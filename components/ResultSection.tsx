
import React, { useState } from 'react';
import { Download, CheckCircle2, Copy, AlertTriangle, ArrowRight, Link } from './ui/Icons';

interface ResultSectionProps {
  content: string;
  onSendToReconciliation?: () => void;
}

export const ResultSection: React.FC<ResultSectionProps> = ({ content, onSendToReconciliation }) => {
  const [copied, setCopied] = useState(false);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'application/x-ofx' }));
    link.download = `extrato_${new Date().toISOString().slice(0, 10)}.ofx`;
    link.click();
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
      <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-green-800 dark:text-green-300"><CheckCircle2 className="w-5 h-5" /><span className="font-semibold">Conversão Realizada</span></div>
        <div className="flex gap-2 w-full sm:w-auto">
           <button onClick={handleCopy} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">{copied ? 'Copiado' : 'Copiar'}</button>
           <button onClick={handleDownload} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"><Download className="w-4 h-4" /> Baixar</button>
        </div>
      </div>
      
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
               <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
               <p>Verifique a prévia abaixo. Se estiver correta, envie para conciliação.</p>
            </div>
            {onSendToReconciliation && (
              <button 
                onClick={onSendToReconciliation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 font-medium text-sm"
              >
                <Link className="w-4 h-4" /> Enviar para Conciliação <ArrowRight className="w-4 h-4" />
              </button>
            )}
         </div>
      </div>

      <div className="p-0 relative group">
        <div className="absolute top-0 right-0 bg-slate-100 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-300 px-2 py-1 rounded-bl-lg border-l border-b border-slate-200 dark:border-slate-600">Visualização OFX</div>
        <pre className="p-6 overflow-x-auto text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 h-[400px] leading-relaxed custom-scrollbar">{content}</pre>
      </div>
    </div>
  );
};
