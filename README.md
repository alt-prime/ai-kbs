# AI Knowledge Base System (ai-kbs)

## アプリケーション概要
このアプリケーションは、AIチャットを通じてユーザーの質問に回答するシステムです。情報取得は以下のフローで行われます：

1. **自社DB（Cloud Storage）検索**: まず、自社データベース（Cloud Storageなど）にアクセスし、関連する情報の取得を試みます。
2. **Web検索（フォールバック）**: 自社データベースに該当する情報が存在しなかった場合、自動的にWeb検索を実行し、外部から必要な情報を取得して回答を生成します。

## 技術スタック（予定）
* **AIモデル**: Google Gemini (Function Calling機能を用いてDB検索とWeb検索をルーティング)
* **フロントエンド/バックエンド**: Next.js (App Router)
* **自社DB**: 未定 (Cloud Storage)
* **Web検索**: 未定 (GeminiのGroudning機能 または 外部検索API)

## 環境変数

Gemini APIキーはコードに直接記載せず、環境変数として設定します。

1. `.env.example` を参考に、プロジェクト直下へ `.env.local` を作成します。
2. [Google AI Studio](https://aistudio.google.com/app/apikey) で取得したAPIキーを設定します。

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

`.env.local` は `.gitignore` によりGit管理対象外です。APIキーなどの秘密情報はコミットしないでください。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
