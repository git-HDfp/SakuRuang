import { cookies } from "next/headers";
import {
  COOKIE_ACTIVE_SPACE,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppSessionContext,
  BudgetWithProgress,
  Category,
  CategorySpendPoint,
  DailySpendPoint,
  MonthlyCashflowPoint,
  Profile,
  SpaceInvite,
  SpaceInvitePreview,
  SpaceMemberWithProfile,
  SpaceWithRole,
  SplitBillWithParticipants,
  TransactionWithRelations,
  Wallet,
} from "@/lib/types/database";
import {
  formatShortMonthLabel,
  getCurrentMonthKey,
  getTodayISO,
} from "@/lib/format";

function getMonthEndDate(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    return `${month}-28`;
  }
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
}

export async function getCurrentUserProfile(): Promise<{
  profile: Profile | null;
  mode: "supabase";
}> {
  if (!isSupabaseConfigured()) {
    return { profile: null, mode: "supabase" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, mode: "supabase" };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileData) {
    return { profile: profileData as Profile, mode: "supabase" };
  }

  return { profile: null, mode: "supabase" };
}

export async function getAppSessionContext(
  requestedSpaceId?: string
): Promise<AppSessionContext | null> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) return null;

  const cookieStore = await cookies();
  const preferredSpaceId =
    requestedSpaceId || cookieStore.get(COOKIE_ACTIVE_SPACE)?.value;

  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("space_members")
    .select("space_id, role, spaces(id, name, type, created_by, created_at)")
    .eq("user_id", profile.id);

  const spaces: SpaceWithRole[] = [];
  for (const m of memberships ?? []) {
    const rawSpace = Array.isArray(m.spaces) ? m.spaces[0] : m.spaces;
    if (!rawSpace) continue;
    const { count } = await supabase
      .from("space_members")
      .select("*", { count: "exact", head: true })
      .eq("space_id", rawSpace.id);

    spaces.push({
      id: rawSpace.id,
      name: rawSpace.name,
      type: rawSpace.type,
      created_by: rawSpace.created_by,
      created_at: rawSpace.created_at,
      role: m.role,
      member_count: count ?? 1,
    });
  }

  if (spaces.length === 0) return null;

  const activeSpace =
    spaces.find((s) => s.id === preferredSpaceId) ?? spaces[0];

  const [membersRes, walletsRes, categoriesRes] = await Promise.all([
    supabase
      .from("space_members")
      .select("id, space_id, user_id, role, joined_at, profiles(*)")
      .eq("space_id", activeSpace.id),
    supabase
      .from("wallets")
      .select("*")
      .eq("space_id", activeSpace.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("space_id", activeSpace.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const members: SpaceMemberWithProfile[] = (membersRes.data ?? []).map(
    (item) => {
      const prof = Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles;
      return {
        id: item.id,
        space_id: item.space_id,
        user_id: item.user_id,
        role: item.role,
        joined_at: item.joined_at,
        profile: (prof as Profile) ?? profile,
      };
    }
  );

  return {
    user: profile,
    spaces,
    activeSpace,
    members,
    wallets: ((walletsRes.data ?? []) as Wallet[]).map((w) => ({
      ...w,
      balance: Number(w.balance),
    })),
    categories: (categoriesRes.data ?? []) as Category[],
    storageMode: "supabase",
  };
}

export async function getSpaceTransactions(
  spaceId: string,
  filters?: {
    month?: string;
    walletId?: string;
    categoryId?: string;
    type?: string;
    search?: string;
    limit?: number;
  }
): Promise<TransactionWithRelations[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("space_id", spaceId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.walletId && filters.walletId !== "all") {
    query = query.or(
      `wallet_id.eq.${filters.walletId},destination_wallet_id.eq.${filters.walletId}`
    );
  }
  if (filters?.categoryId && filters.categoryId !== "all") {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }
  if (filters?.month && filters.month !== "all") {
    query = query
      .gte("occurred_at", `${filters.month}-01`)
      .lte("occurred_at", getMonthEndDate(filters.month));
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const [{ data: txs }, { data: wallets }, { data: categories }, { data: profiles }] =
    await Promise.all([
      query,
      supabase.from("wallets").select("*").eq("space_id", spaceId),
      supabase.from("categories").select("*").eq("space_id", spaceId),
      supabase.from("profiles").select("*"),
    ]);

  const walletMap = new Map((wallets ?? []).map((w) => [w.id, w]));
  const catMap = new Map((categories ?? []).map((c) => [c.id, c]));
  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  let enriched: TransactionWithRelations[] = (txs ?? []).map((tx) => {
    const w = walletMap.get(tx.wallet_id);
    const dw = tx.destination_wallet_id
      ? walletMap.get(tx.destination_wallet_id)
      : null;
    const c = tx.category_id ? catMap.get(tx.category_id) : null;
    const p = profMap.get(tx.created_by);
    return {
      ...tx,
      amount: Number(tx.amount),
      wallet_name: w?.name ?? "Kantong",
      wallet_color: w?.color ?? "#0D6E52",
      destination_wallet_name: dw?.name ?? null,
      category_name:
        c?.name ??
        (tx.type === "transfer" ? "Transfer Antar Kantong" : "Tanpa Kategori"),
      category_icon:
        c?.icon ?? (tx.type === "transfer" ? "ArrowsLeftRight" : "Tag"),
      category_color: c?.color ?? "#5A655E",
      creator_name: p?.full_name ?? "Anggota",
    };
  });

  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    enriched = enriched.filter(
      (t) =>
        (t.note ?? "").toLowerCase().includes(q) ||
        (t.category_name ?? "").toLowerCase().includes(q) ||
        t.wallet_name.toLowerCase().includes(q)
    );
  }

  return enriched;
}

export async function getSpaceBudgetsWithProgress(
  spaceId: string,
  month: string = getCurrentMonthKey()
): Promise<BudgetWithProgress[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const [{ data: budgets }, { data: categories }, { data: txs }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("*")
        .eq("space_id", spaceId)
        .eq("month", month),
      supabase.from("categories").select("*").eq("space_id", spaceId),
      supabase
        .from("transactions")
        .select("category_id, amount, type, occurred_at")
        .eq("space_id", spaceId)
        .eq("type", "expense")
        .gte("occurred_at", `${month}-01`)
        .lte("occurred_at", getMonthEndDate(month)),
    ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c]));
  const spendByCat = new Map<string, number>();

  for (const tx of txs ?? []) {
    if (!tx.category_id) continue;
    spendByCat.set(
      tx.category_id,
      (spendByCat.get(tx.category_id) ?? 0) + Number(tx.amount)
    );
  }

  return (budgets ?? [])
    .map((b) => {
      const cat = catMap.get(b.category_id);
      const limit = Number(b.amount_limit);
      const spent = spendByCat.get(b.category_id) ?? 0;
      const remaining = limit - spent;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const status: "safe" | "warning" | "over" =
        percentage >= 100 ? "over" : percentage >= 75 ? "warning" : "safe";

      return {
        ...b,
        amount_limit: limit,
        category_name: cat?.name ?? "Kategori",
        category_icon: cat?.icon ?? "Tag",
        category_color: cat?.color ?? "#0D6E52",
        spent,
        remaining,
        percentage,
        status,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export async function getSpaceSplitBills(
  spaceId: string
): Promise<SplitBillWithParticipants[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const [{ data: bills }, { data: profiles }, { data: wallets }] =
    await Promise.all([
      supabase
        .from("split_bills")
        .select("*, split_bill_participants(*)")
        .eq("space_id", spaceId)
        .order("occurred_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("wallets").select("*").eq("space_id", spaceId),
    ]);

  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const walletMap = new Map((wallets ?? []).map((w) => [w.id, w]));

  return (bills ?? []).map((bill) => {
    const participants = (bill.split_bill_participants ?? []).map(
      (p: Record<string, unknown>) => ({
        id: String(p.id),
        split_bill_id: String(p.split_bill_id),
        user_id: p.user_id ? String(p.user_id) : null,
        participant_name: String(p.participant_name),
        share_amount: Number(p.share_amount),
        share_percentage:
          p.share_percentage !== null && p.share_percentage !== undefined
            ? Number(p.share_percentage)
            : null,
        is_paid: Boolean(p.is_paid),
        paid_at: p.paid_at ? String(p.paid_at) : null,
      })
    );
    const totalAmount = Number(bill.total_amount);
    const extraFee = Number(bill.extra_fee);
    const grandTotal = totalAmount + extraFee;
    const collected = participants
      .filter((p: { is_paid: boolean }) => p.is_paid)
      .reduce(
        (acc: number, p: { share_amount: number }) => acc + p.share_amount,
        0
      );

    return {
      id: bill.id,
      space_id: bill.space_id,
      title: bill.title,
      total_amount: totalAmount,
      extra_fee: extraFee,
      method: bill.method,
      paid_by_user_id: bill.paid_by_user_id,
      wallet_id: bill.wallet_id,
      status: bill.status,
      occurred_at: bill.occurred_at,
      created_by: bill.created_by,
      created_at: bill.created_at,
      paid_by_name:
        profMap.get(bill.paid_by_user_id)?.full_name ?? "Anggota",
      wallet_name: bill.wallet_id
        ? walletMap.get(bill.wallet_id)?.name ?? null
        : null,
      grand_total: grandTotal,
      collected_amount: collected,
      outstanding_amount: Math.max(0, grandTotal - collected),
      participants,
    };
  });
}

export async function getSpaceAnalytics(
  spaceId: string,
  month: string = getCurrentMonthKey()
): Promise<{
  monthlyCashflow: MonthlyCashflowPoint[];
  dailySpend: DailySpendPoint[];
  categoryBreakdown: CategorySpendPoint[];
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  savingsRate: number;
}> {
  const allTxs = await getSpaceTransactions(spaceId);

  const [selYear, selMonth] = month.split("-").map(Number);
  const monthsList: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selYear, selMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    monthsList.push(`${y}-${m}`);
  }

  const monthlyCashflow: MonthlyCashflowPoint[] = monthsList.map((mKey) => {
    const inMonth = allTxs.filter((t) => t.occurred_at.startsWith(mKey));
    const income = inMonth
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = inMonth
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      month: mKey,
      label: formatShortMonthLabel(mKey),
      income,
      expense,
      net: income - expense,
    };
  });

  const monthTxs = allTxs.filter((t) => t.occurred_at.startsWith(month));
  const monthIncome = monthTxs
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const monthExpense = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const monthNet = monthIncome - monthExpense;
  const savingsRate =
    monthIncome > 0
      ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
      : 0;

  const catMap = new Map<
    string,
    {
      category_id: string;
      name: string;
      color: string;
      icon: string;
      amount: number;
      transaction_count: number;
    }
  >();

  for (const tx of monthTxs) {
    if (tx.type !== "expense") continue;
    const cid = tx.category_id ?? "uncategorized";
    const existing = catMap.get(cid);
    if (existing) {
      existing.amount += tx.amount;
      existing.transaction_count += 1;
    } else {
      catMap.set(cid, {
        category_id: cid,
        name: tx.category_name ?? "Lainnya",
        color: tx.category_color ?? "#0D6E52",
        icon: tx.category_icon ?? "Tag",
        amount: tx.amount,
        transaction_count: 1,
      });
    }
  }

  const categoryBreakdown: CategorySpendPoint[] = Array.from(catMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      ...item,
      percentage:
        monthExpense > 0 ? Math.round((item.amount / monthExpense) * 100) : 0,
    }));

  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const dailySpend: DailySpendPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, "0");
    const dateKey = `${month}-${dayStr}`;
    const dayTxs = monthTxs.filter((t) => t.occurred_at.slice(0, 10) === dateKey);
    const expense = dayTxs
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    const income = dayTxs
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);
    dailySpend.push({
      date: dateKey,
      dayLabel: String(day),
      expense,
      income,
    });
  }

  return {
    monthlyCashflow,
    dailySpend,
    categoryBreakdown,
    monthIncome,
    monthExpense,
    monthNet,
    savingsRate,
  };
}

export async function getSpaceInvites(spaceId: string): Promise<SpaceInvite[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("space_invites")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as SpaceInvite[];
}

export async function getInvitePreviewByCode(
  code: string
): Promise<SpaceInvitePreview | null> {
  if (!isSupabaseConfigured()) return null;

  const cleanCode = code.trim().toUpperCase();
  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from("space_invites")
    .select("*, spaces(name), profiles(full_name)")
    .eq("code", cleanCode)
    .single();

  if (!invite) return null;
  const sp = Array.isArray(invite.spaces) ? invite.spaces[0] : invite.spaces;
  const pr = Array.isArray(invite.profiles)
    ? invite.profiles[0]
    : invite.profiles;

  return {
    ...invite,
    space_name: sp?.name ?? "Ruang Keluarga",
    inviter_name: pr?.full_name ?? "Pengundang",
  };
}

export function getTodayDateString(): string {
  return getTodayISO();
}
