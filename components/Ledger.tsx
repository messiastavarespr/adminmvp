
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Category, Account, UserRole, CostCenter, Member, Church, Fund } from '../types';
import { Filter, Trash2, FileText, Download, TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Search, X, Edit2, Plus, Minus, Eye, CalendarClock, ChevronLeft, ChevronRight, FileSpreadsheet, Share2, AlertCircle, Target, User, Paperclip, CheckCircle } from './ui/Icons';
import ConfirmationModal from './ConfirmationModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import ReceiptModal from './ReceiptModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchBox from './ui/SearchBox';
import { TableVirtuoso, Virtuoso } from 'react-virtuoso';

interface LedgerProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  costCenters: CostCenter[];
  funds?: Fund[];
  members: Member[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  onNewTransaction: (type: TransactionType) => void;
  userRole: UserRole;
  currentChurch: Church;
}

const Ledger: React.FC<LedgerProps> = ({ transactions, categories, accounts, costCenters, funds = [], members, onDelete, onEdit, onNewTransaction, userRole, currentChurch }) => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCostCenter, setFilterCostCenter] = useState('ALL');
  const [filterFund, setFilterFund] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MISSING_ATTACHMENT' | 'NOT_RECONCILED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

  // Per user request, edit option enabled for all profiles
  const canEdit = true; // was: userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || '-';
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || '-';
  const getFundName = (id?: string) => funds.find(f => f.id === id)?.name || '-';

  const filteredTransactions = transactions
    .filter(t => t.date >= startDate && t.date <= endDate)
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .filter(t => filterAccount === 'ALL' || t.accountId === filterAccount)
    .filter(t => filterCategory === 'ALL' || t.categoryId === filterCategory)
    .filter(t => filterCostCenter === 'ALL' || t.costCenterId === filterCostCenter)
    .filter(t => filterFund === 'ALL' || t.fundId === filterFund)
    .filter(t => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'MISSING_ATTACHMENT') return t.type === TransactionType.EXPENSE && (!t.attachments || t.attachments.length === 0);
      if (filterStatus === 'NOT_RECONCILED') return !t.reconciled;
      return true;
    })
    .filter(t =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.memberOrSupplierName && t.memberOrSupplierName.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME || (t.type === TransactionType.TRANSFER && t.transferDirection === 'IN')).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE || (t.type === TransactionType.TRANSFER && t.transferDirection === 'OUT')).reduce((acc, t) => acc + t.amount, 0);
  const periodBalance = totalIncome - totalExpense;

  const previousTransactions = transactions
    .filter(t => t.date.split('T')[0] < startDate)
    .filter(t => filterAccount === 'ALL' || t.accountId === filterAccount)
    .filter(t => filterCategory === 'ALL' || t.categoryId === filterCategory)
    .filter(t => filterCostCenter === 'ALL' || t.costCenterId === filterCostCenter)
    .filter(t => filterFund === 'ALL' || t.fundId === filterFund);

  // Global Initial Balance & Legacy Offset calculation for Ledger
  // We only add this if we aren't filtering by Fund/Category/CostCenter, 
  // because initialBalance belongs to the Account, not specific categories.
  let globalInitialAndLegacy = 0;
  if (filterCategory === 'ALL' && filterCostCenter === 'ALL' && filterFund === 'ALL') {
    globalInitialAndLegacy = accounts.reduce((acc, a) => {
      const matchesAccount = filterAccount === 'ALL' ? true : a.id === filterAccount;
      if (!matchesAccount) return acc;

      let initial = 0;
      // Default to the church-specific initial balance if not MASTER
      if (currentChurch?.id !== 'ALL') {
        const isHidden = currentChurch?.settings?.hiddenAccounts?.includes(a.id);
        if (isHidden) return acc;

        const customInitial = currentChurch?.settings?.initialBalances?.[a.id];
        if (customInitial !== undefined) {
          initial = customInitial;
        } else if (a.churchId === currentChurch?.id) {
          initial = a.initialBalance;
        }
      } else {
        initial = a.initialBalance;
      }
      return acc + initial + (a.legacyBalanceOffset || 0);
    }, 0);
  }

  const previousIncome = previousTransactions.filter(t => t.type === TransactionType.INCOME || (t.type === TransactionType.TRANSFER && t.transferDirection === 'IN')).reduce((acc, t) => acc + t.amount, 0);
  const previousExpense = previousTransactions.filter(t => t.type === TransactionType.EXPENSE || (t.type === TransactionType.TRANSFER && t.transferDirection === 'OUT')).reduce((acc, t) => acc + t.amount, 0);
  const previousBalance = previousIncome - previousExpense + globalInitialAndLegacy;

  const currentBalance = previousBalance + periodBalance;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExportExcel = () => {
    const exportData = filteredTransactions.map(t => ({
      Data: t.date.split('T')[0].split('-').reverse().join('/'),
      Descrição: t.description,
      'Membro/Fornecedor': t.memberOrSupplierName || '-',
      Categoria: getCategoryName(t.categoryId),
      Conta: getAccountName(t.accountId),
      'Fundo/Projeto': getFundName(t.fundId),
      'Responsável': t.createdBy || '-',
      'Centro de Custo': costCenters.find(cc => cc.id === t.costCenterId)?.name || 'Geral',
      Valor: t.amount,
      Tipo: t.type === TransactionType.INCOME ? 'Entrada' : (t.type === TransactionType.EXPENSE ? 'Saída' : 'Transferência'),
      Status: t.isPaid ? 'Conciliado' : 'Pendente'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Livro Caixa");

    const wscols = [{ wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `livro_caixa_${startDate}_${endDate}.xlsx`);
  };

  const activeFiltersCount = [filterType !== 'ALL', filterCategory !== 'ALL', filterAccount !== 'ALL', filterCostCenter !== 'ALL', filterFund !== 'ALL'].filter(Boolean).length;

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex-none space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div><h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><FileText className="text-blue-600" size={24} /> Livro Caixa</h2><p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie lançamentos financeiros.</p></div>
          <div className="flex gap-2 w-full md:w-auto">
            {canEdit && (
              <>
                <button onClick={() => onNewTransaction(TransactionType.INCOME)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"><Plus size={16} /> Entrada</button>
                <button onClick={() => onNewTransaction(TransactionType.EXPENSE)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"><Minus size={16} /> Saída</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Saldo Anterior */}
          <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl border border-gray-200 dark:border-slate-600 flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Saldo Anterior</p>
              <p className={`text-lg font-bold ${previousBalance >= 0 ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>
                {formatter.format(previousBalance)}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Acumulado até {new Date(startDate).toLocaleDateString('pt-BR')}</p>
            </div>
            <CalendarClock className="text-gray-300 dark:text-slate-600 absolute -right-2 -bottom-2 z-0 opacity-50" size={48} />
          </div>

          {/* Card 2: Entradas (Período) */}
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Entradas</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatter.format(totalIncome)}</p>
            </div>
            <TrendingUp className="text-emerald-500 opacity-80" size={24} />
          </div>

          {/* Card 3: Saídas (Período) */}
          <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30 flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <p className="text-xs font-bold text-rose-600 uppercase mb-1">Saídas</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{formatter.format(totalExpense)}</p>
            </div>
            <TrendingDown className="text-rose-500 opacity-80" size={24} />
          </div>

          {/* Card 4: Resultado do Período (NOVO) */}
          <div className={`p-4 rounded-xl border flex justify-between items-center relative overflow-hidden bg-gradient-to-br ${periodBalance >= 0 ? 'from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 border-indigo-100 dark:border-indigo-800/30' : 'from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-800 border-orange-100 dark:border-orange-800/30'}`}>
            <div className="z-10">
              <p className={`text-xs font-bold uppercase mb-1 ${periodBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Resultado (Mês)</p>
              <p className={`text-lg font-bold ${periodBalance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {formatter.format(periodBalance)}
              </p>
            </div>
            {periodBalance >= 0 ? <Target className="text-indigo-500" size={24} /> : <AlertCircle className="text-orange-500" size={24} />}
          </div>

          {/* Card 5: Saldo Atual (Acumulado) */}
          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="z-10">
              <p className="text-xs font-bold text-blue-600 uppercase mb-1">Saldo Atual</p>
              <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600'}`}>
                {formatter.format(currentBalance)}
              </p>
              <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-1">Saldo Final Acumulado</p>
            </div>
            <Wallet className="text-blue-500" size={28} />
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-all">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === 'ALL' ? 'bg-gray-800 dark:bg-slate-600 text-white border-gray-800' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:border-gray-300'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('MISSING_ATTACHMENT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === 'MISSING_ATTACHMENT' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:border-amber-200'}`}
              >
                <AlertCircle size={14} /> Sem Comprovante
              </button>
              <button
                onClick={() => setFilterStatus('NOT_RECONCILED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === 'NOT_RECONCILED' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:border-rose-200'}`}
              >
                <X size={14} /> Não Conciliados
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-32 p-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-32 p-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full lg:w-auto"><SearchBox value={search} onChange={setSearch} placeholder="Buscar por descrição, membro..." /></div>
            <div className="flex gap-2 w-full lg:w-auto">
              <button onClick={() => setShowFilters(!showFilters)} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Filter size={18} />Filtros {activeFiltersCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{activeFiltersCount}</span>}</button>
              <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" title="Exportar dados filtrados para Excel"><FileSpreadsheet size={18} />Exportar</button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2">
              <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo</label><select value={filterType} onChange={(e) => setFilterType(e.target.value as TransactionType | 'ALL')} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"><option value="ALL">Todos</option><option value={TransactionType.INCOME}>Entradas</option><option value={TransactionType.EXPENSE}>Saídas</option><option value={TransactionType.TRANSFER}>Transferências</option></select></div>
              <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Categoria</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"><option value="ALL">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Conta / Banco</label><select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"><option value="ALL">Todas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Centro de Custo</label><select value={filterCostCenter} onChange={(e) => setFilterCostCenter(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"><option value="ALL">Todos</option>{costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Fundo / Projeto</label><select value={filterFund} onChange={(e) => setFilterFund(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"><option value="ALL">Todos</option>{funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
        {filteredTransactions.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p>Nenhum lançamento encontrado neste período.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW */}
            <div className="hidden md:block h-full">
              <TableVirtuoso
                data={filteredTransactions}
                fixedHeaderContent={() => (
                  <tr className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-sm text-left">
                    <th className="px-6 py-3 whitespace-nowrap w-[120px]">Data</th>
                    <th className="px-6 py-3 whitespace-nowrap">Descrição</th>
                    <th className="px-6 py-3 whitespace-nowrap">Membro / Fornecedor</th>
                    <th className="px-6 py-3 whitespace-nowrap">Categoria</th>
                    <th className="px-6 py-3 whitespace-nowrap">Fundo</th>
                    <th className="px-6 py-3 whitespace-nowrap">Responsável</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap w-[150px]">Valor</th>
                    <th className="px-6 py-3 text-center whitespace-nowrap w-[120px]">Ações</th>
                  </tr>
                )}
                components={{
                  TableRow: (props) => {
                    const index = props['data-index'];
                    const t = filteredTransactions[index];
                    const isExpenseWithoutAttachment = t?.type === TransactionType.EXPENSE && (!t.attachments || t.attachments.length === 0);

                    return (
                      <tr
                        {...props}
                        title={isExpenseWithoutAttachment ? "Atenção: Este lançamento de saída não possui comprovante anexado." : undefined}
                        className={`${props.className} transition-colors border-b border-gray-50/50 dark:border-slate-700/50 hover:bg-blue-50/30 dark:hover:bg-slate-700/40 ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/40'
                          } ${isExpenseWithoutAttachment ? 'border-l-4 border-l-amber-500' : ''}`}
                      />
                    );
                  }
                }}
                itemContent={(index, t) => (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 text-xs font-medium">{t.date.split('T')[0].split('-').reverse().join('/')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px] text-sm" title={t.description}>{t.description}</span>
                        {t.type === TransactionType.EXPENSE && (!t.attachments || t.attachments.length === 0) && (
                          <AlertCircle size={14} className="text-amber-500 shrink-0 anim-pulse" title="Sem comprovante anexado" />
                        )}
                        {t.reconciled && (
                          <span
                            className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50 font-bold whitespace-nowrap"
                            title="Lançamento Conciliado: Este valor já foi conferido e validado com o extrato bancário/caixa."
                          >
                            <CheckCircle size={10} /> OK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[150px]" title={t.memberOrSupplierName}>{t.memberOrSupplierName || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-800/30">
                        {getCategoryName(t.categoryId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-[11px] font-medium">{getFundName(t.fundId)}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-[11px] italic">{t.createdBy || '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{formatter.format(t.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {t.type === TransactionType.INCOME && <button onClick={() => setReceiptTransaction(t)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Recibo Digital"><Share2 size={16} /></button>}
                        {t.attachments && t.attachments.length > 0 && (
                          <button
                            onClick={() => window.open(t.attachments[0], '_blank')}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={`Ver Anexo (${t.attachments.length})`}
                          >
                            <Paperclip size={16} />
                          </button>
                        )}
                        <button onClick={() => setViewingTransaction(t)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Visualizar"><Eye size={16} /></button>
                        {canEdit && (
                          <>
                            <button onClick={() => onEdit(t)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Editar"><Edit2 size={16} /></button>
                            <button onClick={() => setItemToDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </>
                )}
              />
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden h-full">
              <Virtuoso
                data={filteredTransactions}
                itemContent={(index, t) => {
                  const isExpenseWithoutAttachment = t.type === TransactionType.EXPENSE && (!t.attachments || t.attachments.length === 0);
                  return (
                    <div
                      title={isExpenseWithoutAttachment ? "Atenção: Este lançamento de saída não possui comprovante anexado." : undefined}
                      className={`p-4 space-y-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 ${isExpenseWithoutAttachment ? 'border-l-4 border-l-amber-500' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} dark:bg-opacity-20`}>{t.type === TransactionType.INCOME ? <TrendingUp size={20} /> : <TrendingDown size={20} />}</div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1 flex items-center gap-2">
                              {t.description}
                              {isExpenseWithoutAttachment && (
                                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                              )}
                              {t.reconciled && (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50 font-bold whitespace-nowrap"
                                  title="Lançamento Conciliado: Este valor já foi conferido e validado com o extrato bancário/caixa."
                                >
                                  <CheckCircle size={9} /> OK
                                </span>
                              )}
                            </h4>
                            {t.memberOrSupplierName && (
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1 flex items-center gap-1"><User size={10} /> {t.memberOrSupplierName}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.date.split('T')[0].split('-').reverse().join('/')}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{formatter.format(t.amount)}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg gap-2 overflow-hidden">
                        <span className="text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{getCategoryName(t.categoryId)}</span>
                        <span className="text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">{getFundName(t.fundId)}</span>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        {t.type === TransactionType.INCOME && <button onClick={() => setReceiptTransaction(t)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800"><Share2 size={14} /> Recibo</button>}
                        {t.attachments && t.attachments.length > 0 && (
                          <button onClick={() => window.open(t.attachments[0], '_blank')} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-blue-500"><Paperclip size={16} /></button>
                        )}
                        <button onClick={() => setViewingTransaction(t)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-blue-500"><Eye size={16} /></button>
                        {canEdit && (
                          <>
                            <button onClick={() => onEdit(t)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-amber-500"><Edit2 size={16} /></button>
                            <button onClick={() => setItemToDelete(t.id)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-red-500"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            onDelete(itemToDelete);
            setItemToDelete(null);
          }
        }}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        isDanger={true}
      />

      <TransactionDetailsModal
        isOpen={!!viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        categories={categories}
        accounts={accounts}
        costCenters={costCenters}
        members={members}
        currentChurch={currentChurch}
      />

      <ReceiptModal
        isOpen={!!receiptTransaction}
        onClose={() => setReceiptTransaction(null)}
        transaction={receiptTransaction}
        church={currentChurch}
      />
    </div>
  );
};

export default Ledger;
