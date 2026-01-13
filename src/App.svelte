<script>
    import { getChordRole } from './lib/chordRole';
  // キー選択UI用（個別キー）
  const keyList = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
    'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
  ];
  let selectedKey = 'C';
  // キーごとにuseFlat自動判定
  function isFlatKey(key) {
    return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(key);
  }
  import { detectChord } from './lib/chordDetector'
  import Piano from './lib/Piano.svelte'

  let pianoNotes = [];
  let pianoChord = '';
  let pianoRole = '';
  function handlePianoChange(notes) {
    pianoNotes = notes;
    const result = detectChord(notes, isFlatKey(selectedKey));
    pianoChord = result ? result : '判定できません';
    // 和音のルート名抽出（例: Cメジャー/E → C）
    let rootName = '';
    if (result) {
      rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0];
      rootName = rootName.split('/')[0];
      pianoRole = getChordRole(selectedKey, rootName) || '';
    } else {
      pianoRole = '';
    }
  }
  let inputNotes = '';
  let chordResult = '';
  let chordRole = '';

  function handleDetect() {
    // 入力例: "60,64,67"
    const notes = inputNotes.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    const result = detectChord(notes, isFlatKey(selectedKey));
    chordResult = result ? result : '判定できません';
    let rootName = '';
    if (result) {
      rootName = result.split(/メジャー|マイナー|7|sus|dim|aug/)[0];
      rootName = rootName.split('/')[0];
      chordRole = getChordRole(selectedKey, rootName) || '';
    } else {
      chordRole = '';
    }
  }
</script>

<main>
    <div class="card">
      <h2>キー選択</h2>
      <select bind:value={selectedKey}>
        {#each keyList as key}
          <option value={key}>{key}</option>
        {/each}
      </select>
      <small>選択したキーに応じて和音名の#表記/b表記が切り替わります</small>
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
    <Piano activeNotes={pianoNotes} onNoteChange={handlePianoChange} useFlat={isFlatKey(selectedKey)} />
    <p>現在押下ノート: {pianoNotes.join(', ')}</p>
    <p>判定結果: {pianoChord} {pianoRole ? `（${pianoRole}）` : ''}</p>
    <small>例: C,E,G → Cメジャー（I）</small>
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
