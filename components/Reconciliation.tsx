import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, AlertCircle, ArrowRight, X, FileInput, Plus, Edit2, ListPlus, CheckSquare } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useToast } from '../hooks/useToast';
import { Transaction, TransactionType } from '../types';

// --- Interfaces para OFX ---
interface BankTransaction {
    id: string;
    fitId: string;
    date: string; // YYYY-MM-DD
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
}

interface ReconciliationMatch {
    bankTx: BankTransaction;
    sysTx?: Transaction;
    matchType: 'EXACT' | 'PROBABLE' | 'NONE';
}

const Reconciliation: React.FC<{ onManualAdd?: (t: Partial<Transaction>) => void }> = ({ onManualAdd }) => {
    const { data, addTransaction, updateTransaction, activeChurchId } = useFinance();
    const { toast } = useToast();

    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Pending Data from Tools/OFXConverter (via Context in real app, but here local state simulated or prop)
    // We'll use the context one actually
    const { pendingImportData, setPendingImportData } = useFinance();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper for ID generation (UUID v4)
    const genId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // --- 1. Parser OFX Robusto ---
    const parseOFX = (content: string) => {
        const transactions: BankTransaction[] = [];

        // Divide o conteúdo em blocos de transação usando a tag <STMTTRN>
        // Isso é mais seguro que Regex global pois alguns bancos não usam tags de fechamento
        const rawTransactions = content.split('<STMTTRN>');

        // Ignora o primeiro pedaço (cabeçalho)
        for (let i = 1; i < rawTransactions.length; i++) {
            const block = rawTransactions[i];

            // Função auxiliar para extrair valor de uma tag (com ou sem fechamento)
            const getValue = (tag: string) => {
                // Procura por <TAG>valor< ou <TAG>valor\n ou <TAG>valor (fim)
                const regex = new RegExp(`<${tag}>([^<\r\n]+)`, 'i');
                const match = block.match(regex);
                return match ? match[1].trim() : null;
            };

            const dateRaw = getValue('DTPOSTED');
            const amountRaw = getValue('TRNAMT');
            const fitId = getValue('FITID');
            const memo = getValue('MEMO');

            if (amountRaw && dateRaw && fitId) {
                try {
                    // Parse Data: OFX usa formato YYYYMMDDHHMMSS... Pegamos apenas os primeiros 8 chars
                    const cleanDate = dateRaw.substring(0, 8);
                    const year = cleanDate.substring(0, 4);
                    const month = cleanDate.substring(4, 6);
                    const day = cleanDate.substring(6, 8);
                    const formattedDate = `${year}-${month}-${day}`;

                    // Parse Valor: Substitui vírgula por ponto se necessário e converte
                    const cleanAmount = amountRaw.replace(',', '.');
                    const rawAmountNum = parseFloat(cleanAmount);

                    if (isNaN(rawAmountNum)) continue;

                    const txType = rawAmountNum < 0 ? 'DEBIT' : 'CREDIT';

                    transactions.push({
                        id: genId(), // Using UUID for consistency
                        fitId: fitId,
                        date: formattedDate,
                        amount: Math.abs(rawAmountNum),
                        type: txType,
                        description: memo || 'Transferência/Depósito'
                    });
                } catch (e) {
                    console.error("Erro ao processar linha OFX", e);
                }
            }
        }

        return transactions;
    };

    // --- 2. Algoritmo de Matching ---
    const runMatchingAlgorithm = (bankTxns: BankTransaction[]) => {
        const newMatches: ReconciliationMatch[] = [];

        // Filtrar transações do sistema que AINDA NÃO foram conciliadas
        const openSystemTxns = data.transactions.filter(t => !t.reconciled && t.churchId === activeChurchId);

        bankTxns.forEach(bankTx => {
            // 1. Tentar Match Exato (Valor Igual + Data Igual)
            // Nota: Comparamos strings YYYY-MM-DD direto
            let match = openSystemTxns.find(sysTx =>
                Math.abs(sysTx.amount - bankTx.amount) < 0.01 && // Comparação float segura
                sysTx.date === bankTx.date &&
                ((bankTx.type === 'CREDIT' && sysTx.type === TransactionType.INCOME) ||
                    (bankTx.type === 'DEBIT' && sysTx.type === TransactionType.EXPENSE))
            );

            if (match) {
                newMatches.push({ bankTx, sysTx: match, matchType: 'EXACT' });
                return;
            }

            // 2. Tentar Match Provável (Valor Igual + Data Próxima +/- 3 dias)
            match = openSystemTxns.find(sysTx => {
                if (Math.abs(sysTx.amount - bankTx.amount) >= 0.01) return false;

                // Verificar tipo
                const isCompatibleType = (bankTx.type === 'CREDIT' && sysTx.type === TransactionType.INCOME) ||
                    (bankTx.type === 'DEBIT' && sysTx.type === TransactionType.EXPENSE);
                if (!isCompatibleType) return false;

                const d1 = new Date(sysTx.date + 'T12:00:00').getTime();
                const d2 = new Date(bankTx.date + 'T12:00:00').getTime();
                const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);

                return diffDays <= 3; // Margem de 3 dias para compensação bancária
            });

            if (match) {
                newMatches.push({ bankTx, sysTx: match, matchType: 'PROBABLE' });
            } else {
                newMatches.push({ bankTx, matchType: 'NONE' });
            }
        });

        setMatches(newMatches);
    };

    // --- EFFECT: Handle Pending Import Data (from Tools/OFXConverter) ---
    useEffect(() => {
        if (pendingImportData) {
            try {
                const parsed = parseOFX(pendingImportData);
                if (parsed.length > 0) {
                    setBankTransactions(parsed);
                    runMatchingAlgorithm(parsed);
                    toast.success(`Importação automática via Ferramenta OFX: ${parsed.length} itens.`);
                } else {
                    setError("O conteúdo OFX enviado parece vazio ou inválido.");
                }
            } catch (e) {
                console.error("Erro ao importar dados pendentes", e);
                setError("Erro ao processar dados enviados da ferramenta.");
            } finally {
                // Clear the pending data so it doesn't trigger again
                setPendingImportData(null);
            }
        }
    }, [pendingImportData]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Resetar estados
        setError(null);
        setBankTransactions([]);
        setMatches([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const content = evt.target?.result as string;
                const parsed = parseOFX(content);

                if (parsed.length === 0) {
                    const msg = "Nenhuma transação válida encontrada. Verifique se o arquivo está no formato OFX correto.";
                    setError(msg);
                    toast.error(msg);
                    return;
                }

                setBankTransactions(parsed);
                runMatchingAlgorithm(parsed);
                toast.success(`Importou extrato OFX com ${parsed.length} transações.`);
            } catch (err: any) {
                console.error("Erro no processamento do arquivo", err);
                const msg = "Erro ao processar o arquivo. O formato pode estar corrompido.";
                setError(msg);
                toast.error(msg);
            }
        };

        reader.onerror = () => {
            const msg = "Erro ao ler o arquivo do disco.";
            setError(msg);
            toast.error(msg);
        }

        reader.readAsText(file);
        // Limpar input para permitir re-upload do mesmo arquivo se necessário
        e.target.value = '';
    };

    // --- 3. Ações ---
    const confirmMatch = (match: ReconciliationMatch) => {
        if (match.sysTx) {
            updateTransaction({ ...match.sysTx, reconciled: true });
            // Remove visualmente da lista
            setMatches(prev => prev.filter(m => m.bankTx.id !== match.bankTx.id));
            toast.success("Transação conciliada com sucesso.");
        }
    };


    // --- Smart Category Detection ---
    const getSuggestedCategory = (bankTx: BankTransaction): string => {
        // 1. First, try to find a category that matches keywords in description
        const targetType = bankTx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE;
        const compatibleCategories = data.categories.filter(c => c.type === targetType);

        // Simple Keyword Matcher: Check if Category Name is inside Description (case insensitive)
        const exactNameMatch = compatibleCategories.find(c =>
            bankTx.description.toUpperCase().includes(c.name.toUpperCase())
        );

        if (exactNameMatch) return exactNameMatch.id;

        // 2. Fallback to default logic (first of type)
        return compatibleCategories[0]?.id || data.categories[0].id;
    };

    const createFromBank = (bankTx: BankTransaction) => {
        // Cria automaticamente usando categoria sugerida
        const catId = getSuggestedCategory(bankTx);

        const newTx: Transaction = {
            id: genId(), // Fix: Use UUID
            date: bankTx.date,
            amount: bankTx.amount,
            description: bankTx.description,
            type: bankTx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
            accountId: data.accounts[0]?.id || '', // Default para a primeira conta
            categoryId: catId,
            fundId: data.funds[0]?.id || '', // Default fund required
            churchId: activeChurchId || data.churches[0].id,
            isPaid: true,
            attachments: [],
            reconciled: true // Já nasce conciliado
        };
        addTransaction(newTx);
        setMatches(prev => prev.filter(m => m.bankTx.id !== bankTx.id));
    };

    // --- 4. Bulk Actions ---
    const handleBulkConciliate = () => {
        const exactMatches = matches.filter(m => m.matchType === 'EXACT');
        if (exactMatches.length === 0) return;

        if (!confirm(`Confirma a conciliação automática de ${exactMatches.length} itens exatos?`)) return;

        exactMatches.forEach(m => {
            if (m.sysTx) {
                updateTransaction({ ...m.sysTx, reconciled: true });
            }
        });

        // Remove from UI
        setMatches(prev => prev.filter(m => m.matchType !== 'EXACT'));
        toast.success(`${exactMatches.length} itens conciliados.`);
    };

    const handleBulkAdd = () => {
        const newItems = matches.filter(m => m.matchType === 'NONE');
        if (newItems.length === 0) return;

        if (!confirm(`Deseja adicionar ${newItems.length} novos lançamentos ao Livro Caixa? Eles serão categorizados automaticamente.`)) return;

        newItems.forEach(m => {
            const bankTx = m.bankTx;
            const catId = getSuggestedCategory(bankTx);

            const newTx: Transaction = {
                id: genId(), // Fix: Use UUID
                date: bankTx.date,
                amount: bankTx.amount,
                description: bankTx.description,
                type: bankTx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                accountId: data.accounts[0]?.id || '',
                categoryId: catId,
                fundId: data.funds[0]?.id || '',
                churchId: activeChurchId || data.churches[0].id,
                isPaid: true,
                attachments: [],
                reconciled: true
            };
            addTransaction(newTx);
        });

        setMatches(prev => prev.filter(m => m.matchType !== 'NONE'));
        toast.success(`${newItems.length} novos itens adicionados.`);
    };

    // Helpers de formatação
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Contadores
    const exactCount = matches.filter(m => m.matchType === 'EXACT').length;
    const newCount = matches.filter(m => m.matchType === 'NONE').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Conciliação Bancária</h2>
                    <p className="text-gray-500 dark:text-gray-400">Importe seu extrato e compare com o sistema.</p>
                </div>
                <div className="flex gap-2">
                    {bankTransactions.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm('Limpar dados da importação atual?')) {
                                    setBankTransactions([]);
                                    setMatches([]);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors"
                        >
                            <X size={18} /> Limpar
                        </button>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".ofx,.txt,.xml"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Upload size={18} /> {bankTransactions.length > 0 ? 'Importar Outro' : 'Importar Extrato OFX'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle size={24} className="shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold text-sm">Falha na Importação</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}

            {bankTransactions.length === 0 && !error ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                        <FileInput size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Aguardando Arquivo</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md">
                        Faça upload de um arquivo <strong>.OFX</strong> fornecido pelo seu banco ou use o <strong>Conversor OFX</strong> (Menu Ferramentas) para processar extratos em PDF/Texto.
                    </p>
                </div>
            ) : bankTransactions.length > 0 ? (
                <div className="space-y-4">
                    {/* Resumo e Ações Globais */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="grid grid-cols-3 gap-8 text-center w-full md:w-auto">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Extrato</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{bankTransactions.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Iguais</p>
                                    <p className="text-2xl font-bold text-emerald-600">{exactCount}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Novos</p>
                                    <p className="text-2xl font-bold text-amber-600">{newCount}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={handleBulkConciliate}
                                    disabled={exactCount === 0}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={18} />
                                    Conciliar ({exactCount})
                                </button>
                                <button
                                    onClick={handleBulkAdd}
                                    disabled={newCount === 0}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ListPlus size={18} />
                                    Importar Novos ({newCount})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Matching */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Detalhamento da Conciliação</h3>
                            <span className="text-xs text-gray-500">O sistema tenta identificar categorias automaticamente pelo nome.</span>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {matches.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
                                    <CheckCircle size={48} className="text-emerald-200 mb-2" />
                                    <p className="font-medium">Tudo limpo!</p>
                                    <p className="text-sm">Todas as transações foram conciliadas.</p>
                                </div>
                            ) : (
                                matches.map(m => {
                                    // Encontrar categoria sugerida para exibição
                                    const suggestedCatId = getSuggestedCategory(m.bankTx);
                                    const suggestedCat = data.categories.find(c => c.id === suggestedCatId);

                                    return (
                                        <div key={m.bankTx.id} className="p-4 flex flex-col lg:flex-row items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors animate-in slide-in-from-bottom-2 group">

                                            {/* Lado do Banco */}
                                            <div className="flex-1 w-full bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.bankTx.type === 'CREDIT' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <div className="flex items-center gap-3 pl-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold text-gray-800 dark:text-white text-sm truncate pr-2" title={m.bankTx.description}>
                                                                {m.bankTx.description}
                                                            </p>
                                                            <span className={`font-mono font-bold text-sm ${m.bankTx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                {m.bankTx.type === 'CREDIT' ? '+' : '-'}{formatter.format(m.bankTx.amount)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {new Date(m.bankTx.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {m.bankTx.type === 'CREDIT' ? 'Entrada' : 'Saída'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conector */}
                                            <div className="flex flex-col items-center justify-center text-gray-300">
                                                {m.matchType === 'EXACT' && <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full"><CheckCircle size={20} /></div>}
                                                {m.matchType === 'PROBABLE' && <div className="bg-amber-100 text-amber-600 p-1.5 rounded-full"><AlertTriangle size={20} /></div>}
                                                {m.matchType === 'NONE' && <div className="text-gray-300"><ArrowRight size={20} className="hidden lg:block" /></div>}
                                            </div>

                                            {/* Lado do Sistema / Ação */}
                                            <div className="flex-1 w-full">
                                                {m.matchType === 'NONE' ? (
                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-1 w-full sm:w-auto">
                                                            <span className="font-medium whitespace-nowrap">Será criado como:</span>
                                                            {suggestedCat ? (
                                                                <span className="px-2 py-1 rounded bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 font-bold truncate max-w-[150px]">
                                                                    {suggestedCat.name}
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-gray-400">Sem categoria</span>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            {onManualAdd && (
                                                                <button
                                                                    onClick={() => onManualAdd(m.bankTx)}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg font-bold transition-colors whitespace-nowrap"
                                                                >
                                                                    <Edit2 size={14} /> Manual
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => createFromBank(m.bankTx)}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold transition-colors whitespace-nowrap shadow-sm"
                                                            >
                                                                <Plus size={14} /> Adicionar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`p-3 rounded-lg border flex justify-between items-center gap-2 ${m.matchType === 'EXACT'
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                                                        }`}>
                                                        <div className="min-w-0">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block ${m.matchType === 'EXACT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {m.matchType === 'EXACT' ? 'Encontrado' : 'Semelhante'}
                                                            </span>
                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                                                                {m.sysTx?.description}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => confirmMatch(m)}
                                                            className={`text-xs px-3 py-2 rounded-lg font-bold border transition-colors flex items-center gap-1 shadow-sm ${m.matchType === 'EXACT'
                                                                ? 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                                                : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
                                                                }`}
                                                        >
                                                            <CheckCircle size={14} /> Confirmar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Reconciliation;
