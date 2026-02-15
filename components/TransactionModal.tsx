import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category, Account, Member, CostCenter, Fund, User, UserRole } from '../types';
import { X, Plus, Minus, UserCheck, Upload, Paperclip, Trash2, Layers, ArrowLeftRight, Edit2, AlertTriangle, CheckCircle, Target, HelpCircle } from './ui/Icons';
import ErrorMessage from './ui/ErrorMessage';
import { Tooltip } from './ui/Tooltip';

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
  currentUser?: User | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, onSave, onTransfer, categories, costCenters, accounts, funds = [], members, initialType, editingTransaction, initialData, transactions = [], currentUser
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Attachments (Links)
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowDuplicateWarning(false);
      if (editingTransaction) {
        // Edit Mode
        setType(editingTransaction.type);
        // Safely extract YYYY-MM-DD from date string (handles both "YYYY-MM-DD" and "YYYY-MM-DD HH:mm:ss")
        setDate(editingTransaction.date ? editingTransaction.date.split('T')[0].split(' ')[0] : getLocalDate());
        setAmount(editingTransaction.amount.toString());
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.categoryId || '');
        setCostCenterId(editingTransaction.costCenterId || '');
        setFundId(editingTransaction.fundId || funds[0]?.id || '');
        setAccountId(editingTransaction.accountId);
        setMemberId(editingTransaction.memberOrSupplierId || '');

        if (editingTransaction.attachments) {
          setAttachments(editingTransaction.attachments);
        } else {
          setAttachments([]);
        }

      } else {
        // Create Mode (or Pre-fill Mode)
        // SMART DEFAULTS LOGIC
        const defaultAccount = accounts.find(a => a.name.toLowerCase().includes('sicoob')) || accounts[0];
        const defaultCategory = categories.find(c => c.name.toLowerCase().includes('oferta de culto'));
        const defaultCC = costCenters.find(c => c.name.toLowerCase().includes('geral') && c.name.toLowerCase().includes('sede'));
        const defaultFund = funds.find(f => f.name.toLowerCase().includes('admin') && f.name.toLowerCase().includes('geral')) || funds.find(f => f.type === 'UNRESTRICTED') || funds[0];

        if (initialData) {
          setType(initialData.type || initialType || TransactionType.INCOME);
          setDate(initialData.date ? initialData.date.split('T')[0].split(' ')[0] : getLocalDate());
          setAmount(initialData.amount ? initialData.amount.toString() : '');
          setDescription(initialData.description || '');

          // Apply defaults if initialData is missing them
          setCategoryId(initialData.categoryId || defaultCategory?.id || '');
          setCostCenterId(initialData.costCenterId || defaultCC?.id || '');
          setFundId(initialData.fundId || defaultFund?.id || '');
          setAccountId(initialData.accountId || defaultAccount?.id || '');
        } else {
          // Completely New
          setType(initialType || TransactionType.INCOME);
          setDate(getLocalDate());
          setAmount('');
          setDescription('');

          // Apply Defaults
          setCategoryId(defaultCategory?.id || '');
          setCostCenterId(defaultCC?.id || '');
          setFundId(defaultFund?.id || '');
          setAccountId(defaultAccount?.id || '');
        }

        setToAccountId('');
        setMemberId('');
        setAttachments([]);
      }
      setErrors({});
      setAttachmentUrl('');
    }
  }, [isOpen, initialType, accounts, editingTransaction, initialData, funds, categories, costCenters]);

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

  const addAttachmentLink = () => {
    if (!attachmentUrl.trim()) return;
    if (attachments.length >= 5) { alert("Máximo de 5 links."); return; }

    // Basic URL validation
    let finalUrl = attachmentUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setAttachments(prev => [...prev, finalUrl]);
    setAttachmentUrl('');
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const proceedSave = async () => {
    try {
      // FIX: Append 12:00:00 to ensure we land in the middle of the day.
      const dateWithTime = `${date} 12:00:00`;

      if (type === TransactionType.TRANSFER && onTransfer) {
        onTransfer(parseFloat(amount), accountId, toAccountId, fundId, dateWithTime, description);
      } else {
        const selectedMember = members.find(m => m.id === memberId);
        onSave({
          id: editingTransaction?.id,
          date: dateWithTime,
          amount: parseFloat(amount),
          description,
          categoryId,
          costCenterId: costCenterId || undefined,
          fundId,
          accountId,
          type,
          memberOrSupplierId: memberId || undefined,
          memberOrSupplierName: selectedMember ? selectedMember.name : undefined,
          isPaid: true,
          attachments: attachments
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Tente novamente.");
    }
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
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isEditing && currentUser?.role !== UserRole.MASTER}
                className={`w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 outline-none ${isEditing && currentUser?.role !== UserRole.MASTER ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {isEditing && currentUser?.role !== UserRole.MASTER && (
                <p className="text-[10px] text-gray-500 mt-1">Apenas MASTER pode alterar data.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full rounded-lg border ${errors.description ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 outline-none`} placeholder={type === TransactionType.TRANSFER ? "Motivo da transferência" : "Descrição do lançamento"} />
            <ErrorMessage message={errors.description} />
          </div>

          {/* Account Moved Up */}
          {type !== TransactionType.TRANSFER && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Conta/Banco *</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`w-full rounded-lg border ${errors.accountId ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none`}>
                <option value="">Selecione...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ErrorMessage message={errors.accountId} />
            </div>
          )}

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
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Layers size={12} /> Centro de Custo
                  </label>
                  <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none">
                    <option value="">Geral</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Fund Selector - Restyled and Moved Down */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Target size={12} /> Fundo / Projeto Destino *
                </label>
                <select
                  value={fundId}
                  onChange={(e) => setFundId(e.target.value)}
                  className={`w-full rounded-lg border ${errors.fundId ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none`}
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

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><UserCheck size={12} /> {type === TransactionType.INCOME ? 'Membro' : 'Fornecedor'} (Opcional)</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2 text-sm outline-none">
                  <option value="">-- Avulso --</option>
                  {members
                    .filter(m => type === TransactionType.EXPENSE ? m.type === 'SUPPLIER' : true)
                    .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Paperclip size={12} /> Link do Comprovante (Drive, etc)</label>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Cole o link aqui..."
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={addAttachmentLink}
                className="bg-gray-100 dark:bg-slate-600 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-500"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {attachments.map((url, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-xs border border-gray-100 dark:border-slate-600">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 text-blue-600 hover:underline">{url}</a>
                  <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 mt-1">Máximo de 5 links por lançamento.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-slate-600 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300">Cancelar</button>
            <button type="submit" className={`flex-1 py-3 rounded-lg text-white font-medium shadow-lg transition-transform active:scale-95 ${type === TransactionType.INCOME ? 'bg-emerald-600 hover:bg-emerald-700' : type === TransactionType.EXPENSE ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              Confirmar
            </button>
          </div>
        </form >
      </div >
    </div >
  );
};

export default TransactionModal;
