
import React, { useState, useRef, useEffect } from 'react';
import { InputSection } from './InputSection';
import { ResultSection } from './ResultSection';
import { convertToOFX } from '../services/geminiService';
import { ShieldCheck, Zap, FileJson } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';

type ConversionStatus = 'idle' | 'processing' | 'success' | 'error';

interface ConversionState {
  status: ConversionStatus;
  result?: string;
  errorMessage?: string;
}

export const OFXConverter: React.FC = () => {
  const [state, setState] = useState<ConversionState>({ status: 'idle' });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Use ReturnType to correctly type the interval refs
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setPendingImportData, setActiveTab, currentUser } = useFinance();

  const startProgressSimulation = () => {
    setProgress(0);
    setStatusMessage('');
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (messageInterval.current) clearInterval(messageInterval.current);

    // Simulate progress
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        // Fast start, slow end, cap at 90%
        if (prev >= 90) return 90;
        const increment = prev < 30 ? 5 : prev < 60 ? 2 : 1;
        return prev + increment;
      });
    }, 300);

    // Message update every 30 seconds
    messageInterval.current = setInterval(() => {
      const userName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuário';
      setStatusMessage(`${userName}, estamos preparando seus arquivos. Isso pode levar alguns instantes.`);
    }, 30000);
  };

  const stopProgressSimulation = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (messageInterval.current) clearInterval(messageInterval.current);
    setProgress(100);
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, []);

  const handleConversion = async (inputData: string | File) => {
    setState({ status: 'processing' });
    startProgressSimulation();

    try {
      const result = await convertToOFX(inputData);
      stopProgressSimulation();

      // Small delay to let user see 100%
      setTimeout(() => {
        setState({ status: 'success', result });
      }, 600);
    } catch (err: any) {
      stopProgressSimulation();
      setState({ status: 'error', errorMessage: err.message || "Erro inesperado." });
    }
  };

  const handleSendToReconciliation = () => {
    if (state.result) {
      setPendingImportData(state.result);
      setActiveTab('reconciliation');
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileJson className="text-blue-600" /> Conversor OFX</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Converta extratos em PDF ou texto para o formato OFX compatível com sistemas contábeis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <InputSection onConvert={handleConversion} isLoading={state.status === 'processing'} />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><ShieldCheck className="w-6 h-6 text-blue-600 mb-2" /><h3 className="font-semibold text-slate-900 dark:text-white text-sm">Seguro</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Processamento via API segura.</p></div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><Zap className="w-6 h-6 text-amber-500 mb-2" /><h3 className="font-semibold text-slate-900 dark:text-white text-sm">IA Rápida</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Análise inteligente de dados.</p></div>
          </div>
        </div>
        <div className="lg:col-span-7">
          {state.status === 'idle' && <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">Aguardando entrada...</div>}

          {state.status === 'processing' && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
                </div>
                <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              </div>

              <div className="w-full max-w-xs space-y-2 text-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Convertendo Arquivo</h3>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 animate-pulse transition-all">
                  {statusMessage || (progress < 30 ? 'Lendo dados...' : progress < 70 ? 'Processando com IA...' : 'Formatando OFX...')}
                </p>
              </div>
            </div>
          )}

          {state.status === 'error' && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center h-full min-h-[400px] flex flex-col items-center justify-center"><h3 className="text-lg font-bold text-red-800 dark:text-red-400">Erro na Conversão</h3><p className="text-red-600 dark:text-red-300 text-sm mt-2">{state.errorMessage}</p><button onClick={() => setState({ status: 'idle' })} className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">Tentar Novamente</button></div>}

          {state.status === 'success' && state.result && <ResultSection content={state.result} onSendToReconciliation={handleSendToReconciliation} />}
        </div>
      </div>
    </div>
  );
};
