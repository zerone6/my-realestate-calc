# 不動産取引データ収集・DB設計計画

## ステップ一覧

1. **DB 設計・構築**
   - 保存対象: 市区町村コード、年度、四半期、取引データ(JSON)
   - スキーマ: 
     - `municipality_code` (VARCHAR, PK一部)
     - `year` (INT, PK一部)
     - `quarter` (TINYINT, PK一部)
     - `data` (JSON or TEXT)
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

2. **市区町村コード取得**
   - API: `XIT002?area=13`
   - 東京都23区を対象にコードリストを取得し、DBに保存またはキャッシュ。

3. **四半期ごとのデータ取得**
   - リクエスト: `year=2024, quarter=1..4, city={各コード}`
   - 23区 × 4四半期 = 92リクエスト
   - レートリミット制御 + キュー処理を導入。

4. **応答処理とDB格納**
   - ストリーミングデコードで応答を順次処理。
   - DBに格納し、同時に72時間キャッシュ。
   - 取引データは分期内に増分あり → 週1回の増分バッチを実行。

5. **ユーザー画面提供**
   - マップビュー (XPT001 APIを利用して地図上にポイント表示)
   - ビューポート単位でのデータフェッチ
   - リスト表示・ダウンロードはローカルDBを条件検索し提供。

---

## 実装ポイント

- **DB**: PostgreSQL (JSONBカラム活用) 推奨
- **ETL基盤**: バッチ処理用にキュー (RabbitMQ / Redis Queue)
- **キャッシュ**: Redis を72時間TTLで利用
- **API呼び出し制御**: RateLimiter ミドルウェア
- **ユーザーUI**: 
  - 地図表示: Leaflet.js / Mapbox / Google Maps
  - フィルタ検索: DBクエリ結果を返却
