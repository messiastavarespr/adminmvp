
import React, { useState } from 'react';
import { OFXConverter } from './OFXConverter';
import { ExportData } from './ExportData';
import { ReceiptGenerator } from './ReceiptGenerator';
import { FileJson, Download, Wrench, FileText } from './ui/Icons';

import { useFinance } from '../contexts/FinanceContext';
import { supabaseService } from '../services/supabaseService';
import { Database, AlertTriangle } from './ui/Icons';
// Helper for simple alerts since useToast is not readily available in this context
const simpleToast = (msg: string, type: 'success' | 'error') => {
    alert(`${type === 'success' ? '✅' : '❌'} ${msg}`);
};

type ToolTab = 'OFX' | 'EXPORT' | 'RECEIPT' | 'SETUP';

export const Tools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<ToolTab>('RECEIPT');
    const { activeChurchId, refreshData } = useFinance();

    const handleSeedData = async () => {
        if (!confirm("ATENÇÃO: Isso criará várias categorias, contas e centros de custo padrão na igreja atual. Se eles já existirem com o mesmo nome, poderão ser duplicados. Deseja continuar?")) return;

        try {
            // @ts-ignore - seedStandardData exists but interface might not be updated yet
            await supabaseService.seedStandardData(activeChurchId);
            refreshData();
            simpleToast("Dados padrão criados com sucesso!", 'success');
        } catch (error) {
            console.error(error);
            simpleToast("Erro ao criar dados. Verifique o console.", 'error');
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Wrench className="text-blue-600" /> Central de Ferramentas
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Utilitários para produtividade e gestão de dados.</p>

                {/* TABS */}
                <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTool('RECEIPT')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTool === 'RECEIPT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <FileText size={18} /> Gerador de Recibos
                    </button>
                    <button
                        onClick={() => setActiveTool('EXPORT')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTool === 'EXPORT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <Download size={18} /> Exportação de Dados
                    </button>
                    <button
                        onClick={() => setActiveTool('OFX')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTool === 'OFX' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <FileJson size={18} /> Conversor OFX
                    </button>
                    <button
                        onClick={() => setActiveTool('SETUP')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTool === 'SETUP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <Database size={18} /> Configuração
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-auto p-4 lg:p-8">
                <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                    {activeTool === 'OFX' && <OFXConverter />}
                    {activeTool === 'EXPORT' && <ExportData />}
                    {activeTool === 'RECEIPT' && <ReceiptGenerator />}
                    {activeTool === 'SETUP' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Configuração Inicial e Dados Padrão</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                Use esta ferramenta para preencher o sistema com um conjunto padrão de contas, categorias e centros de custo comuns para igrejas.
                                <br /><span className="text-orange-600 font-bold">Aviso: Isso pode criar itens duplicados se você já tiver cadastrado manualmente.</span>
                            </p>

                            <button
                                onClick={handleSeedData}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                            >
                                <Database size={20} />
                                Gerar Dados Padrão (Seed)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
