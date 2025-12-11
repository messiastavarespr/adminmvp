import React, { useRef, useState } from 'react';
import { AppData } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { Archive, UploadCloud, DownloadCloud, FileJson, AlertTriangle, CheckCircle } from './ui/Icons';
import JSZip from 'jszip';

interface BackupRestoreProps {
  onImport: () => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ onImport }) => {
  const { data } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');

  const handleExport = async () => {
    // Export Data from Context (Supabase)
    const jsonString = JSON.stringify(data, null, 2);

    // Create ZIP
    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `mvpfin_backup_${dateStr}.json`;

    zip.file(fileName, jsonString);

    try {
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger Download
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_completo_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Export Failed", e);
      alert("Falha ao gerar arquivo ZIP.");
    }
  };

  const handleImportClick = () => {
    // fileInputRef.current?.click();
    alert("Função de importação desativada temporariamente na versão Cloud. Entre em contato com o suporte se precisar restaurar dados.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Disabled logic
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Archive size={28} /> Backup & Restauração
        </h2>
        <p className="text-indigo-100 max-w-2xl">
          Mantenha seus dados seguros. Exporte regularmente um backup completo do sistema para evitar perda de dados, já que este MVP armazena informações no navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* EXPORT CARD */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center hover:border-indigo-200 transition-colors">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <DownloadCloud size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Exportar Dados</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
            Gera um arquivo .ZIP contendo todos os lançamentos, cadastros e configurações atuais.
          </p>
          <button
            onClick={handleExport}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-transform active:scale-95 w-full md:w-auto"
          >
            Baixar Backup Completo
          </button>
        </div>

        {/* IMPORT CARD */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center hover:border-emerald-200 transition-colors">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Restaurar Backup</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
            Importe um arquivo .JSON (extraído do ZIP) para restaurar o sistema.
            <br />
            <span className="text-rose-500 font-bold text-xs mt-1 block">ATENÇÃO: Isso substituirá os dados atuais!</span>
          </p>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
          />

          <button
            onClick={handleImportClick}
            className="px-6 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 text-gray-600 dark:text-gray-300 hover:text-emerald-600 rounded-xl font-semibold transition-colors w-full md:w-auto flex items-center justify-center gap-2"
          >
            <FileJson size={20} /> Selecionar Arquivo JSON
          </button>

          {importStatus === 'SUCCESS' && (
            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle size={16} /> {statusMessage}
            </div>
          )}
          {importStatus === 'ERROR' && (
            <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {statusMessage}
            </div>
          )}
        </div>

      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl flex gap-3">
        <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0" />
        <div>
          <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Política de Backup</h4>
          <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
            Como este sistema funciona offline no seu navegador (LocalStorage), é altamente recomendável fazer backups semanais. Se você limpar o cache do navegador, os dados serão perdidos a menos que você tenha um backup.
          </p>
        </div>
      </div>

    </div>
  );
};

export default BackupRestore;