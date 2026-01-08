
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum RecurrenceType {
  NONE = 'NONE',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum UserRole {
  MASTER = 'MASTER',
  ADMIN = 'ADMIN',
  TREASURER = 'TREASURER',
  SECRETARY = 'SECRETARY',
  PASTOR = 'PASTOR',
  MEMBER = 'MEMBER'
}

export type AppView = 'dashboard' | 'ledger' | 'scheduled' | 'payables' | 'reports' | 'members' | 'settings' | 'reconciliation' | 'tools' | 'chartOfAccounts' | 'registries' | 'tithes' | 'assets';

export interface Church {
  id: string;
  name: string;
  type: 'HEADQUARTERS' | 'BRANCH';
  logo?: string;
  login?: string;
  password?: string; // Now stores HASH
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface CostCenter {
  id: string;
  name: string;
  churchId: string;
}

// New Entity: Fund / Project
export interface Fund {
  id: string;
  name: string;
  description?: string;
  type: 'UNRESTRICTED' | 'RESTRICTED'; // Unrestricted (General) vs Restricted (Specific Purpose)
  churchId: string;
  isSystemDefault?: boolean;
  order?: number; // For manual ordering
}

// New Entity: Accounting (Plano de Contas)
export interface AccountingAccount {
  id: string;
  code: string; // e.g. "1.1.01"
  name: string; // e.g. "Caixa Geral"
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  churchId: string;
  isSystemDefault?: boolean; // If true, shouldn't be deleted easily
  order?: number; // For drag and drop ordering
  relatedCategoryId?: string; // Link to internal Category
}

export interface UserPermissions {
  manageCategories: boolean;
  manageAccounts: boolean;
  manageCostCenters: boolean;
  manageBudgets: boolean;
  manageChurches: boolean;
  manageUsers: boolean;
  manageFunds: boolean;
  viewAuditLog: boolean;
  performBackup: boolean;
  performRestore: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string; // Now required for Auth
  role: UserRole;
  avatarInitials: string;
  memberId?: string;
  churchId: string;
  observations?: string;
  password?: string; // Legacy field, can be kept for backward compat or reference, but auth handles it now
  avatarUrl?: string;
  permissions?: UserPermissions;
  allowedChurches?: string[];
  accessMvpSec?: boolean;
  accessMvpFin?: boolean;
}

export interface Member {
  id: string;
  name: string;
  type: 'MEMBER' | 'VISITOR' | 'SUPPLIER';
  churchId: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
  birthDate?: string;
  baptismDate?: string;
  maritalStatus?: string;
  gender?: string;
  rg?: string;
  document?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OBSERVATION';
  tags?: string[];

  // Secretariat Fields - Personal
  nationality?: string;
  naturalness?: string;
  profession?: string;
  educationLevel?: string;
  fatherName?: string;
  motherName?: string;
  photoUrl?: string;
  documentIssuer?: string;

  // Secretariat Fields - Ecclesiastical
  conversionDate?: string;
  baptismHolySpirit?: boolean;
  previousChurch?: string;
  entryMethod?: string;
  exitDate?: string;
  exitReason?: string;

  // Secretariat Fields - Family
  spouseId?: string;
  weddingDate?: string;
  children?: string; // JSON string or text description for now

  // Secretariat Fields - Organization
  role?: string; // Cargo Ecclesiastico
  category?: string; // Categoria de Membro
}

export interface AssetCategory {
  id: string;
  name: string;
  churchId: string;
  description?: string;
  isSystemDefault?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  categoryId: string; // References AssetCategory.id
  category?: 'FURNITURE' | 'ELECTRONICS' | 'INSTRUMENTS' | 'VEHICLES' | 'OTHER'; // DEPRECATED used for migration
  acquisitionDate?: string;
  value?: number;
  location?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED';
  notes?: string;
  churchId: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  churchId: string;
  image?: string;
  icon?: string;
  accountingCode?: string; // Link to AccountingAccount.code
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  churchId: string;
  accountingCode?: string; // Link to AccountingAccount.code (usually an ASSET account)
  icon?: string;
  order?: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  categoryId?: string;
  costCenterId?: string;
  fundId: string; // Mandatory Fund Link
  accountId: string;
  type: TransactionType;
  transferDirection?: 'IN' | 'OUT';
  memberOrSupplierId?: string;
  memberOrSupplierName?: string;
  attachments: string[];
  isPaid: boolean;
  scheduledId?: string;
  relatedTransactionId?: string;
  churchId: string;
  reconciled?: boolean;
  createdBy?: string;
}

export interface ScheduledTransaction {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  categoryId: string;
  costCenterId?: string;
  fundId: string; // Mandatory Fund Link
  type: TransactionType;
  recurrence: RecurrenceType;
  occurrences?: number; // Total remaining occurrences (undefined = infinite)
  isActive: boolean;
  isBankScheduled?: boolean;
  documentUrl?: string; // Link to external document (e.g. Drive, Boleto)
  churchId: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  churchId: string;
}

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'RESTORE' | 'RECONCILE';
  entity: 'TRANSACTION' | 'MEMBER' | 'ACCOUNT' | 'CATEGORY' | 'SYSTEM' | 'BUDGET' | 'FUND';
  details: string;
  churchId: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  read: boolean;
  date: string;
}

export interface AppData {
  transactions: Transaction[];
  scheduled: ScheduledTransaction[];
  categories: Category[];
  costCenters: CostCenter[];
  funds: Fund[];
  accountingAccounts: AccountingAccount[]; // New Array
  accounts: Account[];
  users: User[];
  members: Member[];
  churches: Church[];
  assets: Asset[];
  assetCategories: AssetCategory[];
  budgets: Budget[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  theme: 'light' | 'dark';

  // Dynamic Lists
  memberRoles: string[];
  memberCategories: string[];
}

// Bank Reconciliation Types
export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  fitId: string;
}

export interface ReconciliationMatch {
  bankTx: BankTransaction;
  sysTx?: Transaction;
  matchType: 'EXACT' | 'PROBABLE' | 'NONE';
}

export interface SystemWarning {
  id: string;
  title: string;
  message: string;
  active: boolean;
  created_at: string;
  created_by?: string;
  users?: { name: string };
}

export interface WarningRead {
  id: string;
  user_id: string;
  warning_id: string;
  read_at: string;
}
