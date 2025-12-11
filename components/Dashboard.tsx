
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, ScheduledTransaction, UserRole, Category, Budget, Account, Fund } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { Plus, Minus, BarChart3, AlertTriangle, CalendarClock, Filter, PieChart as PieIcon, X, TrendingUp, TrendingDown, Wallet, ArrowRight, ArrowLeftRight, CheckCircle, Landmark, Activity, List, Target, ChevronDown, Eye, EyeOff } from './ui/Icons';
import { ICON_MAP } from './ui/IconMap';

interface DashboardProps {
  transactions: Transaction[];
  scheduled: ScheduledTransaction[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
  funds?: Fund[];
  onNewTransaction: (type: TransactionType) => void;
  userRole: UserRole;
}

type TimeRange = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, scheduled, categories, budgets, accounts, funds = [], onNewTransaction, userRole }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTHLY');
  const [activeIndex, setActiveIndex] = useState(0);

  // Privacy State (Persisted)
  const [hideValues, setHideValues] = useState(() => localStorage.getItem('mvp_hide_values') === 'true');

  const togglePrivacy = () => {
    const newState = !hideValues;
    setHideValues(newState);
    localStorage.setItem('mvp_hide_values', String(newState));
  };

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

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
    accounts.forEach(a => accBalances.set(a.id, a.initialBalance));
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
      globalAccountBalances: accounts.map(a => ({ ...a, currentBalance: accBalances.get(a.id) || 0 })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
      globalFundBalances: funds.map(f => ({ ...f, balance: fndBalances.get(f.id) || 0 })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    };
  }, [transactions, accounts, funds]);

  // --- OPTIMIZATION: Filtered Data for Charts & KPIs ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && t.type !== TransactionType.TRANSFER;
    });
  }, [transactions, startDate]);

  // --- OPTIMIZATION: KPI Totals ---
  const { income, expense, balance } = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      if (t.type === TransactionType.EXPENSE) acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 }) as any;
  }, [filteredTransactions]);

  const finalBalance = income - expense; // Simple period balance

  // --- OPTIMIZATION: Evolution Data ---
  const evolutionData = useMemo(() => {
    const dataMap: Record<string, { name: string, income: number, expense: number, balance: number, date: string }> = {};
    const isYearly = timeRange === 'YEARLY' || timeRange === 'SEMIANNUAL';
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(t => {
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
        dataMap[key] = { name: label, income: 0, expense: 0, balance: 0, date: key };
      }
      if (t.type === TransactionType.INCOME) dataMap[key].income += t.amount;
      if (t.type === TransactionType.EXPENSE) dataMap[key].expense += t.amount;

      dataMap[key].balance = dataMap[key].income - dataMap[key].expense;
    });
    return Object.values(dataMap);
  }, [filteredTransactions, timeRange]);

  // --- OPTIMIZATION: Pie Data ---
  const pieData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};
    let totalExp = 0;
    expenses.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      grouped[catName] = (grouped[catName] || 0) + t.amount;
      totalExp += t.amount;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, percent: totalExp > 0 ? (value / totalExp) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
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
      .filter(item => item.isActive)
      .map(item => {
        const [y, m, d] = item.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...item, diffDays, dueDateObj: dueDate };
      })
      .filter(item => item.diffDays <= 30)
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

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500 max-w-screen-2xl mx-auto">

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
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
        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm inline-flex items-center overflow-x-auto max-w-full">
          {timeFilters.map(filter => (
            <button key={filter.value} onClick={() => setTimeRange(filter.value)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all outline-none whitespace-nowrap focus:ring-2 focus:ring-blue-500/50 ${timeRange === filter.value ? 'bg-gray-900 dark:bg-slate-600 text-white shadow-md transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{filter.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid - IMPROVED COLORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

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

        {/* Saldo - Royal Blue Gradient */}
        <div className="bg-gradient-to-br from-blue-100/80 to-white dark:from-blue-900/40 dark:to-slate-800 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] border border-blue-200/50 dark:border-blue-800/30 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/60 to-transparent dark:from-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-50 dark:ring-blue-900/20"><Wallet size={24} strokeWidth={2.5} /></div>
            </div>
            <p className="text-blue-800/70 dark:text-blue-300/70 text-xs font-bold uppercase tracking-wider mb-1 ml-1">Saldo Líquido</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {globalAccountBalances.map(acc => (
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

                      <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" name="Saídas" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
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
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        cornerRadius={6}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        animationDuration={800}
                      >
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value, entry: any) => {
                          const { payload } = entry;
                          return <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{value} ({payload.percent.toFixed(0)}%)</span>;
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
                  <div key={t.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs shadow-sm ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : t.type === TransactionType.EXPENSE ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>{t.type === TransactionType.INCOME ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{t.description}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5"><span className="font-medium bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{new Date(t.date).toLocaleDateString('pt-BR')}</span><span className="text-gray-300 dark:text-slate-600">|</span><span>{categories.find(c => c.id === t.categoryId)?.name}</span></div>
                      </div>
                    </div>
                    <div className="text-right"><span className={`text-sm font-bold tabular-nums block ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{formatValue(t.amount)}</span></div>
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
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {budgetAlerts.map(b => {
              const isOver = b.percent >= 100;
              return (
                <div key={b.id} className={`p-4 rounded-xl border relative transition-all ${isOver ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30'}`}>
                  <div className="flex justify-between items-start mb-2"><p className={`text-[10px] font-bold uppercase tracking-wider ${isOver ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{isOver ? 'Estourado' : 'Em Risco'}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isOver ? 'bg-white dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-white dark:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>{b.percent.toFixed(0)}%</span></div>
                  <div className="flex justify-between items-end mb-3"><p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{categories.find(c => c.id === b.categoryId)?.name}</p><p className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatValue(b.spent)} <span className="opacity-50">/ {formatValue(b.amount)}</span></p></div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isOver ? 'bg-red-200 dark:bg-red-900/30' : 'bg-amber-200 dark:bg-amber-900/30'}`}><div className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(b.percent, 100)}%` }}></div></div>
                </div>
              );
            })}
            {scheduleAlerts.map(s => (
              <div key={s.id} className="p-4 bg-white dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 mr-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide inline-block mb-1 ${s.diffDays < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : s.diffDays === 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{s.diffDays === 0 ? 'Vence Hoje' : s.diffDays < 0 ? 'Atrasado' : `Vence em ${s.diffDays}d`}</span><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.title}</p></div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-600">{formatValue(s.amount)}</span>
                </div>
                <div className="mt-2 flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-700/50 pt-2"><span>Vencimento:</span><span className="font-bold text-gray-700 dark:text-gray-300">{s.dueDateObj.toLocaleDateString('pt-BR')}</span></div>
              </div>
            ))}
            {budgetAlerts.length === 0 && scheduleAlerts.length === 0 && (<div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-slate-700/50 rounded-xl"><div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-full mb-3"><CheckCircle className="text-emerald-500 opacity-80" size={32} /></div><p className="text-sm font-bold text-gray-600 dark:text-gray-300">Tudo sob controle!</p><p className="text-xs opacity-70 mt-1">Sem alertas pendentes.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
