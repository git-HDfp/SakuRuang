import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Format warna harus hex valid (contoh: #0D6E52)");

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

const monthStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format bulan harus YYYY-MM");

// 1. AUTH SCHEMAS
export const signInSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(80, "Nama lengkap maksimal 80 karakter"),
  email: z.string().trim().email("Masukkan alamat email yang valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

// 2. SPACE & INVITE SCHEMAS
export const createFamilySpaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama ruang keluarga minimal 2 karakter")
    .max(60, "Nama ruang keluarga maksimal 60 karakter"),
});

export const createSpaceInviteSchema = z.object({
  spaceId: z.string().min(1, "Space ID wajib diisi"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  maxUses: z.number().int().min(1).max(20).default(5),
});

export const acceptSpaceInviteSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, "Kode undangan minimal 6 karakter")
    .max(12, "Kode undangan tidak valid"),
});

// 3. WALLET SCHEMAS
export const walletTypeSchema = z.enum([
  "cash",
  "bank",
  "ewallet",
  "savings",
  "investment",
]);

export const createWalletSchema = z.object({
  spaceId: z.string().min(1, "Ruang wajib dipilih"),
  name: z
    .string()
    .trim()
    .min(1, "Nama kantong wajib diisi")
    .max(50, "Nama kantong maksimal 50 karakter"),
  type: walletTypeSchema,
  initialBalance: z
    .number()
    .int("Saldo harus bilangan bulat")
    .min(0, "Saldo awal tidak boleh negatif")
    .max(1_000_000_000_000, "Saldo melebihi batas"),
  color: hexColorSchema.default("#0D6E52"),
  icon: z.string().min(1).max(40).default("Wallet"),
});

export const updateWalletSchema = z.object({
  id: z.string().min(1, "ID kantong wajib diisi"),
  name: z
    .string()
    .trim()
    .min(1, "Nama kantong wajib diisi")
    .max(50, "Nama kantong maksimal 50 karakter"),
  type: walletTypeSchema,
  color: hexColorSchema,
  icon: z.string().min(1).max(40),
});

export const transferWalletSchema = z
  .object({
    spaceId: z.string().min(1, "Ruang wajib dipilih"),
    sourceWalletId: z.string().min(1, "Pilih kantong asal"),
    destinationWalletId: z.string().min(1, "Pilih kantong tujuan"),
    amount: z
      .number()
      .int()
      .positive("Nominal transfer harus lebih dari Rp 0")
      .max(1_000_000_000_000, "Nominal terlalu besar"),
    occurredAt: dateStringSchema,
    note: z.string().trim().max(200, "Catatan maksimal 200 karakter").optional(),
  })
  .refine((data) => data.sourceWalletId !== data.destinationWalletId, {
    message: "Kantong tujuan harus berbeda dari kantong asal",
    path: ["destinationWalletId"],
  });

// 4. CATEGORY SCHEMAS
export const createCategorySchema = z.object({
  spaceId: z.string().min(1, "Ruang wajib dipilih"),
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi")
    .max(40, "Nama kategori maksimal 40 karakter"),
  type: z.enum(["income", "expense"]),
  icon: z.string().min(1).max(40).default("Tag"),
  color: hexColorSchema.default("#0D6E52"),
});

// 5. TRANSACTION SCHEMAS
export const createTransactionSchema = z
  .object({
    spaceId: z.string().min(1, "Ruang wajib dipilih"),
    type: z.enum(["income", "expense", "transfer"]),
    walletId: z.string().min(1, "Kantong sumber wajib dipilih"),
    destinationWalletId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    amount: z
      .number()
      .int("Nominal harus bilangan bulat")
      .positive("Nominal transaksi harus lebih dari Rp 0")
      .max(1_000_000_000_000, "Nominal melebihi batas"),
    occurredAt: dateStringSchema,
    note: z.string().trim().max(240, "Catatan maksimal 240 karakter").optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "transfer") {
      if (!val.destinationWalletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kantong tujuan wajib dipilih untuk transfer",
          path: ["destinationWalletId"],
        });
      } else if (val.destinationWalletId === val.walletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kantong tujuan tidak boleh sama dengan kantong asal",
          path: ["destinationWalletId"],
        });
      }
    } else if (!val.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kategori wajib dipilih",
        path: ["categoryId"],
      });
    }
  });

// 6. BUDGET SCHEMAS
export const upsertBudgetSchema = z.object({
  spaceId: z.string().min(1, "Ruang wajib dipilih"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  month: monthStringSchema,
  amountLimit: z
    .number()
    .int("Batas anggaran harus bilangan bulat")
    .positive("Batas anggaran harus lebih dari Rp 0")
    .max(1_000_000_000_000, "Nominal melebihi batas"),
});

// 7. SPLIT BILL SCHEMAS
export const splitParticipantInputSchema = z.object({
  userId: z.string().nullable().optional(),
  participantName: z
    .string()
    .trim()
    .min(1, "Nama peserta wajib diisi")
    .max(60, "Nama peserta maksimal 60 karakter"),
  shareAmount: z
    .number()
    .int()
    .min(0, "Bagian peserta tidak boleh negatif"),
  sharePercentage: z.number().min(0).max(100).nullable().optional(),
  isPaid: z.boolean().default(false),
});

export const createSplitBillSchema = z
  .object({
    spaceId: z.string().min(1, "Ruang wajib dipilih"),
    title: z
      .string()
      .trim()
      .min(2, "Judul patungan minimal 2 karakter")
      .max(100, "Judul patungan maksimal 100 karakter"),
    totalAmount: z
      .number()
      .int()
      .positive("Total tagihan harus lebih dari Rp 0")
      .max(1_000_000_000_000, "Nominal terlalu besar"),
    extraFee: z.number().int().min(0, "Pajak/biaya tidak boleh negatif").default(0),
    method: z.enum(["equal", "exact", "percentage"]),
    paidByUserId: z.string().min(1, "Pembayar utama wajib dipilih"),
    walletId: z.string().nullable().optional(),
    occurredAt: dateStringSchema,
    participants: z
      .array(splitParticipantInputSchema)
      .min(2, "Split bill membutuhkan minimal 2 peserta"),
  })
  .superRefine((val, ctx) => {
    const grandTotal = val.totalAmount + val.extraFee;
    const sumShares = val.participants.reduce((acc, p) => acc + p.shareAmount, 0);

    if (Math.abs(sumShares - grandTotal) > val.participants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total bagian peserta (Rp ${sumShares.toLocaleString("id-ID")}) belum sama dengan total tagihan (Rp ${grandTotal.toLocaleString("id-ID")})`,
        path: ["participants"],
      });
    }

    if (val.method === "percentage") {
      const sumPct = val.participants.reduce(
        (acc, p) => acc + (p.sharePercentage ?? 0),
        0
      );
      if (Math.abs(sumPct - 100) > 0.5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total persentase harus 100% (saat ini ${sumPct.toFixed(1)}%)`,
          path: ["participants"],
        });
      }
    }
  });

export const toggleSplitParticipantPaidSchema = z.object({
  participantId: z.string().min(1, "ID peserta wajib diisi"),
  isPaid: z.boolean(),
  recordSettlementTransaction: z.boolean().default(false),
});

// 8. REPORT EXPORT FILTER SCHEMA
export const reportFilterSchema = z
  .object({
    mode: z.enum(["weekly", "monthly", "custom"]),
    weekAnchorDate: dateStringSchema.optional(),
    month: monthStringSchema.optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "monthly" && !val.month) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih bulan laporan terlebih dahulu",
        path: ["month"],
      });
    }
    if (val.mode === "custom") {
      if (!val.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tanggal mulai wajib diisi",
          path: ["startDate"],
        });
      }
      if (!val.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tanggal akhir wajib diisi",
          path: ["endDate"],
        });
      }
      if (val.startDate && val.endDate && val.startDate > val.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tanggal mulai tidak boleh melewati tanggal akhir",
          path: ["endDate"],
        });
      }
    }
  });
