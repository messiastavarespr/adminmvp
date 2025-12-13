
import React, { useState } from 'react';
import { AppData } from '../types';
import { Palette, Sun, Moon, Shield, List, FileJson, Download } from './ui/Icons';
import AuditLogViewer from './AuditLog';
import { useFinance } from '../contexts/FinanceContext';

interface SettingsGeneralProps {
    data: AppData;
    currentUser: any; // Using any for simplicity as User structure is known
}

const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ data, currentUser }) => {
    const [showAuditLog, setShowAuditLog] = useState(false);
    const { toggleTheme, loadMoreAuditLogs } = useFinance();

    const handleThemeChange = (theme: 'light' | 'dark') => {
        if (data.theme !== theme) {
            toggleTheme();
        }
    };

    const handleDownloadPRD = async () => {
        try {
            const response = await fetch('./prd.json');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mvpfin_prd.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                throw new Error("Arquivo não encontrado");
            }
        } catch (e) {
            alert("Não foi possível baixar o arquivo PRD diretamente.");
        }
    };

    return (
        <div className="grid grid-cols-1 gap-6">
            {/* THEME SELECTION */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Palette size={20} className="text-purple-500" /> Aparência e Tema
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex-1 p-4 w-full rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${data.theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                        <Sun size={24} />
                        <span className="font-bold">Modo Claro</span>
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex-1 p-4 w-full rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${data.theme === 'dark' ? 'border-blue-500 bg-slate-800 text-blue-400' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                        <Moon size={24} />
                        <span className="font-bold">Modo Escuro</span>
                    </button>
                </div>
            </div>

            {/* DOCUMENTATION */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><FileJson size={20} className="text-emerald-500" /> Documentação Técnica</h3>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">PRD - Documento de Requisitos do Produto</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                            Baixe o arquivo de metadados técnicos (JSON).
                        </p>
                    </div>
                    <button
                        onClick={handleDownloadPRD}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm active:scale-95 transition-all whitespace-nowrap"
                    >
                        <Download size={18} /> Baixar PRD
                    </button>
                </div>
            </div>

            {/* AUDIT LOG */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Shield size={20} className="text-indigo-500" /> Auditoria do Sistema</h3>
                {!showAuditLog ? (
                    <button onClick={() => setShowAuditLog(true)} className="flex items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors w-full md:w-auto"><List size={18} /> Visualizar Logs de Auditoria</button>
                ) : (
                    <div className="mt-4"><div className="mb-4 flex justify-between items-center"><p className="text-sm text-gray-500">Histórico de ações realizadas no sistema.</p><button onClick={() => setShowAuditLog(false)} className="text-sm text-red-500 hover:underline">Fechar Histórico</button></div><AuditLogViewer logs={data.auditLogs} onLoadMore={loadMoreAuditLogs} /></div>
                )}
            </div>
        </div>
    );
};

export default SettingsGeneral;
