# ムダなび MVP

見積・請求・残業のムダを「仕事の流れ」から見える化する15問診断アプリです。

## 使い方

ローカルで確認する場合は、依存関係を入れてViteを起動します。

```bash
npm install
npm run dev
```

React、Recharts、lucide-react はViteでビルドして配信します。

## Vercel配布

このアプリはViteでビルドしてVercelへ公開します。

### GitHub連携で公開する場合

このリポジトリはVercel連携済みなので、GitHubへpushすると自動デプロイされます。

- Build Command: `npm run build`
- Output Directory: `dist`

### Vercel CLIで公開する場合

```bash
npx vercel
```

本番公開する場合は、初回設定後に以下を実行します。

```bash
npx vercel --prod
```

## 構成

- `index.html`: アプリのエントリ
- `package.json`: Viteビルド設定
- `src/App.js`: 診断フォーム、集計、結果表示、CTA
- `src/config.js`: Google Sheets送信先URLとLINE CTA URL
- `src/styles.css`: レスポンシブUI
- `assets/mudanavi-reference.png`: 参考ビジュアル
- `google-sheets-webapp.gs`: Googleスプレッドシート保存用Apps Script
- `vercel.json`: Vercel公開用設定

## 保存仕様

診断結果表示時に、基本情報と診断結果をセットで保存します。

- 保存キー: `mudanaviSubmissions`
- ローカル保存: ブラウザ内の `localStorage`
- Google Sheets保存: `src/config.js` の `GOOGLE_SHEETS_WEB_APP_URL` にApps ScriptのWebアプリURLを設定
- 保存項目: 回答日時、会社名、お名前、メールアドレス、診断カテゴリ、15問の回答、5軸スコア、一番低い軸、次のステップ
- 一部のプレビュー環境で `localStorage` が制限される場合は、ページ内メモリにフォールバックします。

## Google Sheets連携手順

保存先スプレッドシートは作成済みです。

- ムダなび 診断結果: https://docs.google.com/spreadsheets/d/1OEw1WMNdB5GuZi-ikqUBkybECpjgGpABEecoZ2qQ980/edit?usp=drivesdk

1. 上記スプレッドシートを開きます。
2. 拡張機能 → Apps Script を開きます。
3. `google-sheets-webapp.gs` の内容を貼り付けます。スプレッドシートIDは埋め込み済みです。
4. デプロイ → 新しいデプロイ → ウェブアプリを選びます。
5. 実行ユーザーは自分、アクセスできるユーザーは用途に合わせて設定します。
6. 発行されたWebアプリURLを `src/config.js` の `GOOGLE_SHEETS_WEB_APP_URL` に貼り付けます。

## CTA設定

- LINEで改善ヒントを受け取る: `src/config.js` の `LINE_HINT_URL`
- 診断結果をもとに個別相談する: `src/config.js` の `CONSULTATION_URL`
