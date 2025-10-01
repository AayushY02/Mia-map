# React + TypeScript + Vite

このテンプレートは、React を Vite 上で HMR（ホットモジュールリプレースメント）付きで動作させるための最小構成を提供します。また、いくつかの ESLint 設定も含まれています。

現在、以下の公式プラグインが利用可能です：

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) は [Babel](https://babeljs.io/) を使用して Fast Refresh を実現
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) は [SWC](https://swc.rs/) を使用して Fast Refresh を実現

## ESLint 設定の拡張

本番用アプリケーションを開発する場合、型認識によるルールを有効にするよう ESLint 設定を更新することを推奨します。

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

React 用の追加ルールとして、以下のプラグインの導入も可能です：

```js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

---

# 🌏 FrameArk マップビューアの概要

このアプリは、Mapbox GL JS を使用した地図可視化アプリケーションです。千葉県の人口統計と農業用地データを視覚化し、地形、行政界、スタイルの切り替え、メッシュごとの指標表示などの機能を提供します。

## 🚀 主な機能

- Mapbox GL JS によるインタラクティブ地図
- 複数のスタイル切り替え（ストリート、ダーク、ライト、衛星写真など）
- レイヤー表示・非表示（道路、地形、行政界、農業地）
- メッシュ（1km / 500m / 250m）ごとの人口データ表示
- 高齢化率や年少人口など、指標別のカラースケーリング
- 色分け凡例の表示
- 高速表示とスムーズな操作性

## 🧱 ディレクトリ構成

```bash
src/
├── components/
│   ├── Legend.tsx
│   ├── MapControls.tsx
│   └── LoadingOverlay.tsx
├── constants/
│   ├── bounds.ts
│   └── mapStyles.ts
├── hooks/
│   └── useMapInitialization.ts
├── layers/
│   ├── adminBoundaries.ts
│   ├── agriLayer.ts
│   ├── meshLayers.ts
│   └── terrain.ts
├── utils/
│   ├── expressions.ts
│   └── metrics.ts
├── MapView.tsx
└── App.tsx
```

## 🧩 使用方法

```bash
npm install
```

### `.env` に Mapbox アクセストークンを追加

```env
VITE_MAPBOX_TOKEN=あなたの_mapbox_アクセストークン
```

### 開発サーバーの起動

```bash
npm run dev
```

## 🗂 データファイルの配置例

`/public/data` フォルダに以下の GeoJSON ファイルを配置してください：

- `/data/12_chiba_1km_pop.geojson`
- `/data/kashiwa_agricultural_land.geojson`

## 💡 拡張のアイデア

- useMapInitialization.ts を活用してマップ初期化を分離
- 指標や凡例のテストコード追加
- 外部 API 経由でデータ取得に切り替える

## ✅ 推奨コミットメッセージ

```bash
feat(refactor): 地図機能の構成をモジュール化し、再利用可能なコンポーネントへ分離

- スタイル・境界・指標処理をユーティリティ化
- メッシュ・農業地・地形・行政レイヤーを個別ファイルに分離
- UI コンポーネント（MapControls、Legend、LoadingOverlay）を作成
- MapView.tsx を新構成に基づいて整理
- 元の動作はすべて維持し、機能に変更なし
```