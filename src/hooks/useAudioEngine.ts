import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { KEYS, PATTERNS, type Degree } from '../progressions';
import { type GrooveSpec, STYLE_PRESETS } from '../grooveSpec';

// ----------------------------------------------------------------
// 型定義
// ----------------------------------------------------------------
export type AudioState = 'idle' | 'loading' | 'ready' | 'playing';

// Tone.js: SequenceEventDescription<T> が null を含まない型定義のため any で回避
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneSeqAny = Tone.Sequence<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneSeqEvents = any[];

// ----------------------------------------------------------------
// サンプル URL マップ
// ----------------------------------------------------------------
const ALL_SAMPLE_URLS: Record<string, string> = {
  // ドラム（各トラック名フォルダ）
  kick:       '/samples/KICK/DrumKick01.wav',
  snare:      '/samples/SNARE/DrumSnare01.wav',
  hat:        '/samples/HAT/DrumHihat01.wav',
  op_hat:     '/samples/HAT/DrumHihat_open.wav',
  cymbal:     '/samples/CYMBAL/DrumSymbal.wav',
  // ギター (クランチ): CR_GTR/Gtr{コード名}.wav
  guitar_Am:    '/samples/CR_GTR/GtrAm.wav',
  guitar_C:     '/samples/CR_GTR/GtrC.wav',
  guitar_Dm:    '/samples/CR_GTR/GtrDm.wav',
  guitar_E:     '/samples/CR_GTR/GtrE.wav',
  guitar_F:     '/samples/CR_GTR/GtrF.wav',
  guitar_G:     '/samples/CR_GTR/GtrG.wav',
  guitar_A:     '/samples/CR_GTR/GtrA.wav',
  guitar_B:     '/samples/CR_GTR/GtrB.wav',
  guitar_D:     '/samples/CR_GTR/GtrD.wav',
  guitar_Em:    '/samples/CR_GTR/GtrEm.wav',
  'guitar_F#m': '/samples/CR_GTR/GtrFshm.wav',
  'guitar_C#m': '/samples/CR_GTR/GtrCshm.wav',
  guitar_Gadd9: '/samples/CR_GTR/GtrGadd9.wav',
  // ベース: BASS/Bass{ルート音}.wav（マイナー/メジャー共用）
  bass_Am:    '/samples/BASS/BassA.wav',
  bass_A:     '/samples/BASS/BassA.wav',
  bass_C:     '/samples/BASS/BassC.wav',
  bass_D:     '/samples/BASS/BassD.wav',
  bass_Dm:    '/samples/BASS/BassD.wav',
  bass_E:     '/samples/BASS/BassE.wav',
  bass_Em:    '/samples/BASS/BassE.wav',
  bass_F:     '/samples/BASS/BassF.wav',
  bass_G:     '/samples/BASS/BassG.wav',
  bass_B:     '/samples/BASS/BassB.wav',
  'bass_F#m': '/samples/BASS/BassFsh.wav',
  'bass_C#m': '/samples/BASS/BassCsh.wav',
};

// available なキーで使用するサンプルのみロード
const DEGREES: readonly Degree[] = ['I', 'IV', 'V', 'VI', '♭VII'];

function buildSampleUrls(): Record<string, string> {
  const urls: Record<string, string> = {
    kick:  ALL_SAMPLE_URLS.kick,
    snare: ALL_SAMPLE_URLS.snare,
    hat:   ALL_SAMPLE_URLS.hat,
  };
  // 単音サンプル（存在する場合のみ追加）
  if (ALL_SAMPLE_URLS.cymbal) urls.cymbal = ALL_SAMPLE_URLS.cymbal;
  if (ALL_SAMPLE_URLS.op_hat) urls.op_hat = ALL_SAMPLE_URLS.op_hat;
  KEYS.filter((k) => k.available).forEach((key) => {
    DEGREES.forEach((d) => {
      const sk = key.sampleKey[d];
      if (sk && ALL_SAMPLE_URLS[`guitar_${sk}`])    urls[`guitar_${sk}`]    = ALL_SAMPLE_URLS[`guitar_${sk}`];
      if (sk && ALL_SAMPLE_URLS[`cl_guitar_${sk}`]) urls[`cl_guitar_${sk}`] = ALL_SAMPLE_URLS[`cl_guitar_${sk}`];
      if (sk && ALL_SAMPLE_URLS[`bass_${sk}`])      urls[`bass_${sk}`]      = ALL_SAMPLE_URLS[`bass_${sk}`];
    });
  });
  // guitarSample オーバーライドを持つスロットも追加ロード
  PATTERNS.forEach((p) => {
    p.slots.forEach((slot) => {
      if (slot.guitarSample) {
        const gKey  = `guitar_${slot.guitarSample}`;
        const cgKey = `cl_guitar_${slot.guitarSample}`;
        if (ALL_SAMPLE_URLS[gKey])  urls[gKey]  = ALL_SAMPLE_URLS[gKey];
        if (ALL_SAMPLE_URLS[cgKey]) urls[cgKey] = ALL_SAMPLE_URLS[cgKey];
      }
    });
  });
  return urls;
}

// ----------------------------------------------------------------
// 初期パターン（16ステップ boolean[]）
// ----------------------------------------------------------------
const INIT_PATTERNS: Record<string, boolean[]> = {
  kick:      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0].map(Boolean),
  snare:     [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean),
  hat:       [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean),
  op_hat:    Array(16).fill(false),
  cymbal:    Array(16).fill(false),
  bass:      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
  guitar:    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
  cl_guitar: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
};

// 全16ステップのインデックス
const ALL_STEPS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];

// ----------------------------------------------------------------
// 定数
// ----------------------------------------------------------------
export const BPM_MIN = 60;
export const BPM_MAX = 200;

// ----------------------------------------------------------------
// カスタムフック
// ----------------------------------------------------------------
export function useAudioEngine(
  initialGrooveSpec: GrooveSpec = STYLE_PRESETS['Rock'],
  initialSampleSlots: readonly { guitar: string; bass: string }[] = [
    { guitar: 'Am', bass: 'Am' },
    { guitar: 'G',  bass: 'G'  },
    { guitar: 'F',  bass: 'F'  },
    { guitar: 'G',  bass: 'G'  },
  ],
) {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [bpm, setBpmState] = useState(120);
  const [humanize, setHumanizeState] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const [currentStep, setCurrentStep] = useState(-1);
  const [countBeat, setCountBeat] = useState(-1);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState<string>('未確認');

  // ref 経由でコールバック内から最新値を参照（シーケンス再生成不要）
  const humanizeRef    = useRef(false);
  const bpmRef         = useRef(120);
  const progressionRef = useRef<readonly { guitar: string; bass: string }[]>(initialSampleSlots);
  const grooveSpecRef  = useRef<GrooveSpec>(initialGrooveSpec);
  const playersRef     = useRef<Tone.Players | null>(null);
  const seqsRef        = useRef<ToneSeqAny[]>([]);
  const clickSynthRef  = useRef<Tone.Synth | null>(null);
  const wakeLockRef    = useRef<WakeLockSentinel | null>(null);
  const heartbeatRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isPlayingRef   = useRef(false);

  // ミュート・パターン・バーカウンタ
  const mutedRef = useRef<Record<string, boolean>>({
    kick: false, snare: false, hat: false, op_hat: false, cymbal: false,
    guitar: false, cl_guitar: false, bass: false,
  });
  const trackPatternsRef = useRef<Record<string, boolean[][]>>(
    Object.fromEntries(Object.entries(INIT_PATTERNS).map(([k, v]) => [k, Array.from({ length: 8 }, () => [...v])])),
  );
  const barCountRef      = useRef(-1); // -1 → play開始時に0になる
  const sampleUrlsRef    = useRef<Record<string, string>>({});

  // ------ Wake Lock ------
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || !(navigator as unknown as { wakeLock?: unknown }).wakeLock) {
      const detail = 'wakeLock' in navigator ? 'プロパティあり/値なし(プライベートブラウズ?)' : 'プロパティなし';
      setWakeLockStatus(`API未対応: ${detail}`);
      return;
    }
    if (wakeLockRef.current !== null) return; // 既に保持中
    try {
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      setWakeLockStatus('取得成功');
      console.log('[BackTruck] WakeLock acquired');
      // release イベントからの直接再取得は iOS で不安定 → heartbeat / visibilitychange に委ねる
      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
        setWakeLockStatus('解放された');
        console.log('[BackTruck] WakeLock released');
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setWakeLockStatus(`失敗: ${msg}`);
      console.warn('[BackTruck] WakeLock request failed:', err);
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    // stop() からの解除: isPlayingRef を先に false にしてから呼ぶこと
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setWakeLockActive(false);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current) acquireWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [acquireWakeLock]);

  // ------ Tap to enable audio ------
  const enableAudio = useCallback(async () => {
    try {
      setAudioState('loading');
      await Tone.start();
      const urls = buildSampleUrls();
      sampleUrlsRef.current = urls;
      const players = new Tone.Players(urls).toDestination();
      playersRef.current = players;
      await Tone.loaded();
      setAudioState('ready');
    } catch (err) {
      console.error('[BackTruck] Audio enable failed:', err);
      setAudioState('idle');
    }
  }, []);

  // ------ 各種セッター ------
  const toggleHumanize = useCallback(() => {
    setHumanizeState((prev) => { humanizeRef.current = !prev; return !prev; });
  }, []);

  const setBpm = useCallback((value: number) => {
    const next = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
    setBpmState(next);
    bpmRef.current = next;
    Tone.Transport.bpm.value = next;
  }, []);

  const setProgressionChords = useCallback((chords: readonly { guitar: string; bass: string }[]) => {
    progressionRef.current = chords;
  }, []);

  const setGrooveSpec = useCallback((spec: GrooveSpec) => {
    grooveSpecRef.current = spec;
  }, []);

  const setTrackMuted = useCallback((track: string, muted: boolean) => {
    mutedRef.current = { ...mutedRef.current, [track]: muted };
  }, []);

  // ------ トラックパターン変更（全トラック共通） ------
  const setTrackPattern = useCallback((track: string, barIdx: number, pattern: boolean[]) => {
    const bars = trackPatternsRef.current[track].map((p, i) => i === barIdx ? [...pattern] : p);
    trackPatternsRef.current = { ...trackPatternsRef.current, [track]: bars };
  }, []);

  // ------ CR_GTR ビート別コードオーバーライド ------
  const gtrBeatOverridesRef = useRef<({ guitar: string } | null)[][]>(
    Array(8).fill(null).map(() => Array(4).fill(null)),
  );
  const setGtrBeatOverrides = useCallback((overrides: ({ guitar: string } | null)[][]) => {
    gtrBeatOverridesRef.current = overrides;
  }, []);

  // ------ CR_GTR ビート別活性フラグ ------
  const gtrBeatActiveRef = useRef<boolean[][]>(
    Array(8).fill(null).map(() => [true, false, false, false]),
  );
  const setGtrBeatActive = useCallback((active: boolean[][]) => {
    gtrBeatActiveRef.current = active;
  }, []);

  // ------ トラックボリューム変更（全トラック共通、value: 0〜100） ------
  const setTrackVolume = useCallback((track: string, value: number) => {
    const players = playersRef.current;
    if (!players) return;
    const dB = value === 0 ? -Infinity : ((value - 100) / 100) * 40;
    if (track === 'kick' || track === 'snare' || track === 'hat' || track === 'cymbal' || track === 'op_hat') {
      if (players.has(track)) players.player(track).volume.value = dB;
    } else {
      // guitar / bass は複数サンプルを持つので一括設定
      Object.keys(sampleUrlsRef.current).forEach((key) => {
        if (key.startsWith(`${track}_`) && players.has(key)) {
          players.player(key).volume.value = dB;
        }
      });
    }
  }, []);

  // ------ Play ------
  const play = useCallback(() => {
    const players = playersRef.current;
    if (!players || audioState !== 'ready') return;

    seqsRef.current.forEach((s) => s.dispose());
    seqsRef.current = [];
    barCountRef.current = -1;

    Tone.Transport.bpm.value = bpmRef.current;
    Tone.Transport.timeSignature = 4;

    const newSeqs: ToneSeqAny[] = [];

    const jitter = () =>
      humanizeRef.current
        ? (Math.random() * 2 - 1) * (grooveSpecRef.current.humanizeMs / 1000)
        : 0;

    // --- キック（step 0 でバーカウンタも更新） ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kickSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        // バーカウンタ: step 0 のたびに 1 小節進む（ミュート・パターン問わず必ず実行）
        if (s === 0) {
          barCountRef.current = (barCountRef.current + 1) % 16;
          setCurrentBar(barCountRef.current);
        }
        setCurrentStep(s);
        const kickBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.kick[kickBar][s]) return;
        if (mutedRef.current.kick) return;
        if (Math.random() > grooveSpecRef.current.kickDensity) return;
        players.player('kick').start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    kickSeq.loop = true;
    newSeqs.push(kickSeq);

    // --- スネア ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snareSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const snareBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.snare[snareBar][s]) return;
        if (mutedRef.current.snare) return;
        players.player('snare').start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    snareSeq.loop = true;
    newSeqs.push(snareSeq);

    // --- ハット ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hatSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const hatBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.hat[hatBar][s]) return;
        if (mutedRef.current.hat) return;
        if (Math.random() > grooveSpecRef.current.hatDensity) return;
        players.player('hat').start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    hatSeq.loop = true;
    newSeqs.push(hatSeq);

    // --- オープンハット ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opHatSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const opHatBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.op_hat[opHatBar][s]) return;
        if (mutedRef.current.op_hat) return;
        if (players.has('op_hat')) players.player('op_hat').start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    opHatSeq.loop = true;
    newSeqs.push(opHatSeq);

    // --- シンバル ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cymbalSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const cymbalBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.cymbal[cymbalBar][s]) return;
        if (mutedRef.current.cymbal) return;
        if (players.has('cymbal')) players.player('cymbal').start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    cymbalSeq.loop = true;
    newSeqs.push(cymbalSeq);

    // --- ギター（4ビート単位、beat-chord-row で制御） ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gtrSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const beat = step as number;
        const gtrBar = Math.max(0, barCountRef.current) % 8;
        if (mutedRef.current.guitar) return;
        if (!gtrBeatActiveRef.current[gtrBar]?.[beat]) return;
        if (Math.random() < grooveSpecRef.current.guitarSkip) return;
        const bar = Math.max(0, barCountRef.current);
        const prog = progressionRef.current;
        const slot = prog[bar % prog.length];
        const beatOverride = gtrBeatOverridesRef.current[gtrBar]?.[beat];
        const guitarKey = beatOverride?.guitar ?? slot.guitar;
        const key = `guitar_${guitarKey}`;
        if (players.has(key)) players.player(key).start(time + jitter());
      },
      [0, 1, 2, 3] as ToneSeqEvents,
      '4n',
    );
    gtrSeq.loop = true;
    newSeqs.push(gtrSeq);

    // --- クリーンギター（CL_GTR） ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clGtrSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const clBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.cl_guitar[clBar][s]) return;
        if (mutedRef.current.cl_guitar) return;
        if (Math.random() < grooveSpecRef.current.guitarSkip) return;
        const bar = Math.max(0, barCountRef.current);
        const prog = progressionRef.current;
        const slot = prog[bar % prog.length];
        const key = `cl_guitar_${slot.guitar}`;
        if (players.has(key)) players.player(key).start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    clGtrSeq.loop = true;
    newSeqs.push(clGtrSeq);

    // --- ベース（16ステップ、barCountRef でコード決定） ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bassSeq = new Tone.Sequence<any>(
      (time: number, step: unknown) => {
        const s = step as number;
        const bassBar = Math.max(0, barCountRef.current) % 8;
        if (!trackPatternsRef.current.bass[bassBar][s]) return;
        if (mutedRef.current.bass) return;
        const bar = Math.max(0, barCountRef.current);
        const prog = progressionRef.current;
        const slot = prog[bar % prog.length];
        const key = `bass_${slot.bass}`;
        if (players.has(key)) players.player(key).start(time + jitter());
      },
      ALL_STEPS as ToneSeqEvents,
      '16n',
    );
    bassSeq.loop = true;
    newSeqs.push(bassSeq);

    seqsRef.current = newSeqs;

    // --- カウントイン: 4クリック (1小節) ---
    if (clickSynthRef.current) {
      clickSynthRef.current.dispose();
      clickSynthRef.current = null;
    }
    const clickSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: -4,
    }).toDestination();
    clickSynthRef.current = clickSynth;

    for (let i = 0; i < 4; i++) {
      Tone.Transport.scheduleOnce((time) => {
        clickSynth.triggerAttackRelease(i === 0 ? 'C6' : 'A5', '32n', time);
        setCountBeat(i);
      }, `0:${i}:0`);
    }

    Tone.Transport.scheduleOnce(() => {
      setCountBeat(-1);
      clickSynthRef.current?.dispose();
      clickSynthRef.current = null;
    }, '1:0:0');

    newSeqs.forEach((s) => s.start('1m'));
    Tone.Transport.start();

    isPlayingRef.current = true;
    acquireWakeLock();
    // heartbeat: wake lock が切れた場合に定期的に再取得を試みる（iOS Safari workaround）
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (isPlayingRef.current && document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    }, 15_000);
    setAudioState('playing');
  }, [audioState, acquireWakeLock]);

  // ------ Stop ------
  const stop = useCallback(() => {
    Tone.Transport.stop();
    seqsRef.current.forEach((s) => { s.stop(0); s.dispose(); });
    seqsRef.current = [];
    if (clickSynthRef.current) {
      clickSynthRef.current.dispose();
      clickSynthRef.current = null;
    }
    barCountRef.current = -1;
    setCountBeat(-1);
    setCurrentBar(-1);
    setCurrentStep(-1);
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = undefined;
    isPlayingRef.current = false;
    releaseWakeLock();
    setAudioState('ready');
  }, [releaseWakeLock]);

  return {
    audioState,
    bpm, setBpm,
    humanize, toggleHumanize,
    currentBar,
    currentStep,
    countBeat,
    wakeLockActive,
    wakeLockStatus,
    setGrooveSpec,
    setProgressionChords,
    setGtrBeatOverrides,
    setGtrBeatActive,
    setTrackMuted,
    setTrackPattern,
    setTrackVolume,
    enableAudio, play, stop,
  } as const;
}
