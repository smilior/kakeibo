-- =====================================================
-- メンバーロール機能の追加
-- =====================================================

-- ロールのenum型を作成
CREATE TYPE public.user_role AS ENUM ('owner', 'member');

-- usersテーブルにroleカラムを追加
ALTER TABLE public.users ADD COLUMN role public.user_role NOT NULL DEFAULT 'member';

-- 既存のユーザーにロールを設定（各家計で最初に作成されたユーザーをownerに）
WITH first_users AS (
  SELECT DISTINCT ON (household_id) id
  FROM public.users
  WHERE household_id IS NOT NULL
  ORDER BY household_id, created_at ASC
)
UPDATE public.users
SET role = 'owner'
WHERE id IN (SELECT id FROM first_users);

-- create_household_and_setupを更新してownerロールを設定
CREATE OR REPLACE FUNCTION public.create_household_and_setup(
  p_household_name VARCHAR(100),
  p_nickname VARCHAR(50)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
BEGIN
  -- 現在のユーザーIDを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 家計を作成
  INSERT INTO public.households (name)
  VALUES (p_household_name)
  RETURNING id INTO v_household_id;

  -- ユーザーを家計に紐づけ（ownerとして）
  UPDATE public.users
  SET household_id = v_household_id, nickname = p_nickname, role = 'owner'
  WHERE id = v_user_id;

  -- デフォルトカテゴリを作成
  PERFORM public.create_default_categories(v_household_id);

  RETURN v_household_id;
END;
$$;

-- メンバーを家計から削除する関数（オーナーのみ実行可能）
CREATE OR REPLACE FUNCTION public.remove_household_member(
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_household_id UUID;
  v_caller_role public.user_role;
  v_member_household_id UUID;
  v_member_role public.user_role;
BEGIN
  -- 現在のユーザーIDを取得
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 呼び出し元のユーザー情報を取得
  SELECT household_id, role INTO v_caller_household_id, v_caller_role
  FROM public.users
  WHERE id = v_caller_id;

  -- オーナーでない場合はエラー
  IF v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only owner can remove members';
  END IF;

  -- 削除対象のメンバー情報を取得
  SELECT household_id, role INTO v_member_household_id, v_member_role
  FROM public.users
  WHERE id = p_member_id;

  -- 同じ家計に属していない場合はエラー
  IF v_member_household_id IS NULL OR v_member_household_id != v_caller_household_id THEN
    RAISE EXCEPTION 'Member not found in your household';
  END IF;

  -- オーナー自身を削除しようとした場合はエラー
  IF v_member_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the owner';
  END IF;

  -- メンバーの家計紐付けを解除
  UPDATE public.users
  SET household_id = NULL, role = 'member'
  WHERE id = p_member_id;

  RETURN TRUE;
END;
$$;

-- コメント追加
COMMENT ON COLUMN public.users.role IS 'ユーザーのロール（owner: 所有者, member: メンバー）';
