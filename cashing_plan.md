# 不動産取引データ収集・DB設計・運用計画

## 0. 開始前共通（要件・契約・セキュリティ）
- データ契約: XIT002/XPT001 応答スキーマ、フィールド定義書、単位/座標系(WGS84)、Null規則。
- クォータ/レート制限: 秒/分/時間あたりのリクエスト上限、同時実行数、リトライ方針(バックオフ+jitter)。
- 秘密管理: .env → Vault/Parameter Store、キーのローテーション計画。
- ロギング/モニタリング: 収集成功率、遅延、失敗理由、警告閾値(Slack/Pager)。

---

## 1. 保存用 DB 設計・構築
**推奨:** トランザクション + ジオクエリ → Postgres(+PostGIS) + Redis キャッシュ(72h)

- スキーマ(主要)
  - `prefectures(pref_code PK, name_ja, …)`
  - `municipalities(city_id PK, pref_code FK, name_ja, name_ko, is_ward, geom(point/centroid), geohash7, UNIQUE(pref_code, name_ja))`
  - `transactions(tx_id BIGSERIAL PK, provider_tx_id UNIQUE, city_id FK, year SMALLINT, quarter SMALLINT, trade_date, price, price_per_m2, floor_area, build_year, lat, lon, geog GEOGRAPHY(Point), raw_json JSONB, valid_from, valid_to, is_current)`
  - `ingest_jobs(job_id PK, year, quarter, city_id, status, started_at, finished_at, try_count, error_text)`
  - `ingest_batches(batch_id PK, job_id FK, page, status, …)` (ページネーション対応)
- インデックス/パーティショニング
  - パーティション: `transactions` を `year` または `year,quarter` で RANGE パーティション。
  - インデックス: `city_id,year,quarter`, `GIST(geog)`, `btree(provider_tx_id)`, `btree(geohash7)`。
- 整合性/増分
  - SCD2 または upsert: `provider_tx_id + quarter` を自然キーに `ON CONFLICT DO UPDATE`。
- マイグレーション
  - DDL管理: Flyway/Prisma/Liquibase。ステージング→本番へ。

---

## 2. XIT002?area=13 市区町村コード取得
- クライアント
  - タイムアウト/リトライ(指数バックオフ, 最大N回)、429/5xx処理、ETag/If-None-Match 利用。
- 検証/シード
  - 応答検証、東京23区の件数確認。
  - 提供済み JSON をシードマスターにし、APIとの差分を通知。
- 格納
  - `municipalities` upsert (名称変更対応)、削除コードはソフトデリート。

---

## 3. 23区 × 4四半期 = 92リクエスト（キュー+レート制御）
- ジョブ管理
  - `jobs`: (year, quarter, city_id) をキーに生成。
  - ワーカープール並列度設定、トークンバケット方式。
- リクエスト単位
  - ページネーション対応、gzip/HTTP2利用。
- 障害対応
  - 429/5xx リトライ、DLQ へ分離、超過時は通知。
- メトリクス
  - リクエスト数、成功率、p95遅延、エラー分布。

---

## 4. 応答処理 → DB格納 + 72hキャッシュ
- ストリーミング処理
  - NDJSON/SSE 単位処理、部分JSON補正、UTF-8/圧縮対応。
  - スキーマ検証、単位統一(㎡・円)。
- 格納戦略
  - ステージングにBulk INSERT → UPSERT。
  - 主キー: `provider_tx_id` または `(city_id, external_id, quarter)`。
- 増分バッチ
  - 週1回: JSONB hashで変更検出、差分更新、valid_to更新。
- キャッシュ
  - Redis key: `v1:view:bbox:filters:year:quarter`, TTL=72h。
  - バッチ完了時にキー無効化。
- 品質管理
  - 異常値検知、座標範囲チェック、警告レポート。

---

## 5. ユーザー画面 (XPT001)
- 地図ビュー
  - API: `GET /points?bbox&zoom&filters&year&quarter`。
  - DB: `ST_Intersects(geog, bbox)`、ズーム閾値以下は集約。
- リスト/ダウンロード
  - ページング、CSV/Parquet出力は非同期ジョブ、署名URLで提供。
  - 最大件数制限、サンプルモード。
- UX
  - CDNキャッシュ、ETag/If-Modified-Since。
  - プリセット検索、空結果時メッセージ。
- 国際化
  - 通貨/単位の整備、日本語/韓国語併記。

---

## 6. 運用・ガバナンス
- バックアップ/リストア: 年度単位バックアップ、PITR。
- セキュリティ: IP制限、WAF、入力検証、ユーザークォータ。
- ライセンス/出典: 約款に基づく出典表記、加工表記。
- テスト: スキーマ回帰テスト、カナリア収集、性能試験。
- コスト: インデックス/キャッシュ最適化。

---

## 実装Tips
- Idempotency: リクエストハッシュを `jobs.request_key` に保存。
- 精度: 金額 NUMERIC(14,0)、面積 NUMERIC(10,2)。
- ジオ: GIST(geog) インデックス + geohash7。
- キャッシュキー: パラメータ順序・小数桁正規化。
- 観測性: 都市×四半期単位の成功率/遅延をモニター。

