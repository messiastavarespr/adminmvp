
import React, { useState, useEffect } from 'react';
import { ScheduledTransaction, TransactionType, RecurrenceType, Category, CostCenter, Fund } from '../types';
import { X, CalendarClock, Repeat, Layers, Edit2, Plus, AlertTriangle, Target, Clock } from './ui/Icons';
import ErrorMessage from './ui/ErrorMessage';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ScheduledTransaction, 'id' | 'churchId'> & { id?: string }) => void;
  categories: Category[];
  costCenters: CostCenter[]; 
  funds?: Fund[]; // Added funds
  editingSchedule?: ScheduledTransaction | null;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ 
  isOpen, onClose, onSave, categories, costCenters, funds = [], editingSchedule
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(getLocalDate());
  const [categoryId, setCategoryId] = useState('');
  const [costCenterId, setCostCenterId] = useState(''); 
  const [fundId, setFundId] = useState(''); // New Fund ID
  const [recurrence, setRecurrence] = useState<RecurrenceType>(RecurrenceType.NONE);
  
  // Occurrences State
  const [isInfinite, setIsInfinite] = useState(true);
  const [occurrences, setOccurrences] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingSchedule) {
        setType(editingSchedule.type);
        setTitle(editingSchedule.title);
        setAmount(editingSchedule.amount.toString());
        setDueDate(editingSchedule.dueDate);
        setCategoryId(editingSchedule.categoryId);
        setCostCenterId(editingSchedule.costCenterId || '');
        setFundId(editingSchedule.fundId || funds[0]?.id || '');
        setRecurrence(editingSchedule.recurrence);
        
        if (editingSchedule.occurrences !== undefined && editingSchedule.occurrences !== null) {
           setIsInfinite(false);
           setOccurrences(editingSchedule.occurrences.toString());
        } else {
           setIsInfinite(true);
           setOccurrences('');
        }
      } else {
        setType(TransactionType.EXPENSE);
        setTitle('');
        setAmount('');
        setDueDate(getLocalDate());
        setCategoryId('');
        setCostCenterId('');
        setFundId(funds[0]?.id || '');
        setRecurrence(RecurrenceType.NONE);
        setIsInfinite(true);
        setOccurrences('');
      }
      setErrors({});
    }
  }, [isOpen, editingSchedule, funds]);

  useEffect(() => {
    let valid = true;
    if (!title.trim()) valid = false;
    if (!amount || parseFloat(amount) <= 0) valid = false;
    if (!dueDate) valid = false;
    if (!categoryId) valid = false;
    if (!fundId) valid = false; // Fund is mandatory
    if (recurrence !== RecurrenceType.NONE && !isInfinite) {
       if (!occurrences || parseInt(occurrences) < 2) valid = false;
    }
    setIsFormValid(valid);
  }, [title, amount, dueDate, categoryId, fundId, recurrence, isInfinite, occurrences]);

  const validateOnSubmit = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!title.trim()) { newErrors.title = 'Título é obrigatório'; isValid = false; }
    if (!amount || parseFloat(amount) <= 0) { newErrors.amount = 'Valor inválido'; isValid = false; }
    
    if (!dueDate) { 
      newErrors.dueDate = 'Data de vencimento obrigatória'; 
      isValid = false; 
    } else {
      // Validate: Cannot be past date
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = today.toISOString().split('T')[0];
      
      if (dueDate < todayStr) {
         newErrors.dueDate = 'A data de vencimento não pode ser anterior à data atual.';
         isValid = false;
      }
    }

    if (!categoryId) { newErrors.categoryId = 'Categoria obrigatória'; isValid = false; }
    if (!fundId) { newErrors.fundId = 'Fundo/Projeto obrigatório'; isValid = false; }
    
    if (recurrence !== RecurrenceType.NONE && !isInfinite) {
       if (!occurrences || parseInt(occurrences) < 2) {
          newErrors.occurrences = 'Informe um número válido de repetições (mínimo 2).';
          isValid = false;
       }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOnSubmit()) return;

    onSave({
      id: editingSchedule?.id,
      title,
      amount: parseFloat(amount),
      dueDate,
      categoryId,
      costCenterId: costCenterId || undefined,
      fundId, // Save Fund
      type,
      recurrence,
      occurrences: (recurrence !== RecurrenceType.NONE && !isInfinite) ? parseInt(occurrences) : undefined,
      isActive: true
    });
    onClose();
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);
  const isEditing = !!editingSchedule;

  const getRecurrenceHelpText = () => {
     switch (recurrence) {
        case RecurrenceType.NONE: return "O agendamento desaparecerá após ser pago.";
        case RecurrenceType.WEEKLY: return "Após pagar, um novo agendamento será criado para 7 dias depois.";
        case RecurrenceType.MONTHLY: return "Após pagar, um novo agendamento será criado para o próximo mês.";
        case RecurrenceType.YEARLY: return "Após pagar, um novo agendamento será criado para o próximo ano.";
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="p-4 flex justify-between items-center bg-blue-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>}
            {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-2 rounded-md text-sm font-medium ${type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Conta a Pagar</button>
            <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 py-2 rounded-md text-sm font-medium ${type === TransactionType.INCOME ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Conta a Receber</button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título / Descrição *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={`w-full rounded-lg border ${errors.title ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 p-2 text-gray-900 dark:text-white outline-none`} placeholder="Ex: Conta de Luz..."/>
             <ErrorMessage message={errors.title} />
          </div>

          {/* New Fund Selector */}
          <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-800/50">
             <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
               <Target size={12}/> Fundo / Projeto *
             </label>
             <select
               value={fundId}
               onChange={(e) => setFundId(e.target.value)}
               className={`w-full rounded-lg border ${errors.fundId ? 'border-rose-500' : 'border-purple-200 dark:border-purple-700'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none`}
             >
               <option value="">Selecione...</option>
               {funds.map(f => (
                 <option key={f.id} value={f.id}>{f.name}</option>
               ))}
             </select>
             <ErrorMessage message={errors.fundId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor Previsto (R$) *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full rounded-lg border ${errors.amount ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 p-2 text-lg font-bold text-gray-900 dark:text-white outline-none`} placeholder="0,00"/>
               <ErrorMessage message={errors.amount} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vencimento *</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className={`w-full rounded-lg border ${errors.dueDate ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 p-2 text-gray-900 dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]`}
              />
               <ErrorMessage message={errors.dueDate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`w-full rounded-lg border ${errors.categoryId ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 p-2 text-gray-900 dark:text-white outline-none`}>
                <option value="">Selecione...</option>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
               <ErrorMessage message={errors.categoryId} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Layers size={12}/> Centro de Custo</label>
              <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-gray-900 dark:text-white outline-none">
                <option value="">Geral</option>
                {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 transition-all">
             <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2"><Repeat size={14} /> Frequência de Repetição</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)} className="w-full rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-700 p-2 text-gray-900 dark:text-white outline-none mb-3">
                <option value={RecurrenceType.NONE}>Única (Não repete)</option>
                <option value={RecurrenceType.WEEKLY}>Semanal</option>
                <option value={RecurrenceType.MONTHLY}>Mensal</option>
                <option value={RecurrenceType.YEARLY}>Anual</option>
              </select>
              
              {recurrence !== RecurrenceType.NONE && (
                 <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                       <Clock size={14} /> Duração da Repetição
                    </label>
                    <div className="flex gap-4 mb-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                             type="radio" 
                             checked={isInfinite} 
                             onChange={() => { setIsInfinite(true); setOccurrences(''); }}
                             className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Indefinida (Sempre)</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                             type="radio" 
                             checked={!isInfinite} 
                             onChange={() => setIsInfinite(false)}
                             className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Definir quantidade</span>
                       </label>
                    </div>
                    {!isInfinite && (
                       <div className="flex items-center gap-2 animate-in fade-in">
                          <input 
                             type="number" 
                             min="2" 
                             placeholder="Qtd" 
                             value={occurrences}
                             onChange={(e) => setOccurrences(e.target.value)}
                             className="w-20 p-1.5 rounded border border-blue-300 dark:border-blue-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                          <span className="text-xs text-blue-600 dark:text-blue-400">vezes (Total)</span>
                       </div>
                    )}
                    <ErrorMessage message={errors.occurrences} />
                 </div>
              )}

              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1 mt-2"><AlertTriangle size={12} className="shrink-0 mt-0.5"/>{getRecurrenceHelpText()}</p>
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={!isFormValid} className={`flex-1 py-3 rounded-lg text-white font-medium shadow-lg transition-transform active:scale-95 ${!isFormValid ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}>{isEditing ? 'Salvar Alterações' : 'Agendar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;
