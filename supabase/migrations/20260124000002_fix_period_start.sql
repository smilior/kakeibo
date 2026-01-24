-- =====================================================
-- 期間計算関数の修正（開始日の調整）
-- 前期間が土日祝日回避で早く終わった場合、次期間の開始日も調整
-- =====================================================

-- 指定日付が含まれる締め日ベースの期間を取得する関数
CREATE OR REPLACE FUNCTION get_period_for_date(p_household_id UUID, p_target_date DATE)
RETURNS TABLE (start_date DATE, end_date DATE) AS $$
DECLARE
  v_reset_day INTEGER;
  v_skip_holidays BOOLEAN;
  period_start DATE;
  period_end DATE;
  adjusted_end DATE;
  prev_period_end DATE;
  prev_adjusted_end DATE;
BEGIN
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

  -- 基本の期間計算
  IF EXTRACT(DAY FROM p_target_date) >= v_reset_day THEN
    period_start := DATE_TRUNC('month', p_target_date) + (v_reset_day - 1) * INTERVAL '1 day';
    period_end := (DATE_TRUNC('month', p_target_date) + INTERVAL '1 month' + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  ELSE
    period_start := (DATE_TRUNC('month', p_target_date) - INTERVAL '1 month' + (v_reset_day - 1) * INTERVAL '1 day')::DATE;
    period_end := (DATE_TRUNC('month', p_target_date) + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
  END IF;

  -- 土日祝日回避が有効な場合
  IF v_skip_holidays THEN
    -- 前期間の終了日を計算（現在の期間開始日 - 1日）
    prev_period_end := period_start - INTERVAL '1 day';
    prev_adjusted_end := get_previous_business_day(prev_period_end);

    -- 前期間が早く終わった場合、現期間の開始日を調整
    IF prev_adjusted_end < prev_period_end THEN
      period_start := prev_adjusted_end + INTERVAL '1 day';
    END IF;

    -- 現期間の終了日を調整
    adjusted_end := get_previous_business_day(period_end);

    -- 指定日が調整後の終了日より後なら、次の期間
    IF p_target_date > adjusted_end THEN
      period_start := adjusted_end + INTERVAL '1 day';
      period_end := (DATE_TRUNC('month', period_start) + INTERVAL '1 month' + (v_reset_day - 2) * INTERVAL '1 day')::DATE;
      period_end := get_previous_business_day(period_end);
    ELSE
      period_end := adjusted_end;
    END IF;
  END IF;

  RETURN QUERY SELECT period_start, period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
