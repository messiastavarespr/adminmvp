
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Member, TransactionType } from '../types';
import { Plus, Trash2, CheckCircle, Search, User, DollarSign, Calendar } from './ui/Icons';

export const TithesEntry: React.FC = () => {
    const { data, addTransaction } = useFinance();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedAccount, setSelectedAccount] = useState(data.accounts[0]?.id || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [batchList, setBatchList] = useState<{ memberId: string; memberName: string; amount: number }[]>([]);

    // Find the "Tithes" category automatically or fallback
    const titheCategory = useMemo(() =>
        data.categories.find(c => c.name.toLowerCase().includes('dízimo') || c.name.toLowerCase().includes('dizimo'))?.id ||
        data.categories.find(c => c.type === TransactionType.INCOME)?.id || '',
        [data.categories]);

    const filteredMembers = useMemo(() => {
        if (!searchTerm) return [];
        return data.members.filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [data.members, searchTerm]);

    const handleAdd = () => {
        if (!selectedMember || !amount) return;
        const val = parseFloat(amount.replace(',', '.')); // Simple PT-BR handler
        if (!val || val <= 0) return;

        setBatchList(prev => [{
            memberId: selectedMember.id,
            memberName: selectedMember.name,
            amount: val
        }, ...prev]);

        // Reset for next entry
        setSelectedMember(null);
        setSearchTerm('');
        setAmount('');
        // Focus back to search provided by UI flow (manually implemented via ref if needed, but simplistic for now)
    };

    const handleRemove = (index: number) => {
        setBatchList(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcessBatch = async () => {
        if (batchList.length === 0) return;
        if (!selectedAccount) {
            alert("Selecione uma conta de destino.");
            return;
        }

        try {
            // Process all transactions
            // Ideally this should be a batch operation in Context, but loop is fine for MVP
            const today = new Date().toISOString(); // or use selected 'date'

            // We use Promise.all to ensure we wait, but Context usually updates optimistically or fast.
            // Ideally we'd have addTransactionsBatch but addTransaction is fine.
            for (const item of batchList) {
                await addTransaction({
                    id: crypto.randomUUID(),
                    description: `Dízimo - ${item.memberName}`,
                    amount: item.amount,
                    date: date, // User selected date
                    type: TransactionType.INCOME,
                    categoryId: titheCategory,
                    accountId: selectedAccount,
                    memberId: item.memberId,
                    churchId: data.churches[0]?.id || '', // Should use active church
                    status: 'COMPLETED'
                } as any);
            }

            alert(`${batchList.length} dízimos lançados com sucesso!`);
            setBatchList([]);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar lote.");
        }
    };

    const totalBatch = batchList.reduce((acc, item) => acc + item.amount, 0);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 absolute inset-0">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6 shadow-sm z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <DollarSign className="text-emerald-500" /> Lançamento de Dízimos
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Lance múltiplos dízimos rapidamente para um culto/evento.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Total do Lote</div>
                            <div className="text-3xl font-bold text-emerald-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBatch)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Data do Culto</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Destino (Conta)</label>
                            <select
                                value={selectedAccount}
                                onChange={e => setSelectedAccount(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                {data.accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleProcessBatch}
                                disabled={batchList.length === 0}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} /> Processar Lote
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section: Input & List */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

                    {/* LEFT: Entry Form */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-500" /> Nova Entrada</h3>

                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Membro</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={selectedMember ? selectedMember.name : searchTerm}
                                            onChange={e => {
                                                setSearchTerm(e.target.value);
                                                if (selectedMember && e.target.value !== selectedMember.name) setSelectedMember(null);
                                            }}
                                            placeholder="Digite o nome do membro..."
                                            className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-all font-medium"
                                        />
                                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    </div>
                                    {/* Autocomplete Dropdown */}
                                    {searchTerm && !selectedMember && filteredMembers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                                            {filteredMembers.map(m => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => { setSelectedMember(m); setSearchTerm(''); }}
                                                    className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 last:border-0"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                        {m.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 dark:text-white text-sm">{m.name}</div>
                                                        <div className="text-xs text-gray-500">{m.type === 'MEMBER' ? 'Membro' : 'Visitante'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Valor (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-gray-500 font-bold">R$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                            placeholder="0,00"
                                            className="w-full pl-12 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-all font-bold text-lg"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAdd}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    Adicionar à Lista
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2">Dica Rápida</h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Use a tecla <strong>Enter</strong> após digitar o valor para adicionar rapidamente e voltar ao campo de nome.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Batch List */}
                    <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">Lançamentos no Lote ({batchList.length})</h3>
                            {batchList.length > 0 && <button onClick={() => setBatchList([])} className="text-xs text-red-500 hover:underline">Limpar Tudo</button>}
                        </div>

                        <div className="flex-1 overflow-auto p-2 space-y-1">
                            {batchList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <User size={48} strokeWidth={1} className="mb-2" />
                                    <p>Nenhum lançamento ainda.</p>
                                </div>
                            ) : (
                                batchList.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg group transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-bold text-xs ring-2 ring-white dark:ring-slate-800">
                                                {idx + 1}
                                            </div>
                                            <span className="font-medium text-gray-800 dark:text-slate-200">{item.memberName}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-emerald-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                            </span>
                                            <button
                                                onClick={() => handleRemove(idx)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {batchList.length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Total acumulado</span>
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBatch)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
