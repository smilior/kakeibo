-- =====================================================
-- RLSポリシー
-- =====================================================

-- RLS有効化
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- households
-- -----------------------------------------------------
CREATE POLICY "Users can view own household"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household"
  ON households FOR UPDATE
  USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------
-- users
-- -----------------------------------------------------
CREATE POLICY "Users can view household members"
  ON users FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------
-- invitations
-- -----------------------------------------------------
CREATE POLICY "Users can view own household invitations"
  ON invitations FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR used_at IS NULL
  );

CREATE POLICY "Users can create invitation for own household"
  ON invitations FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update invitations"
  ON invitations FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR used_at IS NULL
  );

-- -----------------------------------------------------
-- categories
-- -----------------------------------------------------
CREATE POLICY "Users can view own household categories"
  ON categories FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own household categories"
  ON categories FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household categories"
  ON categories FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own household categories"
  ON categories FOR DELETE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- -----------------------------------------------------
-- rules
-- -----------------------------------------------------
CREATE POLICY "Users can view own household rules"
  ON rules FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own household rules"
  ON rules FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household rules"
  ON rules FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own household rules"
  ON rules FOR DELETE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- -----------------------------------------------------
-- expenses
-- -----------------------------------------------------
CREATE POLICY "Users can view own household expenses"
  ON expenses FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create expenses for own household"
  ON expenses FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------
-- subscriptions
-- -----------------------------------------------------
CREATE POLICY "Users can view own household subscriptions"
  ON subscriptions FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own household subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own household subscriptions"
  ON subscriptions FOR DELETE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );
