-- ============================================================
-- 体力管理アプリ Supabase セットアップ
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- アプリ設定（名前・プロフィール・目標回数を JSON で一括管理）
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日次チェック記録（1ユーザー1日1行）
CREATE TABLE IF NOT EXISTS daily_records (
  date DATE NOT NULL,
  user_key TEXT NOT NULL CHECK (user_key IN ('a', 'b')),
  plank BOOLEAN NOT NULL DEFAULT FALSE,
  hip BOOLEAN NOT NULL DEFAULT FALSE,
  squat BOOLEAN NOT NULL DEFAULT FALSE,
  fiber BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (date, user_key)
);

-- 週次計測記録（土曜日ごと 1行）
CREATE TABLE IF NOT EXISTS weekly_records (
  date DATE PRIMARY KEY,
  weight_a NUMERIC,
  fat_a NUMERIC,
  weight_b NUMERIC,
  fat_b NUMERIC
);

-- メモ（チャット形式）
CREATE TABLE IF NOT EXISTS memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  who TEXT NOT NULL CHECK (who IN ('a', 'b')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security（認証なし・全操作許可）
-- ============================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_daily"        ON daily_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_weekly"       ON weekly_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_memos"        ON memos FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- サンプルデータ（初回用）
-- ============================================================
INSERT INTO memos (who, text) VALUES
  ('b', '今日から一緒にがんばろう！'),
  ('a', 'よろしくね。毎日続けよう')
ON CONFLICT DO NOTHING;
