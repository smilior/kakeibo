-- 家族メンバーテーブル作成
-- ログインユーザー（users）とは別に、支出の「誰のため」を分類するためのメンバー
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_family_members_household ON family_members (household_id);

-- updated_atトリガー
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシー
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own household family members"
  ON family_members FOR SELECT
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family members for own household"
  ON family_members FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own household family members"
  ON family_members FOR UPDATE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own household family members"
  ON family_members FOR DELETE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- expensesテーブルにfamily_member_idカラムを追加
ALTER TABLE expenses ADD COLUMN family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX idx_expenses_family_member ON expenses (family_member_id);
