<script>
    import { onMount, onDestroy } from 'svelte';
    import { getChordRole } from './lib/chordRole';
  // キー選択UI用（個別キー）
  const keyList = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
    'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
  ];
  let selectedKey = $state('C');
  // 調性（長調/短調）
  let isMinor = $state(false);

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
  import { playNotes, stopAll } from './lib/simpleSynth'
  let isPlaying = $state(false);

  function handlePlay() {
    if (notes.length === 0) return;
    playNotes(notes);
    isPlaying = true;
  }

  function handleStop() {
    stopAll();
    isPlaying = false;
  }

  // ノート入力の同期用
  let notes = $state([]);
  let chordResult = $state('');
  let chordRole = $state('');

  function handlePianoChange(newNotes) {
    notes = [...newNotes];
    updateChordStates();
  }

  // ---- MIDI入力（Web MIDI API） ----
  let midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  let midiAccess = null;
  let midiInputs = $state([]);
  let selectedMidiId = $state('');
  let listening = $state(false);
  let midiInputObj = null;

  function refreshMidiInputs() {
    if (!midiAccess) return;
    midiInputs = Array.from(midiAccess.inputs.values()).map(inp => ({ id: inp.id, name: inp.name }));
    if (midiInputs.length && !selectedMidiId) selectedMidiId = midiInputs[0].id;
  }


  function handleMIDIMessage(ev) {
    const data = ev.data;
    const status = data[0] & 0xf0;
    const note = data[1];
    const vel = data[2];
    if (status === 0x90 && vel > 0) {
      if (!notes.includes(note)) notes = [...notes, note].sort((a,b)=>a-b);
      updateChordStates();
    } else if (status === 0x80 || (status === 0x90 && vel === 0)) {
      notes = notes.filter(n => n !== note);
      updateChordStates();
    }
  }

  function updateChordStates() {
    // すべてのUIで同じ結果を表示
    const result = detectChord(notes, isFlatKey(selectedKey, isMinor));
    chordResult = result ? result : '判定できません';
    if (result) {
      let rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0].split('/')[0];
      chordRole = getChordRole(selectedKey, rootName, isMinor) || '';
    } else {
      chordRole = '';
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
    notes = [];
    updateChordStates();
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
      <p>
        <small>キーと調性に応じて#表記/b表記が切り替わります</small>
      </p>
    </div>

    <div class="card">
      <h2>判定結果</h2>
      <div class="result-highlight">
        {chordResult} {chordRole ? `（${chordRole}）` : '　'}
      </div>
      <div style="display:flex; justify-content:center; gap:12px; margin:12px 0;">
        <button onclick={handlePlay} disabled={isPlaying || notes.length === 0} style="font-size:1.1em;">▶️和音を鳴らす</button>
        <button onclick={handleStop} disabled={!isPlaying} style="font-size:1.1em;">⏹止める</button>
      </div>
      <p style="text-align:center; color:#888; margin-top:8px;">現在押下ノート: {notes.join(', ')}</p>
    </div>

  <div class="card">
    <h2>ピアノ鍵盤（クリックで入力）</h2>
    <Piano activeNotes={notes} onNoteChange={handlePianoChange} useFlat={isFlatKey(selectedKey, isMinor)} />
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
        <button onclick={startListening} disabled={!midiInputs.length || listening}>開始</button>
        <button onclick={stopListening} disabled={!listening}>停止</button>
      </div>
      <small>注: localhost/HTTPS上の対応ブラウザでご利用ください。</small>
    {:else}
      <p>このブラウザはWeb MIDI APIに対応していません。</p>
    {/if}
  </div>

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework powered by Vite!
  </p>
</main>

<style>
  .result-highlight {
      button[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }
    margin: 20px auto 12px auto;
    padding: 18px 28px;
    font-size: 1.5rem;
    font-weight: 600;
    color: #f8fafc;
    background: linear-gradient(90deg, #22304a 0%, #3a5068 100%);
    border-radius: 12px;
    box-shadow: 0 2px 8px 0 rgba(34,48,74,0.10);
    text-align: center;
    letter-spacing: 0.03em;
    min-width: 180px;
    max-width: 90vw;
    transition: background 0.3s;
    user-select: text;
  }
</style>
