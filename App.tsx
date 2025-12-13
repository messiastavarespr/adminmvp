
import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, Building2 } from './components/ui/Icons';
import { FinanceProvider, useFinance } from './contexts/FinanceContext';
import { AppData, Transaction, TransactionType, ScheduledTransaction, User, UserRole, BankTransaction } from './types';
import { notificationService } from './services/notificationService';

// Eagerly loaded components (Critical Path)
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Toast from './components/ui/Toast';
import TransactionModal from './components/TransactionModal';
import ScheduleModal from './components/ScheduleModal';

// Lazy loaded components (Code Splitting)
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Ledger = React.lazy(() => import('./components/Ledger'));
const Settings = React.lazy(() => import('./components/Settings'));
const ScheduledTransactions = React.lazy(() => import('./components/ScheduledTransactions'));
const Reports = React.lazy(() => import('./components/Reports'));
const Members = React.lazy(() => import('./components/Members'));
const MemberPortal = React.lazy(() => import('./components/MemberPortal'));
const Reconciliation = React.lazy(() => import('./components/Reconciliation'));
const AccountsPayable = React.lazy(() => import('./components/AccountsPayable'));
const Assets = React.lazy(() => import('./components/Assets'));
const Registries = React.lazy(() => import('./components/Registries'));
const TithesEntry = React.lazy(() => import('./components/TithesEntry').then(module => ({ default: module.TithesEntry }))); // Handle named export if any, checking usage
// Note: TithesEntry was imported as named { TithesEntry } in previous App.tsx. 
// If it is a named export, we need the above .then pattern.
// Checking previous usage: import { TithesEntry } from './components/TithesEntry'; -> Yes, it was named.

// Previous import: import { Tools } from './components/Tools';
const Tools = React.lazy(() => import('./components/Tools').then(module => ({ default: module.Tools })));

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-400 animate-pulse">Carregando...</p>
    </div>
  </div>
);

// Inner App Component that consumes the Context
function AppContent() {
  const {
    data,
    currentUser,
    activeChurchId,
    login,
    logout,
    setActiveChurch,
    refreshData,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useFinance();

  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [isTransModalOpen, setTransModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [preFillTransaction, setPreFillTransaction] = useState<Partial<Transaction> | null>(null);

  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledTransaction | null>(null);

  const [modalInitialType, setModalInitialType] = useState<TransactionType>(TransactionType.INCOME);

  useEffect(() => {
    if (data.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.theme]);

  // --- Notification Logic ---
  useEffect(() => {
    if (currentUser) {
      notificationService.requestPermission().then(granted => {
        if (granted) {
          const relevantScheduled = data.scheduled.filter(s => {
            if (currentUser.role !== UserRole.ADMIN && s.churchId !== currentUser.churchId) return false;
            return true;
          });
          notificationService.checkAndNotify(relevantScheduled);
        }
      });
    }
  }, [currentUser, data.scheduled]);
  // --------------------------

  // Data Filtering Logic
  const isHeadquartersUser = currentUser && data.churches.find(c => c.id === currentUser.churchId)?.type === 'HEADQUARTERS';
  const targetChurchId = activeChurchId === 'ALL' ? (currentUser?.churchId || '') : activeChurchId;

  const filteredTransactions = data.transactions.filter(t => activeChurchId === 'ALL' ? true : t.churchId === activeChurchId);
  const filteredScheduled = data.scheduled.filter(s => activeChurchId === 'ALL' ? true : s.churchId === activeChurchId);
  const filteredCategories = data.categories.filter(c => activeChurchId === 'ALL' ? true : c.churchId === activeChurchId);
  const filteredCostCenters = data.costCenters.filter(cc => activeChurchId === 'ALL' ? true : cc.churchId === activeChurchId);
  const filteredAccounts = data.accounts.filter(a => activeChurchId === 'ALL' ? true : a.churchId === activeChurchId);
  const filteredMembers = data.members.filter(m => activeChurchId === 'ALL' ? true : m.churchId === activeChurchId);
  const filteredBudgets = data.budgets.filter(b => activeChurchId === 'ALL' ? true : b.churchId === activeChurchId);

  const filteredAppData: AppData = {
    ...data,
    transactions: filteredTransactions,
    scheduled: filteredScheduled,
    categories: filteredCategories,
    costCenters: filteredCostCenters,
    accounts: filteredAccounts,
    members: filteredMembers,
    budgets: filteredBudgets,
    users: data.users.filter(u => activeChurchId === 'ALL' ? true : u.churchId === activeChurchId)
  };

  const {
    addScheduled, updateScheduled, deleteScheduled, processScheduled,
    addTransfer: addTransferCtx
  } = useFinance();

  const handleSaveTransaction = (transactionData: Omit<Transaction, 'id' | 'churchId'> & { id?: string }) => {
    if (transactionData.id) {
      const updatedTransaction: Transaction = { ...transactionData, id: transactionData.id, churchId: targetChurchId } as Transaction;
      updateTransaction(updatedTransaction);
    } else {
      const newTransaction: Transaction = { ...transactionData, id: transactionData.id || generateId(), churchId: targetChurchId } as Transaction;
      addTransaction(newTransaction);
    }
    setEditingTransaction(null);
    setPreFillTransaction(null);
  };

  const handleTransfer = (amount: number, fromId: string, toId: string, fundId: string, date: string, desc: string) => {
    addTransferCtx(amount, fromId, toId, fundId, date, desc);
  };

  const handleSaveScheduled = (scheduledData: Omit<ScheduledTransaction, 'id' | 'churchId'> & { id?: string }) => {
    if (scheduledData.id) {
      const updated: ScheduledTransaction = { ...scheduledData, id: scheduledData.id, churchId: targetChurchId } as ScheduledTransaction;
      updateScheduled(updated);
    } else {
      const newItem: ScheduledTransaction = { ...scheduledData, id: generateId(), churchId: targetChurchId } as ScheduledTransaction;
      addScheduled(newItem);
    }
    setEditingSchedule(null);
  };

  const handleDeleteTransaction = (id: string) => deleteTransaction(id);

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setPreFillTransaction(null);
    setTransModalOpen(true);
  };

  const handleReconciliationManual = (bankTx: BankTransaction) => {
    setEditingTransaction(null);
    setPreFillTransaction({
      date: bankTx.date,
      amount: bankTx.amount,
      description: bankTx.description,
      type: bankTx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE
    });
    setTransModalOpen(true);
  };

  const handleEditScheduled = (s: ScheduledTransaction) => {
    setEditingSchedule(s);
    setScheduleModalOpen(true);
  };

  const openNewTransaction = (type: TransactionType) => {
    setEditingTransaction(null);
    setPreFillTransaction(null);
    setModalInitialType(type);
    setTransModalOpen(true);
  };

  const openNewSchedule = () => {
    setEditingSchedule(null);
    setScheduleModalOpen(true);
  };

  const systemLogo = data.churches.find(c => c.type === 'HEADQUARTERS')?.logo || data.churches[0]?.logo;
  const currentChurch = data.churches.find(c => c.id === targetChurchId) || data.churches[0];

  const { isLoading } = useFinance();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) return <Login users={data.users} onLogin={login} logoUrl={systemLogo} />;

  if (currentUser.role === UserRole.MEMBER) {
    const memberProfile = data.members.find(m => m.id === currentUser.memberId);
    return (
      <Suspense fallback={<PageLoader />}>
        <MemberPortal
          user={currentUser}
          memberProfile={memberProfile}
          transactions={data.transactions}
          onLogout={logout}
          logoUrl={systemLogo}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <Toast notifications={data.notifications} onDismiss={() => { }} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 dark:text-gray-400"><Menu size={24} /></button>
            {isHeadquartersUser ? (
              <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                <Building2 size={16} className="text-gray-500 ml-2" />
                <select value={activeChurchId} onChange={(e) => setActiveChurch(e.target.value)} className="bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-300 pr-2 cursor-pointer">
                  <option value="ALL">Todas as Igrejas</option>
                  {data.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                <Building2 size={16} />
                {data.churches.find(c => c.id === currentUser.churchId)?.name}
              </div>
            )}
          </div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 relative">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <Dashboard
                  transactions={filteredAppData.transactions}
                  scheduled={filteredAppData.scheduled}
                  categories={filteredAppData.categories}
                  budgets={filteredAppData.budgets}
                  accounts={filteredAppData.accounts}
                  funds={filteredAppData.funds}
                  onNewTransaction={openNewTransaction}
                  userRole={currentUser.role}
                />
              } />
              <Route path="/ledger" element={
                <Ledger
                  transactions={filteredAppData.transactions}
                  categories={filteredAppData.categories}
                  accounts={filteredAppData.accounts}
                  costCenters={filteredAppData.costCenters}
                  funds={filteredAppData.funds}
                  members={filteredAppData.members}
                  onDelete={handleDeleteTransaction}
                  onEdit={handleEditTransaction}
                  onNewTransaction={openNewTransaction}
                  userRole={currentUser.role}
                  currentChurch={currentChurch}
                />
              } />
              <Route path="/tithes" element={<TithesEntry />} />
              <Route path="/registries" element={<Registries />} />
              <Route path="/reconciliation" element={<Reconciliation onManualAdd={handleReconciliationManual} />} />
              <Route path="/scheduled" element={
                <ScheduledTransactions
                  scheduled={filteredAppData.scheduled}
                  categories={filteredAppData.categories}
                  accounts={filteredAppData.accounts}
                  costCenters={filteredAppData.costCenters}
                  onUpdate={refreshData}
                  onOpenModal={openNewSchedule}
                  onEdit={handleEditScheduled}
                  userRole={currentUser.role}
                />
              } />
              <Route path="/payables" element={
                <AccountsPayable transactions={filteredAppData.transactions} scheduled={filteredAppData.scheduled} categories={filteredAppData.categories} costCenters={filteredAppData.costCenters} />
              } />
              <Route path="/reports" element={<Reports data={filteredAppData} />} />
              <Route path="/members" element={
                <Members members={filteredAppData.members} onUpdate={refreshData} userRole={currentUser.role} currentChurchId={targetChurchId} />
              } />
              <Route path="/tools" element={<Tools />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/settings" element={<Settings data={filteredAppData} onDataChange={refreshData} currentUser={currentUser} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <TransactionModal
        isOpen={isTransModalOpen} onClose={() => { setTransModalOpen(false); setPreFillTransaction(null); }} onSave={handleSaveTransaction} onTransfer={handleTransfer}
        categories={filteredCategories} costCenters={filteredCostCenters} accounts={filteredAccounts} members={filteredMembers} funds={filteredAppData.funds}
        initialType={modalInitialType} editingTransaction={editingTransaction} initialData={preFillTransaction}
        transactions={filteredAppData.transactions}
      />
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSave={handleSaveScheduled}
        categories={filteredCategories}
        costCenters={filteredCostCenters}
        funds={filteredAppData.funds}
        editingSchedule={editingSchedule}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <Router>
        <AppContent />
      </Router>
    </FinanceProvider>
  );
}
