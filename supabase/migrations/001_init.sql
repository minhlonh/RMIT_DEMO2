-- =====================================================================
-- GIA ĐÌNH SỐ — Supabase migration
-- (families table is created before profiles so profiles.family_id can
--  carry a real foreign key.)
-- =====================================================================

-- Enums
CREATE TYPE user_role AS ENUM ('grandparent', 'parent', 'child');
CREATE TYPE ui_mode AS ENUM ('senior', 'standard', 'junior');

-- Families Table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  ui_mode ui_mode NOT NULL DEFAULT 'standard',
  preferred_language VARCHAR(5) DEFAULT 'vi',
  avatar_url TEXT,
  birth_year INT,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table (Family Wall & Anti-Scam)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  audio_url TEXT,
  is_scam_flagged BOOLEAN DEFAULT FALSE,
  scam_reason TEXT,
  slang_translation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Vault Table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  story_text TEXT NOT NULL,
  audio_narration_url TEXT,
  image_urls TEXT[],
  year_occurred INT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_family ON profiles(family_id);
CREATE INDEX idx_messages_family_created ON messages(family_id, created_at DESC);
CREATE INDEX idx_memories_family_created ON memories(family_id, created_at DESC);

-- Helper: the caller's family (SECURITY DEFINER avoids RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_family" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (family_id IS NOT NULL AND family_id = public.current_family_id())
  );
CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND family_id IS NULL);
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Users may not change family_id / role directly (use create_family / join_family)
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, ui_mode, preferred_language, avatar_url, birth_year)
  ON profiles TO authenticated;

-- families
CREATE POLICY "families_select_member" ON families
  FOR SELECT USING (id = public.current_family_id());

-- messages
CREATE POLICY "messages_select_family" ON messages
  FOR SELECT USING (family_id = public.current_family_id());
CREATE POLICY "messages_insert_member" ON messages
  FOR INSERT WITH CHECK (
    family_id = public.current_family_id() AND sender_id = auth.uid()
  );

-- memories
CREATE POLICY "memories_select_family" ON memories
  FOR SELECT USING (family_id = public.current_family_id());
CREATE POLICY "memories_insert_member" ON memories
  FOR INSERT WITH CHECK (
    family_id = public.current_family_id() AND creator_id = auth.uid()
  );
CREATE POLICY "memories_update_creator" ON memories
  FOR UPDATE USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "memories_delete_creator" ON memories
  FOR DELETE USING (creator_id = auth.uid());

-- Create a family and join it
CREATE OR REPLACE FUNCTION public.create_family(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO families (family_name, invite_code)
  VALUES (p_name, upper(substr(md5(gen_random_uuid()::text), 1, 8)))
  RETURNING id INTO new_id;
  UPDATE profiles SET family_id = new_id WHERE id = auth.uid();
  RETURN new_id;
END;
$$;

-- Join an existing family by invite code
CREATE OR REPLACE FUNCTION public.join_family(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fam_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT id INTO fam_id FROM families WHERE invite_code = upper(trim(p_code));
  IF fam_id IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;
  UPDATE profiles SET family_id = fam_id WHERE id = auth.uid();
  RETURN fam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_family(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(TEXT) TO authenticated;

-- Auto-create a profile row for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Thành viên')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Live family wall
ALTER PUBLICATION supabase_realtime ADD TABLE messages;