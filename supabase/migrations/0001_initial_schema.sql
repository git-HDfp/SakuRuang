-- ============================================================================
-- SakuRuang — Initial Supabase PostgreSQL Schema, RLS, Triggers & Atomic RPCs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE space_type AS ENUM ('personal', 'family');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE space_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'ewallet', 'savings', 'investment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE category_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE split_method AS ENUM ('equal', 'exact', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE split_status AS ENUM ('open', 'settled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#0D6E52',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type space_type NOT NULL DEFAULT 'personal',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.space_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role space_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_user_id ON public.space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_space_id ON public.space_members(space_id);

CREATE TABLE IF NOT EXISTS public.space_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  max_uses int NOT NULL DEFAULT 5,
  used_count int NOT NULL DEFAULT 0,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_invites_code ON public.space_invites(code);

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type wallet_type NOT NULL DEFAULT 'bank',
  balance bigint NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#0D6E52',
  icon text NOT NULL DEFAULT 'Wallet',
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_space_id ON public.wallets(space_id) WHERE NOT is_archived;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type category_type NOT NULL,
  icon text NOT NULL DEFAULT 'Tag',
  color text NOT NULL DEFAULT '#0D6E52',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_space_type ON public.categories(space_id, type);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  destination_wallet_id uuid NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  note text NULL,
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_space_date ON public.transactions(space_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount_limit bigint NOT NULL CHECK (amount_limit > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_space_month ON public.budgets(space_id, month);

CREATE TABLE IF NOT EXISTS public.split_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_amount bigint NOT NULL CHECK (total_amount > 0),
  extra_fee bigint NOT NULL DEFAULT 0 CHECK (extra_fee >= 0),
  method split_method NOT NULL DEFAULT 'equal',
  paid_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id uuid NULL REFERENCES public.wallets(id) ON DELETE SET NULL,
  status split_status NOT NULL DEFAULT 'open',
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_split_bills_space_id ON public.split_bills(space_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.split_bill_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_bill_id uuid NOT NULL REFERENCES public.split_bills(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  share_amount bigint NOT NULL CHECK (share_amount >= 0),
  share_percentage numeric(5,2) NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_split_participants_bill_id ON public.split_bill_participants(split_bill_id);

-- 3. HELPER FUNCTIONS FOR RLS & DEFAULT CATEGORIES

CREATE OR REPLACE FUNCTION public.is_space_member(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE space_id = target_space_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.seed_default_categories(target_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (space_id, name, type, icon, color)
  VALUES
    (target_space_id, 'Makan & Minum', 'expense', 'ForkKnife', '#0D6E52'),
    (target_space_id, 'Belanja Rumah', 'expense', 'Basket', '#2B5B84'),
    (target_space_id, 'Transportasi', 'expense', 'CarProfile', '#C4781A'),
    (target_space_id, 'Tagihan & Utilitas', 'expense', 'Lightning', '#B84A39'),
    (target_space_id, 'Kesehatan', 'expense', 'FirstAidKit', '#2A7B76'),
    (target_space_id, 'Pendidikan', 'expense', 'Books', '#4F6D5A'),
    (target_space_id, 'Hiburan & Santai', 'expense', 'FilmSlate', '#6D5D7A'),
    (target_space_id, 'Keluarga & Anak', 'expense', 'UsersThree', '#8C6D46'),
    (target_space_id, 'Gaji & Penghasilan', 'income', 'Briefcase', '#0D6E52'),
    (target_space_id, 'Bonus & Hasil Lain', 'income', 'TrendUp', '#2B5B84');
END;
$$;

-- 4. TRIGGER: AUTO CREATE PROFILE + PERSONAL SPACE ON AUTH SIGNUP

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_space_id uuid;
  display_name text;
BEGIN
  display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, full_name, email, avatar_color)
  VALUES (NEW.id, display_name, NEW.email, '#0D6E52')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.spaces (name, type, created_by)
  VALUES ('Ruang Pribadi', 'personal', NEW.id)
  RETURNING id INTO new_space_id;

  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (new_space_id, NEW.id, 'owner');

  PERFORM public.seed_default_categories(new_space_id);

  INSERT INTO public.wallets (space_id, name, type, balance, color, icon, created_by)
  VALUES (new_space_id, 'Dompet Utama', 'bank', 0, '#0D6E52', 'Wallet', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ATOMIC RPC FUNCTIONS

CREATE OR REPLACE FUNCTION public.create_transaction_atomic(
  p_space_id uuid,
  p_wallet_id uuid,
  p_destination_wallet_id uuid,
  p_category_id uuid,
  p_type transaction_type,
  p_amount bigint,
  p_note text,
  p_occurred_at date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
BEGIN
  IF NOT public.is_space_member(p_space_id) THEN
    RAISE EXCEPTION 'Akses ditolak ke ruang ini';
  END IF;

  INSERT INTO public.transactions (
    space_id, wallet_id, destination_wallet_id, category_id,
    type, amount, note, occurred_at, created_by
  )
  VALUES (
    p_space_id, p_wallet_id, p_destination_wallet_id, p_category_id,
    p_type, p_amount, p_note, p_occurred_at, auth.uid()
  )
  RETURNING id INTO v_tx_id;

  IF p_type = 'income' THEN
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE id = p_wallet_id AND space_id = p_space_id;
  ELSIF p_type = 'expense' THEN
    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE id = p_wallet_id AND space_id = p_space_id;
  ELSIF p_type = 'transfer' THEN
    IF p_destination_wallet_id IS NULL OR p_destination_wallet_id = p_wallet_id THEN
      RAISE EXCEPTION 'Kantong tujuan transfer tidak valid';
    END IF;
    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE id = p_wallet_id AND space_id = p_space_id;

    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE id = p_destination_wallet_id AND space_id = p_space_id;
  END IF;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction_atomic(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF NOT public.is_space_member(v_tx.space_id) THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  IF v_tx.type = 'income' THEN
    UPDATE public.wallets SET balance = balance - v_tx.amount WHERE id = v_tx.wallet_id;
  ELSIF v_tx.type = 'expense' THEN
    UPDATE public.wallets SET balance = balance + v_tx.amount WHERE id = v_tx.wallet_id;
  ELSIF v_tx.type = 'transfer' THEN
    UPDATE public.wallets SET balance = balance + v_tx.amount WHERE id = v_tx.wallet_id;
    UPDATE public.wallets SET balance = balance - v_tx.amount WHERE id = v_tx.destination_wallet_id;
  END IF;

  DELETE FROM public.transactions WHERE id = p_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_space_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Silakan masuk terlebih dahulu';
  END IF;

  SELECT * INTO v_invite
  FROM public.space_invites
  WHERE UPPER(code) = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode undangan tidak ditemukan';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Kode undangan sudah dicabut';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Kode undangan sudah kedaluwarsa';
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Kuota undangan sudah penuh';
  END IF;

  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (v_invite.space_id, auth.uid(), 'member')
  ON CONFLICT (space_id, user_id) DO NOTHING;

  UPDATE public.space_invites
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN v_invite.space_id;
END;
$$;

-- 6. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Spaces visible to members"
  ON public.spaces FOR SELECT TO authenticated
  USING (public.is_space_member(id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create spaces"
  ON public.spaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Space members visible to fellow members"
  ON public.space_members FOR SELECT TO authenticated
  USING (public.is_space_member(space_id) OR user_id = auth.uid());

CREATE POLICY "Owners can insert space members"
  ON public.space_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_space_member(space_id));

CREATE POLICY "Space invites visible to members"
  ON public.space_invites FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can manage invites"
  ON public.space_invites FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Wallets access for space members"
  ON public.wallets FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Categories access for space members"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Transactions access for space members"
  ON public.transactions FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Budgets access for space members"
  ON public.budgets FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Split bills access for space members"
  ON public.split_bills FOR ALL TO authenticated
  USING (public.is_space_member(space_id))
  WITH CHECK (public.is_space_member(space_id));

CREATE POLICY "Split bill participants access for space members"
  ON public.split_bill_participants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.split_bills sb
      WHERE sb.id = split_bill_id
        AND public.is_space_member(sb.space_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.split_bills sb
      WHERE sb.id = split_bill_id
        AND public.is_space_member(sb.space_id)
    )
  );
