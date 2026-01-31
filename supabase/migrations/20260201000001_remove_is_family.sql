-- is_familyフラグを廃止し、family_member_idに一本化するマイグレーション

-- 1. is_family=trueの支出がある各householdに「家族」family_memberを作成
INSERT INTO family_members (household_id, name, sort_order)
SELECT DISTINCT e.household_id, '家族', 0
FROM expenses e
WHERE e.is_family = true
  AND NOT EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.household_id = e.household_id AND fm.name = '家族'
  );

-- 2. is_family=trueの支出を「家族」family_memberに紐付け
UPDATE expenses e
SET family_member_id = fm.id
FROM family_members fm
WHERE e.is_family = true
  AND e.family_member_id IS NULL
  AND fm.household_id = e.household_id
  AND fm.name = '家族';

-- 3. is_familyカラムを削除
ALTER TABLE expenses DROP COLUMN is_family;
