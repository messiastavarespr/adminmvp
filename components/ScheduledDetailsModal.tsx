
import React from 'react';
import { ScheduledTransaction, TransactionType, Category, CostCenter, RecurrenceType } from '../types';
import { X, CalendarClock, TrendingUp, TrendingDown, Layers, Repeat, FileText, AlertTriangle, Clock } from './ui/Icons';

interface ScheduledDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduledTransaction | null;
  categories: Category[];
  costCenters: CostCenter[];
}

const ScheduledDetailsModal: React.FC<ScheduledDetailsModalProps> = ({ 
  isOpen, onClose, schedule, categories, costCenters
}) => {
  if (!isOpen || !schedule) return null;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dueDateStr = new Date(schedule.dueDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const categoryName = categories.find(c => c.id === schedule.categoryId)?.name || 'N/A';
  const costCenterName = costCenters.find(cc => cc.id === schedule.costCenterId)?.name || 'Geral';

  const getRecurrenceLabel = (r: RecurrenceType) => {
    switch (r) {
      case RecurrenceType.WEEKLY: return 'Semanal';
      case RecurrenceType.MONTHLY: return 'Mensal';
      case RecurrenceType.YEARLY: return 'Anual';
      default: return 'Única';
    }
  };

  const isOverdue = new Date(schedule.dueDate) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-6 flex justify-between items-start text-white ${
           schedule.type === TransactionType.INCOME ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-1 uppercase tracking-wider">
               {schedule.type === TransactionType.INCOME ? <><TrendingUp size={16}/> A Receber</> : <><TrendingDown size={16}/> A Pagar</>}
            </div>
            <h2 className="text-3xl font-bold">{formatter.format(schedule.amount)}</h2>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
              <CalendarClock size={14}/> Vence em: {dueDateStr}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {isOverdue && (
             <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold">
               <AlertTriangle size={18} />
               Esta conta está atrasada!
             </div>
          )}

          <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-400 uppercase">Título / Descrição</label>
               <p className="text-gray-800 dark:text-white font-medium text-lg leading-snug">{schedule.title}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
                  <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                    <FileText size={18} className="text-gray-400"/>
                    {categoryName}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Centro de Custo</label>
                  <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                    <Layers size={18} className="text-gray-400"/>
                    {costCenterName}
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Recorrência</label>
                  <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                    <Repeat size={18} className="text-gray-400"/>
                    {getRecurrenceLabel(schedule.recurrence)}
                  </div>
                </div>
                {schedule.recurrence !== RecurrenceType.NONE && (
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-400 uppercase">Duração / Restante</label>
                     <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                       <Clock size={18} className="text-gray-400"/>
                       {schedule.occurrences !== undefined ? `${schedule.occurrences}x restantes` : 'Indefinida'}
                     </div>
                   </div>
                )}
             </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-4 text-xs text-gray-400 flex justify-between">
            <span>ID: {schedule.id}</span>
            <span>Status: {schedule.isActive ? 'Ativo' : 'Inativo'}</span>
          </div>

        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
           >
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduledDetailsModal;
