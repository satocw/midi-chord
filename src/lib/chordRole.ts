// キーと和音名から機能（I, IV, V, ii, iii, vi, vii°など）を判定する関数

const MAJOR_DEGREES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_DEGREES = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

// キー名からルートノート番号（C=0, C#=1, D=2...）を取得
const NOTE_INDEX = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

export function getChordRole(key: string, chordRoot: string, isMinor = false): string | null {
  const rootIdx = NOTE_INDEX[key];
  const chordIdx = NOTE_INDEX[chordRoot];
  if (rootIdx === undefined || chordIdx === undefined) return null;
  // メジャーキーの場合
  const degree = (chordIdx - rootIdx + 12) % 12;
  const majorMap = [0, 2, 4, 5, 7, 9, 11];
  const idx = majorMap.indexOf(degree);
  if (!isMinor) {
    return idx >= 0 ? MAJOR_DEGREES[idx] : null;
  } else {
    // マイナーキーの場合
    const minorMap = [0, 2, 3, 5, 7, 8, 10];
    const idx2 = minorMap.indexOf(degree);
    return idx2 >= 0 ? MINOR_DEGREES[idx2] : null;
  }
}

// 例
// getChordRole('C', 'C') // I
// getChordRole('C', 'F') // IV
// getChordRole('C', 'G') // V
// getChordRole('C', 'D') // ii
