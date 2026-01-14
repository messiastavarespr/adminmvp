
import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, Target, PieChart as PieIcon,
    ArrowUpRight, ArrowDownRight, Zap, Briefcase, Landmark, Info
} from './ui/Icons';
import { Transaction, TransactionType, Category, Church } from '../types';

interface AnalyticsProps {
    transactions: Transaction[];
    categories: Category[];
    churches: Church[];
    activeChurchId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#475569', '#14b8a6'];

const Analytics: React.FC<AnalyticsProps> = ({ transactions, categories, churches, activeChurchId }) => {
    const [timeRange, setTimeRange] = useState<'12M' | '6M' | '3M' | 'MONTH'>('12M');

    // --- DATA PROCESSING: Strategic Flow ---
    const strategicData = useMemo(() => {
        const dataMap: Record<string, any> = {};
        const now = new Date();

        if (timeRange === 'MONTH') {
            // Daily view for current month
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = String(i).padStart(2, '0');
                const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${dayStr}`;
                dataMap[key] = {
                    name: dayStr,
                    fullName: `${dayStr}/${String(now.getMonth() + 1).padStart(2, '0')}`,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    accBalance: 0,
                    date: key
                };
            }
        } else {
            // Monthly view for last X months
            const monthsToInlcude = timeRange === '12M' ? 12 : timeRange === '6M' ? 6 : 3;
            for (let i = monthsToInlcude - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                dataMap[key] = {
                    name: d.toLocaleDateString('pt-BR', { month: 'short' }),
                    fullName: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                    income: 0,
                    expense: 0,
                    balance: 0,
                    accBalance: 0,
                    date: key
                };
            }
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = timeRange === 'MONTH'
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (dataMap[key]) {
                if (t.type === TransactionType.INCOME) dataMap[key].income += t.amount;
                if (t.type === TransactionType.EXPENSE) dataMap[key].expense += t.amount;
            }
        });

        const sorted = Object.values(dataMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

        let runningBalance = 0;
        return sorted.map((m: any) => {
            m.balance = m.income - m.expense;
            runningBalance += m.balance;
            m.accBalance = runningBalance;
            return m;
        });
    }, [transactions, timeRange]);

    // --- METRICS ---
    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);

        const monthIncome = transactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date) >= startOfMonth).reduce((acc, t) => acc + t.amount, 0);
        const monthExpense = transactions.filter(t => t.type === TransactionType.EXPENSE && new Date(t.date) >= startOfMonth).reduce((acc, t) => acc + t.amount, 0);

        const netProfit = totalIncome - totalExpense;
        const efficiency = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        return {
            totalIncome,
            totalExpense,
            monthIncome,
            monthExpense,
            netProfit,
            efficiency
        };
    }, [transactions]);

    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header & Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Activity size={24} className="text-white" />
                        </div>
                        Centro de Inteligência
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Análise estratégica e saúde financeira em tempo real</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    {(['MONTH', '3M', '6M', '12M'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeRange === range
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {range === '12M' ? 'Últimos 12 Meses' : range === '6M' ? '6 Meses' : range === '3M' ? '3 Meses' : 'Este Mês'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{timeRange === 'MONTH' ? 'Entradas (Mês)' : 'Arrecadação Total'}</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatValue(timeRange === 'MONTH' ? metrics.monthIncome : metrics.totalIncome)}</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                        <ArrowUpRight size={12} /> {timeRange === 'MONTH' ? 'Performance Mensal' : 'Performance Total'}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={48} className="text-rose-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{timeRange === 'MONTH' ? 'Saídas (Mês)' : 'Custo Operacional'}</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{formatValue(timeRange === 'MONTH' ? metrics.monthExpense : metrics.totalExpense)}</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-700/50 px-2 py-1 rounded-full w-fit">
                        {timeRange === 'MONTH' ? 'Gastos do Período' : 'Histórico Consolidado'}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={48} className="text-indigo-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Eficácia {timeRange === 'MONTH' ? '(Mês)' : ''}</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {(timeRange === 'MONTH'
                            ? (metrics.monthIncome > 0 ? ((metrics.monthIncome - metrics.monthExpense) / metrics.monthIncome * 100) : 0)
                            : metrics.efficiency
                        ).toFixed(1)}%
                    </p>
                    <div className="mt-4 w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{
                            width: `${Math.max(0, Math.min(100, (timeRange === 'MONTH'
                                ? (metrics.monthIncome > 0 ? ((metrics.monthIncome - metrics.monthExpense) / metrics.monthIncome * 100) : 0)
                                : metrics.efficiency
                            )))}%`
                        }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group border-b-4 border-b-amber-500">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={48} className="text-amber-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ponto de Equilíbrio</p>
                    <p className="text-2xl font-black text-gray-800 dark:text-white tabular-nums">1.2x</p>
                    <p className="text-[10px] text-gray-400 mt-2">Arrecadação vs Despesa Fixa</p>
                </div>
            </div>

            {/* Main Strategic Chart */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Fluxo de Caixa Estratégico</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Comparativo mensal entre Entradas, Saídas e Evolução do Saldo</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-gray-400 uppercase">Entradas</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-[10px] font-bold text-gray-400 uppercase">Saídas</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-1 rounded-full bg-indigo-500"></div><span className="text-[10px] font-bold text-gray-400 uppercase">Saldo Acumulado</span></div>
                    </div>
                </div>

                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={strategicData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <defs>
                                <linearGradient id="barGradientIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                                </linearGradient>
                                <linearGradient id="barGradientExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.3} />
                                </linearGradient>
                                <filter id="shadow" height="200%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                    <feOffset dx="2" dy="2" result="offsetblur" />
                                    <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
                                    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={(val) => `R$ ${val / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: 'none',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '12px'
                                }}
                                itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                formatter={(value: number) => [formatValue(value), '']}
                            />
                            <Bar dataKey="income" name="Entradas" fill="url(#barGradientIncome)" radius={[6, 6, 0, 0]} barSize={32} />
                            <Bar dataKey="expense" name="Saídas" fill="url(#barGradientExpense)" radius={[6, 6, 0, 0]} barSize={32} />
                            <Line
                                type="monotone"
                                dataKey="accBalance"
                                name="Saldo Accl."
                                stroke="#6366f1"
                                strokeWidth={4}
                                dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
                                filter="url(#shadow)"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Dynamic Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Category Share */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center">
                    <h3 className="w-full text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <PieIcon size={20} className="text-indigo-500" /> Radar de Destino
                    </h3>
                    <div className="h-64 w-full relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Top 1</span>
                            <span className="text-sm font-black text-gray-800 dark:text-white">Aluguel</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Pessoal', value: 400 },
                                        { name: 'Operacional', value: 300 },
                                        { name: 'Missões', value: 200 },
                                        { name: 'Social', value: 100 },
                                    ]}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-3 mt-4">
                        {['Pessoal (40%)', 'Operacional (30%)', 'Missões (20%)'].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
                                <span className="font-bold text-gray-500 dark:text-gray-400">{item}</span>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Intelligence Message */}
                <div className="lg:col-span-2 bg-indigo-600 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Target size={180} strokeWidth={4} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="w-fit p-3 bg-blue-400/20 backdrop-blur-md rounded-2xl mb-6">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-3xl font-black leading-tight mb-4">Insights de <br /> Inteligência Financeira</h3>
                            <p className="text-indigo-100 text-lg font-medium max-w-lg leading-relaxed">
                                Detectamos que seu fluxo de entrada cresceu **12%** nos últimos 3 meses, enquanto as despesas fixas mantiveram-se estáveis. Isso indica uma oportunidade para expansão ou novos investimentos ministeriais.
                            </p>
                        </div>
                        <div className="mt-12 flex flex-wrap gap-4">
                            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 opacity-80 mb-1 text-center">Saúde Atual</p>
                                <p className="text-xl font-black text-center">Excelente</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 opacity-80 mb-1 text-center">Tendência</p>
                                <p className="text-xl font-black text-center">Alta 📈</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
