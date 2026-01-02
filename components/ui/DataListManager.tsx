import React, { useState } from 'react';
import { Plus, X, Trash2, Check, Edit2 } from 'lucide-react';

interface DataListManagerProps {
    title: string;
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (item: string) => void;
    onUpdate?: (oldItem: string, newItem: string) => void;
    onClose: () => void;
}

const DataListManager: React.FC<DataListManagerProps> = ({ title, items, onAdd, onRemove, onUpdate, onClose }) => {
    const [newItem, setNewItem] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    const startEdit = (item: string) => {
        setEditingItem(item);
        setEditValue(item);
    };

    const saveEdit = () => {
        if (editingItem && editValue.trim() && editValue !== editingItem) {
            onUpdate?.(editingItem, editValue.trim());
        }
        setEditingItem(null);
        setEditValue('');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-white">Gerenciar {title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Novo item..."
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            autoFocus
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newItem.trim()}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {items.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-sm">Nenhum item cadastrado.</p>
                    ) : (
                        <div className="space-y-1">
                            {items.map((item, idx) => (
                                <div key={`${item}-${idx}`} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 group border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all">
                                    {editingItem === item ? (
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="flex-1 p-1 bg-white dark:bg-slate-700 border border-blue-500 rounded text-sm outline-none text-gray-900 dark:text-white"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit();
                                                    if (e.key === 'Escape') setEditingItem(null);
                                                }}
                                            />
                                            <button onClick={saveEdit} className="text-green-600 hover:text-green-500"><Check size={16} /></button>
                                            <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-500"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                {onUpdate && (
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="text-gray-300 hover:text-blue-500"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => confirm(`Deseja remover "${item}"?`) && onRemove(item)}
                                                    className="text-gray-300 hover:text-rose-500"
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataListManager;
