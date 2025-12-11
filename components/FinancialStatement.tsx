
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { TransactionType } from '../types';
import { Printer, Calendar } from './ui/Icons';

export const FinancialStatement: React.FC = () => {
    const { data } = useFinance();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const currentChurch = data.churches.find(c => c.id === data.users[0]?.churchId) || data.churches[0];

    const reportData = useMemo(() => {
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        // 1. Previous Balance (All transactions before start of month)
        // Note: This is an approximation. In a real accounting system, we'd have closing balances.
        // Assuming 'initialBalance' of accounts + transactions < startOfMonth
        let previousBalance = data.accounts.reduce((acc, a) => acc + (a.churchId === currentChurch?.id ? a.initialBalance : 0), 0);

        const previousTransactions = data.transactions.filter(t =>
            t.churchId === currentChurch?.id &&
            new Date(t.date) < startOfMonth &&
            t.status === 'COMPLETED'
        );

        previousTransactions.forEach(t => {
            if (t.type === TransactionType.INCOME) previousBalance += t.amount;
            else if (t.type === TransactionType.EXPENSE) previousBalance -= t.amount;
        });

        // 2. Current Month Movement
        const monthTransactions = data.transactions.filter(t =>
            t.churchId === currentChurch?.id &&
            new Date(t.date) >= startOfMonth &&
            new Date(t.date) <= endOfMonth &&
            t.status === 'COMPLETED'
        );

        const totalIncome = monthTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((acc, t) => acc + t.amount, 0);

        const totalExpense = monthTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => acc + t.amount, 0);

        const currentBalance = previousBalance + totalIncome - totalExpense;

        // 3. Breakdown by Account (Current Balance of each account at end of month)
        // Ideally we calculate this per account, but as a summary:
        // We can just list current balances IF selected month is current month.
        // If historical, we need to calculate historical balance per account. Complex.
        // For MVP, we will show GLOBAL previous/current.
        // And list Accounts with their *calculated* balance at end of that month.

        const accountBalances = data.accounts
            .filter(a => a.churchId === currentChurch?.id)
            .map(acc => {
                let bal = acc.initialBalance;
                // Add all txs for this account up to end of selected month
                const accTxs = data.transactions.filter(t =>
                    t.accountId === acc.id &&
                    new Date(t.date) <= endOfMonth &&
                    t.status === 'COMPLETED'
                );
                accTxs.forEach(t => {
                    if (t.type === TransactionType.INCOME) bal += t.amount;
                    else if (t.type === TransactionType.EXPENSE) bal -= t.amount;
                });
                return { name: acc.name, balance: bal };
            });

        return {
            previousBalance,
            totalIncome,
            totalExpense,
            currentBalance,
            accountBalances
        };
    }, [data.transactions, data.accounts, selectedMonth, selectedYear, currentChurch]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Non-printable controls */}
            <div className="mb-8 flex justify-between items-center print:hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex gap-4">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                        className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
                    >
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
                    >
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                    <Printer size={18} /> Imprimir Balancete
                </button>
            </div>

            {/* Printable Area - A4 Style */}
            <div className="bg-white text-black p-10 shadow-lg print:shadow-none print:p-0 min-h-[29.7cm] relative">

                {/* Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-8">
                    {currentChurch?.logo && <img src={currentChurch.logo} alt="Logo" className="h-16 mx-auto mb-2 opacity-80 grayscale" />}
                    <h1 className="text-2xl font-bold uppercase">{currentChurch?.name || "Igreja Local"}</h1>
                    <p className="text-sm">Relatório Financeiro Mensal • Balancete de {months[selectedMonth]} / {selectedYear}</p>
                </div>

                {/* Summary Table */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">1. Resumo Geral</h2>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600">Saldo Anterior (em 01/{selectedMonth + 1}/{selectedYear})</td>
                                <td className="py-2 text-right font-mono font-bold">
                                    {reportData.previousBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600">( + ) Entradas do Mês</td>
                                <td className="py-2 text-right font-mono text-green-700">
                                    {reportData.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600">( - ) Saídas do Mês</td>
                                <td className="py-2 text-right font-mono text-red-700">
                                    {reportData.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                            <tr className="bg-gray-100 font-bold text-base">
                                <td className="py-3 pl-2">(=) Saldo Atual (em {new Date(selectedYear, selectedMonth + 1, 0).getDate()}/{selectedMonth + 1}/{selectedYear})</td>
                                <td className="py-3 text-right pr-2">
                                    {reportData.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Account Details */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">2. Demonstração por Conta (Disponibilidades)</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-200">
                                <th className="py-1">Conta / Caixa</th>
                                <th className="py-1 text-right">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.accountBalances.map((acc, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="py-2">{acc.name}</td>
                                    <td className="py-2 text-right font-mono">
                                        {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            <tr className="font-bold border-t border-black">
                                <td className="py-2 text-right">TOTAL DISPONÍVEL</td>
                                <td className="py-2 text-right font-mono">
                                    {reportData.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Legal / Notes */}
                <div className="mb-12 text-xs text-justify text-gray-500 leading-relaxed">
                    Declaramos para os devidos fins que as informações acima são verdadeiras e refletem a movimentação financeira da entidade no período citado. Os documentos comprobatórios (notas fiscais, recibos e extratos) encontram-se arquivados na tesouraria à disposição do Conselho Fiscal.
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-20">
                    <div className="text-center">
                        <div className="border-t border-black pt-2 font-bold text-sm uppercase">Tesoureiro(a)</div>
                        <div className="text-xs text-gray-500">Resp. Financeiro</div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black pt-2 font-bold text-sm uppercase">Presidente / Pastor</div>
                        <div className="text-xs text-gray-500">Administrativo</div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black pt-2 font-bold text-sm uppercase">Conselho Fiscal</div>
                        <div className="text-xs text-gray-500">Verificação</div>
                    </div>
                </div>

            </div>
        </div>
    );
};
