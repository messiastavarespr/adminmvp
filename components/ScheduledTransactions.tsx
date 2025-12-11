
import React, { useState } from 'react';
import { ScheduledTransaction, Category, TransactionType, RecurrenceType, Account, UserRole, CostCenter } from '../types';
import { CalendarClock, CheckSquare, Trash2, Repeat, Plus, AlertTriangle, Eye, Edit2, X, Landmark, Calendar, ChevronLeft, ChevronRight, ArrowRight, Clock, List as ListIcon, Calendar as CalendarIcon } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import ConfirmationModal from './ConfirmationModal';
import ScheduledDetailsModal from './ScheduledDetailsModal';

interface ScheduledTransactionsProps {
  scheduled: ScheduledTransaction[];
  categories: Category[];
  costCenters: CostCenter[];
  accounts: Account[];
  onUpdate: () => void;
  onOpenModal: () => void;
  onEdit: (item: ScheduledTransaction) => void;
  userRole: UserRole;
}

const ScheduledTransactions: React.FC<ScheduledTransactionsProps> = ({
  scheduled, categories, costCenters, accounts, onUpdate, onOpenModal, onEdit, userRole
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  // Date Navigation State
  const [viewDate, setViewDate] = useState(new Date());

  // States for Processing (Paying/Receiving)
  const [payItem, setPayItem] = useState<ScheduledTransaction | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [viewingItem, setViewingItem] = useState<ScheduledTransaction | null>(null);

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  // Filter items based on active status AND selected month
  const activeItems = scheduled.filter(s => {
    if (!s.isActive) return false;

    // Parse the due date (YYYY-MM-DD)
    // We append T12:00:00 to ensure we don't get timezone shifts on parsing
    const dueDate = new Date(s.dueDate + 'T12:00:00');

    // Compare Month and Year
    const matchesMonth = dueDate.getMonth() === viewDate.getMonth();
    const matchesYear = dueDate.getFullYear() === viewDate.getFullYear();

    return matchesMonth && matchesYear;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Desconhecido';

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // Context Hooks
  const { deleteScheduled, processScheduled } = useFinance();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteScheduled(deleteId); // Context handles refresh
      // onUpdate(); // Context triggers refresh, parent might reload but let's rely on Context
      onUpdate(); // Calling it to be safe if parent re-renders list
      setDeleteId(null);
    }
  };

  const openPaymentModal = (item: ScheduledTransaction) => {
    if (accounts.length === 0) {
      alert('Você precisa cadastrar uma conta/banco nas configurações primeiro.');
      return;
    }
    setPayItem(item);
    setPaymentAccountId(accounts[0].id); // Default to first
    setPaymentDate(new Date().toISOString().split('T')[0]); // Default to today
  };

  const handleProcessPayment = async () => {
    if (!payItem || !paymentAccountId || !paymentDate) return;

    await processScheduled(payItem.id, paymentAccountId, paymentDate);
    onUpdate();
    setPayItem(null);
  };

  const getRecurrenceLabel = (r: RecurrenceType) => {
    switch (r) {
      case RecurrenceType.WEEKLY: return 'Semanal';
      case RecurrenceType.MONTHLY: return 'Mensal';
      case RecurrenceType.YEARLY: return 'Anual';
      default: return 'Única';
    }
  };

  const isOverdue = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Navigation Handlers
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const currentMonthLabel = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Check if there are overdue items NOT in the current view (optional safety feature)
  const hasHiddenOverdue = scheduled.some(s => {
    if (!s.isActive) return false;
    const d = new Date(s.dueDate + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Is overdue AND falls before the currently viewed month start
    const viewStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    return d < today && d < viewStart;
  });

  // Calculate next date preview
  const getNextDatePreview = (dateStr: string, recurrence: RecurrenceType) => {
    if (recurrence === RecurrenceType.NONE) return null;
    const current = new Date(dateStr + 'T12:00:00');
    const next = new Date(current);

    switch (recurrence) {
      case RecurrenceType.WEEKLY: next.setDate(next.getDate() + 7); break;
      case RecurrenceType.MONTHLY: next.setMonth(next.getMonth() + 1); break;
      case RecurrenceType.YEARLY: next.setFullYear(next.getFullYear() + 1); break;
    }

    return next.toLocaleDateString('pt-BR');
  };

  // --- CALENDAR RENDER LOGIC ---
  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

    const daysArray = [];
    // Padding for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysArray.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] divide-x divide-y divide-gray-100 dark:divide-slate-700 bg-gray-100 dark:bg-slate-700 border-l border-t border-gray-100 dark:border-slate-700">
          {daysArray.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-gray-50/50 dark:bg-slate-800/50"></div>;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = isCurrentMonth && day === today.getDate();

            // Find items for this specific day
            const dayItems = activeItems.filter(item => item.dueDate === dateStr);

            return (
              <div key={day} className={`bg-white dark:bg-slate-800 p-1 relative hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayItems.map(item => {
                    const overdue = isOverdue(item.dueDate);
                    return (
                      <div
                        key={item.id}
                        onClick={() => canEdit ? openPaymentModal(item) : setViewingItem(item)}
                        className={`text-[10px] px-1.5 py-1 rounded cursor-pointer border truncate transition-all active:scale-95 ${item.type === TransactionType.INCOME
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800 hover:border-emerald-300'
                          : overdue
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:border-red-300'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-blue-400'
                          }`}
                        title={`${item.title} - ${formatter.format(item.amount)}`}
                      >
                        <div className="flex justify-between items-center gap-1">
                          <span className="truncate font-medium">{item.title}</span>
                          {overdue && <AlertTriangle size={8} className="text-red-500 shrink-0" />}
                        </div>
                        <div className="font-bold opacity-80">{formatter.format(item.amount)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarClock className="text-blue-600" />
            Contas Agendadas
          </h1>
          <p className="text-gray-500 text-sm dark:text-gray-400">Gerencie contas a pagar e receber futuras e recorrentes.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
              title="Visualização em Lista"
            >
              <ListIcon size={18} />
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`p-2 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
              title="Visualização em Calendário"
            >
              <CalendarIcon size={18} />
            </button>
          </div>

          {canEdit && (
            <button
              onClick={onOpenModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex-1 md:flex-none justify-center"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Agendamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white capitalize min-w-[200px] text-center">
            {currentMonthLabel}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
        {hasHiddenOverdue && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
            <AlertTriangle size={12} />
            Existem contas atrasadas em meses anteriores. Volte para conferir.
          </div>
        )}
      </div>

      {activeItems.length === 0 && viewMode === 'LIST' ? (
        <div className="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum agendamento para este mês</h3>
          <p className="text-gray-500 dark:text-gray-400">Navegue pelos meses ou adicione uma nova conta.</p>
        </div>
      ) : (
        <>
          {viewMode === 'LIST' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeItems.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex flex-col justify-between relative overflow-hidden group animate-in fade-in">
                  {/* Overdue Indicator */}
                  {isOverdue(item.dueDate) && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wide shadow-sm">
                      <AlertTriangle size={10} /> Atrasado
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap gap-2 justify-between items-start mb-2">
                      <span className={`px-2 py-1 text-xs rounded-md font-bold uppercase tracking-wider ${item.type === TransactionType.INCOME
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                        {item.type === TransactionType.INCOME ? 'A Receber' : 'A Pagar'}
                      </span>
                      {item.recurrence !== RecurrenceType.NONE && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full font-medium" title={item.occurrences ? `Restam ${item.occurrences} parcelas` : 'Repetição Indefinida'}>
                          <Repeat size={10} /> {getRecurrenceLabel(item.recurrence)}
                          {item.occurrences && <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1 rounded ml-1">{item.occurrences}x</span>}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1 truncate" title={item.title}>
                      {item.title}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                      {getCategoryName(item.categoryId)}
                    </p>

                    <div className="flex items-end justify-between mb-4 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Valor Previsto</p>
                        <p className={`text-lg font-bold ${item.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {formatter.format(item.amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Vencimento</p>
                        <p className={`font-medium text-sm ${isOverdue(item.dueDate) ? 'text-red-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                          {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                      <button
                        onClick={() => openPaymentModal(item)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors text-white shadow-sm ${item.type === TransactionType.INCOME
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        title={item.type === TransactionType.INCOME ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                      >
                        <CheckSquare size={16} />
                        {item.type === TransactionType.INCOME ? 'Receber' : 'Pagar'}
                      </button>

                      <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                        <button onClick={() => setViewingItem(item)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-all" title="Ver Detalhes">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => onEdit(item)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-all" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'CALENDAR' && renderCalendar()}
        </>
      )}

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Agendamento"
        message="Tem certeza que deseja excluir este agendamento? Ele será removido permanentemente da lista de contas futuras."
        confirmText="Excluir"
        isDanger={true}
      />

      {/* Payment Processing Modal */}
      {payItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={`p-4 flex justify-between items-center ${payItem.type === TransactionType.INCOME ? 'bg-emerald-600' : 'bg-rose-600'
              } text-white`}>
              <h3 className="font-bold flex items-center gap-2">
                <CheckSquare size={20} />
                {payItem.type === TransactionType.INCOME ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
              </h3>
              <button onClick={() => setPayItem(null)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Você está prestes a lançar no Livro Caixa:
                <br />
                <strong className="text-gray-900 dark:text-white text-lg">{payItem.title}</strong>
              </p>

              {/* Visual Preview of Next Occurrence */}
              {payItem.recurrence !== RecurrenceType.NONE ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
                  <p className="text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1">
                    <Repeat size={14} /> Atualização Automática
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-2">
                    <span>Atual: {new Date(payItem.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <ArrowRight size={12} />
                    {payItem.occurrences && payItem.occurrences <= 1 ? (
                      <span className="font-bold text-amber-600">Fim (Última parcela)</span>
                    ) : (
                      <span className="font-bold">{getNextDatePreview(payItem.dueDate, payItem.recurrence)}</span>
                    )}
                  </p>
                  {payItem.occurrences && payItem.occurrences > 1 && (
                    <p className="text-xs text-blue-500 mt-1">Restarão {payItem.occurrences - 1} repetições.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-2 rounded">
                  <CheckSquare size={12} /> Este agendamento único será concluído e arquivado.
                </p>
              )}

              <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-100 dark:border-slate-600">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Valor Original:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatter.format(payItem.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Vencimento:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{new Date(payItem.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Conta Bancária <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Data do Pagamento <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setPayItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPayment}
                className={`px-4 py-2 rounded-lg text-white font-bold text-sm shadow-md transition-transform active:scale-95 ${payItem.type === TransactionType.INCOME
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                Confirmar {payItem.type === TransactionType.INCOME ? 'Recebimento' : 'Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduledDetailsModal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        schedule={viewingItem}
        categories={categories}
        costCenters={costCenters}
      />
    </div>
  );
};

export default ScheduledTransactions;
