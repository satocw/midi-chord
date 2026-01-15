// 簡易WebAudioシンセ（1音ずつ発音）

let audioCtx: AudioContext | null = null;
const activeOsc: Record<number, {osc: OscillatorNode, filter: BiquadFilterNode, gain: GainNode}> = {};

// Master processing chain
let masterIn: GainNode | null = null;
let lowShelf: BiquadFilterNode | null = null;
let highShelf: BiquadFilterNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let masterOut: GainNode | null = null;

type LoudnessOptions = {
  bassShelfDb?: number;      // +dB to boost lows
  trebleShelfDb?: number;    // -dB to attenuate highs
  tilt?: number;             // -1..+1, negative = darker, positive = brighter
  useCompressor?: boolean;   // enable dynamics compression
};

const opts: Required<LoudnessOptions> = {
  bassShelfDb: 6,
  trebleShelfDb: -5,
  tilt: -0.2,
  useCompressor: true,
};

function ensureAudio() {
  if (!audioCtx) audioCtx = new window.AudioContext();
  if (!masterIn) {
    masterIn = audioCtx.createGain();
    lowShelf = audioCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 180; // Hz

    highShelf = audioCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 2500; // Hz

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    masterOut = audioCtx.createGain();
    masterOut.gain.value = 0.9;

    // Connect chain: masterIn -> lowShelf -> highShelf -> (compressor) -> masterOut -> destination
    masterIn.connect(lowShelf);
    lowShelf.connect(highShelf);
    if (opts.useCompressor) {
      highShelf.connect(compressor);
      compressor.connect(masterOut);
    } else {
      highShelf.connect(masterOut);
    }
    masterOut.connect(audioCtx.destination);

    applyLoudnessOptions();
  }
}

export function setLoudnessOptions(newOpts: LoudnessOptions) {
  Object.assign(opts, newOpts);
  if (!audioCtx) return;
  applyLoudnessOptions();
}

function applyLoudnessOptions() {
  if (!audioCtx || !lowShelf || !highShelf) return;
  const tiltDb = Math.max(-6, Math.min(6, opts.tilt * 6));
  const bass = opts.bassShelfDb + tiltDb;
  const treble = opts.trebleShelfDb - tiltDb;
  lowShelf.gain.value = bass;
  highShelf.gain.value = treble;
  if (compressor && masterOut && highShelf) {
    // reconnect compressor depending on flag
    try {
      highShelf.disconnect();
    } catch {}
    if (opts.useCompressor) {
      highShelf.connect(compressor);
      compressor!.connect(masterOut);
    } else {
      highShelf.connect(masterOut);
    }
  }
}


function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}


// エンベロープ設定
const ATTACK = 0.03; // 秒
const RELEASE = 0.15; // 秒

// さらに強めのラウドネス補正: 低音は大きく・高音は控えめ
function loudnessComp(midi: number): number {
  // MIDI 21(A0)〜108(C8)を0〜1に正規化
  const norm = (midi - 21) / (108 - 21);
  // 低音(0)で2.2、中音(0.5)で1.35、高音(1)で0.5くらいに補正
    return 2.0 - 0.7 * Math.pow(norm - 0.5, 2);
}

export function playNotes(midiNotes: number[]) {
  ensureAudio();
  stopAll();
  const n = midiNotes.length || 1;
  midiNotes.forEach(midi => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(midi);
    // Per-voice filter (key-tracked lowpass)
    const vcf = audioCtx!.createBiquadFilter();
    vcf.type = 'lowpass';
    // 基準カットオフ(ミドルC付近)とキー追従: 高音ほどカットオフを下げて耳障りを抑制
    const baseCut = 1800; // Hz @ MIDI 60
    const cutoff = Math.max(300, Math.min(4000, baseCut * Math.pow(2, (60 - midi) / 24)));
    vcf.frequency.value = cutoff;
    vcf.Q.value = 0.707;

    const gain = audioCtx!.createGain();
    gain.gain.value = 0;
    osc.connect(vcf);
    vcf.connect(gain);
    gain.connect(masterIn!);
    osc.start();
    // ラウドネス補正を各音に適用
    const loudness = loudnessComp(midi);
    const perGain = (0.18 / n) * loudness;
    // Attack
    gain.gain.linearRampToValueAtTime(0, audioCtx!.currentTime);
    gain.gain.linearRampToValueAtTime(perGain, audioCtx!.currentTime + ATTACK);
    activeOsc[midi] = { osc, filter: vcf, gain };
  });
}


export function stopAll() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  for (const midi in activeOsc) {
    const { osc, filter, gain } = activeOsc[midi];
    if (osc && gain) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + RELEASE);
        // stopは一度しか呼べないので、既にstop済みならcatch
        osc.stop(now + RELEASE);
      } catch {}
      // disconnectはstop後に
      setTimeout(() => {
        try { osc.disconnect(); } catch {}
        try { filter.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      }, RELEASE * 1000 + 20);
    }
    delete activeOsc[midi];
  }
}
