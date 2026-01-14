<script>
    import { onMount, onDestroy } from 'svelte';
    import { getChordRole } from './lib/chordRole';
  // キー選択UI用（個別キー）
  const keyList = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
    'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
  ];
  let selectedKey = 'C';
  // 調性（長調/短調）
  let isMinor = false;

  // ノート名→インデックス変換（C=0...B=11）
  const NOTE_INDEX = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
  };

  // キーと調性から #/b 表記を自動判定
  function isFlatKey(key, minor = false) {
    // 長調は従来通りの判定
    if (!minor) {
      return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(key);
    }
    // 短調は平行長調（+3半音）で判定
    const tonicIdx = NOTE_INDEX[key];
    if (tonicIdx === undefined) return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(key);
    const relativeMajor = (tonicIdx + 3) % 12;
    // フラット系長調のインデックス集合（F, Bb, Eb, Ab, Db, Gb, Cb）
    const flatMajors = new Set([5, 10, 3, 8, 1, 6, 11]);
    return flatMajors.has(relativeMajor);
  }
  import { detectChord } from './lib/chordDetector'
  import Piano from './lib/Piano.svelte'

  let pianoNotes = [];
  let pianoChord = '';
  let pianoRole = '';
  function handlePianoChange(notes) {
    pianoNotes = notes;
    const result = detectChord(notes, isFlatKey(selectedKey, isMinor));
    pianoChord = result ? result : '判定できません';
    // 和音のルート名抽出（例: Cメジャー/E → C）
    let rootName = '';
    if (result) {
      rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0];
      rootName = rootName.split('/')[0];
      pianoRole = getChordRole(selectedKey, rootName, isMinor) || '';
    } else {
      pianoRole = '';
    }
    if (syncPianoMidi) {
      midiNotes = [...notes];
      updateMidiChord();
    }
  }
  let inputNotes = '';
  let chordResult = '';
  let chordRole = '';

  function handleDetect() {
    // 入力例: "60,64,67"
    const notes = inputNotes.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    const result = detectChord(notes, isFlatKey(selectedKey, isMinor));
    chordResult = result ? result : '判定できません';
    let rootName = '';
    if (result) {
      rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0];
      rootName = rootName.split('/')[0];
      chordRole = getChordRole(selectedKey, rootName, isMinor) || '';
    } else {
      chordRole = '';
    }
  }

  // ---- MIDI入力（Web MIDI API） ----
  let midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  let midiAccess = null;
  let midiInputs = [];
  let selectedMidiId = '';
  let listening = false;
  let midiNotes = [];
  let originalMidiNotes = [];
  let midiChord = '';
  let midiRole = '';
  let midiInputObj = null;
  let syncPianoMidi = false;

  function refreshMidiInputs() {
    if (!midiAccess) return;
    midiInputs = Array.from(midiAccess.inputs.values()).map(inp => ({ id: inp.id, name: inp.name }));
    if (midiInputs.length && !selectedMidiId) selectedMidiId = midiInputs[0].id;
  }

  function updateMidiChord() {
    const result = detectChord(midiNotes, isFlatKey(selectedKey, isMinor));
    midiChord = result ? result : '判定できません';
    if (result) {
      let rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0].split('/')[0];
      midiRole = getChordRole(selectedKey, rootName, isMinor) || '';
    } else {
      midiRole = '';
    }
  }

  function normalizeToPianoRange(notes) {
    // 60～83の範囲にオクターブシフト
    return notes.map(n => {
      let note = n;
      while (note < 60) note += 12;
      while (note > 83) note -= 12;
      // もし範囲外（極端な場合）なら除外
      if (note < 60 || note > 83) return null;
      return note;
    }).filter(n => n !== null);
  }

  function handleMIDIMessage(ev) {
    const data = ev.data;
    const status = data[0] & 0xf0;
    const note = data[1];
    const vel = data[2];
    if (status === 0x90 && vel > 0) {
      if (!midiNotes.includes(note)) midiNotes = [...midiNotes, note].sort((a,b)=>a-b);
      // 元のノート配列も更新
      if (!originalMidiNotes.includes(note)) originalMidiNotes = [...originalMidiNotes, note].sort((a,b)=>a-b);
      updateMidiChord();
      if (syncPianoMidi) {
        const normalized = normalizeToPianoRange(midiNotes);
        pianoNotes = normalized;
        // ピアノ側の判定も更新
        updatePianoChordWithBass();
      }
    } else if (status === 0x80 || (status === 0x90 && vel === 0)) {
      midiNotes = midiNotes.filter(n => n !== note);
      // 元のノート配列も更新
      originalMidiNotes = originalMidiNotes.filter(n => n !== note);
      updateMidiChord();
      if (syncPianoMidi) {
        const normalized = normalizeToPianoRange(midiNotes);
        pianoNotes = normalized;
        updatePianoChordWithBass();
      }
    }
  }

  function updatePianoChordWithBass() {
    // 最低音のピッチクラスを取得
    if (originalMidiNotes.length === 0) {
      pianoChord = '';
      pianoRole = '';
      return;
    }
    const bassNote = Math.min(...originalMidiNotes);
    const bassClass = bassNote % 12;
    // コード判定
    const result = detectChord(pianoNotes, isFlatKey(selectedKey, isMinor));
    pianoChord = result ? result : '判定できません';
    if (result) {
      // ルート名抽出
      let rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0];
      rootName = rootName.split('/')[0];
      // ベース音名を付加（スラッシュコード）
      const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const bassName = NOTE_NAMES_SHARP[bassClass];
      if (!result.includes('/')) {
        pianoChord += `/${bassName}`;
      }
      pianoRole = getChordRole(selectedKey, rootName, isMinor) || '';
    } else {
      pianoRole = '';
    }
  }

  function startListening() {
    if (!midiAccess || !selectedMidiId || listening) return;
    const inp = Array.from(midiAccess.inputs.values()).find(i => i.id === selectedMidiId);
    if (!inp) return;
    midiInputObj = inp;
    inp.onmidimessage = handleMIDIMessage;
    listening = true;
  }

  function stopListening() {
    if (midiInputObj) {
      midiInputObj.onmidimessage = null;
      midiInputObj = null;
    }
    listening = false;
    midiNotes = [];
    originalMidiNotes = [];
    updateMidiChord();
  }

  onMount(async () => {
    if (!midiSupported) return;
    try {
      // @ts-ignore
      midiAccess = await navigator.requestMIDIAccess();
      refreshMidiInputs();
      midiAccess.onstatechange = () => refreshMidiInputs();
    } catch (e) {
      console.warn('MIDIアクセスに失敗しました', e);
    }
  });

  onDestroy(() => {
    stopListening();
  });
</script>

<main>
    <div class="card">
      <h2>キー選択</h2>
      <select bind:value={selectedKey}>
        {#each keyList as key}
          <option value={key}>{key}</option>
        {/each}
      </select>
      <label style="margin-left: 8px;">
        <input type="checkbox" bind:checked={isMinor} /> 短調（マイナー）
      </label>
      <small>キーと調性に応じて#表記/b表記が切り替わります</small>
    </div>

  <div class="card">
    <h2>和音判定テスト</h2>
    <input type="text" bind:value={inputNotes} placeholder="ノート番号例: 60,64,67" />
    <button on:click={handleDetect}>判定</button>
    <p>結果: {chordResult} {chordRole ? `（${chordRole}）` : ''}</p>
    <small>例: 60,64,67 → Cメジャー（I）</small>
  </div>

  <div class="card">
    <h2>ピアノ鍵盤（クリックで入力）</h2>
    <Piano activeNotes={pianoNotes} onNoteChange={handlePianoChange} useFlat={isFlatKey(selectedKey, isMinor)} />
    <p>現在押下ノート: {pianoNotes.join(', ')}</p>
    <p>判定結果: {pianoChord} {pianoRole ? `（${pianoRole}）` : ''}</p>
    <small>例: C,E,G → Cメジャー（I）</small>
  </div>

  <div class="card">
    <h2>MIDI入力</h2>
    {#if midiSupported}
      <div>
        <label>入力デバイス: 
          <select bind:value={selectedMidiId} disabled={!midiInputs.length || listening}>
            {#each midiInputs as dev}
              <option value={dev.id}>{dev.name}</option>
            {/each}
          </select>
        </label>
        <button on:click={startListening} disabled={!midiInputs.length || listening}>開始</button>
        <button on:click={stopListening} disabled={!listening}>停止</button>
        <label style="margin-left: 8px;">
          <input type="checkbox" bind:checked={syncPianoMidi} /> ピアノと同期
        </label>
      </div>
      <p>現在押下ノート(MIDI): {midiNotes.join(', ')}</p>
      <p>判定結果: {midiChord} {midiRole ? `（${midiRole}）` : ''}</p>
      <small>注: localhost/HTTPS上の対応ブラウザでご利用ください。</small>
    {:else}
      <p>このブラウザはWeb MIDI APIに対応していません。</p>
    {/if}
  </div>

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework powered by Vite!
  </p>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p>
</main>

<style>
  .read-the-docs {
    color: #888;
  }
</style>
