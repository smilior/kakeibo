-- =====================================================
-- 締日の土日祝日回避機能を追加
-- =====================================================

-- householdsテーブルに skip_holidays カラムを追加
ALTER TABLE households
ADD COLUMN skip_holidays BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN households.skip_holidays IS '締日が土日祝日の場合に前倒しするかどうか';

-- =====================================================
-- 日本の祝日テーブル
-- =====================================================
CREATE TABLE japanese_holidays (
  date DATE PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE japanese_holidays IS '日本の祝日マスタ';

-- 2025年〜2030年の祝日を登録
INSERT INTO japanese_holidays (date, name) VALUES
  -- 2025年
  ('2025-01-01', '元日'),
  ('2025-01-13', '成人の日'),
  ('2025-02-11', '建国記念の日'),
  ('2025-02-23', '天皇誕生日'),
  ('2025-02-24', '振替休日'),
  ('2025-03-20', '春分の日'),
  ('2025-04-29', '昭和の日'),
  ('2025-05-03', '憲法記念日'),
  ('2025-05-04', 'みどりの日'),
  ('2025-05-05', 'こどもの日'),
  ('2025-05-06', '振替休日'),
  ('2025-07-21', '海の日'),
  ('2025-08-11', '山の日'),
  ('2025-09-15', '敬老の日'),
  ('2025-09-23', '秋分の日'),
  ('2025-10-13', 'スポーツの日'),
  ('2025-11-03', '文化の日'),
  ('2025-11-23', '勤労感謝の日'),
  ('2025-11-24', '振替休日'),
  -- 2026年
  ('2026-01-01', '元日'),
  ('2026-01-12', '成人の日'),
  ('2026-02-11', '建国記念の日'),
  ('2026-02-23', '天皇誕生日'),
  ('2026-03-20', '春分の日'),
  ('2026-04-29', '昭和の日'),
  ('2026-05-03', '憲法記念日'),
  ('2026-05-04', 'みどりの日'),
  ('2026-05-05', 'こどもの日'),
  ('2026-05-06', '振替休日'),
  ('2026-07-20', '海の日'),
  ('2026-08-11', '山の日'),
  ('2026-09-21', '敬老の日'),
  ('2026-09-22', '国民の休日'),
  ('2026-09-23', '秋分の日'),
  ('2026-10-12', 'スポーツの日'),
  ('2026-11-03', '文化の日'),
  ('2026-11-23', '勤労感謝の日'),
  -- 2027年
  ('2027-01-01', '元日'),
  ('2027-01-11', '成人の日'),
  ('2027-02-11', '建国記念の日'),
  ('2027-02-23', '天皇誕生日'),
  ('2027-03-21', '春分の日'),
  ('2027-03-22', '振替休日'),
  ('2027-04-29', '昭和の日'),
  ('2027-05-03', '憲法記念日'),
  ('2027-05-04', 'みどりの日'),
  ('2027-05-05', 'こどもの日'),
  ('2027-07-19', '海の日'),
  ('2027-08-11', '山の日'),
  ('2027-09-20', '敬老の日'),
  ('2027-09-23', '秋分の日'),
  ('2027-10-11', 'スポーツの日'),
  ('2027-11-03', '文化の日'),
  ('2027-11-23', '勤労感謝の日'),
  -- 2028年
  ('2028-01-01', '元日'),
  ('2028-01-10', '成人の日'),
  ('2028-02-11', '建国記念の日'),
  ('2028-02-23', '天皇誕生日'),
  ('2028-03-20', '春分の日'),
  ('2028-04-29', '昭和の日'),
  ('2028-05-03', '憲法記念日'),
  ('2028-05-04', 'みどりの日'),
  ('2028-05-05', 'こどもの日'),
  ('2028-07-17', '海の日'),
  ('2028-08-11', '山の日'),
  ('2028-09-18', '敬老の日'),
  ('2028-09-22', '秋分の日'),
  ('2028-10-09', 'スポーツの日'),
  ('2028-11-03', '文化の日'),
  ('2028-11-23', '勤労感謝の日'),
  -- 2029年
  ('2029-01-01', '元日'),
  ('2029-01-08', '成人の日'),
  ('2029-02-11', '建国記念の日'),
  ('2029-02-12', '振替休日'),
  ('2029-02-23', '天皇誕生日'),
  ('2029-03-20', '春分の日'),
  ('2029-04-29', '昭和の日'),
  ('2029-04-30', '振替休日'),
  ('2029-05-03', '憲法記念日'),
  ('2029-05-04', 'みどりの日'),
  ('2029-05-05', 'こどもの日'),
  ('2029-07-16', '海の日'),
  ('2029-08-11', '山の日'),
  ('2029-09-17', '敬老の日'),
  ('2029-09-23', '秋分の日'),
  ('2029-09-24', '振替休日'),
  ('2029-10-08', 'スポーツの日'),
  ('2029-11-03', '文化の日'),
  ('2029-11-23', '勤労感謝の日'),
  -- 2030年
  ('2030-01-01', '元日'),
  ('2030-01-14', '成人の日'),
  ('2030-02-11', '建国記念の日'),
  ('2030-02-23', '天皇誕生日'),
  ('2030-03-20', '春分の日'),
  ('2030-04-29', '昭和の日'),
  ('2030-05-03', '憲法記念日'),
  ('2030-05-04', 'みどりの日'),
  ('2030-05-05', 'こどもの日'),
  ('2030-05-06', '振替休日'),
  ('2030-07-15', '海の日'),
  ('2030-08-11', '山の日'),
  ('2030-08-12', '振替休日'),
  ('2030-09-16', '敬老の日'),
  ('2030-09-23', '秋分の日'),
  ('2030-10-14', 'スポーツの日'),
  ('2030-11-03', '文化の日'),
  ('2030-11-04', '振替休日'),
  ('2030-11-23', '勤労感謝の日');

-- =====================================================
-- 土日祝日かどうかをチェックする関数
-- =====================================================
CREATE OR REPLACE FUNCTION is_holiday_or_weekend(check_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- 土曜日（6）または日曜日（0）かチェック
  IF EXTRACT(DOW FROM check_date) IN (0, 6) THEN
    RETURN TRUE;
  END IF;

  -- 祝日テーブルに存在するかチェック
  IF EXISTS (SELECT 1 FROM public.japanese_holidays WHERE date = check_date) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 指定日から前倒しで直近の平日を取得する関数
-- =====================================================
CREATE OR REPLACE FUNCTION get_previous_business_day(target_date DATE)
RETURNS DATE AS $$
DECLARE
  result_date DATE := target_date;
  max_iterations INTEGER := 10; -- 無限ループ防止
  i INTEGER := 0;
BEGIN
  -- 土日祝日の場合は前倒し
  WHILE is_holiday_or_weekend(result_date) AND i < max_iterations LOOP
    result_date := result_date - INTERVAL '1 day';
    i := i + 1;
  END LOOP;

  RETURN result_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 月間期間計算関数を更新（土日祝日回避対応）
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_period(p_household_id UUID)
RETURNS TABLE (start_date DATE, end_date DATE) AS $$
DECLARE
  v_reset_day INTEGER;
  v_skip_holidays BOOLEAN;
  today DATE := CURRENT_DATE;
  period_start DATE;
  period_end DATE;
BEGIN
  -- 家計のリセット日と祝日回避設定を取得
  SELECT h.reset_day, h.skip_holidays
  INTO v_reset_day, v_skip_holidays
  FROM public.households h
  WHERE h.id = p_household_id;

  IF v_reset_day IS NULL THEN
    v_reset_day := 1;
  END IF;

  IF v_skip_holidays IS NULL THEN
    v_skip_holidays := FALSE;
  END IF;

  -- 期間計算
  IF EXTRACT(DAY FROM today) >= v_reset_day THEN
    period_start := DATE_TRUNC('month', today) + (v_reset_day - 1) * INTERVAL '1 day';
    period_end := (DATE_TRUNC('month', today) + INTERVAL '1 month' + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  ELSE
    period_start := (DATE_TRUNC('month', today) - INTERVAL '1 month' + (v_reset_day - 1) * INTERVAL '1 day')::DATE;
    period_end := (DATE_TRUNC('month', today) + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  END IF;

  -- 土日祝日回避が有効な場合、期間開始日を調整
  IF v_skip_holidays THEN
    period_start := get_previous_business_day(period_start);
    period_end := get_previous_business_day(period_end);
  END IF;

  RETURN QUERY SELECT period_start, period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLSポリシーを追加（祝日テーブルは全員読み取り可能）
ALTER TABLE japanese_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "japanese_holidays_select_policy" ON japanese_holidays
  FOR SELECT USING (true);
