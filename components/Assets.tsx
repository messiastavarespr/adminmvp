import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Asset, UserRole } from '../types';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Package,
    MapPin,
    Calendar,
    X,
    Filter,
    DollarSign,
    Tag,
    AlertTriangle,
    CheckCircle2,
    Archive,
    BarChart3
} from './ui/Icons';
import { useToast } from '../hooks/useToast';

const Assets: React.FC = () => {
    const { data, currentUser, addAsset, updateAsset, deleteAsset } = useFinance();
    const { toast } = useToast();

    // Defensive check
    if (!data || !data.assets) return <div className="p-8 text-center text-gray-500">Carregando dados de patrimônio...</div>;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ACTIVE, MAINTENANCE, DISPOSED

    // Form State
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [value, setValue] = useState('');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [location, setLocation] = useState('');
    const [status, setStatus] = useState<Asset['status']>('ACTIVE');
    const [notes, setNotes] = useState('');

    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const currentChurchId = currentUser?.churchId || data.churches[0]?.id;

    const assetCategories = data.assetCategories?.filter(c => c.churchId === currentChurchId) || [];

    // Filter Logic
    const filteredAssets = useMemo(() => {
        return data.assets.filter(asset => {
            const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.location?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = filterCategory === 'ALL' || asset.categoryId === filterCategory;
            const matchesStatus = filterStatus === 'ALL' || asset.status === filterStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [data.assets, searchTerm, filterCategory, filterStatus]);

    // Stats
    const totalValue = filteredAssets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalItems = filteredAssets.length;

    const handleOpenForm = (asset?: Asset) => {
        if (asset) {
            setEditingAsset(asset);
            setName(asset.name);
            setCategoryId(asset.categoryId);
            setValue(asset.value?.toString() || '');
            setAcquisitionDate(asset.acquisitionDate || '');
            setLocation(asset.location || '');
            setStatus(asset.status);
            setNotes(asset.notes || '');
        } else {
            setEditingAsset(null);
            setName('');
            setCategoryId(assetCategories.find(c => c.isSystemDefault)?.id || assetCategories[0]?.id || '');
            setValue('');
            setAcquisitionDate(new Date().toISOString().split('T')[0]);
            setLocation('');
            setStatus('ACTIVE');
            setNotes('');
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            const assetData: Asset = {
                id: editingAsset ? editingAsset.id : crypto.randomUUID(),
                churchId: currentUser.churchId,
                name,
                categoryId,
                value: value ? parseFloat(value) : 0,
                acquisitionDate: acquisitionDate || undefined,
                location,
                status,
                notes
            };

            if (editingAsset) {
                await updateAsset(assetData);
                toast.success('Patrimônio atualizado com sucesso!');
            } else {
                await addAsset(assetData);
                toast.success('Patrimônio adicionado com sucesso!');
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar patrimônio.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        try {
            await deleteAsset(id);
            toast.success('Item excluído com sucesso.');
        } catch (error) {
            toast.error('Erro ao excluir item.');
        }
    };

    // Helper for Status Badge
    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'ACTIVE': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 size={12} /> Ativo</span>;
            case 'MAINTENANCE': return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200 flex items-center gap-1"><AlertTriangle size={12} /> Manutenção</span>;
            case 'DISPOSED': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1"><Archive size={12} /> Baixado</span>;
            default: return null;
        }
    };

    const formatCurrency = (val?: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Package className="text-blue-600" /> Gestão de Patrimônio
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Controle de bens, equipamentos e móveis da igreja.</p>
                </div>
                <div className="flex gap-4">
                    {/* Summary Cards */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Total de Itens</p>
                            <p className="font-bold text-lg dark:text-white">{totalItems}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Valor Total</p>
                            <p className="font-bold text-lg dark:text-white">{formatCurrency(totalValue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou local..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                        >
                            <option value="ALL">Todas Categorias</option>
                            {assetCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenForm()}
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} /> Novo Item
                </button>
            </div>

            {/* Main List - Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-3 text-left">Item</th>
                                <th className="px-6 py-3 text-left">Categoria</th>
                                <th className="px-6 py-3 text-left">Localização</th>
                                <th className="px-6 py-3 text-left">Valor (Est.)</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Calendar size={10} /> {asset.acquisitionDate ? new Date(asset.acquisitionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                                                {assetCategories.find(c => c.id === asset.categoryId)?.name || 'Sem Categoria'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {asset.location || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(asset.value)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(asset.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenForm(asset)} title="Editar" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(asset.id)} title="Excluir" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 rounded-t-xl">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingAsset ? 'Editar Item' : 'Novo Item'}
                            </h2>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                type="button"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Item <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ex: Teclado Yamaha, Microfone Shure..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="">Selecione uma categoria</option>
                                            {assetCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        <option value="ACTIVE">Ativo</option>
                                        <option value="MAINTENANCE">Manutenção</option>
                                        <option value="DISPOSED">Baixado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Estimado (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Aquisição</label>
                                    <input
                                        type="date"
                                        value={acquisitionDate}
                                        onChange={(e) => setAcquisitionDate(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localização</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ex: Templo, Secretaria, Depósito..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Número de série, detalhes da condição, etc..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors"
                                >
                                    {editingAsset ? 'Salvar Alterações' : 'Adicionar Item'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Assets;
