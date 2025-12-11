import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { AccountingAccount, Category } from '../types';
import { Search, Plus, Trash2, Edit2, GripVertical, AlertCircle, Check, X } from 'lucide-react';

interface ChartOfAccountsProps {
    accounts: AccountingAccount[];
    categories: Category[];
    currentChurchId: string;
}

export default function ChartOfAccounts() {
    const { data, addAccountingAccount, updateAccountingAccount, deleteAccountingAccount, activeChurchId, currentUser } = useFinance();

    // Filtering for current context
    const targetChurchId = activeChurchId === 'ALL' ? (currentUser?.churchId || '') : activeChurchId;
    const accounts = data.accountingAccounts.filter(a => activeChurchId === 'ALL' ? true : a.churchId === activeChurchId);
    const categories = data.categories.filter(c => activeChurchId === 'ALL' ? true : c.churchId === activeChurchId);

    // Split Logic
    const revenues = accounts.filter(a => a.type === 'REVENUE').sort((a, b) => (a.order || 0) - (b.order || 0));
    const expenses = accounts.filter(a => a.type === 'EXPENSE').sort((a, b) => (a.order || 0) - (b.order || 0));

    // Filters State
    const [filterRev, setFilterRev] = useState('');
    const [filterExp, setFilterExp] = useState('');
    const [catFilterRev, setCatFilterRev] = useState('ALL');
    const [catFilterExp, setCatFilterExp] = useState('ALL');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AccountingAccount | null>(null);
    const [modalType, setModalType] = useState<'REVENUE' | 'EXPENSE'>('REVENUE');

    // Drag State
    const [draggedItem, setDraggedItem] = useState<AccountingAccount | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<AccountingAccount>>({});

    const handleOpenModal = (type: 'REVENUE' | 'EXPENSE', item?: AccountingAccount) => {
        setModalType(type);
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({
                type: type,
                code: '',
                name: '',
                relatedCategoryId: '',
                churchId: targetChurchId,
                order: (type === 'REVENUE' ? revenues.length : expenses.length) // Append to end
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.code) return; // Basic validation

        // Ensure ID is present for update, or generated/handled by service for add
        const payload = { ...formData, churchId: targetChurchId } as AccountingAccount;

        if (editingItem && editingItem.id) {
            updateAccountingAccount(payload);
        } else {
            // Generate ID here if needed or let service. 
            // Service expects ID for types usually.
            const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
            addAccountingAccount({ ...payload, id: newId });
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            deleteAccountingAccount(id);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, item: AccountingAccount) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Hide ghost image if desired or style it
    };

    const handleDragOver = (e: React.DragEvent, targetItem: AccountingAccount) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.type !== targetItem.type) return;

        // Logic to reorder locally? 
        // Usually we just highlight the drop zone, but for simplicity here strictly reorder on drop
    };

    const handleDrop = (e: React.DragEvent, targetItem: AccountingAccount) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.type !== targetItem.type) return;

        // Calculate new order
        // We swap orders or shift?
        // Let's implement array shift logic
        const list = draggedItem.type === 'REVENUE' ? [...revenues] : [...expenses];
        const oldIndex = list.findIndex(i => i.id === draggedItem.id);
        const newIndex = list.findIndex(i => i.id === targetItem.id);

        if (oldIndex < 0 || newIndex < 0) return;

        // Move item
        const [removed] = list.splice(oldIndex, 1);
        list.splice(newIndex, 0, removed);

        // Update orders for all affected items
        list.forEach((item, index) => {
            if (item.order !== index) {
                updateAccountingAccount({ ...item, order: index });
            }
        });

        setDraggedItem(null);
    };

    // Filter Logic
    const filterList = (list: AccountingAccount[], text: string, catId: string) => {
        return list.filter(item => {
            const matchName = item.name.toLowerCase().includes(text.toLowerCase()) || item.code.toLowerCase().includes(text.toLowerCase());
            const matchCat = catId === 'ALL' || item.relatedCategoryId === catId;
            return matchName && matchCat;
        });
    };

    const displayedRevenue = filterList(revenues, filterRev, catFilterRev);
    const displayedExpense = filterList(expenses, filterExp, catFilterExp);

    // Pagination Logic (Simple: Show 20, load more? OR scroll? Request asked for "Paginação automática caso a lista seja longa")
    // For simplicity, we'll let the container scroll, but if user explicitly asked for pagination, I should implement page numbers?
    // "Paginação automática caso a lista seja longa". Scroll is usually better for strict lists, but I'll add simple pagination if > 50 items.
    // Actually, usually responsive lists just scroll. The prompt says "Paginação automática". I will check if I can just use scroll bars.
    // "Use layout limpo... altura ajustável à tela". This implies scrollable area. I will trust scrollable area unless list is massive.
    // If explicitly requested pagination, maybe pages. Let's do simple pages.

    const ITEMS_PER_PAGE = 20;
    const [pageRev, setPageRev] = useState(1);
    const [pageExp, setPageExp] = useState(1);

    const paginate = (list: AccountingAccount[], page: number) => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return list.slice(start, start + ITEMS_PER_PAGE);
    };

    const pagedRevenue = paginate(displayedRevenue, pageRev);
    const pagedExpense = paginate(displayedExpense, pageExp);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {/* Left Column: REVENUE */}
                <Column
                    title="Receitas"
                    type="REVENUE"
                    items={pagedRevenue}
                    totalItems={displayedRevenue.length}
                    page={pageRev}
                    setPage={setPageRev}
                    search={filterRev}
                    setSearch={setFilterRev}
                    catFilter={catFilterRev}
                    setCatFilter={setCatFilterRev}
                    onAdd={() => handleOpenModal('REVENUE')}
                    onEdit={(item) => handleOpenModal('REVENUE', item)}
                    onDelete={(id) => handleDelete(id)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    categories={categories}
                    colorClass="text-green-600 bg-green-50 dark:bg-green-900/20"
                />

                {/* Right Column: EXPENSE */}
                <Column
                    title="Despesas"
                    type="EXPENSE"
                    items={pagedExpense}
                    totalItems={displayedExpense.length}
                    page={pageExp}
                    setPage={setPageExp}
                    search={filterExp}
                    setSearch={setFilterExp}
                    catFilter={catFilterExp}
                    setCatFilter={setCatFilterExp}
                    onAdd={() => handleOpenModal('EXPENSE')}
                    onEdit={(item) => handleOpenModal('EXPENSE', item)}
                    onDelete={(id) => handleDelete(id)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    categories={categories}
                    colorClass="text-red-600 bg-red-50 dark:bg-red-900/20"
                />
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                            {editingItem ? 'Editar Conta' : 'Nova Conta'}
                            <span className={`text-xs px-2 py-1 rounded-full ${modalType === 'REVENUE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {modalType === 'REVENUE' ? 'Receita' : 'Despesa'}
                            </span>
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                                <input
                                    value={formData.code || ''}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                    placeholder="Ex: 1.1.01"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Conta</label>
                                <input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                    placeholder="Ex: Ofertas de Culto"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria Vinculada</label>
                                <select
                                    value={formData.relatedCategoryId || ''}
                                    onChange={e => setFormData({ ...formData, relatedCategoryId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                >
                                    <option value="">Nenhuma</option>
                                    {categories
                                        .filter(c => (modalType === 'REVENUE' ? c.type === 'INCOME' : c.type === 'EXPENSE'))
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Vincule a uma categoria interna para agrupamento.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.code || !formData.name}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for Column to reduce duplication
const Column = ({
    title, type, items, page, setPage, totalItems,
    search, setSearch, catFilter, setCatFilter,
    onAdd, onEdit, onDelete, onDragStart, onDragOver, onDrop,
    categories, colorClass
}: any) => {
    const totalPages = Math.ceil(totalItems / 20);

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className={`p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col gap-3 ${colorClass} bg-opacity-10`}>
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        {title}
                        <span className="text-xs font-normal opacity-70 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                            {totalItems} itens
                        </span>
                    </h2>
                    <button
                        onClick={onAdd}
                        className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all text-current"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/50 dark:bg-black/20 border-none rounded-lg outline-none focus:ring-1 focus:ring-current placeholder:text-gray-500"
                        />
                    </div>
                    <select
                        value={catFilter}
                        onChange={e => setCatFilter(e.target.value)}
                        className="w-1/3 py-1.5 px-2 text-sm bg-white/50 dark:bg-black/20 border-none rounded-lg outline-none focus:ring-1 focus:ring-current cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                        <option value="ALL">Categoria</option>
                        {categories.filter((c: any) => (type === 'REVENUE' ? c.type === 'INCOME' : c.type === 'EXPENSE')).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mb-3">
                            <Search size={20} className="opacity-50" />
                        </div>
                        <p className="text-sm">Nenhum registro encontrado</p>
                    </div>
                ) : (
                    items.map((item: any) => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, item)}
                            onDragOver={(e) => onDragOver(e, item)}
                            onDrop={(e) => onDrop(e, item)}
                            className="group bg-gray-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30 p-3 rounded-xl transition-all flex items-center gap-3 cursor-grab active:cursor-grabbing"
                        >
                            <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab">
                                <GripVertical size={16} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                        {item.code}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                        {item.name}
                                    </span>
                                </div>
                                {item.relatedCategoryId && (
                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                        <span>
                                            {categories.find((c: any) => c.id === item.relatedCategoryId)?.name || 'Categoria Removida'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(item)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-2 py-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span>Página {page} de {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="px-2 py-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
};
