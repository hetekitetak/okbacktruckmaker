# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install --cache /tmp/npm-cache  # ~/.npm はパーミッションエラーのため必須オプション
npm run dev          # localhost:5173
npm run dev:host     # LAN 公開（iPhone Safari 確認用）
npm run build        # tsc + vite build → dist/
npm run preview      # ビルド結果をローカル確認
```

テストフレームワークは未導入。

## アーキテクチャ

### データフロー

```
grooveSpec.ts   progressions.ts
     ↓                ↓
useAudioEngine.ts  (カスタムフック)
     ↓
App.tsx  (UI + state)
```

### `src/grooveSpec.ts`
スタイル別グルーブパラメータを定義。`GrooveSpec` インタフェース（`humanizeMs` / `kickDensity` / `hatDensity` / `guitarSkip`）と `STYLE_PRESETS`（Tight/Rock/Funk/Jazz/Ballad/Latin）を export。

### `src/progressions.ts`
コード進行プリセット（P1: Am-G-F-G、P2: Am-F-C-G）。`ChordName = 'Am' | 'G' | 'F' | 'C'` が他モジュールとの接点。

### `src/hooks/useAudioEngine.ts`
Tone.js の全スケジューリングロジックを担う中心モジュール。

- **再生中でも即時反映させるパラメータ**は `useRef` で保持し、Tone.js コールバック内から参照する（`humanizeRef` / `soloSpaceRef` / `progressionRef` / `grooveSpecRef`）。シーケンスを再生成しない。
- **ドラム**：`Tone.Sequence` + `'16n'` subdivision で 16ステップループ。kick/hat は `kickDensity`/`hatDensity` で確率的発音。
- **ギター/ベース**：`Tone.Sequence` + `'1m'` subdivision で小節単位イベント。`BAR_EVENTS = [0..7]` を流し、`bar % 4` でコードを決定。
- **カウントイン**：PLAY 押下時に 1 小節分（4クリック）を `Tone.Transport.scheduleOnce` で先行スケジュール。シーケンスは `'1m'` 後から開始。
- **`Tone.Sequence<any>` + `as any[]`**：`SequenceEventDescription<T>` が null を型として許容しないため。ランタイムは null をスキップするので動作上は問題なし。

### `src/App.tsx`
状態管理は `useAudioEngine` に委譲し、UI レンダリングに専念。`VISUAL` 定数（16ステップの表示用データ）と `cellOpacity` 関数でパターングリッドに密度をフィードバック。

## サンプルファイルの注意点

`public/samples/` 内のファイル名には typo があるが **実ファイルとして存在する**。変更不可。

| キー         | ファイル名              | 備考                   |
| ------------ | ----------------------- | ---------------------- |
| `guitar_Am`  | `GuitarAminar01.wav`    | Aminar (Aminor の typo) |
| `bass_G`     | `BaaG01.wav`            | Baa (Bass の typo)     |

## iOS Safari 対応

- `Tone.start()` はユーザーのタップイベントのコールスタック内で呼ぶ必要がある（`enableAudio` 関数）。
- サンプルは `Tone.Players` + `Tone.loaded()` で一括プリロード。
- `audioState`: `'idle'` → `'loading'` → `'ready'` ⇔ `'playing'` の 4状態。
