import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { useAudioEngine, BPM_MIN, BPM_MAX } from './hooks/useAudioEngine';
import { PATTERNS, KEYS, getDisplayChords, getSampleSlots, getDegreeNumbers } from './progressions';
import { STYLES, STYLE_PRESETS, type StyleName, type GrooveSpec } from './grooveSpec';

// ギターサンプル選択肢（13種）
const GUITAR_OPTIONS = [
  { label: 'A',     guitar: 'A'     },
  { label: 'Am',    guitar: 'Am'    },
  { label: 'B',     guitar: 'B'     },
  { label: 'C',     guitar: 'C'     },
  { label: 'C#m',   guitar: 'C#m'   },
  { label: 'D',     guitar: 'D'     },
  { label: 'Dm',    guitar: 'Dm'    },
  { label: 'E',     guitar: 'E'     },
  { label: 'Em',    guitar: 'Em'    },
  { label: 'F',     guitar: 'F'     },
  { label: 'F#m',   guitar: 'F#m'   },
  { label: 'G',     guitar: 'G'     },
  { label: 'Gadd9', guitar: 'Gadd9' },
] as const;

// ベースサンプル選択肢（ルート音9種、minor 表記は root と同一 WAV）
const BASS_OPTIONS = [
  { label: 'A',  bass: 'A'   },
  { label: 'B',  bass: 'B'   },
  { label: 'C',  bass: 'C'   },
  { label: 'C#', bass: 'C#m' },
  { label: 'D',  bass: 'D'   },
  { label: 'E',  bass: 'E'   },
  { label: 'F',  bass: 'F'   },
  { label: 'F#', bass: 'F#m' },
  { label: 'G',  bass: 'G'   },
] as const;

// ベースサンプルキーの正規化（Am/Em/Dm → ルート音に統一）
const BASS_NORM: Record<string, string> = { Am: 'A', Em: 'E', Dm: 'D' };
function normBassKey(k: string): string { return BASS_NORM[k] ?? k; }

// ----------------------------------------------------------------
// ギター単列ホイールピッカー（ビート別コード用）
// ----------------------------------------------------------------
function GuitarWheelPicker({
  initialIdx,
  align,
  onSelect,
}: {
  initialIdx: number;
  align: 'left' | 'right';
  onSelect: (idx: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestIdx = useRef(initialIdx);
  const [liveIdx, setLiveIdx] = useState(initialIdx);

  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollTop = initialIdx * WHEEL_ITEM_H;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!trackRef.current) return;
    const idx = Math.max(0, Math.min(GUITAR_OPTIONS.length - 1, Math.round(trackRef.current.scrollTop / WHEEL_ITEM_H)));
    setLiveIdx(idx); latestIdx.current = idx;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSelect(latestIdx.current), 150);
  };

  return (
    <div className={`guitar-wheel guitar-wheel--${align}`}>
      <div className="guitar-wheel__col">
        <div className="chord-wheel__indicator" />
        <div className="chord-wheel__fade chord-wheel__fade--top" />
        <div className="chord-wheel__fade chord-wheel__fade--bottom" />
        <div className="chord-wheel__track" ref={trackRef} onScroll={handleScroll}>
          <div className="chord-wheel__pad" />
          {GUITAR_OPTIONS.map((o, i) => (
            <div key={i} className={`chord-wheel__item${i === liveIdx ? ' chord-wheel__item--active' : ''}`}>
              {o.label}
            </div>
          ))}
          <div className="chord-wheel__pad" />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// デュアルホイールピッカー（左=Guitar、右=Bass）
// ----------------------------------------------------------------
const WHEEL_ITEM_H = 44;

function DualWheelPicker({
  initialGuitarIdx,
  initialBassIdx,
  align,
  onSelect,
}: {
  initialGuitarIdx: number;
  initialBassIdx: number;
  align: 'left' | 'right';
  onSelect: (guitarIdx: number, bassIdx: number) => void;
}) {
  const guitarRef = useRef<HTMLDivElement>(null);
  const bassRef   = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestG   = useRef(initialGuitarIdx);
  const latestB   = useRef(initialBassIdx);
  const [guitarLive, setGuitarLive] = useState(initialGuitarIdx);
  const [bassLive,   setBassLive]   = useState(initialBassIdx);

  useEffect(() => {
    if (guitarRef.current) guitarRef.current.scrollTop = initialGuitarIdx * WHEEL_ITEM_H;
    if (bassRef.current)   bassRef.current.scrollTop   = initialBassIdx   * WHEEL_ITEM_H;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleCommit = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSelect(latestG.current, latestB.current); }, 150);
  };

  const handleGScroll = () => {
    if (!guitarRef.current) return;
    const idx = Math.max(0, Math.min(GUITAR_OPTIONS.length - 1, Math.round(guitarRef.current.scrollTop / WHEEL_ITEM_H)));
    setGuitarLive(idx); latestG.current = idx; scheduleCommit();
  };

  const handleBScroll = () => {
    if (!bassRef.current) return;
    const idx = Math.max(0, Math.min(BASS_OPTIONS.length - 1, Math.round(bassRef.current.scrollTop / WHEEL_ITEM_H)));
    setBassLive(idx); latestB.current = idx; scheduleCommit();
  };

  const renderTrack = (
    ref: React.RefObject<HTMLDivElement>,
    options: readonly { label: string }[],
    liveIdx: number,
    onScroll: () => void,
  ) => (
    <div className="chord-wheel__col">
      <div className="chord-wheel__indicator" />
      <div className="chord-wheel__fade chord-wheel__fade--top" />
      <div className="chord-wheel__fade chord-wheel__fade--bottom" />
      <div className="chord-wheel__track" ref={ref} onScroll={onScroll}>
        <div className="chord-wheel__pad" />
        {options.map((o, i) => (
          <div key={i} className={`chord-wheel__item${i === liveIdx ? ' chord-wheel__item--active' : ''}`}>
            {o.label}
          </div>
        ))}
        <div className="chord-wheel__pad" />
      </div>
    </div>
  );

  return (
    <div className={`chord-wheel chord-wheel--${align}`}>
      <div className="chord-wheel__header">
        <span className="chord-wheel__col-label">Guitar</span>
        <div className="chord-wheel__divider-v" />
        <span className="chord-wheel__col-label">Bass</span>
      </div>
      <div className="chord-wheel__body">
        {renderTrack(guitarRef, GUITAR_OPTIONS, guitarLive, handleGScroll)}
        <div className="chord-wheel__divider-v" />
        {renderTrack(bassRef, BASS_OPTIONS, bassLive, handleBScroll)}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 16ステップ パターン (視覚表示用)
// 1 = 音あり, 0 = 休み
// ----------------------------------------------------------------
const VISUAL: Record<string, number[]> = {
  CL_GTR: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  CR_GTR: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  BASS:   [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  CYMBAL: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  OP_HAT: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  HAT:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  SNARE:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  KICK:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
};

// UI トラック名 → オーディオエンジン トラック名
const TRACK_TO_AUDIO: Record<string, string> = {
  CL_GTR: 'cl_guitar', CR_GTR: 'guitar',
  BASS: 'bass',
  CYMBAL: 'cymbal', OP_HAT: 'op_hat',
  HAT: 'hat', SNARE: 'snare', KICK: 'kick',
};

// トラックのデフォルト音量
const DEFAULT_VOLUMES: Record<string, number> = {
  CL_GTR: 85, CR_GTR: 85, BASS: 85,
  CYMBAL: 75,
  OP_HAT: 80, HAT: 80, SNARE: 80, KICK: 80,
};

function cellClass(trackName: string, step: number, active: number): string {
  if (!active) return 'cell';
  if (trackName === 'HAT' && step % 2 !== 0) return 'cell cell--dim';
  return 'cell cell--active';
}

function cellOpacity(trackName: string, active: number, spec: GrooveSpec): number {
  if (!active) return 1;
  if (trackName === 'KICK')   return spec.kickDensity;
  if (trackName === 'HAT')    return spec.hatDensity;
  if (trackName === 'CR_GTR') return 1 - spec.guitarSkip;
  if (trackName === 'CL_GTR') return 1 - spec.guitarSkip;
  return 1;
}

// 初期値（useAudioEngine の初期状態と一致させる唯一の定義箇所）
const INITIAL_STYLE: StyleName = 'Rock';
const INITIAL_KEY_INDEX     = 0; // KEYS[0] = Am
const INITIAL_PATTERN_INDEX = 0; // PATTERNS[0] = P1

// ----------------------------------------------------------------
// App コンポーネント
// ----------------------------------------------------------------
export default function App() {
  const [keyIndex,     setKeyIndex]     = useState(INITIAL_KEY_INDEX);
  const [patternIndex, setPatternIndex] = useState(INITIAL_PATTERN_INDEX);
  const [isKeyOpen,         setIsKeyOpen]         = useState(false);
  const [isProgressionOpen, setIsProgressionOpen] = useState(false);
  const [barOverrides, setBarOverrides] = useState<({ guitar: string; bass: string } | null)[]>(() => Array(8).fill(null));
  const [openBarIndex, setOpenBarIndex] = useState<number | null>(null);
  const [gtrBeatOverrides, setGtrBeatOverrides] = useState<(({ guitar: string } | null)[])[]>(
    () => Array(8).fill(null).map(() => Array(4).fill(null)),
  );
  const [gtrBeatActive, setGtrBeatActive] = useState<boolean[][]>(
    () => Array(8).fill(null).map(() => [true, false, false, false]),
  );
  const beatPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const beatLongPressRef = useRef(false);
  const [openBeatPicker, setOpenBeatPicker] = useState<number | null>(null);

  const key     = KEYS[keyIndex];
  const pattern = PATTERNS[patternIndex];
  const displayChords = getDisplayChords(pattern, key);
  const effectiveDisplayChords = Array.from({ length: 8 }, (_, bar) => {
    const override = barOverrides[bar];
    if (override !== null) {
      const gLabel = GUITAR_OPTIONS.find((o) => o.guitar === override.guitar)?.label ?? override.guitar;
      const bLabel = BASS_OPTIONS.find((o) => o.bass === override.bass)?.label ?? override.bass;
      // ギターのルート音を抽出して比較（Am→A、Gadd9→G）
      const gRoot = gLabel.replace(/m$/, '').replace(/add9$/, '');
      return gRoot !== bLabel ? `${gLabel}/${bLabel}` : gLabel;
    }
    return displayChords[bar % displayChords.length];
  });

  const initialSampleSlots = getSampleSlots(PATTERNS[INITIAL_PATTERN_INDEX], KEYS[INITIAL_KEY_INDEX]);

  const {
    audioState, bpm, setBpm,
    humanize, toggleHumanize, enableAudio, play, stop,
    currentBar, currentStep, countBeat,
    wakeLockActive,
    wakeLockStatus,
    setGrooveSpec, setProgressionChords, setTrackMuted, setTrackPattern, setTrackVolume,
    setGtrBeatOverrides: setGtrBeatOverridesEngine,
    setGtrBeatActive: setGtrBeatActiveEngine,
  } = useAudioEngine(STYLE_PRESETS[INITIAL_STYLE], initialSampleSlots);

  const [mutedTracks, setMutedTracks] = useState<Record<string, boolean>>(
    () => Object.fromEntries(Object.keys(VISUAL).map((k) => [k, false]))
  );

  const handleToggleMute = (trackName: string) => {
    setMutedTracks((prev) => {
      const muted = !prev[trackName];
      setTrackMuted(TRACK_TO_AUDIO[trackName], muted);
      return { ...prev, [trackName]: muted };
    });
  };

  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const [trackSteps, setTrackSteps] = useState<Record<string, boolean[][]>>(
    () => Object.fromEntries(Object.keys(VISUAL).map((k) => [
      k,
      Array.from({ length: 8 }, () => VISUAL[k].map((v) => v === 1)),
    ]))
  );

  // 編集する小節（0–7）
  const [editBar, setEditBar] = useState(0);
  // 視覚的に表示する小節: 再生中は現在の小節、停止中は editBar
  const displayBar = audioState === 'playing' && currentBar >= 0 ? currentBar % 8 : editBar;

  const handleToggleStep = (trackName: string, i: number) => {
    setTrackSteps((prev) => {
      const bars = prev[trackName].map((row, b) => b === editBar ? [...row] : row);
      bars[editBar] = [...bars[editBar]];
      bars[editBar][i] = !bars[editBar][i];
      setTrackPattern(TRACK_TO_AUDIO[trackName], editBar, bars[editBar]);
      return { ...prev, [trackName]: bars };
    });
  };

  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>(
    () => Object.fromEntries(Object.keys(VISUAL).map((k) => [k, DEFAULT_VOLUMES[k] ?? 100]))
  );

  const handleToggleGtrBeatActive = (barIdx: number, beat: number) => {
    setGtrBeatActive((prev) => {
      const next = prev.map((row, b) => b === barIdx ? [...row] : row);
      next[barIdx] = [...next[barIdx]];
      next[barIdx][beat] = !next[barIdx][beat];
      return next;
    });
  };

  const handleVolumeChange = (trackName: string, value: number) => {
    setTrackVolumes((prev) => ({ ...prev, [trackName]: value }));
    setTrackVolume(TRACK_TO_AUDIO[trackName], value);
  };

  const [styleName, setStyleName] = useState<StyleName>(INITIAL_STYLE);
  const grooveSpec = STYLE_PRESETS[styleName];

  const handleStyleChange = (name: StyleName) => {
    setStyleName(name);
    setGrooveSpec(STYLE_PRESETS[name]);
  };

  const handleKeyChange = (newKeyIndex: number) => {
    setKeyIndex(newKeyIndex);
  };

  const handlePatternChange = (newPatternIndex: number) => {
    setPatternIndex(newPatternIndex);
    setIsProgressionOpen(false);
    setBarOverrides(Array(8).fill(null));
    setGtrBeatOverrides(Array(8).fill(null).map(() => Array(4).fill(null)));
  };

  useEffect(() => {
    setGtrBeatOverridesEngine(gtrBeatOverrides);
  }, [gtrBeatOverrides]);

  useEffect(() => {
    setGtrBeatActiveEngine(gtrBeatActive);
  }, [gtrBeatActive]);

  // オーディオロード完了時にデフォルト音量を適用
  useEffect(() => {
    if (audioState === 'ready') {
      Object.entries(trackVolumes).forEach(([name, vol]) => {
        setTrackVolume(TRACK_TO_AUDIO[name], vol);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState]);

  useEffect(() => {
    const currentKey = KEYS[keyIndex];
    const currentPattern = PATTERNS[patternIndex];
    const slots = Array.from({ length: 8 }, (_, bar) => {
      const override = barOverrides[bar];
      if (override !== null) return override;
      const patSlot = currentPattern.slots[bar % currentPattern.slots.length];
      return {
        guitar: patSlot.guitarSample ?? currentKey.sampleKey[patSlot.guitar],
        bass: currentKey.sampleKey[patSlot.bass],
      };
    });
    setProgressionChords(slots);
  }, [barOverrides, keyIndex, patternIndex]);

  return (
    <div className="app">
      <div className="card">
        <h1 className="card__title">OK</h1>
        <p className="card__subtitle">BackTruckMaker</p>

        {/* ---- 初期状態：音声有効化ボタン ---- */}
        {audioState === 'idle' && (
          <button className="btn-enable" onClick={enableAudio}>
            Tap to Enable Audio
          </button>
        )}

        {/* ---- ロード中 ---- */}
        {audioState === 'loading' && (
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">Loading samples…</p>
          </div>
        )}

        {/* ---- 再生コントロール ---- */}
        {(audioState === 'ready' || audioState === 'playing') && (
          <>
            {/* カウントイン表示 */}
            {audioState === 'playing' && countBeat >= 0 && (
              <div className="count-in" key={countBeat}>
                <span className="count-beat">{countBeat + 1}</span>
              </div>
            )}

            {/* Play / Stop */}
            <div className="controls">
              <button
                className="btn-play"
                onClick={play}
                disabled={audioState === 'playing'}
              >
                ▶ PLAY
              </button>
              <button
                className="btn-stop"
                onClick={stop}
                disabled={audioState === 'ready'}
              >
                ■ STOP
              </button>
            </div>


            {/* Wake Lock 状態（診断用） */}
            <div className={`wakelock-badge ${wakeLockActive ? 'wakelock-badge--on' : 'wakelock-badge--off'}`}>
              画面ロック防止: {wakeLockStatus}
            </div>

            {/* BPM コントロール */}
            <div className="bpm-section">
              <p className="progression-section-title">BPM</p>
              <div className="bpm-control">
                <button className="btn-bpm" onClick={() => setBpm(bpm - 1)}>−</button>
                <div className="bpm-display">
                  <span className="bpm-value">{bpm}</span>
                </div>
                <button className="btn-bpm" onClick={() => setBpm(bpm + 1)}>+</button>
                <input
                  className="bpm-slider"
                  type="range"
                  min={BPM_MIN}
                  max={BPM_MAX}
                  step={1}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  style={
                    { '--bpm-pct': ((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN) * 100).toFixed(1) } as React.CSSProperties
                  }
                />
              </div>
            </div>

            {/* PROGRESSION セクション */}
            <div className="progression-section">

              <p className="progression-section-title">PROGRESSION</p>

              {/* Key プルダウン */}
              <div className="prog-item">
                <span className="prog-item-label">Key</span>
                <div className="key-select-wrapper">
                  <button
                    className="key-current"
                    onClick={() => setIsKeyOpen((v) => !v)}
                  >
                    <span className="key-current-label">{key.label}</span>
                    <span className="key-current-arrow">{isKeyOpen ? '▴' : '▾'}</span>
                  </button>
                  {isKeyOpen && (
                    <>
                      <div className="key-backdrop" onClick={() => setIsKeyOpen(false)} />
                      <div className="key-options">
                        {KEYS.map((k, i) => (
                          <button
                            key={k.id}
                            className={`key-option ${keyIndex === i ? 'key-option--active' : ''} ${!k.available ? 'key-option--unavailable' : ''}`}
                            onClick={() => {
                              if (!k.available) return;
                              handleKeyChange(i);
                              setIsKeyOpen(false);
                            }}
                          >
                            {k.label}
                            {!k.available && <span className="key-option-note"> (要音源)</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <hr className="prog-divider" />

              {/* Progression プルダウン */}
              <div className="prog-item">
                <span className="prog-item-label">Preset Progression</span>
                <div className="progression-select-wrapper">
                  <button
                    className="progression-current"
                    onClick={() => setIsProgressionOpen((v) => !v)}
                  >
                    <span className="prog-current-label">
                      {displayChords.length > 4
                        ? displayChords.slice(0, 4).join(' - ') + ' …'
                        : displayChords.join(' - ')}
                    </span>
                    <span className="prog-current-arrow">{isProgressionOpen ? '▴' : '▾'}</span>
                  </button>
                  {isProgressionOpen && (
                    <>
                      <div className="progression-backdrop" onClick={() => setIsProgressionOpen(false)} />
                      <div className="progression-options">
                        {PATTERNS.map((p, i) => {
                          const chords = getDisplayChords(p, key);
                          return (
                            <button
                              key={p.id}
                              className={`progression-option ${patternIndex === i ? 'progression-option--active' : ''}`}
                              onClick={() => handlePatternChange(i)}
                            >
                              {chords.join(' - ')}
                              <span className="progression-option-degrees">({getDegreeNumbers(p)})</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 8小節コード表示（現在の小節をハイライト） */}
              <div className="changes-section">
                <div className="changes-section-header">
                  <p className="prog-item-label">Loop Changes</p>
                  {barOverrides.some((b) => b !== null) && (
                    <button
                      className="btn-reset-changes"
                      onClick={() => { setBarOverrides(Array(8).fill(null)); setOpenBarIndex(null); }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="chord-display">
                  {Array.from({ length: 8 }, (_, bar) => {
                    const isCurrentBar = audioState === 'playing' && bar === currentBar % 8;
                    const hasOverride = barOverrides[bar] !== null;
                    const isOpen = openBarIndex === bar;
                    const patSlot = pattern.slots[bar % pattern.slots.length];
                    const defaultGuitarKey = patSlot.guitarSample ?? key.sampleKey[patSlot.guitar];
                    const defaultBassKey   = key.sampleKey[patSlot.bass];
                    const normDefaultBass  = normBassKey(defaultBassKey);
                    const activeGuitarKey  = barOverrides[bar]?.guitar ?? defaultGuitarKey;
                    const activeBassKey    = barOverrides[bar]?.bass   ?? defaultBassKey;
                    const initialGuitarIdx = Math.max(0, GUITAR_OPTIONS.findIndex((o) => o.guitar === activeGuitarKey));
                    const initialBassIdx   = Math.max(0, BASS_OPTIONS.findIndex((o) => o.bass === normBassKey(activeBassKey)));
                    return (
                      <div key={bar} className="chord-chip-wrapper">
                        <button
                          className={[
                            'chord-chip',
                            isCurrentBar ? 'chord-chip--current' : '',
                            hasOverride ? 'chord-chip--overridden' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => setOpenBarIndex((v) => (v === bar ? null : bar))}
                        >
                          {effectiveDisplayChords[bar]}
                        </button>
                        {isOpen && (
                          <>
                            <div
                              className="chord-chip-backdrop"
                              onClick={() => setOpenBarIndex(null)}
                            />
                            <DualWheelPicker
                              initialGuitarIdx={initialGuitarIdx}
                              initialBassIdx={initialBassIdx}
                              align={bar % 4 <= 1 ? 'left' : 'right'}
                              onSelect={(gIdx, bIdx) => {
                                const gOpt = GUITAR_OPTIONS[gIdx];
                                const bOpt = BASS_OPTIONS[bIdx];
                                setBarOverrides((prev) => {
                                  const next = [...prev];
                                  const isDefault =
                                    gOpt.guitar === defaultGuitarKey &&
                                    bOpt.bass === normDefaultBass;
                                  next[bar] = isDefault
                                    ? null
                                    : { guitar: gOpt.guitar, bass: bOpt.bass };
                                  return next;
                                });
                              }}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* パターン表示（密度を opacity で可視化） */}
            <div className="sequencer-section">
              <p className="progression-section-title">Sequencer</p>
            <div className="pattern-grid">
              {Object.entries(VISUAL).map(([name]) => {
                const isExpanded = expandedTrack === name;
                const steps = trackSteps[name][displayBar];
                const volume = trackVolumes[name];
                return (
                  <React.Fragment key={name}>
                    <div
                      className="track-row track-row--clickable"
                      onClick={() => setExpandedTrack((v) => (v === name ? null : name))}
                    >
                      <span
                        className={`track-label${mutedTracks[name] ? '' : ' track-label--active'}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleMute(name); }}
                      >
                        {name}
                      </span>
                      {name === 'CR_GTR' ? (
                        <div className="step-cells">
                          {gtrBeatActive[displayBar].map((active, beatIdx) => {
                            const isPlaying = audioState === 'playing' && currentStep >= 0 && Math.floor(currentStep / 4) === beatIdx;
                            return (
                              <div
                                key={beatIdx}
                                className={[
                                  'cell',
                                  active ? 'cell--active' : '',
                                  isPlaying ? 'cell--playing' : '',
                                ].filter(Boolean).join(' ')}
                                style={mutedTracks[name] ? { opacity: 0.2 } : {}}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="step-cells step-cells--editable">
                          {steps.map((active, i) => {
                            const opacity = cellOpacity(name, active ? 1 : 0, grooveSpec);
                            return (
                              <div
                                key={i}
                                className={cellClass(name, i, active ? 1 : 0)}
                                style={{
                                  ...(opacity < 1 ? { opacity } : {}),
                                  ...(mutedTracks[name] ? { opacity: 0.2 } : {}),
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <>
                        <div className="bar-selector">
                          {Array.from({ length: 8 }, (_, b) => (
                            <button
                              key={b}
                              className={[
                                'bar-btn',
                                editBar === b ? 'bar-btn--active' : '',
                                audioState === 'playing' && currentBar % 8 === b ? 'bar-btn--playing' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={(e) => { e.stopPropagation(); setEditBar(b); setOpenBeatPicker(null); }}
                            >
                              {b + 1}
                            </button>
                          ))}
                        </div>
                        {name === 'CR_GTR' && (
                          <div className="beat-chord-row">
                            {([0, 1, 2, 3] as const).map((beat) => {
                              const override = gtrBeatOverrides[editBar][beat];
                              const patSlot = pattern.slots[editBar % pattern.slots.length];
                              const defGtrKey = barOverrides[editBar]?.guitar
                                ?? (patSlot.guitarSample ?? key.sampleKey[patSlot.guitar]);
                              const currentGtrKey = override?.guitar ?? defGtrKey;
                              const label = GUITAR_OPTIONS.find((o) => o.guitar === currentGtrKey)?.label ?? currentGtrKey;
                              const initialIdx = Math.max(0, GUITAR_OPTIONS.findIndex((o) => o.guitar === currentGtrKey));
                              const isOpen = openBeatPicker === beat;
                              return (
                                <div key={beat} className="beat-chip-wrap">
                                  <button
                                    className={[
                                      'beat-chord-chip',
                                      gtrBeatActive[editBar][beat] ? 'beat-chord-chip--on' : '',
                                    ].filter(Boolean).join(' ')}
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      beatLongPressRef.current = false;
                                      clearTimeout(beatPressTimerRef.current);
                                      beatPressTimerRef.current = setTimeout(() => {
                                        beatLongPressRef.current = true;
                                        setOpenBeatPicker((v) => (v === beat ? null : beat));
                                      }, 400);
                                    }}
                                    onPointerUp={(e) => {
                                      e.stopPropagation();
                                      clearTimeout(beatPressTimerRef.current);
                                      if (!beatLongPressRef.current) {
                                        handleToggleGtrBeatActive(editBar, beat);
                                      }
                                    }}
                                    onPointerLeave={() => { clearTimeout(beatPressTimerRef.current); beatLongPressRef.current = false; }}
                                    onPointerCancel={() => { clearTimeout(beatPressTimerRef.current); beatLongPressRef.current = false; }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {label}
                                  </button>
                                  {isOpen && (
                                    <>
                                      <div className="chord-chip-backdrop" onClick={() => setOpenBeatPicker(null)} />
                                      <GuitarWheelPicker
                                        initialIdx={initialIdx}
                                        align={beat < 2 ? 'left' : 'right'}
                                        onSelect={(idx) => {
                                          const gOpt = GUITAR_OPTIONS[idx];
                                          const isDefault = gOpt.guitar === defGtrKey;
                                          setGtrBeatOverrides((prev) => {
                                            const next = prev.map((row, b) => b === editBar ? [...row] : row);
                                            next[editBar][beat] = isDefault ? null : { guitar: gOpt.guitar };
                                            return next;
                                          });
                                        }}
                                      />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {name !== 'CR_GTR' && (
                        <div className="step-editor">
                          {trackSteps[name][editBar].map((on, i) => (
                            <button
                              key={i}
                              className={[
                                'step-btn',
                                on ? 'step-btn--on' : '',
                                audioState === 'playing' && i === currentStep ? 'step-btn--playing' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={(e) => { e.stopPropagation(); handleToggleStep(name, i); }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        )}
                        <div className="track-volume-row">
                          <span className="track-volume-label">VOL</span>
                          <input
                            className="track-volume-slider"
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={volume}
                            onChange={(e) => handleVolumeChange(name, Number(e.target.value))}
                            style={{ '--vol-pct': volume } as React.CSSProperties}
                          />
                          <span className="track-volume-value">{volume}</span>
                        </div>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            </div>

            {/* Humanize トグル */}
            <button
              className={`btn-humanize ${humanize ? 'btn-humanize--on' : ''}`}
              onClick={toggleHumanize}
            >
              <span className="humanize-dot" />
              Humanize
              <span className="humanize-badge">{humanize ? 'ON' : 'OFF'}</span>
              {humanize && grooveSpec.humanizeMs > 0 && (
                <span className="humanize-ms">±{grooveSpec.humanizeMs}ms</span>
              )}
            </button>

            {/* STYLE セクション */}
            <div className="style-section">
              <p className="progression-section-title">Style</p>
              <div className="style-buttons">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    className={`btn-style ${styleName === s ? 'btn-style--active' : ''}`}
                    onClick={() => handleStyleChange(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
