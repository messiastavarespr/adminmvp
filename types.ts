
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
  ADMIN = 'ADMIN',
  TREASURER = 'TREASURER',
  PASTOR = 'PASTOR',
  MEMBER = 'MEMBER'
}

export type AppView = 'dashboard' | 'ledger' | 'scheduled' | 'payables' | 'reports' | 'members' | 'settings' | 'reconciliation' | 'tools' | 'chartOfAccounts' | 'registries';

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
  email?: string;
  role: UserRole;
  avatarInitials: string;
  memberId?: string;
  churchId: string;
  observations?: string;
  password?: string; // Hashed password
  avatarUrl?: string;
  permissions?: UserPermissions;
}

export interface Member {
  id: string;
  name: string;
  type: 'MEMBER' | 'VISITOR' | 'SUPPLIER';
  churchId: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  birthDate?: string;
  baptismDate?: string;
  document?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  churchId: string;
  image?: string;
  accountingCode?: string; // Link to AccountingAccount.code
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  churchId: string;
  accountingCode?: string; // Link to AccountingAccount.code (usually an ASSET account)
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
  budgets: Budget[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  theme: 'light' | 'dark';
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
