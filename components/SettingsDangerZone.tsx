
import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';

const SettingsDangerZone: React.FC = () => {
    const { resetSystem } = useFinance();
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetOptions, setResetOptions] = useState({
        transactions: true,
        members: false,
        budgets: false,
        settings: false,
        audit: false
    });
    const [confirmText, setConfirmText] = useState('');

    const handleOptionChange = (key: keyof typeof resetOptions) => {
        setResetOptions(prev => {
            const next = { ...prev, [key]: !prev[key] };
            if (key === 'settings' && next.settings) {
                next.transactions = true; // Constraint
            }
            return next;
        });
    };

    const handleExecuteReset = async () => {
        if (confirmText !== 'RESETAR') return;

        try {
            await resetSystem(resetOptions);
            alert("Sistema resetado com sucesso conforme opções selecionadas.");
            setShowResetModal(false);
            setConfirmText('');
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao resetar o sistema: ${error.message || "Erro desconhecido"}`);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> Zona de Perigo</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ações destrutivas. Selecione o que deseja apagar.</p>
            <button onClick={() => setShowResetModal(true)} className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-100 transition-colors w-full md:w-auto">
                <Trash2 size={18} /> Opções de Reset
            </button>

            {/* Custom Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                            <h3 className="text-xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle size={24} /> Resetar Dados do Sistema
                            </h3>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                                Selecione as categorias de dados que deseja apagar permanentemente. Esta ação não pode ser desfeita.
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.transactions}
                                    onChange={() => handleOptionChange('transactions')}
                                    disabled={resetOptions.settings} // Enforce dependency
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-bold text-gray-800 dark:text-white block">Movimentações Financeiras</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Transações, Extratos, Agendamentos e Transferências.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.budgets}
                                    onChange={() => handleOptionChange('budgets')}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-bold text-gray-800 dark:text-white block">Planejamento Orçamentário</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Todos os orçamentos definidos.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.members}
                                    onChange={() => handleOptionChange('members')}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-bold text-gray-800 dark:text-white block">Base de Membros</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Cadastro de membros e dizimistas.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.audit}
                                    onChange={() => handleOptionChange('audit')}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-bold text-gray-800 dark:text-white block">Histórico de Auditoria</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Logs de ações dos usuários.</span>
                                </div>
                            </label>

                            <div className="my-2 border-t border-gray-100 dark:border-slate-700"></div>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.settings}
                                    onChange={() => handleOptionChange('settings')}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-bold text-red-800 dark:text-red-300 block">Configurações Globais (CUIDADO!)</span>
                                    <span className="text-sm text-red-700 dark:text-red-400">Categorias, Contas, Centros de Custo. <br /><strong>Apaga automaticamente as Movimentações e Orçamentos.</strong></span>
                                </div>
                            </label>

                            <div className="pt-4">
                                <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Para confirmar, digite <span className="text-red-600 select-all">RESETAR</span> abaixo:</p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="Digite RESETAR"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowResetModal(false); setConfirmText(''); }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExecuteReset}
                                disabled={confirmText !== 'RESETAR'}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Confirmar e Apagar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsDangerZone;
