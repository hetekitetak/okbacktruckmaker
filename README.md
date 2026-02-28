# BackTruck

iPhone / iPad Safari で動作する、Tone.js ベースのバッキングトラック Web アプリです。

## 必要なサンプルファイル

`public/samples/` に以下のファイルを置いてください（すでに配置済みです）:

| ファイル名            | 役割                      |
| --------------------- | ------------------------- |
| DrumKick01.wav        | キック                    |
| DrumSnare01.wav       | スネア                    |
| DrumHihat01.wav       | ハイハット                |
| GuitarAminar01.wav    | ギター (Am) ※ファイル名typo |
| GuitarGmajor01.wav    | ギター (G)                |
| GuitarFmajor01.wav    | ギター (F)                |
| GuitarCmajor01.wav    | ギター (C)                |
| BassAminor01.wav      | ベース (Am)               |
| BaaG01.wav            | ベース (G) ※ファイル名typo |
| BassF01.wav           | ベース (F)                |
| BassC01.wav           | ベース (C)                |

---

## セットアップ

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動（PC ブラウザ確認用）
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

---

## iPhone / iPad Safari で確認する

PC と iPhone が **同じ Wi-Fi** に接続している必要があります。

```bash
# LAN アドレスで開発サーバーを公開
npm run dev:host
```

ターミナルに表示される `Network: http://192.168.x.x:5173` の URL を Safari で開いてください。

> **ヒント**: iPhone から QR コードで開くと便利です。
> macOS であれば `qrencode -t ANSI 'http://192.168.x.x:5173'` で表示できます。

---

## 使い方

1. **Tap to Enable Audio** をタップ → iOS の AudioContext を起動してサンプルをプリロード
2. ローディングが終わったら **▶ PLAY** でループ再生開始
3. **■ STOP** で停止

---

## パターン (120 BPM / 4/4拍子)

```
       拍1  拍2  拍3  拍4
KICK:   ●    .    ●    .
SNARE:  .    ●    .    ●
HAT:    ♩ ♩  ♩ ♩  ♩ ♩  ♩ ♩  (8分音符)
BASS A: ●    .    .    .
GTR Am: ●    .    .    .
```

---

## ビルド（本番）

```bash
npm run build
# dist/ に静的ファイルが生成されます
npm run preview   # ローカルでビルド結果を確認
```

---

## 技術スタック

- [Vite](https://vitejs.dev/) 5 + [React](https://react.dev/) 18 + TypeScript
- [Tone.js](https://tonejs.github.io/) 14（Web Audio API ラッパー）

## iOS 音声制限への対応

- `Tone.start()` をユーザーのタップイベントハンドラ内で呼び出し、AudioContext を "running" 状態へ移行
- サンプルは `Tone.Players` + `Tone.loaded()` で一括プリロード
- スケジューリングは `Tone.Sequence` + `Tone.Transport` を使用（AudioContext タイムラインで精度保証）
