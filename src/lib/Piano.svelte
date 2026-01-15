<script>
  import { onMount } from 'svelte';
  // 88鍵盤分の鍵盤（A0=21〜C8=108）
  const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  let { activeNotes = [], onNoteChange = (notes) => {}, useFlat = false } = $props();

  const NOTE_NAMES = $derived(() => useFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP);
  // 88鍵盤分生成
  const keys = $derived(() => Array.from({length: 88}, (_, i) => {
    const midi = 21 + i;
    return { name: NOTE_NAMES()[midi % 12], midi };
  }));

  // 中央ド(C4)の白鍵インデックスを取得
  const middleCIndex = $derived(() => {
    // MIDI 60がC4
    return whiteKeys().findIndex(k => k.midi === 60);
  });

  const whiteKeys = $derived(() => keys().filter(k => !k.name.includes('#') && !k.name.includes('b')));
  const blackKeys = $derived(() => keys().filter(k => k.name.includes('#') || k.name.includes('b')));

  // 黒鍵の位置調整（白鍵の幅32px, 黒鍵の幅24px, 白鍵間に配置）
  function getBlackKeyLeft(i) {
    const blackKey = blackKeys()[i];
    const midi = blackKey.midi;
    let whiteIndex = -1;
    for (let j = 0; j < whiteKeys().length; j++) {
      if (whiteKeys()[j].midi < midi) whiteIndex = j;
    }
    return (whiteIndex + 1) * 32 - 12;
  }

  // スクロール初期位置を中央ド(C4)に
  onMount(() => {
    const scrollEl = document.querySelector('.piano-scroll');
    if (scrollEl && middleCIndex() !== -1) {
      // 白鍵の幅32px, piano-scrollの幅800px
      const keyWidth = 32;
      const scrollWidth = scrollEl.offsetWidth;
      const middleCPos = middleCIndex() * keyWidth + keyWidth / 2;
      // 中央ドが中央に来るようにスクロール
      scrollEl.scrollLeft = Math.max(0, middleCPos - scrollWidth / 2);
    }
  });

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

<div class="piano-scroll">
  <div class="piano">
    <div class="white-keys">
      {#each whiteKeys() as key}
        <button
          class="key white {activeNotes.includes(key.midi) ? 'active' : ''}"
          onclick={() => toggleNote(key.midi)}
        >
          {NOTE_NAMES()[key.midi % 12]}{Math.floor((key.midi - 12) / 12)}
        </button>
      {/each}
    </div>
    <div class="black-keys">
      {#each blackKeys() as key, i}
        <button
          class="key black {activeNotes.includes(key.midi) ? 'active' : ''}"
          style="left: {getBlackKeyLeft(i)}px;"
          onclick={() => toggleNote(key.midi)}
        >
          {NOTE_NAMES()[key.midi % 12]}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
/* スクロール可能なピアノラッパー */
.piano-scroll {
  width: 800px;
  overflow-x: auto;
  margin: 0 auto;
}
/* ピアノ全体 */
.piano {
  position: relative;
  width: calc(52 * 32px); /* 88鍵の白鍵は52本 */
  min-width: 1664px;
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
  display: flex;
  align-items: flex-end;
  justify-content: center;
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
