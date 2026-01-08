import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { warningService } from '../../services/warningService';
import { SystemWarning } from '../../types';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

const AdminWarningPanel: React.FC = () => {
    const { currentUser } = useFinance();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [warnings, setWarnings] = useState<SystemWarning[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchWarnings = async () => {
        try {
            const data = await warningService.fetchActiveWarnings();
            setWarnings(data);
        } catch (error) {
            console.error('Error fetching warnings:', error);
        }
    };

    useEffect(() => {
        fetchWarnings();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !title || !message) return;

        setLoading(true);
        try {
            await warningService.createWarning(title, message, currentUser.id);
            setTitle('');
            setMessage('');
            fetchWarnings();
            alert('Aviso criado com sucesso!');
        } catch (error) {
            console.error('Error creating warning:', error);
            alert('Erro ao criar aviso. Verifique o console ou contate o suporte.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar este aviso?')) return;
        try {
            await warningService.deactivateWarning(id);
            fetchWarnings();
        } catch (error) {
            console.error('Error deactivating warning:', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Create Warning Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 dark:text-white">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    Novo Aviso do Sistema
                </h2>

                <form onSubmit={handleCreate} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Título do Aviso
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-all"
                            placeholder="Ex: Manutenção Programada - Sábado 22h"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Mensagem
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-all"
                            placeholder="Digite o conteúdo detalhado do aviso que aparecerá para os usuários..."
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center items-center py-2.5 px-5 border border-transparent shadow-md text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:scale-[1.02]"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {loading ? 'Publicando...' : 'Publicar Aviso'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Active Warnings List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                    Avisos Ativos
                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{warnings.length}</span>
                </h3>

                {warnings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p>Nenhum aviso ativo no momento.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {warnings.map((w) => (
                            <li key={w.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-start group">
                                <div className="pr-4">
                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {w.title}
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded border border-green-100 dark:border-green-900/30">Ativo</span>
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{w.message}</p>
                                    <span className="text-xs text-gray-400 mt-2 block flex items-center gap-1">
                                        Created: {new Date(w.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeactivate(w.id)}
                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                    title="Desativar Aviso"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default AdminWarningPanel;
