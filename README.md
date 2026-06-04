# DEBATE ARENA

エンタメ特化型ディベートバトル・プラットフォーム。  
AIキャラクターとリアルタイムでディベートを楽しめるWebアプリケーション。

## 技術スタック

| 層 | 技術 |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python) |
| AI | Gemini 2.5 Flash (SSEストリーミング) |
| スタイル | Vanilla CSS (ダークモード・グラスモーフィズム) |

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env
# .env 内の GOOGLE_API_KEY を設定
```

### 2. バックエンド

```bash
pip install -r requirements.txt
cd backend
python main.py
# → http://localhost:8000
```

### 3. フロントエンド

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## プロジェクト構成

```
├── backend/
│   └── main.py          # FastAPI + Gemini SSE
├── frontend/
│   └── src/
│       ├── components/  # React コンポーネント
│       ├── data/        # キャラクター・モード定義
│       └── styles/      # CSS ファイル
├── .env                 # API Key (git管理外)
└── requirements.txt
```

## キャラクター

| 名前 | スタイル |
|---|---|
| 眼鏡の論理紳士 | 丁寧な敬語＋マシンガン論破 |
| 五月の技巧派ライマー | 固い韻＋テクニカル |
| 最強のおかん | 関西弁＋感情論 |
| 戦国大名 | 古語＋大局観 |

## モード

- **ガチディベート** — 論理性・根拠・反論力で勝負
- **ラップバトル** — 韻・フロウ・パンチラインで勝負
- **日常の説得** — 説得力・共感力で勝負
