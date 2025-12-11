
import React, { useState } from 'react';
import { Budget, Category, TransactionType, User, Transaction } from '../types';
import { PieChart, Plus, Trash2, Save, Edit2, Eye, X, CheckCircle } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import ConfirmationModal from './ConfirmationModal';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currentChurchId: string;
  currentUser: User;
  onUpdate: () => void;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({ budgets, categories, transactions, currentChurchId, currentUser, onUpdate }) => {
  const { setBudget, deleteBudget } = useFinance();
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Only Expense categories
  const expenseCats = categories.filter(c => c.type === TransactionType.EXPENSE && c.churchId === currentChurchId);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !amount) return;

    const budgetData = {
      id: editingBudget ? editingBudget.id : Math.random().toString(36).substr(2, 9),
      categoryId: selectedCat,
      amount: parseFloat(amount),
      churchId: currentChurchId
    };
    await setBudget(budgetData);

    setAmount('');
    setSelectedCat('');
    setEditingBudget(null);
    onUpdate();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteBudget(deleteId);
      onUpdate();
      setDeleteId(null);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setSelectedCat(budget.categoryId);
    setAmount(budget.amount.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingBudget(null);
    setSelectedCat('');
    setAmount('');
  };

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Helper for "View" Modal
  const getBudgetStatus = (budget: Budget) => {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const spent = transactions
      .filter(t => t.categoryId === budget.categoryId && t.type === TransactionType.EXPENSE && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = (spent / budget.amount) * 100;
    const remaining = budget.amount - spent;

    return { spent, percent, remaining };
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
        <PieChart className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-indigo-800 dark:text-indigo-300">Orçamento Mensal</h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
            Defina limites de gastos para cada categoria. O painel avisará quando você ultrapassar 80% e 100% do orçamento.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {editingBudget ? <Edit2 size={18} className="text-amber-500" /> : <Plus size={18} className="text-indigo-500" />}
            {editingBudget ? 'Editar Orçamento' : 'Definir Novo Limite'}
          </h4>
          {editingBudget && (
            <button onClick={cancelEdit} className="text-sm text-red-500 hover:underline flex items-center gap-1"><X size={14} /> Cancelar</button>
          )}
        </div>

        <form onSubmit={handleSetBudget} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-gray-500 mb-1 block">Categoria de Despesa</label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!!editingBudget} // Disable category change on edit to force update
            >
              <option value="">Selecione...</option>
              {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-gray-500 mb-1 block">Limite Mensal (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors w-full md:w-auto h-[38px] shadow-lg shadow-indigo-500/20">
            {editingBudget ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {budgets.filter(b => b.churchId === currentChurchId).map(budget => {
          const catName = categories.find(c => c.id === budget.categoryId)?.name || 'Desconhecido';
          return (
            <div key={budget.categoryId} className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3 sm:mb-0 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <PieChart size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-white">{catName}</p>
                  <p className="text-xs text-gray-500">Teto: <span className="font-medium text-indigo-600 dark:text-indigo-400">{formatter.format(budget.amount)}</span></p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setViewingBudget(budget)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Ver Detalhes"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleEdit(budget)}
                  className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => setDeleteId(budget.categoryId)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )
        })}
        {budgets.filter(b => b.churchId === currentChurchId).length === 0 && (
          <p className="text-center text-gray-400 py-8 italic">Nenhum orçamento definido.</p>
        )}
      </div>

      {/* View Modal */}
      {viewingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Detalhes do Orçamento</h3>
              <button onClick={() => setViewingBudget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const status = getBudgetStatus(viewingBudget);
                const catName = categories.find(c => c.id === viewingBudget.categoryId)?.name;
                const isOver = status.percent >= 100;

                return (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Categoria</p>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{catName}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-xs text-gray-500">Orçamento</p>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatter.format(viewingBudget.amount)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-xs text-gray-500">Gasto (Mês Atual)</p>
                        <p className={`font-bold ${isOver ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{formatter.format(status.spent)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-medium">
                        <span className={isOver ? 'text-red-500' : 'text-gray-600'}>{status.percent.toFixed(1)}% Utilizado</span>
                        <span className="text-gray-400">Restante: {formatter.format(status.remaining)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(status.percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 text-right">
              <button onClick={() => setViewingBudget(null)} className="px-4 py-2 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-500">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Orçamento"
        message="Tem certeza que deseja excluir este orçamento? O limite de gastos para esta categoria será removido."
        confirmText="Excluir"
        isDanger={true}
      />
    </div>
  );
};

export default BudgetManager;
