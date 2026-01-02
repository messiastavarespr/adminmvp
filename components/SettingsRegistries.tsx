import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Plus, Trash2, Folder, Shield } from 'lucide-react'; // Using direct lucide-react imports for specialized icons if possible, or fallback to ui/Icons if restricted. 
// However, the project seems to use a central Icons file. Let's stick to that to avoid errors if lucide-react isn't direct dep or styled differently.
import { Plus as PlusIcon, Trash2 as TrashIcon, Save, Folder as FolderIcon, User as UserIcon, Edit2 as EditIcon, X, Check } from './ui/Icons';

// Inline Component for a Single Registry List
const RegistryCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (item: string) => void;
    onUpdate: (oldItem: string, newItem: string) => void;
    description: string;
}> = ({ title, icon, items = [], onAdd, onRemove, onUpdate, description }) => {
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

    const cancelEdit = () => {
        setEditingItem(null);
        setEditValue('');
    };

    const saveEdit = () => {
        if (editingItem && editValue.trim() && editValue !== editingItem) {
            onUpdate(editingItem, editValue.trim());
        }
        setEditingItem(null);
        setEditValue('');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{items.length} itens cadastrados</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{description}</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-900/10 border-b border-gray-100 dark:border-slate-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Adicionar novo..."
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newItem.trim()}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        <PlusIcon size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 max-h-[300px]">
                {items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-xs">Nenhum item cadastrado.</p>
                ) : (
                    <div className="space-y-1">
                        {items.map((item, idx) => (
                            <div key={`${item}-${idx}`} className="flex justify-between items-center p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 group border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all">
                                {editingItem === item ? (
                                    <div className="flex flex-1 items-center gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 p-1 bg-white dark:bg-slate-800 border border-blue-500 rounded text-sm outline-none"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                        <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => startEdit(item)}
                                                className="text-gray-300 hover:text-blue-500 p-1"
                                                title="Editar"
                                            >
                                                <EditIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => confirm(`Tem certeza que deseja remover "${item}"?`) && onRemove(item)}
                                                className="text-gray-300 hover:text-rose-500 p-1"
                                                title="Remover"
                                            >
                                                <TrashIcon size={14} />
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
    );
};

const SettingsRegistries: React.FC = () => {
    const {
        data,
        addMemberRole, removeMemberRole,
        addMemberCategory, removeMemberCategory
    } = useFinance();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SECTION: SECRETARIA */}
                <div className="md:col-span-2">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                        Secretaria e Membresia
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RegistryCard
                            title="Categorias de Membros"
                            icon={<UserIcon size={20} />}
                            description="Tipos de vínculo dos membros (ex: Membro Comungante, Congregado, Criança)."
                            items={data.memberCategories || []}
                            onAdd={addMemberCategory}
                            onRemove={removeMemberCategory}
                        />

                        <RegistryCard
                            title="Cargos Eclesiásticos"
                            icon={<Shield size={20} />} // Assuming Shield exists or fallback
                            description="Funções e cargos exercidos na igreja (ex: Pastor, Diácono, Líder)."
                            items={data.memberRoles || []}
                            onAdd={addMemberRole}
                            onRemove={removeMemberRole}
                        />
                    </div>
                </div>

                {/* FUTURE SECTIONS */}
                {/* 
                <div className="md:col-span-2 mt-4">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                        Patrimônio
                    </h2>
                    // Asset Categories could go here
                </div> 
                */}

            </div>
        </div>
    );
};

export default SettingsRegistries;
