
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData, Transaction, ScheduledTransaction, User, Church, TransactionType, AuditLog, AppView, Category, Account, Member, CostCenter, Fund, Budget, AccountingAccount } from '../types';
import { storageService } from '../services/storageService';
import { supabaseService } from '../services/supabaseService';

interface FinanceContextProps {
  data: AppData;
  currentUser: User | null;
  activeChurchId: string;
  isLoading: boolean;

  // Navigation
  activeTab: AppView;
  setActiveTab: (tab: AppView) => void;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  setActiveChurch: (id: string) => void;
  refreshData: () => void;

  // CRUD Wrappers
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;

  // Helpers
  hashPassword: (pwd: string) => Promise<string>;
  verifyPassword: (pwd: string, hash: string) => Promise<boolean>;

  // Data Passing
  pendingImportData: string | null;
  setPendingImportData: (data: string | null) => void;

  // Additional CRUD wrappers needed for components that might use Context
  addCategory: (c: Category) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  addScheduled: (s: ScheduledTransaction) => void;
  updateScheduled: (s: ScheduledTransaction) => void;
  deleteScheduled: (id: string) => void;
  processScheduled: (id: string, accountId: string, date: string) => void;

  addTransfer: (amount: number, fromId: string, toId: string, fundId: string, date: string, desc: string) => void;

  addAccount: (a: Account) => void;
  updateAccount: (a: Account) => void;
  deleteAccount: (id: string) => void;

  addCostCenter: (cc: CostCenter) => void;
  updateCostCenter: (cc: CostCenter) => void;
  deleteCostCenter: (id: string) => void;

  addFund: (f: Fund) => void;
  updateFund: (f: Fund) => void;
  deleteFund: (id: string) => void;

  addChurch: (c: Church) => void;
  updateChurch: (c: Church) => void;
  deleteChurch: (id: string) => void;

  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;

  addMember: (m: Member) => void;
  updateMember: (m: Member) => void;
  deleteMember: (id: string) => void;

  setBudget: (b: Budget) => void;
  deleteBudget: (catId: string) => void;

  addAccountingAccount: (a: AccountingAccount) => void;
  updateAccountingAccount: (a: AccountingAccount) => void;
  deleteAccountingAccount: (id: string) => void;

  logAction: (action: string, level: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM', details: string) => void;
  toggleTheme: () => void;
}

const FinanceContext = createContext<FinanceContextProps | undefined>(undefined);

// Initial Empty Data System
const initialData: AppData = {
  transactions: [],
  scheduled: [],
  categories: [],
  costCenters: [],
  funds: [],
  accountingAccounts: [],
  accounts: [],
  users: [],
  members: [],
  churches: [],
  budgets: [],
  auditLogs: [],
  notifications: [],
  theme: 'light',
};

export const FinanceProvider = ({ children }: { children?: ReactNode }) => {
  const [data, setData] = useState<AppData>(initialData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChurchId, setActiveChurchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AppView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedData = await supabaseService.getData();

      // Persist Theme from LocalStorage
      const storedTheme = localStorage.getItem('mvp_theme') as 'light' | 'dark';
      if (storedTheme) {
        fetchedData.theme = storedTheme;
      }

      setData(fetchedData);
    } catch (error) {
      console.error("Failed to load data from Supabase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = () => {
    supabaseService.getData().then(fetchedData => {
      const storedTheme = localStorage.getItem('mvp_theme') as 'light' | 'dark';
      if (storedTheme) {
        fetchedData.theme = storedTheme;
      }
      setData(fetchedData);
    }).catch(console.error);
  };

  const login = (user: User) => {
    setCurrentUser(user);
    setActiveChurchId(user.churchId);
    supabaseService.logAction(user, 'LOGIN', 'SYSTEM', 'Login realizado via Contexto (Supabase)');
  };

  const logout = () => {
    if (currentUser) {
      supabaseService.logAction(currentUser, 'LOGIN', 'SYSTEM', 'Logout realizado');
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const hashPassword = async (password: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    const computedHash = await hashPassword(password);
    return computedHash === hash;
  };

  const addTransaction = async (t: Transaction) => {
    await supabaseService.addTransaction(t);
    refreshData();
  };

  const updateTransaction = async (t: Transaction) => {
    await supabaseService.updateTransaction(t);
    refreshData();
  };

  const deleteTransaction = async (id: string) => {
    await supabaseService.deleteTransaction(id);
    refreshData();
  };

  const addCategory = async (c: Category) => {
    await supabaseService.addCategory(c);
    refreshData();
  };

  const deleteCategory = async (id: string) => {
    await supabaseService.deleteCategory(id);
    refreshData();
  };

  const addScheduled = async (s: ScheduledTransaction) => {
    await supabaseService.addScheduled(s);
    refreshData();
  };

  const updateScheduled = async (s: ScheduledTransaction) => {
    await supabaseService.updateScheduled(s);
    refreshData();
  };

  const deleteScheduled = async (id: string) => {
    await supabaseService.deleteScheduled(id);
    refreshData();
  };

  const processScheduled = async (id: string, accountId: string, date: string) => {
    await supabaseService.processScheduledTransaction(id, accountId, date, currentUser);
    refreshData();
  };

  const addTransfer = async (amount: number, fromId: string, toId: string, fundId: string, date: string, desc: string) => {
    await supabaseService.addTransfer(amount, fromId, toId, fundId, date, desc, activeChurchId, currentUser);
    refreshData();
  };

  const updateCategory = async (c: Category) => { await supabaseService.updateCategory(c); refreshData(); };

  const addAccount = async (a: Account) => { await supabaseService.addAccount(a); refreshData(); };
  const updateAccount = async (a: Account) => { await supabaseService.updateAccount(a); refreshData(); };
  const deleteAccount = async (id: string) => { await supabaseService.deleteAccount(id); refreshData(); };

  const addCostCenter = async (cc: CostCenter) => { await supabaseService.addCostCenter(cc); refreshData(); };
  const updateCostCenter = async (cc: CostCenter) => { await supabaseService.updateCostCenter(cc); refreshData(); };
  const deleteCostCenter = async (id: string) => { await supabaseService.deleteCostCenter(id); refreshData(); };

  const addFund = async (f: Fund) => { await supabaseService.addFund(f); refreshData(); };
  const updateFund = async (f: Fund) => { await supabaseService.updateFund(f); refreshData(); };
  const deleteFund = async (id: string) => { await supabaseService.deleteFund(id); refreshData(); };

  const addChurch = async (c: Church) => { await supabaseService.addChurch(c); refreshData(); };
  const updateChurch = async (c: Church) => { await supabaseService.updateChurch(c); refreshData(); };
  const deleteChurch = async (id: string) => { await supabaseService.deleteChurch(id); refreshData(); };

  const addUser = async (u: User) => { await supabaseService.addUser(u); refreshData(); };
  const updateUser = async (u: User) => { await supabaseService.updateUser(u); refreshData(); };
  const deleteUser = async (id: string) => { await supabaseService.deleteUser(id); refreshData(); };

  const addMember = async (m: Member) => { await supabaseService.addMember(m); refreshData(); };
  const updateMember = async (m: Member) => { await supabaseService.updateMember(m); refreshData(); };
  const deleteMember = async (id: string) => { await supabaseService.deleteMember(id); refreshData(); };

  const setBudget = async (b: Budget) => { await supabaseService.setBudget(b); refreshData(); };
  const deleteBudget = async (id: string) => { await supabaseService.deleteBudget(id); refreshData(); };

  const addAccountingAccount = async (a: AccountingAccount) => { await supabaseService.addAccountingAccount(a); refreshData(); };
  const updateAccountingAccount = async (a: AccountingAccount) => { await supabaseService.updateAccountingAccount(a); refreshData(); };
  const deleteAccountingAccount = async (id: string) => { await supabaseService.deleteAccountingAccount(id); refreshData(); };

  return (
    <FinanceContext.Provider value={{
      data,
      currentUser,
      activeChurchId,
      isLoading,
      activeTab,
      setActiveTab,
      login,
      logout,
      setActiveChurch: setActiveChurchId,
      refreshData,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      hashPassword,
      verifyPassword,
      pendingImportData,
      setPendingImportData,
      addCategory,
      updateCategory,
      deleteCategory,
      addScheduled,
      updateScheduled,
      deleteScheduled,
      processScheduled,
      addTransfer,
      addAccount,
      updateAccount,
      deleteAccount,
      addCostCenter,
      updateCostCenter,
      deleteCostCenter,
      addFund,
      updateFund,
      deleteFund,
      addChurch,
      updateChurch,
      deleteChurch,
      addUser,
      updateUser,
      deleteUser,
      addMember,
      updateMember,
      deleteMember,
      setBudget,
      deleteBudget,
      addAccountingAccount,
      updateAccountingAccount,
      deleteAccountingAccount,
      logAction: (action: string, level: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM', details: string) => {
        if (currentUser) {
          supabaseService.logAction(currentUser, action, level, details);
        }
      },
      toggleTheme: () => {
        const newTheme = data.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('mvp_theme', newTheme);
        setData(prev => ({ ...prev, theme: newTheme }));
      }
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
