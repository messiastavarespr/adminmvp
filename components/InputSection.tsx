
import React, { useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from './ui/Icons';

type InputMode = 'text' | 'file';

interface InputSectionProps {
  onConvert: (data: string | File) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onConvert, isLoading }) => {
  const [mode, setMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => setSelectedFile(null);

  const handleSubmit = () => {
    if (mode === 'text' && textInput.trim()) {
      onConvert(textInput);
    } else if (mode === 'file' && selectedFile) {
      onConvert(selectedFile);
    }
  };

  const isReady = (mode === 'text' && textInput.length > 10) || (mode === 'file' && selectedFile !== null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setMode('text')} className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${mode === 'text' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Colar Texto</button>
        <button onClick={() => setMode('file')} className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${mode === 'file' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Enviar PDF/Arquivo</button>
      </div>
      <div className="p-6">
        {mode === 'text' ? (
          <div className="space-y-4">
             <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-3 text-amber-800 dark:text-amber-300 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /><p>Copie o conteúdo do PDF e cole abaixo, ou digite os dados da transação.</p></div>
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Cole o texto bruto aqui..." className="w-full h-64 p-4 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" spellCheck={false} />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 relative hover:border-blue-400 transition-colors">
            {!selectedFile ? (
              <>
                <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Clique ou arraste o arquivo (PDF, TXT)</p>
                <input type="file" accept=".pdf,.txt" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </>
            ) : (
              <div className="flex flex-col items-center p-4">
                <FileText className="w-12 h-12 text-blue-500 mb-3" />
                <p className="text-slate-900 dark:text-white font-medium mb-1">{selectedFile.name}</p>
                <button onClick={clearFile} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 mt-2"><X className="w-4 h-4" /> Remover</button>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button onClick={handleSubmit} disabled={!isReady || isLoading} className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-sm flex items-center gap-2 transition-all ${!isReady || isLoading ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}>
            {isLoading ? 'Processando...' : 'Converter para OFX'}
          </button>
        </div>
      </div>
    </div>
  );
};
