
import React, { useState, useEffect } from 'react';
import { AppData, TransactionType, AccountingAccount } from '../types';
import { Download, FileText, Calculator, TrendingUp, TrendingDown, BookOpen } from './ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AccountingReportsProps {
  data: AppData;
}

const AccountingReports: React.FC<AccountingReportsProps> = ({ data }) => {
  const [reportType, setReportType] = useState<'TRIAL_BALANCE' | 'DRE'>('TRIAL_BALANCE');
  const [year, setYear] = useState(new Date().getFullYear());
  
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- TRIAL BALANCE CALCULATION (BALANCETE) ---
  const calculateTrialBalance = () => {
    // 1. Initialize balances for all accounting accounts
    const balances: Record<string, number> = {};
    data.accountingAccounts.forEach(acc => balances[acc.code] = 0);

    // 2. Process ASSET accounts (From Bank Accounts)
    // Assets accumulate ALL history plus initial balance.
    data.accounts.forEach(acc => {
       if (acc.accountingCode) {
          balances[acc.accountingCode] = (balances[acc.accountingCode] || 0) + acc.initialBalance;
       }
    });

    // 3. Process Transactions
    // We filter by year for DRE usually, but Balancete accumulates Assets/Liabilities over time.
    // However, Revenue/Expense are usually reset yearly. For simplified view, we'll show accumulated for Assets/Liabilities 
    // and Period Sum for Revenue/Expense if filtered, or Total if not.
    // Let's assume Balancete De Verificação covers the selected YEAR.
    
    // Re-calc Assets from scratch based on transaction history + initial
    const allTransactions = data.transactions;

    allTransactions.forEach(t => {
       const tYear = new Date(t.date).getFullYear();
       
       // Find related accounts
       const category = data.categories.find(c => c.id === t.categoryId);
       const account = data.accounts.find(a => a.id === t.accountId);
       
       // Impact on Bank Account (Asset) - Always happens
       if (account?.accountingCode) {
          if (t.type === TransactionType.INCOME) balances[account.accountingCode] += t.amount;
          else if (t.type === TransactionType.EXPENSE) balances[account.accountingCode] -= t.amount;
          else if (t.type === TransactionType.TRANSFER) {
             if (t.transferDirection === 'IN') balances[account.accountingCode] += t.amount;
             else balances[account.accountingCode] -= t.amount;
          }
       }

       // Impact on Revenue/Expense Account - Only if in selected year
       if (tYear === year && category?.accountingCode) {
          // Revenue is Credit (+), Expense is Debit (-) in accounting logic, but usually displayed positive in columns.
          // Let's store raw value sum.
          if (t.type === TransactionType.INCOME) balances[category.accountingCode] = (balances[category.accountingCode] || 0) + t.amount;
          else if (t.type === TransactionType.EXPENSE) balances[category.accountingCode] = (balances[category.accountingCode] || 0) + t.amount;
       }
    });

    return Object.keys(balances).map(code => {
       const acc = data.accountingAccounts.find(a => a.code === code);
       return {
          code,
          name: acc?.name || 'Desconhecida',
          type: acc?.type,
          balance: balances[code]
       };
    }).filter(row => row.balance !== 0 || row.type === 'ASSET'); // Hide empty revenue/expenses
  };

  // --- DRE CALCULATION ---
  const calculateDRE = () => {
     const revenueOps: { name: string, value: number, code: string }[] = [];
     const expenseOps: { name: string, value: number, code: string }[] = [];

     data.transactions.forEach(t => {
        const tYear = new Date(t.date).getFullYear();
        if (tYear !== year) return;

        const category = data.categories.find(c => c.id === t.categoryId);
        if (category?.accountingCode) {
           const acc = data.accountingAccounts.find(a => a.code === category.accountingCode);
           if (!acc) return;

           if (t.type === TransactionType.INCOME && acc.type === 'REVENUE') {
              const existing = revenueOps.find(r => r.code === acc.code);
              if (existing) existing.value += t.amount;
              else revenueOps.push({ name: acc.name, value: t.amount, code: acc.code });
           } else if (t.type === TransactionType.EXPENSE && acc.type === 'EXPENSE') {
              const existing = expenseOps.find(r => r.code === acc.code);
              if (existing) existing.value += t.amount;
              else expenseOps.push({ name: acc.name, value: t.amount, code: acc.code });
           }
        }
     });

     const totalRev = revenueOps.reduce((a,b) => a + b.value, 0);
     const totalExp = expenseOps.reduce((a,b) => a + b.value, 0);
     
     return { revenueOps, expenseOps, totalRev, totalExp, result: totalRev - totalExp };
  };

  const trialData = calculateTrialBalance();
  const dreData = calculateDRE();

  const exportCSV = () => {
     let csvContent = "data:text/csv;charset=utf-8,";
     
     if (reportType === 'TRIAL_BALANCE') {
        csvContent += "Codigo,Conta,Tipo,Saldo\n";
        trialData.forEach(row => {
           csvContent += `${row.code},"${row.name}",${row.type},${row.balance.toFixed(2)}\n`;
        });
     } else {
        csvContent += "DRE - Demonstracao do Resultado\n";
        csvContent += `Ano Base: ${year}\n\n`;
        csvContent += "Natureza,Conta,Valor\n";
        dreData.revenueOps.forEach(r => csvContent += `RECEITA,"${r.name}",${r.value.toFixed(2)}\n`);
        dreData.expenseOps.forEach(r => csvContent += `DESPESA,"${r.name}",${r.value.toFixed(2)}\n`);
        csvContent += `RESULTADO,SUPERAVIT/DEFICIT,${dreData.result.toFixed(2)}\n`;
     }

     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `contabilidade_${reportType}_${year}.csv`);
     document.body.appendChild(link);
     link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-600">
             <button onClick={() => setReportType('TRIAL_BALANCE')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportType === 'TRIAL_BALANCE' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Balancete</button>
             <button onClick={() => setReportType('DRE')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportType === 'DRE' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>DRE</button>
          </div>
          <div className="flex items-center gap-3">
             <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Ano Base:</label>
             <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-24 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none"/>
             <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"><Download size={16}/> Exportar CSV</button>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden min-h-[400px]">
          {reportType === 'TRIAL_BALANCE' && (
             <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><BookOpen size={20} className="text-indigo-500"/> Balancete de Verificação</h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-bold">
                         <tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Conta</th><th className="px-4 py-3">Natureza</th><th className="px-4 py-3 text-right">Saldo</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                         {trialData.sort((a,b) => a.code.localeCompare(b.code)).map(row => (
                            <tr key={row.code} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                               <td className="px-4 py-2 font-mono text-gray-500">{row.code}</td>
                               <td className="px-4 py-2 font-medium text-gray-800 dark:text-white">{row.name}</td>
                               <td className="px-4 py-2 text-xs text-gray-500">{row.type === 'ASSET' ? 'ATIVO' : row.type === 'LIABILITY' ? 'PASSIVO' : row.type === 'REVENUE' ? 'RECEITA' : row.type === 'EXPENSE' ? 'DESPESA' : 'PATRIMÔNIO'}</td>
                               <td className="px-4 py-2 text-right font-bold text-gray-700 dark:text-gray-300">{formatter.format(row.balance)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {reportType === 'DRE' && (
             <div className="p-6 max-w-4xl mx-auto">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 text-center border-b border-gray-100 dark:border-slate-700 pb-4">Demonstração do Resultado do Exercício ({year})</h3>
                
                <div className="space-y-1">
                   <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg font-bold text-emerald-800 dark:text-emerald-300">
                      <span>(+) RECEITAS OPERACIONAIS</span>
                      <span>{formatter.format(dreData.totalRev)}</span>
                   </div>
                   {dreData.revenueOps.map(r => (
                      <div key={r.code} className="flex justify-between items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-l-2 border-emerald-200 dark:border-emerald-800 ml-2">
                         <span>{r.code} - {r.name}</span>
                         <span>{formatter.format(r.value)}</span>
                      </div>
                   ))}
                </div>

                <div className="space-y-1 mt-6">
                   <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg font-bold text-rose-800 dark:text-rose-300">
                      <span>(-) DESPESAS OPERACIONAIS</span>
                      <span>{formatter.format(dreData.totalExp)}</span>
                   </div>
                   {dreData.expenseOps.map(r => (
                      <div key={r.code} className="flex justify-between items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-l-2 border-rose-200 dark:border-rose-800 ml-2">
                         <span>{r.code} - {r.name}</span>
                         <span>{formatter.format(r.value)}</span>
                      </div>
                   ))}
                </div>

                <div className="mt-8 pt-4 border-t-2 border-gray-200 dark:border-slate-600">
                   <div className={`flex justify-between items-center p-4 rounded-xl text-xl font-bold ${dreData.result >= 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-red-600 text-white shadow-lg shadow-red-500/30'}`}>
                      <span>RESULTADO DO EXERCÍCIO</span>
                      <span>{formatter.format(dreData.result)}</span>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default AccountingReports;
