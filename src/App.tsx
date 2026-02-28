import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { useAudioEngine, BPM_MIN, BPM_MAX } from './hooks/useAudioEngine';
import { PATTERNS, KEYS, getDisplayChords, getSampleSlots, getDegreeNumbers } from './progressions';
import { STYLES, STYLE_PRESETS, type StyleName, type GrooveSpec } from './grooveSpec';

// ----------------------------------------------------------------
// 多言語サポート
// ----------------------------------------------------------------
export type LangCode = 'en' | 'ja' | 'zh-Hans' | 'zh-Hant' | 'ko';

export const LANG_OPTIONS: { code: LangCode; label: string }[] = [
  { code: 'en',      label: 'EN' },
  { code: 'ja',      label: '日本語' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ko',      label: '한국어' },
];

interface HelpItem   { heading: string; body: string }
interface HelpSection { title: string; items: HelpItem[] }
type HelpContent = Record<string, Record<LangCode, HelpSection>>;

const HELP_CONTENT: HelpContent = {
  bpm: {
    en: {
      title: 'How to Use BPM',
      items: [
        { heading: '− / + buttons', body: 'Decrease or increase the BPM by 1 per tap.' },
        { heading: 'Slider', body: 'Drag left or right to set the BPM. Range: 60–200 BPM.' },
      ],
    },
    ja: {
      title: 'BPM の使い方',
      items: [
        { heading: '−/+ ボタン', body: 'タップするたびに BPM を 1 下げ/上げします。' },
        { heading: 'スライダー', body: '左右にドラッグして BPM を設定します。範囲：60〜200 BPM。' },
      ],
    },
    'zh-Hans': {
      title: 'BPM 使用方法',
      items: [
        { heading: '−/+ 按钮', body: '每次点击将 BPM 减少或增加 1。' },
        { heading: '滑块', body: '向左/右拖动设置 BPM。范围：60〜200 BPM。' },
      ],
    },
    'zh-Hant': {
      title: 'BPM 使用方法',
      items: [
        { heading: '−/+ 按鈕', body: '每次點擊將 BPM 減少或增加 1。' },
        { heading: '滑桿', body: '向左/右拖動設定 BPM。範圍：60〜200 BPM。' },
      ],
    },
    ko: {
      title: 'BPM 사용법',
      items: [
        { heading: '−/+ 버튼', body: '탭할 때마다 BPM을 1씩 줄이거나 늘립니다.' },
        { heading: '슬라이더', body: '좌우로 드래그하여 BPM을 설정합니다. 범위: 60〜200 BPM.' },
      ],
    },
  },
  progression: {
    en: {
      title: 'How to Use Progression',
      items: [
        { heading: 'Key', body: 'Select the tonal center. All chord and bass samples change to match the selected key.' },
        { heading: 'Preset Progression', body: 'Choose a chord pattern (e.g., Am–G–F–G). The pattern loops every 4 bars.' },
        { heading: 'Loop Changes (bar chips)', body: 'Tap any of the 8 bar chips to open a wheel picker and customize the guitar/bass chord for that bar. The current bar is highlighted in orange during playback.' },
        { heading: 'Reset', body: 'Appears when any bar has been customized. Tap to restore all bars to the preset pattern.' },
      ],
    },
    ja: {
      title: 'PROGRESSION の使い方',
      items: [
        { heading: 'Key', body: '調のルートを選択します。ギター・ベースのサンプルがすべて対応キーに変わります。' },
        { heading: 'Preset Progression', body: 'コード進行のプリセットを選択します（例：Am–G–F–G）。4小節ループで繰り返されます。' },
        { heading: 'Loop Changes（コードチップ）', body: '8つの小節チップをタップするとホイールピッカーが開き、その小節のギター/ベースコードを変更できます。再生中は現在の小節がオレンジでハイライトされます。' },
        { heading: 'Reset', body: 'カスタムが適用された小節があると表示されます。タップでプリセットに戻します。' },
      ],
    },
    'zh-Hans': {
      title: 'PROGRESSION 使用方法',
      items: [
        { heading: 'Key（调）', body: '选择音调中心。所有和弦及贝斯采样将随之变更。' },
        { heading: 'Preset Progression（预设进行）', body: '选择和弦进行预设（例：Am–G–F–G）。每4小节循环。' },
        { heading: 'Loop Changes（小节芯片）', body: '点击8个小节芯片中的任意一个，打开滚轮选择器，自定义该小节的吉他/贝斯和弦。播放时当前小节以橙色高亮显示。' },
        { heading: 'Reset', body: '有自定义小节时显示。点击可恢复为预设。' },
      ],
    },
    'zh-Hant': {
      title: 'PROGRESSION 使用方法',
      items: [
        { heading: 'Key（調）', body: '選擇音調中心。所有和弦及低音採樣將隨之更改。' },
        { heading: 'Preset Progression（預設進行）', body: '選擇和弦進行預設（例：Am–G–F–G）。每4小節循環。' },
        { heading: 'Loop Changes（小節芯片）', body: '點擊8個小節芯片中的任一個，開啟滾輪選擇器，自訂該小節的吉他/低音和弦。播放時當前小節以橙色高亮顯示。' },
        { heading: 'Reset', body: '有自訂小節時顯示。點擊可恢復為預設。' },
      ],
    },
    ko: {
      title: 'PROGRESSION 사용법',
      items: [
        { heading: 'Key', body: '음조 중심을 선택합니다. 모든 코드 및 베이스 샘플이 선택한 키로 변경됩니다.' },
        { heading: 'Preset Progression', body: '코드 진행 프리셋을 선택합니다 (예: Am–G–F–G). 4마디마다 반복됩니다.' },
        { heading: 'Loop Changes（마디 칩）', body: '8개의 마디 칩 중 하나를 탭하면 휠 선택기가 열려 해당 마디의 기타/베이스 코드를 변경할 수 있습니다. 재생 중에는 현재 마디가 주황색으로 표시됩니다.' },
        { heading: 'Reset', body: '커스텀 마디가 있을 때 표시됩니다. 탭하면 프리셋으로 초기화됩니다.' },
      ],
    },
  },
  humanize: {
    en: {
      title: 'How to Use Humanize',
      items: [
        { heading: 'Tap to toggle', body: 'Switch Humanize ON or OFF. When ON, note timing is randomly shifted for a more natural, human feel.' },
        { heading: '±N ms display', body: 'Shown when ON. Indicates the maximum random timing offset applied to each note. The amount depends on the current Style preset.' },
      ],
    },
    ja: {
      title: 'Humanize の使い方',
      items: [
        { heading: 'タップでオン/オフ', body: 'Humanize を ON / OFF で切り替えます。ON にすると音符のタイミングがランダムにずれ、より自然な演奏感になります。' },
        { heading: '±N ms 表示', body: 'ON のときに表示されます。各音符に適用される最大のランダムタイミングずれ量です。数値は現在のスタイルプリセットによって異なります。' },
      ],
    },
    'zh-Hans': {
      title: 'Humanize 使用方法',
      items: [
        { heading: '点击切换', body: '开启或关闭 Humanize。开启时，音符时间将随机偏移，使演奏更具人性化。' },
        { heading: '±N ms 显示', body: '开启时显示。表示每个音符所应用的最大随机时间偏移量。具体数值取决于当前的 Style 预设。' },
      ],
    },
    'zh-Hant': {
      title: 'Humanize 使用方法',
      items: [
        { heading: '點擊切換', body: '開啟或關閉 Humanize。開啟時，音符時間將隨機偏移，使演奏更具人性化。' },
        { heading: '±N ms 顯示', body: '開啟時顯示。表示每個音符所應用的最大隨機時間偏移量。具體數值取決於當前的 Style 預設。' },
      ],
    },
    ko: {
      title: 'Humanize 사용법',
      items: [
        { heading: '탭하여 전환', body: 'Humanize를 ON / OFF로 전환합니다. ON 상태에서는 음표 타이밍이 무작위로 이동하여 더 자연스러운 연주감을 만듭니다.' },
        { heading: '±N ms 표시', body: 'ON일 때 표시됩니다. 각 음표에 적용되는 최대 무작위 타이밍 오프셋입니다. 정확한 값은 현재 Style 프리셋에 따라 다릅니다.' },
      ],
    },
  },
  style: {
    en: {
      title: 'How to Use Style',
      items: [
        { heading: 'Style buttons (Tight / Rock / Funk / Jazz / Ballad / Latin)', body: 'Tap to select a groove style. Each style sets kick density, hat density, guitar skip probability, and humanize amount together.' },
        { heading: 'Sequencer opacity', body: 'Step cells in the Sequencer reflect each track\'s density. Dimmer cells mean a lower probability of sounding on that step.' },
      ],
    },
    ja: {
      title: 'Style の使い方',
      items: [
        { heading: 'スタイルボタン（Tight / Rock / Funk / Jazz / Ballad / Latin）', body: 'タップしてグルーブスタイルを選択します。キック密度・ハット密度・ギタースキップ確率・ヒューマナイズ量がまとめて切り替わります。' },
        { heading: 'シーケンサーの透明度', body: 'シーケンサーのセルが各トラックの密度を反映します。薄いセルほどそのステップで発音される確率が低くなります。' },
      ],
    },
    'zh-Hans': {
      title: 'Style 使用方法',
      items: [
        { heading: '风格按钮（Tight / Rock / Funk / Jazz / Ballad / Latin）', body: '点击选择律动风格。每种风格会一并设置底鼓密度、踩镲密度、吉他跳过概率和时间偏移量。' },
        { heading: '音序器透明度', body: '音序器中的步骤格子反映各音轨的密度。格子越淡，该步骤发声的概率越低。' },
      ],
    },
    'zh-Hant': {
      title: 'Style 使用方法',
      items: [
        { heading: '風格按鈕（Tight / Rock / Funk / Jazz / Ballad / Latin）', body: '點擊選擇律動風格。每種風格會一併設定大鼓密度、踩鈸密度、吉他跳過概率和時間偏移量。' },
        { heading: '音序器透明度', body: '音序器中的步驟格子反映各音軌的密度。格子越淡，該步驟發聲的概率越低。' },
      ],
    },
    ko: {
      title: 'Style 사용법',
      items: [
        { heading: '스타일 버튼 (Tight / Rock / Funk / Jazz / Ballad / Latin)', body: '탭하여 그루브 스타일을 선택합니다. 각 스타일은 킥 밀도, 하이햇 밀도, 기타 스킵 확률, 휴머나이즈 양을 함께 설정합니다.' },
        { heading: '시퀀서 투명도', body: '시퀀서의 스텝 셀은 각 트랙의 밀도를 반영합니다. 셀이 흐릴수록 해당 스텝에서 소리날 확률이 낮습니다.' },
      ],
    },
  },
  sequencer: {
    en: {
      title: 'How to Use the Sequencer',
      items: [
        { heading: 'Tap a track name', body: 'Toggle mute / unmute. Orange = active, gray = muted.' },
        { heading: 'Tap a track row', body: 'Expand to enter edit mode. Tap again to collapse.' },
        { heading: 'Bar selector (1–8)', body: 'Select the bar to edit. During playback, the current bar is highlighted in orange.' },
        { heading: 'Step buttons (1–16)', body: 'Tap to toggle ON / OFF. Sound plays on ON steps.' },
        { heading: 'CR_GTR beat buttons (1–4)', body: 'Tap to toggle active (orange) / inactive (gray). Long press (0.4 s) to change the chord.' },
        { heading: 'VOL slider', body: 'Adjust each track\'s volume from 0 to 100.' },
      ],
    },
    ja: {
      title: 'Sequencer の使い方',
      items: [
        { heading: 'トラック名をタップ', body: 'ミュート／解除を切り替えます。オレンジ = 有効、グレー = ミュート。' },
        { heading: 'トラック行をタップ', body: '展開して詳細編集モードを開きます。もう一度タップで閉じます。' },
        { heading: '小節セレクター（1〜8）', body: '編集したい小節を選択します。再生中は現在の小節がオレンジ枠でハイライトされます。' },
        { heading: 'ステップボタン（1〜16）', body: 'タップで ON / OFF を切り替えます。ON のステップで音が鳴ります。' },
        { heading: 'CR_GTR ビートボタン（1〜4）', body: 'タップで活性（オレンジ）/ 非活性（グレー）を切り替えます。ロングプレス（0.4秒）でコードを変更できます。' },
        { heading: 'VOL スライダー', body: 'トラックごとの音量を 0〜100 で調整します。' },
      ],
    },
    'zh-Hans': {
      title: '音序器使用方法',
      items: [
        { heading: '点击音轨名称', body: '切换静音／取消静音。橙色 = 启用，灰色 = 静音。' },
        { heading: '点击音轨行', body: '展开进入详细编辑模式。再次点击可关闭。' },
        { heading: '小节选择器（1〜8）', body: '选择要编辑的小节。播放时当前小节以橙色框高亮显示。' },
        { heading: '步骤按钮（1〜16）', body: '点击切换 ON／OFF。ON 状态的步骤会发声。' },
        { heading: 'CR_GTR 拍点按钮（1〜4）', body: '点击切换启用（橙色）／停用（灰色）。长按（0.4秒）可更改和弦。' },
        { heading: 'VOL 滑块', body: '调整各音轨音量（0〜100）。' },
      ],
    },
    'zh-Hant': {
      title: '音序器使用方法',
      items: [
        { heading: '點擊音軌名稱', body: '切換靜音／取消靜音。橙色 = 啟用，灰色 = 靜音。' },
        { heading: '點擊音軌行', body: '展開進入詳細編輯模式。再次點擊可關閉。' },
        { heading: '小節選擇器（1〜8）', body: '選擇要編輯的小節。播放時當前小節以橙色框高亮顯示。' },
        { heading: '步驟按鈕（1〜16）', body: '點擊切換 ON／OFF。ON 狀態的步驟會發聲。' },
        { heading: 'CR_GTR 拍點按鈕（1〜4）', body: '點擊切換啟用（橙色）／停用（灰色）。長按（0.4秒）可更改和弦。' },
        { heading: 'VOL 滑桿', body: '調整各音軌音量（0〜100）。' },
      ],
    },
    ko: {
      title: '시퀀서 사용법',
      items: [
        { heading: '트랙 이름 탭', body: '음소거 / 해제를 전환합니다. 주황색 = 활성, 회색 = 음소거.' },
        { heading: '트랙 행 탭', body: '확장하여 상세 편집 모드로 진입합니다. 다시 탭하면 닫힙니다.' },
        { heading: '마디 선택기（1〜8）', body: '편집할 마디를 선택합니다. 재생 중에는 현재 마디가 주황색 테두리로 표시됩니다.' },
        { heading: '스텝 버튼（1〜16）', body: '탭하여 ON / OFF를 전환합니다. ON 상태의 스텝에서 소리가 납니다.' },
        { heading: 'CR_GTR 비트 버튼（1〜4）', body: '탭하여 활성(주황색) / 비활성(회색)을 전환합니다. 길게 누르면(0.4초) 코드를 변경할 수 있습니다.' },
        { heading: 'VOL 슬라이더', body: '각 트랙의 음량을 0〜100으로 조절합니다.' },
      ],
    },
  },
};

// ----------------------------------------------------------------
// HelpModal コンポーネント
// ----------------------------------------------------------------
function HelpModal({ sectionKey, lang, onClose }: { sectionKey: string; lang: LangCode; onClose: () => void }) {
  const content = HELP_CONTENT[sectionKey]?.[lang];
  if (!content) return null;
  return (
    <>
      <div className="help-backdrop" onClick={onClose} />
      <div className="help-modal">
        <div className="help-modal__header">
          <span className="help-modal__title">{content.title}</span>
          <button className="help-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="help-modal__body">
          {content.items.map((item, i) => (
            <div key={i} className="help-modal__item">
              <p className="help-modal__heading">{item.heading}</p>
              <p className="help-modal__text">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

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

  const [lang, setLang] = useState<LangCode>('en');
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const closeHelp = useCallback(() => setOpenHelp(null), []);

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
        <div className="lang-select-wrapper">
          <select
            className="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>{o.label}</option>
            ))}
          </select>
        </div>
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



            {/* BPM コントロール */}
            <div className="bpm-section">
              <div className="section-title-row">
                <p className="progression-section-title">BPM</p>
                <button className="btn-help" onClick={() => setOpenHelp('bpm')}>?</button>
              </div>
              {openHelp === 'bpm' && <HelpModal sectionKey="bpm" lang={lang} onClose={closeHelp} />}
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
              <div className="section-title-row">
                <p className="progression-section-title">PROGRESSION</p>
                <button className="btn-help" onClick={() => setOpenHelp('progression')}>?</button>
              </div>
              {openHelp === 'progression' && <HelpModal sectionKey="progression" lang={lang} onClose={closeHelp} />}

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
              <div className="section-title-row">
                <p className="progression-section-title">Sequencer</p>
                <button className="btn-help" onClick={() => setOpenHelp('sequencer')}>?</button>
              </div>
              {openHelp === 'sequencer' && <HelpModal sectionKey="sequencer" lang={lang} onClose={closeHelp} />}
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

            {/* Humanize セクション */}
            <div className="humanize-section">
              <div className="section-title-row">
                <p className="progression-section-title">Humanize</p>
                <button className="btn-help" onClick={() => setOpenHelp('humanize')}>?</button>
              </div>
              {openHelp === 'humanize' && <HelpModal sectionKey="humanize" lang={lang} onClose={closeHelp} />}
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
            </div>

            {/* STYLE セクション */}
            <div className="style-section">
              <div className="section-title-row">
                <p className="progression-section-title">Style</p>
                <button className="btn-help" onClick={() => setOpenHelp('style')}>?</button>
              </div>
              {openHelp === 'style' && <HelpModal sectionKey="style" lang={lang} onClose={closeHelp} />}
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
