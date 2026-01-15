// ノート番号配列から和音名を判定する関数
// 例: [60, 64, 67] → "Cメジャー"

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 和音パターン（メジャー・マイナーのみ簡易実装）
const CHORD_PATTERNS = [
  { name: 'メジャー', intervals: [0, 4, 7] },
  { name: 'マイナー', intervals: [0, 3, 7] },
  { name: 'メジャー7', intervals: [0, 4, 7, 11] },
  { name: 'マイナー7', intervals: [0, 3, 7, 10] },
  { name: 'ドミナント7', intervals: [0, 4, 7, 10] },
  { name: 'sus4', intervals: [0, 5, 7] },
  { name: 'sus2', intervals: [0, 2, 7] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', intervals: [0, 4, 8] },
];

export function detectChord(notes: number[], useFlat = false): string | null {
  if (notes.length < 3) return null;
  const NOTE_NAMES = useFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  // 昇順にソート（最低音を特定）
  const sortedNotes = [...notes].sort((a, b) => a - b);
  const bassNote = sortedNotes[0];
  // ルート候補ごとに判定
  for (const root of notes) {
    const relNotes = notes.map(n => (n - root + 12) % 12);
    for (const pattern of CHORD_PATTERNS) {
      // パターンのintervalsが全て含まれているか
      // かつ、余計な音が含まれていないか（relNotesとpattern.intervalsが同じ集合）
      const intervalsSet = new Set(pattern.intervals);
      const relNotesSet = new Set(relNotes);
      const allIncluded = pattern.intervals.every(i => relNotesSet.has(i));
      const noExtra = relNotes.every(i => intervalsSet.has(i));
      if (allIncluded && noExtra) {
        const rootName = NOTE_NAMES[root % 12];
        const bassName = NOTE_NAMES[bassNote % 12];
        // 転回形の場合はスラッシュ表記
        if (bassNote % 12 !== root % 12) {
          return `${rootName}${pattern.name}/${bassName}`;
        } else {
          return `${rootName}${pattern.name}`;
        }
      }
    }
  }
  return null;
}

// テスト用: 例
console.log(detectChord([64, 67, 72])); // Cメジャー/E
console.log(detectChord([60, 63, 67])); // Cm
console.log(detectChord([60, 64, 67, 71])); // CM7
console.log(detectChord([60, 63, 67, 70])); // Cm7
console.log(detectChord([60, 64, 67, 70])); // C7
console.log(detectChord([60, 65, 67])); // Csus4
console.log(detectChord([60, 62, 67])); // Csus2
console.log(detectChord([60, 63, 66])); // Cdim
console.log(detectChord([60, 64, 68])); // Caug
