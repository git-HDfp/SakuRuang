export type SpaceType = "personal" | "family";
export type SpaceRole = "owner" | "admin" | "member";
export type WalletType = "cash" | "bank" | "ewallet" | "savings" | "investment";
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryType = "income" | "expense";
export type SplitMethod = "equal" | "exact" | "percentage";
export type SplitStatus = "open" | "settled";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  created_by: string;
  created_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: SpaceRole;
  joined_at: string;
}

export interface SpaceMemberWithProfile extends SpaceMember {
  profile: Profile;
}

export interface SpaceWithRole extends Space {
  role: SpaceRole;
  member_count: number;
}

export interface SpaceInvite {
  id: string;
  space_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  revoked_at: string | null;
  created_at: string;
}

export interface SpaceInvitePreview extends SpaceInvite {
  space_name: string;
  inviter_name: string;
}

export interface Wallet {
  id: string;
  space_id: string;
  name: string;
  type: WalletType;
  balance: number;
  color: string;
  icon: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
}

export interface Category {
  id: string;
  space_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  space_id: string;
  wallet_id: string;
  destination_wallet_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
}

export interface TransactionWithRelations extends Transaction {
  wallet_name: string;
  wallet_color: string;
  destination_wallet_name: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  creator_name: string;
}

export interface Budget {
  id: string;
  space_id: string;
  category_id: string;
  month: string;
  amount_limit: number;
  created_by: string;
  created_at: string;
}

export interface BudgetWithProgress extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "over";
}

export interface SplitBillParticipant {
  id: string;
  split_bill_id: string;
  user_id: string | null;
  participant_name: string;
  share_amount: number;
  share_percentage: number | null;
  is_paid: boolean;
  paid_at: string | null;
}

export interface SplitBill {
  id: string;
  space_id: string;
  title: string;
  total_amount: number;
  extra_fee: number;
  method: SplitMethod;
  paid_by_user_id: string;
  wallet_id: string | null;
  status: SplitStatus;
  occurred_at: string;
  created_by: string;
  created_at: string;
}

export interface SplitBillWithParticipants extends SplitBill {
  paid_by_name: string;
  wallet_name: string | null;
  grand_total: number;
  collected_amount: number;
  outstanding_amount: number;
  participants: SplitBillParticipant[];
}

export interface MonthlyCashflowPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface DailySpendPoint {
  date: string;
  dayLabel: string;
  expense: number;
  income: number;
}

export interface CategorySpendPoint {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface AppSessionContext {
  user: Profile;
  spaces: SpaceWithRole[];
  activeSpace: SpaceWithRole;
  members: SpaceMemberWithProfile[];
  wallets: Wallet[];
  categories: Category[];
  storageMode: "supabase";
}

export type ReportPeriodMode = "weekly" | "monthly" | "custom";

export interface ReportFilterInput {
  mode: ReportPeriodMode;
  weekAnchorDate?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportCategorySummaryItem {
  categoryName: string;
  color: string;
  type: "income" | "expense";
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface ReportWalletSummaryItem {
  walletName: string;
  estimatedOpeningBalance: number;
  currentBalance: number;
  periodInflow: number;
  periodOutflow: number;
  sharePercentage: number;
}

export interface ReportDailyTrendItem {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface ReportMutationRow {
  rowNumber: number;
  date: string;
  txCode: string;
  description: string;
  categoryName: string;
  walletInfo: string;
  recordedBy: string;
  type: TransactionType;
  creditIncome: number;
  debitExpense: number;
  transferAmount: number;
  runningNet: number;
}

export interface FinancialReportPayload {
  reportId: string;
  accountName: string;
  accountEmail: string;
  spaceName: string;
  spaceTypeLabel: string;
  periodMode: ReportPeriodMode;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  generatedAtLabel: string;
  generatedTimestamp: string;
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netCashflow: number;
  savingsRate: number;
  avgDailyExpense: number;
  avgTransactionExpense: number;
  transactionCount: number;
  healthStatus: {
    label: string;
    summary: string;
    tone: "safe" | "warning" | "danger";
  };
  insights: string[];
  dailyTrend: ReportDailyTrendItem[];
  categoryBreakdown: ReportCategorySummaryItem[];
  walletBreakdown: ReportWalletSummaryItem[];
  mutationRows: ReportMutationRow[];
  transactions: TransactionWithRelations[];
}
