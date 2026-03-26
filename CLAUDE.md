# CLAUDE.md — フェリアホーム 物件情報管理システム（完全版）

## プロジェクト概要

東京都心・城南・城西エリアの不動産売買仲介「フェリアホーム」の
物件情報管理システム。AIエージェントが物件情報の収集・管理・公開・
マーケティングを支援する一元管理プラットフォーム。

**対象エリア**: 東京都内（島嶼部を除く）の売買物件
**開発体制**: 内製エンジニア + Claude AIエージェント
**既存システム**: 独自CRM（API連携）

---

## エージェント構成（全8Agent）

```
PropertyOrchestratorAgent        ← 総指揮・タスク振り分け
├── PropertyDataAgent            ← 物件データ管理・CRM連携
├── DocumentParserAgent          ← PDF・画像からの情報抽出  [Phase 1]
├── AdApprovalAgent              ← 広告確認ワークフロー管理  [Phase 1]
├── SoldDetectionAgent           ← 成約検知・自動非掲載     [Phase 1]
├── FloorPlanGeneratorAgent      ← 販売図面PDF自動生成       [Phase 2]
├── ValuationAgent               ← 査定AIアシスタント       [Phase 2]
├── CompetitorMonitorAgent       ← 競合価格モニタリング      [Phase 2]
└── MatchingAgent                ← 顧客×物件マッチング       [Phase 2]
```

---

## Phase 1 エージェント詳細

### DocumentParserAgent（販売図面・資料の自動取込）

**役割**
- 販売図面PDF・物件画像から構造化データを抽出する
- 抽出結果をPropertyDataAgentに渡してDB登録する

**抽出対象フィールド（優先度順）**
```
必須（抽出できない場合はアラート）:
  price          価格（万円）
  address        所在地
  station_walk   最寄駅・徒歩分数
  area_m2        面積（㎡）
  property_type  物件種別

高優先:
  rooms          間取り
  building_year  築年月
  structure      構造
  floors         階数・所在階
  delivery       引渡し時期
  reins_number   レインズ番号
  bcr / far      建ぺい率・容積率
  management_fee 管理費（マンション）
  repair_reserve 修繕積立金（マンション）
```

**抽出精度ルール**
- 確信度 < 80% のフィールドは confidence: "low" フラグを付けてレビュー待ち
- 担当者がプレビュー確認してから確定（自動確定禁止）

**出力形式**
```typescript
interface ParseResult {
  source_type: "pdf" | "image";
  source_url: string;
  extracted: Partial<PropertyData>;
  confidence: Record<string, "high" | "medium" | "low">;
  needs_review: string[];
  raw_text: string;
}
```

---

### AdApprovalAgent（広告確認ワークフロー）

**掲載ステータス定義（この順序でのみ遷移）**
```
DRAFT         → 登録中・未確認
REVIEW        → AI自動チェック中
PENDING       → 担当者の広告確認待ち ← 人間がチェック
APPROVED      → 広告確認済み
PUBLISHED_HP  → HP掲載中
PUBLISHED_ALL → HP＋ポータル掲載中
SUSPENDED     → 一時停止
SOLD          → 成約済み・全掲載終了
```

**遷移ルール（厳守）**
- PENDING → APPROVED: 担当者が管理画面で承認ボタン押下のみ
- APPROVED → PUBLISHED_*: 担当者が掲載設定を操作
- * → SOLD: SoldDetectionAgentが検知 → 担当者確認 → 遷移

**掲載先設定（物件ごとに個別選択）**
```typescript
interface PublishSettings {
  hp_public: boolean;        // HP一般公開
  hp_members_only: boolean;  // HP会員限定
  portal_suumo: boolean;
  portal_athome: boolean;
  portal_yahoo: boolean;
  portal_homes: boolean;
}
```

**通知ルール**
- PENDING になったらSlackに即通知（15分未対応なら再通知）
- すべての変更をAuditLogテーブルに記録（誰が・いつ・何を）

---

### SoldDetectionAgent（成約検知・自動非掲載）

**検知シグナル（スコアリング）**
```
確実（+80点）:
  - REINSに成約情報が登録された
  - 担当者が管理画面でステータスを「成約」に変更

有力（+40点）:
  - ポータルから掲載が消えた
  - 登録90日超 + 直近30日の問い合わせゼロ
  - 「商談中」に変更して60日以上経過

参考（+10点）:
  - 価格が複数回改定されている
  - 60日超で問い合わせ一度もなし

アラート閾値: 40点以上でSlack通知
自動非掲載: 実行しない（必ず担当者が確認して手動処理）
```

**成約確定後の処理（担当者確認後のみ実行）**
1. HPから即時非掲載
2. 連動中の全ポータルから非掲載（24時間以内）
3. ステータスをSOLDに変更・成約日時を記録
4. SaleRecordテーブルに格納

**成約データ格納項目**
```typescript
interface SaleRecord {
  property_id: string;
  sold_price: number;
  listed_price: number;
  price_diff_pct: number;      // 価格乖離率
  days_on_market: number;
  inquiry_count: number;
  viewing_count: number;
  buyer_type: string;
  price_per_m2: number;        // 成約㎡単価
  sold_at: Date;
  agent_id: string;
  season: string;              // Q1〜Q4
  property_type: string;
  station_walk: number;
}
```

---

## Phase 2 エージェント詳細

### FloorPlanGeneratorAgent（販売図面PDF自動生成）

- 物件DBのデータ＋写真からA4販売図面を自動生成
- テンプレート: 戸建て用 / マンション用 / 土地用 / シンプル版
- ComplianceAgentのチェック通過後のみ顧客配布用として出力

**必須掲載項目（公正競争規約）**
- 取引態様・物件種別・所在地・価格・面積
- 交通（80m/分ルール厳守）・築年月・宅建業者名・免許番号・広告有効期限

---

### ValuationAgent（査定AIアシスタント）

**データソース（優先順）**
1. 自社成約データ（SaleRecordテーブル）
2. 国土交通省 不動産情報ライブラリAPI
3. 路線価データ（国税庁）
4. CompetitorMonitorAgentのデータ

**査定ロジック**
```
基準価格 = 類似成約事例の㎡単価 × 対象物件面積
補正 = 築年補正 + 駅距離補正 + 階数補正 + 向き補正
参考査定価格 = 基準価格 × (1 + 補正合計)
信頼区間 = ±15%（事例3件未満の場合は±25%で警告）
```

**制約**: 出力は必ず「参考価格」として明記し、宅建士による最終確認が必要であることを記載

---

### CompetitorMonitorAgent（競合価格モニタリング）

- 収集サイクル: 毎日深夜2時
- 自社物件と同エリア・同種別・近似価格帯の競合を監視
- 価格改定アラート条件:
  - 競合が値下げして自社より20万円以上安くなった
  - 自社掲載日数がエリア平均の1.5倍超
  - 30日連続問い合わせゼロ

---

### MatchingAgent（顧客×物件マッチング）

**マッチングスコア重み**
```
エリア（希望沿線・駅）: 40%
価格帯（±10%の範囲）: 25%
間取り・広さ:           20%
物件種別:               15%
```

- 新着物件登録時にTop10顧客を自動リストアップ
- 提案メール文草案を生成（担当者確認後に送信、自動送信禁止）

---

## 全エージェント共通ルール

### 人間の判断が必要な操作（絶対に自動実行しない）
- 物件の掲載ON/OFFの切り替え
- 成約確定処理
- 顧客へのメール送信
- 価格変更のDB書き込み
- 外部ポータルへの掲載・非掲載

### エスカレーション原則
以下の場合は処理を止めて担当者に確認を求める:
- 5,000万円以上の物件の価格変更
- 成約済み物件のデータ変更
- 複数物件に一括影響する操作
- APIエラーが3回連続発生
- コンプライアンスNGの広告公開

### セキュリティ
- 物件の非公開情報（売主情報・内部メモ）はAPIレスポンスに含めない
- 外部APIキーはすべて環境変数で管理（.envはgit管理外）
- 管理画面はIP制限 + 2段階認証

### ログ・監査
- Agent処理はすべてstructured JSONログで記録
- 物件変更はPropertyHistoryテーブルに全記録
- 広告確認の操作はAuditLogに記録（誰が・いつ・何を）
- 月次でCSVエクスポート可能なエンドポイントを設ける

---

## 環境変数

```bash
# 既存CRM
CRM_API_BASE_URL=
CRM_API_KEY=

# DB
DATABASE_URL=

# Claude API
ANTHROPIC_API_KEY=

# ストレージ
S3_BUCKET_NAME=felia-property-assets
AWS_REGION=ap-northeast-1

# ポータルAPI
SUUMO_API_KEY=
ATHOME_API_KEY=
YAHOO_REAL_ESTATE_API_KEY=
HOMES_API_KEY=

# 通知
SLACK_WEBHOOK_URL=
SLACK_CHANNEL_PROPERTY=#property-updates
SLACK_CHANNEL_ALERTS=#property-alerts

# カレンダー連携
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# 査定用公的データ
MLIT_API_KEY=
```
