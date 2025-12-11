
import React, { useState } from 'react';
import { OFXConverter } from './OFXConverter';
import { ExportData } from './ExportData';
import { FileJson, Download, Wrench } from './ui/Icons';

type ToolTab = 'OFX' | 'EXPORT';

export const Tools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<ToolTab>('EXPORT'); // Default to Export as requested high priority

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
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-auto p-4 lg:p-8">
                <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                    {activeTool === 'OFX' && <OFXConverter />}
                    {activeTool === 'EXPORT' && <ExportData />}
                </div>
            </div>
        </div>
    );
};
