
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useFinance } from '../contexts/FinanceContext';
import { Download, FileSpreadsheet, Loader2, Database, ShieldCheck } from './ui/Icons';
import { TransactionType } from '../types';

export const ExportData: React.FC = () => {
    const { data } = useFinance();
    const [isExporting, setIsExporting] = useState(false);

    const handleExportAll = () => {
        setIsExporting(true);
        setTimeout(() => {
            try {
                const workbook = XLSX.utils.book_new();

                // 1. Transactions Sheet
                const transactionsData = data.transactions.map(t => ({
                    Data: new Date(t.date).toLocaleDateString('pt-BR'),
                    Descrição: t.description,
                    Valor: t.amount,
                    Tipo: t.type === TransactionType.INCOME ? 'Receita' : t.type === TransactionType.EXPENSE ? 'Despesa' : 'Transferência',
                    Categoria: data.categories.find(c => c.id === t.categoryId)?.name || '-',
                    Conta: data.accounts.find(a => a.id === t.accountId)?.name || '-',
                    Centro_Custo: data.costCenters.find(cc => cc.id === t.costCenterId)?.name || '-',
                    Observação: t.notes || ''
                }));
                const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
                XLSX.utils.book_append_sheet(workbook, wsTransactions, "Transações");

                // 2. Categories Sheet
                const categoriesData = data.categories.map(c => ({
                    Nome: c.name,
                    Tipo: c.type === TransactionType.INCOME ? 'Receita' : 'Despesa',
                    Código_Contábil: c.accountingCode || '-'
                }));
                const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
                XLSX.utils.book_append_sheet(workbook, wsCategories, "Categorias");

                // 3. Accounts Sheet
                const accountsData = data.accounts.map(a => ({
                    Nome: a.name,
                    Saldo_Inicial: a.initialBalance,
                    Código: a.accountingCode || '-'
                }));
                const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
                XLSX.utils.book_append_sheet(workbook, wsAccounts, "Contas");

                // 4. Members Sheet
                const membersData = data.members.map(m => ({
                    Nome: m.name,
                    Email: m.email || '-',
                    Telefone: m.phone || '-',
                    Tipo: m.type === 'MEMBER' ? 'Membro' : m.type === 'VISITOR' ? 'Visitante' : 'Criança'
                }));
                const wsMembers = XLSX.utils.json_to_sheet(membersData);
                XLSX.utils.book_append_sheet(workbook, wsMembers, "Membros");


                // Save File
                XLSX.writeFile(workbook, `Backup_Financeiro_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
            } catch (error) {
                console.error("Export Error:", error);
                alert("Erro ao exportar dados.");
            } finally {
                setIsExporting(false);
            }
        }, 500); // Small UI delay
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* Info Section */}
                <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                        <Database size={12} /> Backup e Portabilidade
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Exportação de Dados</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        Exporte todos os seus registros para uma planilha Excel completa. Use para backup pessoal, migração de sistema ou para enviar ao seu contador.
                        <br /><span className="text-xs opacity-70 mt-2 block"><ShieldCheck className="inline w-3 h-3 mr-1" /> Seus dados são processados localmente no seu navegador.</span>
                    </p>
                </div>

                {/* Actions Section */}
                <div className="w-full md:w-auto flex flex-col gap-4">
                    <button
                        onClick={handleExportAll}
                        disabled={isExporting}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 px-8 py-4 text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isExporting ? <Loader2 size={24} className="animate-spin" /> : <FileSpreadsheet size={24} />}
                            <div className="text-left">
                                <div className="font-bold text-lg leading-none">Baixar Planilha</div>
                                <div className="text-xs text-green-100 font-medium mt-1 uppercase tracking-wide">Excel Completo (.xlsx)</div>
                            </div>
                        </div>
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                    </button>

                    <div className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                        Inclui: Transações, Categorias, Contas e Membros
                    </div>
                </div>
            </div>
        </div>
    );
};
