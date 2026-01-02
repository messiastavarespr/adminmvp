
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData, Transaction, ScheduledTransaction, User, Church, TransactionType, AuditLog, AppView, Category, Account, Member, CostCenter, Fund, Budget, AccountingAccount, Asset, AssetCategory, UserRole } from '../types';

import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

interface FinanceContextProps {
  data: AppData;
  currentUser: User | null;
  activeChurchId: string;
  isLoading: boolean;

  // Navigation
  // activeTab removed in favor of React Router

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

  // Member Roles & Categories Management
  addMemberRole: (role: string) => void;
  removeMemberRole: (role: string) => void;
  updateMemberRole: (oldRole: string, newRole: string) => void; // NEW
  addMemberCategory: (cat: string) => void;
  removeMemberCategory: (cat: string) => void;
  updateMemberCategory: (oldCat: string, newCat: string) => void; // NEW

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

  addAsset: (a: Asset) => void;
  updateAsset: (a: Asset) => void;
  deleteAsset: (id: string) => void;

  addAssetCategory: (ac: AssetCategory) => void;
  updateAssetCategory: (ac: AssetCategory) => void;
  deleteAssetCategory: (id: string) => void;

  logAction: (action: string, level: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM', details: string) => void;
  resetSystem: (options: { transactions: boolean; members: boolean; budgets: boolean; settings: boolean; audit: boolean }) => Promise<void>;
  toggleTheme: () => void;
  loadMoreAuditLogs: () => Promise<void>;
  uploadAttachment: (file: File) => Promise<string>;
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
  memberRoles: ['Pastor', 'Presbítero', 'Diácono', 'Cooperador', 'Líder de Departamento', 'Músico', 'Professor EBD', 'Zelador', 'Secretário', 'Tesoureiro'], // Defaults
  memberCategories: ['Membro Comungante', 'Membro Não Comungante', 'Congregado', 'Criança', 'Visitante Frequente'], // Defaults
  churches: [],
  budgets: [],
  auditLogs: [],
  notifications: [],
  assets: [],
  assetCategories: [],
  theme: 'dark',
};

export const FinanceProvider = ({ children }: { children?: ReactNode }) => {
  const [data, setData] = useState<AppData>(initialData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChurchId, setActiveChurchId] = useState<string>('');
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

  // REMOVED: Redundant loadData() on mount. We relying on Auth Check below.
  // useEffect(() => {
  //   loadData();
  // }, []);

  // Safety Timeout: Prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Forcing loading to finish after timeout.");
        setIsLoading(false);
      }
    }, 8000); // 8 seconds grace period
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Sync currentUser with latest data
  useEffect(() => {
    if (currentUser && data.users.length > 0) {
      // Find the updated user object in the new data
      const updatedUser = data.users.find(u => u.id === currentUser.id);

      // If found and different, update internal state
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        // Preserve specific fields if needed, but usually we want the DB truth
        // Special case: Master with "ALL" churchId might be local-only override?
        // Let's check if the updatedUser lacks permissions or role if we forced them.

        // If it was the generated Master user (which might not exist in users list if not synced),
        // updatedUser would be undefined, so this block won't run.
        console.log("Syncing currentUser with updated data...");
        setCurrentUser(updatedUser);

        // Also update church if it was dependent on the user's church
        if (updatedUser.churchId !== activeChurchId && activeChurchId !== 'ALL') {
          // Maybe don't switch church automatically as it might be annoying
          // setActiveChurchId(updatedUser.churchId);
        }
      }
    }
  }, [data.users]);


  // Restore Session Logic
  // Restore Session Logic
  useEffect(() => {

    // Safety Wrapper for Session Check
    const checkSession = () => new Promise<any>((resolve) => {
      // Force resolve null if client hangs for 4s
      const t = setTimeout(() => resolve({ data: { session: null } }), 4000);

      supabase.auth.getSession().then(res => {
        clearTimeout(t);
        resolve(res);
      }).catch(err => {
        console.error("Auth Check Error:", err);
        resolve({ data: { session: null } });
      });
    });

    checkSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch User Profile
        supabaseService.getData().then(fetchedData => {
          const userProfile = fetchedData.users.find(u => u.email === session.user.email);
          if (userProfile) {
            setCurrentUser(userProfile);
            setActiveChurchId(userProfile.churchId);
          } else {
            // Master Fallback if profile missing in DB scan
            if (session.user.email === 'msig12@gmail.com') {
              console.log("Master detected without sync profile - FORCING ALL ACCESS");
              const master: User = {
                id: session.user.id,
                name: 'Messias (Master)',
                email: 'msig12@gmail.com',
                role: UserRole.MASTER,
                avatarInitials: 'MS',
                churchId: 'ALL' // Force ALL for internal checks
              };
              setCurrentUser(master);
              setActiveChurchId('ALL'); // Force Global View
            }
          }
          setData(fetchedData);
        }).catch(err => {
          console.error("Failed to restore session data:", err);
          loadData();
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
        loadData();
      }
    });

    // Remove onAuthStateChange listener for now as it might be unstable with the hangs
    // or keep it but minimal? 
    // If the client is hanging, onAuthStateChange might never fire or hang.
    // Let's keep it but trust the explicit check above first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Minimal Logic
      if (!session) setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
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
    localStorage.setItem('mvp_user_id', user.id); // Persist
    localStorage.setItem('mvp_active_church', user.churchId);
    supabaseService.logAction(user, 'LOGIN', 'SYSTEM', 'Login realizado via Contexto (Supabase)');
  };

  const logout = () => {
    if (currentUser) {
      supabaseService.logAction(currentUser, 'LOGIN', 'SYSTEM', 'Logout realizado');
    }
    setCurrentUser(null);
    localStorage.removeItem('mvp_user_id'); // Clear
    localStorage.removeItem('mvp_active_church');
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
  const reorderAccounts = async (orderedAccounts: Account[]) => {
    // Optimistic Update
    const newAccounts = data.accounts.map(acc => {
      const updated = orderedAccounts.find(u => u.id === acc.id);
      return updated ? updated : acc;
    });
    setData({ ...data, accounts: newAccounts });

    // Persist (Batch)
    await Promise.all(orderedAccounts.map(a => supabaseService.updateAccount(a)));
    refreshData();
  };
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

  const addAsset = async (a: Asset) => { await supabaseService.addAsset(a); refreshData(); };
  const updateAsset = async (a: Asset) => { await supabaseService.updateAsset(a); refreshData(); };
  const deleteAsset = async (id: string) => { await supabaseService.deleteAsset(id); refreshData(); };

  const addAssetCategory = async (ac: AssetCategory) => { await supabaseService.addAssetCategory(ac); refreshData(); };
  const updateAssetCategory = async (ac: AssetCategory) => { await supabaseService.updateAssetCategory(ac); refreshData(); };
  const deleteAssetCategory = async (id: string) => { await supabaseService.deleteAssetCategory(id); refreshData(); };

  return (
    <FinanceContext.Provider value={{
      data,
      currentUser,
      activeChurchId,
      isLoading,
      login,
      logout,
      setActiveChurch: (id: string) => {
        setActiveChurchId(id);
        localStorage.setItem('mvp_active_church', id);
      },
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
      reorderAccounts,
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
      addMemberRole: (role) => setData(prev => ({ ...prev, memberRoles: [...(prev.memberRoles || []), role] })),
      removeMemberRole: (role) => setData(prev => ({ ...prev, memberRoles: (prev.memberRoles || []).filter(r => r !== role) })),
      updateMemberRole: (oldRole, newRole) => setData(prev => ({
        ...prev,
        memberRoles: (prev.memberRoles || []).map(r => r === oldRole ? newRole : r),
        members: prev.members.map(m => m.role === oldRole ? { ...m, role: newRole } : m)
      })),
      addMemberCategory: (cat) => setData(prev => ({ ...prev, memberCategories: [...(prev.memberCategories || []), cat] })),
      removeMemberCategory: (cat) => setData(prev => ({ ...prev, memberCategories: (prev.memberCategories || []).filter(c => c !== cat) })),
      updateMemberCategory: (oldCat, newCat) => setData(prev => ({
        ...prev,
        memberCategories: (prev.memberCategories || []).map(c => c === oldCat ? newCat : c),
        members: prev.members.map(m => m.category === oldCat ? { ...m, category: newCat } : m)
      })),
      addUser,
      updateUser,
      deleteUser,
      addMember,
      updateMember,
      deleteMember,
      mergeMembers: async (fromId: string, toId: string) => {
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.PASTOR && currentUser?.role !== UserRole.SECRETARY) {
          throw new Error('Permissão negada.');
        }
        await supabaseService.mergeMembers(fromId, toId);
        await supabaseService.logAction(currentUser, 'MERGE', 'MEMBER', `Unificou membros: ${fromId} -> ${toId}`);
        refreshData();
      },
      setBudget,
      deleteBudget,
      addAccountingAccount,
      updateAccountingAccount,
      deleteAccountingAccount,
      addAsset,
      updateAsset,
      deleteAsset,
      addAssetCategory,
      updateAssetCategory,
      deleteAssetCategory,
      resetSystem: async (options) => {
        if (currentUser?.role !== UserRole.ADMIN) throw new Error('Apenas administradores podem resetar o sistema.');
        await supabaseService.resetData(options);
        // Log the reset
        supabaseService.logAction(currentUser, 'RESET', 'SYSTEM', `Reset parcial realizado: ${JSON.stringify(options)}`);
        refreshData();
      },
      logAction: (action: string, level: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM', details: string) => {
        if (currentUser) {
          supabaseService.logAction(currentUser, action, level, details);
        }
      },
      toggleTheme: () => {
        const newTheme = data.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('mvp_theme', newTheme);
        setData(prev => ({ ...prev, theme: newTheme }));
      },
      loadMoreAuditLogs: async () => {
        const currentCount = data.auditLogs.length;
        const page = Math.floor(currentCount / 50); // Assumption: pageSize=50
        const newLogs = await supabaseService.getMoreAuditLogs(page);
        if (newLogs.length > 0) {
          setData(prev => ({ ...prev, auditLogs: [...prev.auditLogs, ...newLogs] }));
        }
      },
      uploadAttachment: supabaseService.uploadAttachment
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
