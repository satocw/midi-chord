<script>
  export let activeNotes = [];
  export let onNoteChange = (notes) => {};
  export let useFlat = false;

  // 2オクターブ分の鍵盤（C4=60〜B5=83）
  const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  $: NOTE_NAMES = useFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  $: keys = Array.from({length: 24}, (_, i) => {
    const midi = 60 + i;
    return { name: NOTE_NAMES[midi % 12], midi };
  });

  // 白鍵・黒鍵の分離
  $: whiteKeys = keys.filter(k => !k.name.includes('#') && !k.name.includes('b'));
  $: blackKeys = keys.filter(k => k.name.includes('#') || k.name.includes('b'));

  // 黒鍵の位置調整（白鍵の幅32px, 黒鍵の幅24px, 白鍵間に配置）
  function getBlackKeyLeft(i) {
    // 黒鍵の直前の白鍵インデックスを基準に配置
    const blackKey = blackKeys[i];
    // 黒鍵のMIDI番号
    const midi = blackKey.midi;
    // 直前の白鍵を探す
    let whiteIndex = -1;
    for (let j = 0; j < whiteKeys.length; j++) {
      if (whiteKeys[j].midi < midi) whiteIndex = j;
    }
    // 白鍵の幅32px、黒鍵の中央に配置（+16px）
    return (whiteIndex + 1) * 32 - 12;
  }

  function toggleNote(midi) {
    let notes;
    if (activeNotes.includes(midi)) {
      notes = activeNotes.filter(n => n !== midi);
    } else {
      notes = [...activeNotes, midi];
    }
    onNoteChange(notes);
  }
</script>

<div class="piano">
  <div class="white-keys">
    {#each whiteKeys as key}
      <button
        class="key white {activeNotes.includes(key.midi) ? 'active' : ''}"
        on:click={() => toggleNote(key.midi)}
      >
        {NOTE_NAMES[key.midi % 12]}
      </button>
    {/each}
  </div>
  <div class="black-keys">
    {#each blackKeys as key, i}
      <button
        class="key black {activeNotes.includes(key.midi) ? 'active' : ''}"
        style="left: {getBlackKeyLeft(i)}px;"
        on:click={() => toggleNote(key.midi)}
      >
        {NOTE_NAMES[key.midi % 12]}
      </button>
    {/each}
  </div>
</div>

<style>
/* ピアノ全体 */
/* ピアノ全体 */
.piano {
  position: relative;
  width: 416px;
  height: 120px;
}
.white-keys {
  display: flex;
  position: relative;
  z-index: 1;
}
.black-keys {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  z-index: 2;
  pointer-events: none;
}
.key {
  font-size: 12px;
  border: 1px solid #888;
  border-radius: 4px;
  margin: 0;
}
.key.white {
  width: 32px;
  height: 120px;
  background: #fff;
  position: relative;
  z-index: 1;
}
.key.black {
  width: 24px;
  height: 60px;
  background: #222;
  color: #fff;
  position: absolute;
  z-index: 2;
  pointer-events: auto;
}
.key.active {
  background: #ffec8b;
  color: #222;
}
</style>
