
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, ScheduledTransaction, UserRole, Category, Budget, Account, Fund, Member, Church } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { Plus, Minus, BarChart3, AlertTriangle, CalendarClock, Filter, PieChart as PieIcon, X, TrendingUp, TrendingDown, Wallet, ArrowRight, ArrowLeftRight, CheckCircle, Landmark, Activity, List, Target, ChevronDown, Eye, EyeOff, Users, Briefcase, UserPlus, Cake, Edit2 } from './ui/Icons';
import { ICON_MAP } from './ui/IconMap';

interface DashboardProps {
  transactions: Transaction[];
  scheduled: ScheduledTransaction[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
  funds?: Fund[];
  onNewTransaction: (type: TransactionType) => void;
  onEdit?: (transaction: Transaction) => void; // Added onEdit
  userRole: UserRole;

  members?: Member[];
  systemMode?: 'FINANCE' | 'SECRETARY';
  activeChurchId?: string;
  churches?: Church[];
}

type TimeRange = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#475569', '#14b8a6'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, scheduled, categories, budgets, accounts, funds = [], onNewTransaction, onEdit, userRole, members = [], systemMode = 'FINANCE', activeChurchId, churches = [] }) => {
  // ... existing state ...
  // (Skipping purely unchanged lines for brevity in replacement, but I must match exact target content)

  // To avoid replacing the whole file, I will split this into two ReplaceFileContent calls if needed, or just target the interface and the render part separately if they are far apart. 
  // They are somewhat far. I will target the interface/props first.

  // ACTUALLY, I can't do logic here. I need to make the tool call.
  // I will just modify the component signature and the interface first.

  const [timeRange, setTimeRange] = useState<TimeRange>('MONTHLY');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [activeIndex, setActiveIndex] = useState(0);

  // Privacy State (Persisted)
  const [hideValues, setHideValues] = useState(() => localStorage.getItem('mvp_hide_values') === 'true');

  const togglePrivacy = () => {
    const newState = !hideValues;
    setHideValues(newState);
    localStorage.setItem('mvp_hide_values', String(newState));
  };

  const canEdit = userRole === UserRole.MASTER || userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  // --- OPTIMIZATION: Memoize date range ---
  const startDate = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    switch (timeRange) {
      case 'WEEKLY': start.setDate(now.getDate() - 7); break;
      case 'MONTHLY': start.setDate(1); break;
      case 'QUARTERLY': start.setMonth(now.getMonth() - 3); break;
      case 'SEMIANNUAL': start.setMonth(now.getMonth() - 6); break;
      case 'YEARLY': start.setMonth(0); start.setDate(1); break;
    }
    return start;
  }, [timeRange]);

  // --- OPTIMIZATION: Single Pass for Global Aggregations (Balances) ---
  const { globalAccountBalances, globalFundBalances } = useMemo(() => {
    const accBalances = new Map<string, number>();
    const fndBalances = new Map<string, number>();

    // Initialize with zeros or initial values
    accounts.forEach(a => {
      if (!activeChurchId || activeChurchId === 'ALL') {
        // Consolidated View: Sum of current settings + defaults
        let totalInitial = 0;
        churches.forEach(c => {
          const customInitial = c.settings?.initialBalances?.[a.id];
          if (customInitial !== undefined) {
            totalInitial += customInitial;
          } else if (a.churchId === c.id) {
            // Only add default if this church is the OWNER
            totalInitial += a.initialBalance;
          }
        });
        // Add legacy offsets exactly once per overall account
        totalInitial += (a.legacyBalanceOffset || 0);
        accBalances.set(a.id, totalInitial);
      } else {
        // Individual View
        const activeChurch = churches.find(c => c.id === activeChurchId);
        const customInitial = activeChurch?.settings?.initialBalances?.[a.id];

        let initial = 0;
        if (customInitial !== undefined) {
          initial = customInitial;
        } else if (a.churchId === activeChurchId) {
          initial = a.initialBalance;
        }
        initial += (a.legacyBalanceOffset || 0);
        accBalances.set(a.id, initial);
      }
    });
    funds.forEach(f => fndBalances.set(f.id, 0));

    // Single pass through ALL transactions
    transactions.forEach(t => {
      const amount = t.amount;

      // Account Balance Update
      if (t.type === TransactionType.INCOME) {
        accBalances.set(t.accountId, (accBalances.get(t.accountId) || 0) + amount);
        fndBalances.set(t.fundId, (fndBalances.get(t.fundId) || 0) + amount);
      } else if (t.type === TransactionType.EXPENSE) {
        accBalances.set(t.accountId, (accBalances.get(t.accountId) || 0) - amount);
        fndBalances.set(t.fundId, (fndBalances.get(t.fundId) || 0) - amount);
      } else if (t.type === TransactionType.TRANSFER) {
        if (t.transferDirection === 'IN') accBalances.set(t.accountId, (accBalances.get(t.accountId) || 0) + amount);
        if (t.transferDirection === 'OUT') accBalances.set(t.accountId, (accBalances.get(t.accountId) || 0) - amount);
      }
    });

    return {
      globalAccountBalances: accounts
        .filter(a => {
          if (!activeChurchId || activeChurchId === 'ALL') return true;
          const activeChurch = churches.find(c => c.id === activeChurchId);
          const isHidden = activeChurch?.settings?.hiddenAccounts?.includes(a.id);
          return !isHidden;
        })
        .map(a => ({ ...a, currentBalance: accBalances.get(a.id) || 0 }))
        .sort((a, b) => {
          if (!activeChurchId || activeChurchId === 'ALL') return (a.order ?? 999) - (b.order ?? 999);
          const activeChurch = churches.find(c => c.id === activeChurchId);
          const orderList = activeChurch?.settings?.accountOrder || [];
          if (orderList.length > 0) {
            const idxA = orderList.indexOf(a.id);
            const idxB = orderList.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }
          return (a.order ?? 999) - (b.order ?? 999);
        }),
      globalFundBalances: funds.map(f => ({ ...f, balance: fndBalances.get(f.id) || 0 }))
        .sort((a, b) => {
          if (!activeChurchId || activeChurchId === 'ALL') return (a.order ?? 999) - (b.order ?? 999);
          const activeChurch = churches.find(c => c.id === activeChurchId);
          const orderList = activeChurch?.settings?.fundOrder || [];
          if (orderList.length > 0) {
            const idxA = orderList.indexOf(a.id);
            const idxB = orderList.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }
          return (a.order ?? 999) - (b.order ?? 999);
        })
    };
  }, [transactions, accounts, funds]);

  // --- OPTIMIZATION: Filtered Data for Charts & KPIs ---
  const filteredTransactions = useMemo(() => {
    // Convert startDate to YYYY-MM-DD string in Local Time for comparison
    const offset = startDate.getTimezoneOffset();
    const localStart = new Date(startDate.getTime() - (offset * 60 * 1000));
    const startDateStr = localStart.toISOString().split('T')[0];

    return transactions.filter(t => {
      // String comparison is safer for YYYY-MM-DD dates to avoid timezone shifts
      // t.date is already YYYY-MM-DD from Supabase
      const matchesDate = t.date.substring(0, 10) >= startDateStr;
      const matchesAccount = accountFilter === 'ALL' ? true : t.accountId === accountFilter;
      return matchesDate && matchesAccount;
    });
  }, [transactions, startDate, accountFilter]);

  // --- OPTIMIZATION: KPI Totals ---
  const { income, expense, previousBalance, netTransfers } = useMemo(() => {
    // 1. Calculate Previous Balance (Accumulated before start date)
    // Convert startDate to YYYY-MM-DD string in Local Time for comparison
    const offset = startDate.getTimezoneOffset();
    const localStart = new Date(startDate.getTime() - (offset * 60 * 1000));
    const startDateStr = localStart.toISOString().split('T')[0];

    const prevTrans = transactions.filter(t => {
      // Must be BEFORE startDate
      const isBefore = t.date.substring(0, 10) < startDateStr;

      // Must match Account Filter
      const matchesAccount = accountFilter === 'ALL' ? true : t.accountId === accountFilter;

      // Must NOT be a transfer (or handle transfers if they affect balance, which they do for specific accounts)
      // Note: Transfers affect specific accounts but Net Worth (All Accounts) is neutral.
      // If Account Filter is ALL, Income - Expense is enough (Transfers cancel out).
      // If Account Filter is specific, we MUST include Transfer In/Out.

      return isBefore && matchesAccount;
    });

    // Global Initial Balance & Legacy Offset calculation
    const globalInitialAndLegacy = accounts.reduce((acc, a) => {
      const matchesAccount = accountFilter === 'ALL' ? true : a.id === accountFilter;
      if (!matchesAccount) return acc;

      let initial = 0;
      if (!activeChurchId || activeChurchId === 'ALL') {
        initial = a.initialBalance;
      } else {
        const activeChurch = churches.find(c => c.id === activeChurchId);
        const isHidden = activeChurch?.settings?.hiddenAccounts?.includes(a.id);
        if (isHidden) return acc; // Skip hidden accounts

        const customInitial = activeChurch?.settings?.initialBalances?.[a.id];
        if (customInitial !== undefined) {
          initial = customInitial;
        } else if (a.churchId === activeChurchId) {
          initial = a.initialBalance;
        }
      }
      return acc + initial + (a.legacyBalanceOffset || 0);
    }, 0);

    const prevIncome = prevTrans.filter(t => t.type === TransactionType.INCOME || (t.type === TransactionType.TRANSFER && t.transferDirection === 'IN')).reduce((acc, t) => acc + t.amount, 0);
    const prevExpense = prevTrans.filter(t => t.type === TransactionType.EXPENSE || (t.type === TransactionType.TRANSFER && t.transferDirection === 'OUT')).reduce((acc, t) => acc + t.amount, 0);
    const pBalance = prevIncome - prevExpense + globalInitialAndLegacy;

    // 2. Calculate Period Totals (Income/Expense)
    // Note: filteredTransactions ALREADY has the Date >= startDate and Account Filter applied.
    const currentPeriodStats = filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      if (t.type === TransactionType.EXPENSE) acc.expense += t.amount;
      if (t.type === TransactionType.TRANSFER) {
        if (t.transferDirection === 'IN') acc.netTransfers += t.amount;
        if (t.transferDirection === 'OUT') acc.netTransfers -= t.amount;
      }
      return acc;
    }, { income: 0, expense: 0, netTransfers: 0 });

    return {
      income: currentPeriodStats.income,
      expense: currentPeriodStats.expense,
      netTransfers: currentPeriodStats.netTransfers,
      previousBalance: pBalance
    };
  }, [filteredTransactions, transactions, startDate, accountFilter, accounts, activeChurchId, churches]);

  const finalBalance = previousBalance + (income - expense) + netTransfers;

  // --- OPTIMIZATION: Evolution Data (Actual + Projected) ---
  const evolutionData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    const isYearly = timeRange === 'YEARLY' || timeRange === 'SEMIANNUAL';

    // 1. Processing Actuals
    const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedTransactions.forEach(t => {
      const tDate = new Date(t.date);
      const userTimezoneOffset = tDate.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(tDate.getTime() + userTimezoneOffset);

      let key, label;
      if (isYearly) {
        key = `${adjustedDate.getFullYear()}-${adjustedDate.getMonth()}`;
        label = adjustedDate.toLocaleDateString('pt-BR', { month: 'short' });
      } else {
        key = t.date;
        label = adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }

      if (!dataMap[key]) {
        dataMap[key] = { name: label, income: 0, expense: 0, balance: 0, date: key, incomeProjected: 0, expenseProjected: 0 };
      }

      if (t.type === TransactionType.INCOME) dataMap[key].income += t.amount;
      if (t.type === TransactionType.EXPENSE) dataMap[key].expense += t.amount;
      dataMap[key].balance = dataMap[key].income - dataMap[key].expense;
    });

    // 2. Processing Projections (Future)
    // We only project if we are in a view that makes sense (not looking at past years)
    // For simplicity, we project next 3 months mainly for Monthly/Weekly views, 
    // or if the TimeRange includes future.
    // But standard Logic: Add future points.

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + 60); // 60 Days Projection

    scheduled.filter(s => s.isActive && (accountFilter === 'ALL' ? true : s.accountId === accountFilter)).forEach(Item => {
      let currentDue = new Date(Item.dueDate);
      // Adjust if due date is in the past (simulate next recurrence)
      // For MVP, we respect the Item.dueDate. If it's past, it's late (we could show as late, but let's skip for projection).

      // Loop for occurrences within limit
      let occurrencesToAdd = 5; // Safety break

      while (currentDue <= limitDate && occurrencesToAdd > 0) {
        if (currentDue >= today) {
          const dayStr = currentDue.toISOString().split('T')[0]; // YYYY-MM-DD

          // Determine Key based on TimeRange
          let key, label;
          if (isYearly) {
            key = `${currentDue.getFullYear()}-${currentDue.getMonth()}`;
            label = currentDue.toLocaleDateString('pt-BR', { month: 'short' });
          } else {
            key = dayStr;
            label = currentDue.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          }

          if (!dataMap[key]) {
            dataMap[key] = { name: label, income: 0, expense: 0, balance: 0, date: isYearly ? `${key}-01` : key, incomeProjected: 0, expenseProjected: 0 };
          }

          if (Item.type === TransactionType.INCOME) dataMap[key].incomeProjected += Item.amount;
          if (Item.type === TransactionType.EXPENSE) dataMap[key].expenseProjected += Item.amount;
          // We don't touch 'balance' (Actual) but we could add 'balanceProjected'
        }

        // Next Recurrence
        switch (Item.recurrence) {
          case 'WEEKLY': currentDue.setDate(currentDue.getDate() + 7); break;
          case 'MONTHLY': currentDue.setMonth(currentDue.getMonth() + 1); break;
          case 'YEARLY': currentDue.setFullYear(currentDue.getFullYear() + 1); break;
          case 'NONE': occurrencesToAdd = 0; break;
          default: occurrencesToAdd = 0;
        }
        occurrencesToAdd--;
      }
    });

    return Object.values(dataMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions, scheduled, timeRange]);

  // --- OPTIMIZATION: Pie Data ---
  const { pieData, totalExpensesPeriod } = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};
    let totalExp = 0;
    expenses.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      grouped[catName] = (grouped[catName] || 0) + t.amount;
      totalExp += t.amount;
    });
    const parsedData = Object.entries(grouped)
      .map(([name, value]) => ({ name, value, percent: totalExp > 0 ? (value / totalExp) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { pieData: parsedData, totalExpensesPeriod: totalExp };
  }, [filteredTransactions, categories]);

  // --- OPTIMIZATION: Growth Calculation ---
  const incomeGrowth = useMemo(() => {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    const currentMonthIncome = transactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date) >= currentMonthStart).reduce((a, b) => a + b.amount, 0);
    const prevMonthIncome = transactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date) >= prevMonthStart && new Date(t.date) <= prevMonthEnd).reduce((a, b) => a + b.amount, 0);

    return prevMonthIncome === 0 ? 100 : ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100;
  }, [transactions]);

  // --- OPTIMIZATION: Alerts ---
  const budgetAlerts = useMemo(() => {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.categoryId === b.categoryId && t.type === TransactionType.EXPENSE && new Date(t.date) >= currentMonthStart)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = (spent / b.amount) * 100;
      return { ...b, spent, percent };
    }).filter(b => b.percent >= 80);
  }, [budgets, transactions]);

  const scheduleAlerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return scheduled
      .filter(item => item.isActive && (accountFilter === 'ALL' ? true : item.accountId === accountFilter))
      .map(item => {
        const [y, m, d] = item.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...item, diffDays, dueDateObj: dueDate };
      })
      .filter(item => item.diffDays <= 10)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [scheduled]);

  const recentTransactions = useMemo(() => {
    return filteredTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [filteredTransactions]);

  const onPieEnter = (_: any, index: number) => { setActiveIndex(index); };
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Wrapper for values based on privacy setting
  const formatValue = (val: number) => {
    if (hideValues) return 'R$ •••••';
    return formatter.format(val);
  };

  const timeFilters: { label: string, value: TimeRange }[] = [
    { label: '7D', value: 'WEEKLY' },
    { label: 'Mês', value: 'MONTHLY' },
    { label: '3M', value: 'QUARTERLY' },
    { label: '6M', value: 'SEMIANNUAL' },
    { label: 'Ano', value: 'YEARLY' },
  ];

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 text-xs z-50">
          <p className="font-bold mb-1 text-gray-800 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill }}></span>
            {data.name}
          </p>
          <div className="flex justify-between gap-4 mt-2">
            <span className="text-gray-500 dark:text-gray-400">Valor:</span>
            <span className="text-gray-800 dark:text-white font-bold">{formatValue(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Parcela:</span>
            <span className="text-gray-800 dark:text-white font-bold">{data.percent.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 text-xs z-50 min-w-[180px]">
          <p className="font-bold mb-3 text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 mb-1.5">
              <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className={`font-bold font-mono ${entry.dataKey === 'balance' ? (entry.value >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500') : 'text-gray-800 dark:text-white'}`}>
                {hideValues ? '•••••' : formatter.format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- SECRETARY VIEW ---
  // Render Secretary Dashboard if user IS Secretary OR if System Mode is SECRETARY (for Master/Admin access)
  if (userRole === UserRole.SECRETARY || systemMode === 'SECRETARY') {
    const activeMembers = members.filter(m => m.type === 'MEMBER' && m.status !== 'INACTIVE');
    const visitors = members.filter(m => m.type === 'VISITOR');
    const suppliers = members.filter(m => m.type === 'SUPPLIER');

    // Birthdays this month
    const currentMonth = new Date().getMonth();
    const birthdays = members.filter(m => m.birthDate && new Date(m.birthDate).getMonth() === currentMonth && m.status !== 'INACTIVE');

    // New Members (Last 30 days)
    // Assuming createdAt is not available, we can use conversionDate or just skip for MVP.
    // Let's use filter by recent IDs if sequential or just stick to total counts + specific lists.
    // For now: Total counts are most important.

    return (
      <div className="space-y-8 pb-8 animate-in fade-in duration-500 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              Painel da Secretaria
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">
              Visão geral de membros, visitantes e estatísticas.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Members */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total de Membros</p>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{activeMembers.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users size={24} />
            </div>
          </div>

          {/* Total Visitors */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-amber-500"></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Visitantes</p>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{visitors.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UserPlus size={24} />
            </div>
          </div>

          {/* Suppliers */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-slate-500"></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fornecedores</p>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{suppliers.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Briefcase size={24} />
            </div>
          </div>

          {/* Birthdays */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-pink-500"></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Aniversariantes (Mês)</p>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{birthdays.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Cake size={24} />
            </div>
          </div>
        </div>

        {/* Birthday List Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Cake size={20} className="text-pink-500" />
                Aniversariantes de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
              {birthdays.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Nenhum aniversariante este mês.</div>
              ) : (
                birthdays.sort((a, b) => {
                  const dayA = new Date(a.birthDate!).getDate();
                  const dayB = new Date(b.birthDate!).getDate();
                  return dayA - dayB;
                }).map(m => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{m.name}</p>
                        <p className="text-xs text-gray-500 uppercase">{m.type === 'MEMBER' ? 'Membro' : 'Visitante'}</p>
                      </div>
                    </div>
                    <div className="bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400 px-3 py-1 rounded-lg text-sm font-bold">
                      Dia {new Date(m.birthDate!).getDate()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions / Info */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg text-white p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Bem-vindo(a) à Secretaria</h3>
              <p className="opacity-80 text-sm leading-relaxed mb-6">
                Aqui você pode gerenciar todo o cadastro de membros, visitantes e fornecedores da igreja.
                Mantenha os dados atualizados para garantir uma boa comunicação e organização.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <Users size={20} className="text-blue-200" />
                  <div>
                    <p className="font-bold">Cadastro Completo</p>
                    <p className="text-xs opacity-70">Dados pessoais, eclesiásticos e familiares</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <Activity size={20} className="text-blue-200" />
                  <div>
                    <p className="font-bold">Histórico</p>
                    <p className="text-xs opacity-70">Acompanhe a jornada dos membros</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500 max-w-screen-2xl mx-auto">

      {/* Header & Filter */}
      <div id="dashboard-header" className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            Visão Geral
            <button
              onClick={togglePrivacy}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              title={hideValues ? "Mostrar valores" : "Ocultar valores"}
            >
              {hideValues ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">
            Monitoramento de caixa, contas e indicadores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm inline-flex items-center overflow-x-auto max-w-full">
            {timeFilters.map(filter => (
              <button key={filter.value} onClick={() => setTimeRange(filter.value)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all outline-none whitespace-nowrap focus:ring-2 focus:ring-blue-500/50 ${timeRange === filter.value ? 'bg-gray-900 dark:bg-slate-600 text-white shadow-md transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{filter.label}</button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm inline-flex items-center">
            <Landmark size={14} className="text-gray-400 ml-2 mr-1" />
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none text-gray-700 dark:text-gray-300 pr-2 cursor-pointer"
            >
              <option value="ALL">Todas as Contas</option>
              {accounts
                .filter(a => {
                  if (!activeChurchId || activeChurchId === 'ALL') return true;
                  const activeChurch = churches.find(c => c.id === activeChurchId);
                  return !activeChurch?.settings?.hiddenAccounts?.includes(a.id);
                })
                .map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - IMPROVED COLORS */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6">

        {/* Saldo Anterior - Gray/Slate Gradient */}
        <div className="bg-gray-50 dark:bg-slate-700/30 p-6 rounded-3xl border border-gray-200 dark:border-slate-600 flex flex-col justify-between relative overflow-hidden group hover:border-gray-300 dark:hover:border-slate-500 transition-all hover:-translate-y-1 duration-300">
          <div className="z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gray-200 dark:bg-slate-600 rounded-2xl text-gray-600 dark:text-gray-300 shadow-sm"><CalendarClock size={24} strokeWidth={2.5} /></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Saldo Anterior</p>
            <p className={`text-xl font-extrabold tracking-tight ${previousBalance >= 0 ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>
              {formatValue(previousBalance)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">Acumulado anterior</p>
          </div>
        </div>

        {/* Entradas - Emerald Green Gradient */}
        <div className="bg-gradient-to-br from-emerald-100/80 to-white dark:from-emerald-900/40 dark:to-slate-800 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100/60 to-transparent dark:from-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20"><TrendingUp size={24} strokeWidth={2.5} /></div>
              {incomeGrowth !== 0 && !hideValues && (<div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${incomeGrowth >= 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800'}`}>{incomeGrowth > 0 ? '+' : ''}{incomeGrowth.toFixed(0)}%</div>)}
            </div>
            <p className="text-emerald-800/70 dark:text-emerald-300/70 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Entradas</p>
            <h3 className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">{formatValue(income)}</h3>
          </div>
        </div>

        {/* Saídas - Rose Red Gradient */}
        <div className="bg-gradient-to-br from-rose-100/80 to-white dark:from-rose-900/40 dark:to-slate-800 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)] border border-rose-200/50 dark:border-rose-800/30 hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-600 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-100/60 to-transparent dark:from-rose-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl text-white shadow-lg shadow-rose-500/30 ring-4 ring-rose-50 dark:ring-rose-900/20"><TrendingDown size={24} strokeWidth={2.5} /></div>
            </div>
            <p className="text-rose-800/70 dark:text-rose-300/70 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Saídas</p>
            <h3 className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 tracking-tight">{formatValue(expense)}</h3>
          </div>
        </div>

        {/* Resultado (Mês) - Indigo/Orange depending on value */}
        <div className={`p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(99,102,241,0.1)] border hover:shadow-lg transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group bg-gradient-to-br ${income - expense >= 0 ? 'from-indigo-100/80 to-white dark:from-indigo-900/40 dark:to-slate-800 border-indigo-200/50 dark:border-indigo-800/30 hover:border-indigo-300' : 'from-orange-100/80 to-white dark:from-orange-900/40 dark:to-slate-800 border-orange-200/50 dark:border-orange-800/30 hover:border-orange-300'}`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 bg-gradient-to-bl ${income - expense >= 0 ? 'from-indigo-100/60 to-transparent dark:from-indigo-500/10' : 'from-orange-100/60 to-transparent dark:from-orange-500/10'}`}></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl text-white shadow-lg ring-4 ${income - expense >= 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30 ring-indigo-50 dark:ring-indigo-900/20' : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30 ring-orange-50 dark:ring-orange-900/20'}`}>
                {income - expense >= 0 ? <Target size={24} strokeWidth={2.5} /> : <AlertTriangle size={24} strokeWidth={2.5} />}
              </div>
            </div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ml-1 ${income - expense >= 0 ? 'text-indigo-800/70 dark:text-indigo-300/70' : 'text-orange-800/70 dark:text-orange-300/70'}`}>Resultado (Mês)</p>
            <h3 className={`text-3xl font-extrabold tracking-tight ${income - expense >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatValue(income - expense)}</h3>
          </div>
        </div>

        {/* Saldo Atual - Royal Blue Gradient */}
        <div className="bg-gradient-to-br from-blue-100/80 to-white dark:from-blue-900/40 dark:to-slate-800 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] border border-blue-200/50 dark:border-blue-800/30 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/60 to-transparent dark:from-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-50 dark:ring-blue-900/20"><Wallet size={24} strokeWidth={2.5} /></div>
            </div>
            <p className="text-blue-800/70 dark:text-blue-300/70 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Saldo Atual</p>
            <h3 className={`text-3xl font-extrabold tracking-tight ${finalBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatValue(finalBalance)}</h3>
          </div>
        </div>

        {/* Alertas - Amber Orange Gradient */}
        <div className="bg-gradient-to-br from-amber-100/80 to-white dark:from-amber-900/40 dark:to-slate-800 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] border border-amber-200/50 dark:border-amber-800/30 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent dark:from-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-lg shadow-amber-500/30 ring-4 ring-amber-50 dark:ring-amber-900/20"><AlertTriangle size={24} strokeWidth={2.5} /></div>
              {(budgetAlerts.length + scheduleAlerts.length) > 0 && (<span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>)}
            </div>
            <p className="text-amber-800/70 dark:text-amber-300/70 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Alertas Ativos</p>
            <h3 className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 tracking-tight">{budgetAlerts.length + scheduleAlerts.length}</h3>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div id="action-buttons" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => onNewTransaction(TransactionType.INCOME)} className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.99] border border-emerald-400/20"><div className="flex flex-col items-start relative z-10"><span className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Nova</span><span className="font-bold text-lg">Entrada</span></div><div className="bg-white/20 p-2.5 rounded-xl relative z-10 group-hover:rotate-12 transition-transform"><Plus size={24} /></div></button>
          <button onClick={() => onNewTransaction(TransactionType.EXPENSE)} className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl shadow-lg shadow-rose-900/10 transition-all active:scale-[0.99] border border-rose-400/20"><div className="flex flex-col items-start relative z-10"><span className="text-rose-100 text-[10px] font-bold uppercase tracking-wider mb-1">Nova</span><span className="font-bold text-lg">Saída</span></div><div className="bg-white/20 p-2.5 rounded-xl relative z-10 group-hover:rotate-12 transition-transform"><Minus size={24} /></div></button>
          <button onClick={() => onNewTransaction(TransactionType.TRANSFER)} className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-900/10 transition-all active:scale-[0.99] border border-blue-400/20"><div className="flex flex-col items-start relative z-10"><span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Nova</span><span className="font-bold text-lg">Transferência</span></div><div className="bg-white/20 p-2.5 rounded-xl relative z-10 group-hover:rotate-12 transition-transform"><ArrowLeftRight size={24} /></div></button>
        </div>
      )}

      {/* Account & Funds Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Bank Accounts */}
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Landmark size={20} className="text-indigo-500" /> Contas Bancárias
          </h3>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {globalAccountBalances
              .filter(acc => accountFilter === 'ALL' ? true : acc.id == accountFilter)
              .map(acc => (
                <div key={acc.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{acc.name}</p>
                    <p className={`text-xl font-bold tracking-tight ${acc.currentBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600'}`}>{formatValue(acc.currentBalance)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors shadow-sm overflow-hidden">
                    {acc.icon ? (
                      ICON_MAP[acc.icon] ? React.createElement(ICON_MAP[acc.icon], { size: 20 }) : <img src={acc.icon} className="w-full h-full object-cover" />
                    ) : (
                      <Landmark size={20} />
                    )}
                  </div>
                </div>
              ))}

            {globalAccountBalances.length > 0 && globalAccountBalances.filter(acc => accountFilter === 'ALL' ? true : acc.id == accountFilter).length === 0 && (
              <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700">
                <p className="text-gray-400 text-sm">Conta não encontrada ou sem saldo no período.</p>
              </div>
            )}

            {globalAccountBalances.length === 0 && (
              <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700">
                <p className="text-gray-400 text-sm">Nenhuma conta bancária cadastrada para esta igreja.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fund Balances */}
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Target size={20} className="text-purple-500" /> Saldos por Fundo/Projeto
          </h3>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {globalFundBalances.map(fund => (
              <div key={fund.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between group hover:border-purple-200 dark:hover:border-purple-800 transition-all relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {fund.type === 'RESTRICTED' && (
                  <div className="absolute top-0 right-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-bl-lg">Restrito</div>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">{fund.name}</p>
                    <p className={`text-xl font-bold tracking-tight ${fund.balance >= 0 ? 'text-purple-700 dark:text-purple-400' : 'text-rose-600'}`}>{formatValue(fund.balance)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-400 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30 transition-colors"><Target size={16} /></div>
                </div>
                {fund.description && <p className="text-[10px] text-gray-400 mt-2 truncate font-medium">{fund.description}</p>}

                {fund.targetAmount && fund.targetAmount > 0 ? (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Progresso da Meta</span>
                      <span>{Math.max(0, Math.min(100, (fund.balance / fund.targetAmount) * 100)).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden border border-gray-50 dark:border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                        style={{ width: `${Math.max(0, Math.min(100, (fund.balance / fund.targetAmount) * 100))}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-gray-400 italic">Meta: {formatValue(fund.targetAmount)}</p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-700/50">
                    <p className="text-[9px] text-gray-400 italic">Sem meta definida</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Charts & Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Column: Charts and Recent Transactions */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col min-h-[380px]">
              <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Activity size={18} /></div>Evolução Financeira</h3></div>
              <div className="flex-1 w-full min-h-[300px]">
                {evolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => hideValues ? '•' : `${val / 1000}k`} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip content={<CustomAreaTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" align="right" />

                      <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                      <Area type="monotone" dataKey="expense" name="Saídas" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />

                      {/* Projections - Dashed Areas */}
                      <Area type="monotone" dataKey="incomeProjected" name="Ent. Prevista" stroke="#10b981" strokeDasharray="5 5" fillOpacity={0.1} fill="#10b981" strokeWidth={2} />
                      <Area type="monotone" dataKey="expenseProjected" name="Saída Prevista" stroke="#f43f5e" strokeDasharray="5 5" fillOpacity={0.1} fill="#f43f5e" strokeWidth={2} />

                      <Line type="monotone" dataKey="balance" name="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />

                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400"><BarChart3 className="w-10 h-10 mb-2 opacity-20" /><p className="text-xs font-medium">Sem dados no período.</p></div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col min-h-[380px]">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6"><div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400"><PieIcon size={18} /></div>Top Despesas</h3>
              <div className="flex-1 relative w-full min-h-[250px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={95}
                        paddingAngle={4}
                        cornerRadius={8}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        animationDuration={1000}
                      >
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />

                      {/* Central Label for Total */}
                      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 dark:fill-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        Total Geral
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800 dark:fill-white text-lg font-black tabular-nums">
                        {hideValues ? '••••' : formatValue(totalExpensesPeriod).replace('R$', '').trim()}
                      </text>

                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        iconType="circle"
                        formatter={(value, entry: any) => {
                          const { payload } = entry;
                          return <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-1">{value} ({payload.percent.toFixed(0)}%)</span>;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400"><PieIcon className="w-10 h-10 mb-2 opacity-20" /><p className="text-xs font-medium">Sem despesas no período.</p></div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><List size={20} className="text-blue-500" /> Lançamentos Recentes</h3></div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {recentTransactions.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">Nenhum lançamento encontrado.</div>
              ) : (
                recentTransactions.map(t => (
                  <div
                    key={t.id}
                    onClick={() => canEdit && onEdit && onEdit(t)}
                    className={`p-4 sm:px-6 flex items-center justify-between transition-colors group border-b border-gray-50 dark:border-slate-800 last:border-0 ${canEdit && onEdit ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs shadow-sm ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : t.type === TransactionType.EXPENSE ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>{t.type === TransactionType.INCOME ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">{t.description}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5"><span className="font-medium bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{new Date(t.date).toLocaleDateString('pt-BR')}</span><span className="text-gray-300 dark:text-slate-600">|</span><span>{categories.find(c => c.id === t.categoryId)?.name}</span></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold tabular-nums block ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{formatValue(t.amount)}</span>
                      {canEdit && <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 items-center mt-1"><Edit2 size={10} /> Editar</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentTransactions.length > 0 && (<div className="p-3 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 text-center"><p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Últimos {recentTransactions.length} registros</p></div>)}
          </div>
        </div>

        {/* Right Column: Alerts */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-full max-h-[900px]">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500" />Central de Alertas</h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            {/* Critical Alerts */}
            {(scheduleAlerts.filter(s => s.diffDays <= 0).length > 0 || budgetAlerts.filter(b => b.percent >= 100).length > 0) && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Críticos
                </h4>
                {budgetAlerts.filter(b => b.percent >= 100).map(b => (
                  <div key={b.id} className="p-4 rounded-xl border bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                    <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Orçamento Estourado</p><span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{b.percent.toFixed(0)}%</span></div>
                    <div className="flex justify-between items-end mb-3"><p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{categories.find(c => c.id === b.categoryId)?.name}</p></div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-red-200 dark:bg-red-900/30"><div className="h-full rounded-full bg-red-500" style={{ width: '100%' }}></div></div>
                  </div>
                ))}
                {scheduleAlerts.filter(s => s.diffDays <= 0).map(s => (
                  <div key={s.id} className="p-4 bg-white dark:bg-slate-700/20 border-l-4 border-l-red-500 border-y border-r border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-2"><span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide inline-block mb-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{s.diffDays === 0 ? 'Vence Hoje' : 'Atrasado'}</span><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.title}</p></div>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{formatValue(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Attention Alerts */}
            {(scheduleAlerts.filter(s => s.diffDays > 0).length > 0 || budgetAlerts.filter(b => b.percent < 100).length > 0) && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Em Atenção
                </h4>
                {budgetAlerts.filter(b => b.percent < 100).map(b => (
                  <div key={b.id} className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
                    <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Limite Próximo</p><span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white dark:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">{b.percent.toFixed(0)}%</span></div>
                    <div className="flex justify-between items-end mb-3"><p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{categories.find(c => c.id === b.categoryId)?.name}</p></div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-amber-200 dark:bg-amber-900/30"><div className="h-full rounded-full bg-amber-500" style={{ width: `${b.percent}%` }}></div></div>
                  </div>
                ))}
                {scheduleAlerts.filter(s => s.diffDays > 0).map(s => (
                  <div key={s.id} className="p-4 bg-white dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-2"><span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide inline-block mb-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Daqui a {s.diffDays} dias</span><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.title}</p></div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatValue(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {budgetAlerts.length === 0 && scheduleAlerts.length === 0 && (<div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-slate-700/50 rounded-xl"><div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-full mb-3"><CheckCircle className="text-emerald-500 opacity-80" size={32} /></div><p className="text-sm font-bold text-gray-600 dark:text-gray-300">Tudo sob controle!</p><p className="text-xs opacity-70 mt-1">Sem alertas pendentes.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
