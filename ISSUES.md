# BackTruck — 課題管理表

## 凡例

| ステータス | 意味 |
|-----------|------|
| 🔴 未着手 | 未対応 |
| 🟡 調査中 | 原因特定済み・対応検討中 |
| 🟢 完了   | 対応済み |
| ⏸️ 保留   | 意図的に後回し |

---

## 課題一覧

| # | タイトル | 優先度 | ステータス | 詳細 | 対応方針 |
|---|---------|--------|-----------|------|---------|
| 1 | **画面スリープ防止（Wake Lock）** | 高 | 🟢 完了 | Wake Lock API は HTTPS 必須。Cloudflare Pages（HTTPS）でホスト後、iOS Safari で 10 分以上スリープしないことを確認。 | 対応済み。 |
| 2 | **診断バッジの削除** | 中 | 🟢 完了 | Wake Lock 調査のため UI に追加した診断バッジ（`wakelock-badge`）が残っていた。 | Wake Lock 動作確認後、`App.tsx` のバッジ要素・`useAudioEngine` の戻り値・`App.css` の `.wakelock-badge` スタイルを削除済み。 |
| 3 | **`@vitejs/plugin-basic-ssl` の整理** | 低 | 🟢 完了 | HTTPS 検証のためインストールしたが現在 `vite.config.ts` では未使用。 | `npm uninstall` 済み。`package.json` から削除完了。 |

---

## 完了済み

| # | タイトル | 完了日 | 備考 |
|---|---------|--------|------|
| — | Cymbal / Open Hi-Hat 音源追加 | 2026-02-28 | `CYMBAL/DrumSymbal.wav`・`HAT/DrumHihat_open.wav` をロードに追加 |
| — | 各トラックのデフォルト音量設定 | 2026-02-28 | Cymbal:75 / Drum:80 / Guitar・Bass:85 |
| — | CR_GTR を 4 分音符制御に変更 | 2026-02-28 | 16 ステップ編集を廃止、beat-chord ボタンで管理 |
| — | CR_GTR ビートの活性/非活性 | 2026-02-28 | タップでトグル、ロングプレスでコード変更 |
