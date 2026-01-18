-- daily_adviceテーブルにプロンプトカラムを追加
ALTER TABLE daily_advice ADD COLUMN IF NOT EXISTS prompt text;
