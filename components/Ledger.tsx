
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Category, Account, UserRole, CostCenter, Member, Church, Fund } from '../types';
import { Filter, Trash2, FileText, Download, TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Search, X, Edit2, Plus, Minus, Eye, CalendarClock, ChevronLeft, ChevronRight, FileSpreadsheet, Share2, AlertCircle, Target, User } from './ui/Icons';
import ConfirmationModal from './ConfirmationModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import ReceiptModal from './ReceiptModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchBox from './ui/SearchBox';

interface LedgerProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  costCenters: CostCenter[]; 
  funds?: Fund[]; // Added funds
  members: Member[]; 
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void; 
  onNewTransaction: (type: TransactionType) => void; 
  userRole: UserRole;
  currentChurch: Church;
}

const ITEMS_PER_PAGE = 10;

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
  const [filterFund, setFilterFund] = useState('ALL'); // New Fund Filter
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || '-';
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || '-';
  const getFundName = (id?: string) => funds.find(f => f.id === id)?.name || '-';

  const filteredTransactions = transactions
    .filter(t => t.date >= startDate && t.date <= endDate)
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .filter(t => filterAccount === 'ALL' || t.accountId === filterAccount)
    .filter(t => filterCategory === 'ALL' || t.categoryId === filterCategory)
    .filter(t => filterCostCenter === 'ALL' || t.costCenterId === filterCostCenter)
    .filter(t => filterFund === 'ALL' || t.fundId === filterFund) // Fund Filter
    .filter(t => 
      t.description.toLowerCase().includes(search.toLowerCase()) || 
      (t.memberOrSupplierName && t.memberOrSupplierName.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const periodBalance = totalIncome - totalExpense;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => { setCurrentPage(1); }, [startDate, endDate, filterType, search, filterAccount, filterCategory, filterCostCenter, filterFund]);

  const handleExportExcel = () => {
    const exportData = filteredTransactions.map(t => ({
      Data: new Date(t.date).toLocaleDateString('pt-BR'),
      Descrição: t.description,
      'Membro/Fornecedor': t.memberOrSupplierName || '-',
      Categoria: getCategoryName(t.categoryId),
      Conta: getAccountName(t.accountId),
      'Fundo/Projeto': getFundName(t.fundId),
      'Centro de Custo': costCenters.find(cc => cc.id === t.costCenterId)?.name || 'Geral',
      Valor: t.amount,
      Tipo: t.type === TransactionType.INCOME ? 'Entrada' : (t.type === TransactionType.EXPENSE ? 'Saída' : 'Transferência'),
      Status: t.isPaid ? 'Conciliado' : 'Pendente'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Livro Caixa");
    
    const wscols = [{wch: 12}, {wch: 30}, {wch: 25}, {wch: 20}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 10}];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `livro_caixa_${startDate}_${endDate}.xlsx`);
  };

  const activeFiltersCount = [filterType !== 'ALL', filterCategory !== 'ALL', filterAccount !== 'ALL', filterCostCenter !== 'ALL', filterFund !== 'ALL'].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><FileText className="text-blue-600" size={24}/> Livro Caixa</h2><p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie lançamentos financeiros.</p></div>
        <div className="flex gap-2 w-full md:w-auto">
          {canEdit && (
            <>
              <button onClick={() => onNewTransaction(TransactionType.INCOME)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"><Plus size={16} /> Entrada</button>
              <button onClick={() => onNewTransaction(TransactionType.EXPENSE)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"><Minus size={16} /> Saída</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex justify-between"><div><p className="text-xs font-bold text-emerald-600 uppercase">Entradas</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatter.format(totalIncome)}</p></div><TrendingUp className="text-emerald-500" /></div>
        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30 flex justify-between"><div><p className="text-xs font-bold text-rose-600 uppercase">Saídas</p><p className="text-lg font-bold text-rose-700 dark:text-rose-400">{formatter.format(totalExpense)}</p></div><TrendingDown className="text-rose-500" /></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between"><div><p className="text-xs font-bold text-blue-600 uppercase">Saldo</p><p className={`text-lg font-bold ${periodBalance>=0?'text-blue-700 dark:text-blue-400':'text-red-600'}`}>{formatter.format(periodBalance)}</p></div><Wallet className="text-blue-500" /></div>
      </div>

      <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-all">
         <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex gap-2 w-full lg:w-auto">
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Membro / Fornecedor</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Fundo/Projeto</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {paginatedTransactions.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><AlertCircle size={32} className="text-gray-300 dark:text-gray-600" /><p>Nenhum lançamento encontrado neste período.</p></div></td></tr>
              ) : (
                paginatedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}{t.reconciled && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1 rounded border border-green-200" title="Conciliado">OK</span>}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[150px]" title={t.memberOrSupplierName}>{t.memberOrSupplierName || '-'}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-slate-600 rounded-full text-xs text-gray-600 dark:text-gray-300 font-medium">{getCategoryName(t.categoryId)}</span></td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{getFundName(t.fundId)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{formatter.format(t.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                         {t.type === TransactionType.INCOME && <button onClick={() => setReceiptTransaction(t)} className="text-gray-400 hover:text-emerald-500" title="Recibo Digital"><Share2 size={16} /></button>}
                        <button onClick={() => setViewingTransaction(t)} className="text-gray-400 hover:text-blue-500" title="Visualizar"><Eye size={16} /></button>
                        {canEdit && <><button onClick={() => onEdit(t)} className="text-gray-400 hover:text-amber-500" title="Editar"><Edit2 size={16} /></button><button onClick={() => setItemToDelete(t.id)} className="text-gray-400 hover:text-red-500" title="Excluir"><Trash2 size={16} /></button></>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
           {paginatedTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center"><AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mb-2" /><p>Nenhum lançamento encontrado.</p></div>
           ) : (
             paginatedTransactions.map(t => (
               <div key={t.id} className="p-4 space-y-3 bg-white dark:bg-slate-800">
                  <div className="flex justify-between items-start">
                     <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} dark:bg-opacity-20`}>{t.type === TransactionType.INCOME ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}</div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1 flex items-center">{t.description}{t.reconciled && <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 rounded border border-green-200">OK</span>}</h4>
                          {t.memberOrSupplierName && (
                             <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1 flex items-center gap-1"><User size={10}/> {t.memberOrSupplierName}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                     </div>
                     <p className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{formatter.format(t.amount)}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg"><span>{getCategoryName(t.categoryId)}</span><span>{getFundName(t.fundId)}</span></div>
                  <div className="flex justify-end gap-2 pt-2">
                     {t.type === TransactionType.INCOME && <button onClick={() => setReceiptTransaction(t)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800"><Share2 size={14} /> Recibo</button>}
                     <button onClick={() => setViewingTransaction(t)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-blue-500"><Eye size={16} /></button>
                     {canEdit && (
                       <>
                         <button onClick={() => onEdit(t)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-amber-500"><Edit2 size={16} /></button>
                         <button onClick={() => setItemToDelete(t.id)} className="p-2 text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:text-red-500"><Trash2 size={16} /></button>
                       </>
                     )}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

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
        currentChurch={currentChurch} // Pass currentChurch to allow receipt generation with church details
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
