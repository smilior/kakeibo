-- =====================================================
-- 月間集計ビュー
-- =====================================================
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT
  e.household_id,
  e.category_id,
  c.name AS category_name,
  DATE_TRUNC('month', e.date) AS month,
  COUNT(*) AS count,
  SUM(e.amount) AS total_amount
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY e.household_id, e.category_id, c.name, DATE_TRUNC('month', e.date);

-- =====================================================
-- ユーザー別月間集計ビュー
-- =====================================================
CREATE OR REPLACE VIEW monthly_user_expense_summary AS
SELECT
  e.household_id,
  e.user_id,
  u.name AS user_name,
  u.nickname AS user_nickname,
  DATE_TRUNC('month', e.date) AS month,
  COUNT(*) AS count,
  SUM(e.amount) AS total_amount
FROM expenses e
JOIN users u ON e.user_id = u.id
GROUP BY e.household_id, e.user_id, u.name, u.nickname, DATE_TRUNC('month', e.date);

-- =====================================================
-- 月間期間計算関数
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_period(p_household_id UUID)
RETURNS TABLE (start_date DATE, end_date DATE) AS $$
DECLARE
  v_reset_day INTEGER;
  today DATE := CURRENT_DATE;
  period_start DATE;
  period_end DATE;
BEGIN
  -- 家計のリセット日を取得
  SELECT h.reset_day INTO v_reset_day
  FROM households h
  WHERE h.id = p_household_id;

  IF v_reset_day IS NULL THEN
    v_reset_day := 1;
  END IF;

  -- 期間計算
  IF EXTRACT(DAY FROM today) >= v_reset_day THEN
    period_start := DATE_TRUNC('month', today) + (v_reset_day - 1) * INTERVAL '1 day';
    period_end := (DATE_TRUNC('month', today) + INTERVAL '1 month' + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  ELSE
    period_start := (DATE_TRUNC('month', today) - INTERVAL '1 month' + (v_reset_day - 1) * INTERVAL '1 day')::DATE;
    period_end := (DATE_TRUNC('month', today) + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  END IF;

  RETURN QUERY SELECT period_start, period_end;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 残り回数計算関数
-- =====================================================
CREATE OR REPLACE FUNCTION get_remaining_counts(p_household_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  category_icon VARCHAR,
  monthly_limit INTEGER,
  current_count BIGINT,
  remaining_count BIGINT
) AS $$
DECLARE
  period_start DATE;
  period_end DATE;
BEGIN
  -- 現在の期間を取得
  SELECT gcp.start_date, gcp.end_date
  INTO period_start, period_end
  FROM get_current_period(p_household_id) gcp;

  RETURN QUERY
  SELECT
    r.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    r.monthly_limit,
    COALESCE(COUNT(e.id), 0) AS current_count,
    GREATEST(r.monthly_limit - COALESCE(COUNT(e.id), 0), 0) AS remaining_count
  FROM rules r
  JOIN categories c ON r.category_id = c.id
  LEFT JOIN expenses e ON e.category_id = r.category_id
    AND e.household_id = p_household_id
    AND e.date BETWEEN period_start AND period_end
  WHERE r.household_id = p_household_id
    AND r.is_active = TRUE
  GROUP BY r.category_id, c.name, c.icon, r.monthly_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- デフォルトカテゴリ作成関数
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_categories(p_household_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (household_id, name, icon, sort_order) VALUES
    (p_household_id, '食費', '🍚', 1),
    (p_household_id, '外食', '🍽️', 2),
    (p_household_id, '日用品', '🧴', 3),
    (p_household_id, '交通費', '🚃', 4),
    (p_household_id, '娯楽', '🎮', 5),
    (p_household_id, 'サブスク', '💳', 6),
    (p_household_id, '衣服', '👕', 7),
    (p_household_id, '医療', '🏥', 8),
    (p_household_id, '遠出', '🚗', 9),
    (p_household_id, 'その他', '📦', 10);
END;
$$ LANGUAGE plpgsql;
