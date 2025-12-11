
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category, Account, Member, CostCenter, Fund } from '../types';
import { X, Plus, Minus, UserCheck, Upload, Paperclip, Trash2, Layers, ArrowLeftRight, Edit2, AlertTriangle, CheckCircle, Target } from './ui/Icons';
import ErrorMessage from './ui/ErrorMessage';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'churchId'> & { id?: string }) => void;
  onTransfer?: (amount: number, from: string, to: string, fundId: string, date: string, desc: string) => void;
  categories: Category[];
  costCenters: CostCenter[];
  accounts: Account[];
  funds?: Fund[]; // Added Funds prop
  members: Member[];
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  initialData?: Partial<Transaction> | null; // New prop for pre-filling
  transactions?: Transaction[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, onSave, onTransfer, categories, costCenters, accounts, funds = [], members, initialType, editingTransaction, initialData, transactions = []
}) => {
  const [type, setType] = useState<TransactionType>(initialType || TransactionType.INCOME);

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getLocalDate());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Income/Expense Fields
  const [categoryId, setCategoryId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [fundId, setFundId] = useState(''); // New Fund ID State
  const [accountId, setAccountId] = useState('');
  const [memberId, setMemberId] = useState('');

  // Transfer Fields
  const [toAccountId, setToAccountId] = useState('');

  // Attachments (Multi)
  const [attachments, setAttachments] = useState<{ name: string, data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowDuplicateWarning(false);
      if (editingTransaction) {
        // Edit Mode
        setType(editingTransaction.type);
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.categoryId || '');
        setCostCenterId(editingTransaction.costCenterId || '');
        setFundId(editingTransaction.fundId || funds[0]?.id || '');
        setAccountId(editingTransaction.accountId);
        setMemberId(editingTransaction.memberOrSupplierId || '');

        if (editingTransaction.attachments) {
          setAttachments(editingTransaction.attachments.map((data, idx) => ({
            name: `Anexo ${idx + 1}`,
            data
          })));
        } else {
          setAttachments([]);
        }

      } else {
        // Create Mode (or Pre-fill Mode)
        if (initialData) {
          setType(initialData.type || initialType || TransactionType.INCOME);
          setDate(initialData.date || getLocalDate());
          setAmount(initialData.amount ? initialData.amount.toString() : '');
          setDescription(initialData.description || '');
          setCategoryId(initialData.categoryId || '');
          setCostCenterId(initialData.costCenterId || '');

          const defaultFund = funds.find(f => f.type === 'UNRESTRICTED') || funds[0];
          setFundId(initialData.fundId || defaultFund?.id || '');

          setAccountId(initialData.accountId || (accounts.length > 0 ? accounts[0].id : ''));
        } else {
          setType(initialType || TransactionType.INCOME);
          setDate(getLocalDate());
          setAmount('');
          setDescription('');
          setCategoryId('');
          setCostCenterId('');

          const defaultFund = funds.find(f => f.type === 'UNRESTRICTED') || funds[0];
          setFundId(defaultFund?.id || ''); // Default to General/Unrestricted

          setAccountId(accounts.length > 0 ? accounts[0].id : '');
        }

        setToAccountId('');
        setMemberId('');
        setAttachments([]);
      }
      setErrors({});
    }
  }, [isOpen, initialType, accounts, editingTransaction, initialData, funds]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Valor inválido';
      isValid = false;
    }
    if (!description.trim()) {
      newErrors.description = 'Descrição obrigatória';
      isValid = false;
    }
    if (!accountId) {
      newErrors.accountId = 'Conta obrigatória';
      isValid = false;
    }
    if (!fundId) {
      newErrors.fundId = 'Fundo/Projeto obrigatório';
      isValid = false;
    }

    if (type === TransactionType.TRANSFER) {
      if (!toAccountId) {
        newErrors.toAccountId = 'Conta de destino obrigatória';
        isValid = false;
      }
      if (accountId === toAccountId) {
        newErrors.toAccountId = 'Contas devem ser diferentes';
        isValid = false;
      }
    } else {
      if (!categoryId) {
        newErrors.categoryId = 'Categoria obrigatória';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (attachments.length >= 5) { alert("Máximo de 5 arquivos."); return; }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("Arquivo muito grande (Máx: 1MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setAttachments(prev => [...prev, { name: file.name, data: reader.result as string }]); };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };

  const proceedSave = () => {
    if (type === TransactionType.TRANSFER && onTransfer) {
      onTransfer(parseFloat(amount), accountId, toAccountId, fundId, date, description);
    } else {
      const selectedMember = members.find(m => m.id === memberId);
      onSave({
        id: editingTransaction?.id,
        date,
        amount: parseFloat(amount),
        description,
        categoryId,
        costCenterId: costCenterId || undefined,
        fundId, // Save Fund
        accountId,
        type,
        memberOrSupplierId: memberId || undefined,
        memberOrSupplierName: selectedMember ? selectedMember.name : undefined,
        isPaid: true,
        attachments: attachments.map(a => a.data)
      });
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!editingTransaction && !showDuplicateWarning && type !== TransactionType.TRANSFER) {
      const isDuplicate = transactions.some(t => {
        if (t.amount !== parseFloat(amount)) return false;
        if (t.type !== type) return false;
        const tTime = new Date(t.date).getTime();
        const newTime = new Date(date).getTime();
        const diffDays = Math.abs(newTime - tTime) / (1000 * 3600 * 24);
        return diffDays <= 2;
      });

      if (isDuplicate) {
        setShowDuplicateWarning(true);
        return;
      }
    }
    proceedSave();
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);
  const isEditing = !!editingTransaction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative">

        {showDuplicateWarning && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-800/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Possível Duplicidade</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">Já existe um lançamento com o mesmo <strong>Valor</strong> e <strong>Tipo</strong> em uma data próxima.<br />Deseja salvar mesmo assim?</p>
            <div className="flex gap-3 w-full"><button onClick={() => setShowDuplicateWarning(false)} className="flex-1 py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded-lg font-medium">Revisar</button><button onClick={proceedSave} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">Salvar</button></div>
          </div>
        )}

        <div className={`p-4 flex justify-between items-center ${type === TransactionType.INCOME ? 'bg-emerald-600' : type === TransactionType.EXPENSE ? 'bg-rose-600' : 'bg-blue-600'} text-white`}>
          <h2 className="text-lg font-bold flex items-center gap-2">{isEditing ? <Edit2 size={20} /> : (type === TransactionType.INCOME ? <Plus size={20} /> : type === TransactionType.EXPENSE ? <Minus size={20} /> : <ArrowLeftRight size={20} />)} {isEditing ? 'Editar Lançamento' : (type === TransactionType.INCOME ? 'Nova Entrada' : type === TransactionType.EXPENSE ? 'Nova Saída' : 'Transferência')}</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {!isEditing && (
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 py-2 rounded-md text-xs sm:text-sm font-medium ${type === TransactionType.INCOME ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Entrada</button>
              <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-2 rounded-md text-xs sm:text-sm font-medium ${type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Saída</button>
              <button type="button" onClick={() => setType(TransactionType.TRANSFER)} className={`flex-1 py-2 rounded-md text-xs sm:text-sm font-medium ${type === TransactionType.TRANSFER ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Transferência</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full rounded-lg border ${errors.amount ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 p-2 text-lg font-bold text-gray-900 dark:text-white outline-none`} placeholder="0,00" />
              <ErrorMessage message={errors.amount} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full rounded-lg border ${errors.description ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 outline-none`} placeholder={type === TransactionType.TRANSFER ? "Motivo da transferência" : "Descrição do lançamento"} />
            <ErrorMessage message={errors.description} />
          </div>

          {/* New Fund Selector - Mandatory */}
          <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-800/50">
            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
              <Target size={12} /> Fundo / Projeto Destino *
            </label>
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className={`w-full rounded-lg border ${errors.fundId ? 'border-rose-500' : 'border-purple-200 dark:border-purple-700'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none focus:ring-2 focus:ring-purple-500`}
            >
              <option value="">Selecione o fundo...</option>
              {funds.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.type === 'RESTRICTED' ? '(Restrito)' : ''}
                </option>
              ))}
            </select>
            <ErrorMessage message={errors.fundId} />
          </div>

          {type === TransactionType.TRANSFER ? (
            <div className="grid grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
              <div>
                <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">De (Origem) *</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none" disabled={isEditing}>
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ErrorMessage message={errors.accountId} />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Para (Destino) *</label>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none" disabled={isEditing}>
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ErrorMessage message={errors.toAccountId} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria *</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`w-full rounded-lg border ${errors.categoryId ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none`}>
                    <option value="">Selecione...</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ErrorMessage message={errors.categoryId} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Layers size={12} /> Centro de Custo</label>
                  <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none">
                    <option value="">Geral</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Conta/Banco *</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`w-full rounded-lg border ${errors.accountId ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none`}>
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ErrorMessage message={errors.accountId} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><UserCheck size={12} /> {type === TransactionType.INCOME ? 'Membro' : 'Fornecedor'} (Opcional)</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none">
                  <option value="">-- Avulso --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Paperclip size={12} /> Anexos (Máx 5)</label>
            <div className="space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-slate-700 p-2 rounded text-sm">
                  <span className="truncate max-w-[200px] text-gray-700 dark:text-gray-300">{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500"><X size={14} /></button>
                </div>
              ))}
              {attachments.length < 5 && (
                <div className="border border-dashed border-gray-300 dark:border-slate-600 rounded p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm"><Upload size={14} /> Adicionar Arquivo</div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-slate-600 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300">Cancelar</button>
            <button type="submit" className={`flex-1 py-3 rounded-lg text-white font-medium shadow-lg transition-transform active:scale-95 ${type === TransactionType.INCOME ? 'bg-emerald-600 hover:bg-emerald-700' : type === TransactionType.EXPENSE ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
