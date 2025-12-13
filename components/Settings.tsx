
import React, { useState, useRef } from 'react';
import { AppData, User, UserRole, TransactionType, Church, Category, Account, CostCenter, Fund } from '../types';
// import { storageService } from '../services/storageService';
import {
   Palette, Sun, Moon, Shield, List, AlertTriangle, Trash2,
   Settings as SettingsIcon, Users, PieChart, Archive,
   FileJson, Download
} from './ui/Icons';
import UsersManager from './Users';
import BudgetManager from './BudgetManager';
import BackupRestore from './BackupRestore';
import AuditLogViewer from './AuditLog';
import ConfirmationModal from './ConfirmationModal';
import { useFinance } from '../contexts/FinanceContext';

interface SettingsProps {
   data: AppData;
   onDataChange: () => void;
   currentUser: User | null;
}

type SettingsTab = 'GENERAL' | 'BUDGETS' | 'USERS' | 'BACKUP';

const Settings: React.FC<SettingsProps> = ({ data, onDataChange, currentUser }) => {
   const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');

   const [showAuditLog, setShowAuditLog] = useState(false);
   const [showResetModal, setShowResetModal] = useState(false);
   const [resetOptions, setResetOptions] = useState({
      transactions: true,
      members: false,
      budgets: false,
      settings: false,
      audit: false
   });
   const [confirmText, setConfirmText] = useState('');
   const { resetSystem } = useFinance(); // Add resetSystem to destructuring

   const isAdmin = currentUser?.role === UserRole.ADMIN;
   const isTreasurer = currentUser?.role === UserRole.TREASURER;
   const canManageSettings = isAdmin || isTreasurer;

   const {
      refreshData,
      toggleTheme // Imported from context
   } = useFinance();

   /* 
   * Theme is currently local-only or on AppData. 
   * Used to force reload, now uses Context to avoid logout.
   */
   const handleThemeChange = (theme: 'light' | 'dark') => {
      if (data.theme !== theme) {
         toggleTheme();
      }
   };

   // Auto-enable transactions if settings are enabled
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

   const handleDownloadPRD = async () => {
      try {
         // Tenta buscar o arquivo se estiver hospedado
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
            // Fallback: Cria o JSON dinamicamente se o arquivo não for encontrado (ex: ambiente sem servidor estático)
            throw new Error("Arquivo não encontrado");
         }
      } catch (e) {
         alert("Não foi possível baixar o arquivo PRD diretamente. Certifique-se que o arquivo 'prd.json' está na raiz do projeto.");
      }
   };

   return (
      <div className="space-y-6 animate-in fade-in">
         {/* Top Navigation */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <SettingsIcon className="text-blue-600" /> Configurações
            </h1>

            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-x-auto max-w-full">
               <button onClick={() => setActiveTab('GENERAL')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'GENERAL' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <SettingsIcon size={16} /> Geral
               </button>
               {canManageSettings && (
                  <>
                     <button onClick={() => setActiveTab('BUDGETS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'BUDGETS' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <PieChart size={16} /> Orçamentos
                     </button>
                  </>
               )}
               {isAdmin && (
                  <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'USERS' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                     <Users size={16} /> Usuários
                  </button>
               )}
               <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'BACKUP' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Archive size={16} /> Backup
               </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="space-y-6">

            {/* GENERAL TAB */}
            {activeTab === 'GENERAL' && (
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
                              Baixe o arquivo de metadados técnicos (JSON) contendo todas as regras de negócio e especificações do sistema. Útil para manutenção com IA.
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
                        <div className="mt-4"><div className="mb-4 flex justify-between items-center"><p className="text-sm text-gray-500">Histórico de ações realizadas no sistema.</p><button onClick={() => setShowAuditLog(false)} className="text-sm text-red-500 hover:underline">Fechar Histórico</button></div><AuditLogViewer logs={data.auditLogs} /></div>
                     )}
                  </div>

                  {/* DANGER ZONE */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> Zona de Perigo</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ações destrutivas. Selecione o que deseja apagar.</p>
                     <button onClick={() => setShowResetModal(true)} className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-100 transition-colors w-full md:w-auto">
                        <Trash2 size={18} /> Opções de Reset
                     </button>
                  </div>
               </div>
            )}

            {/* OTHER TABS */}
            {activeTab === 'USERS' && isAdmin && (
               <UsersManager users={data.users} churches={data.churches} onUpdate={onDataChange} />
            )}

            {activeTab === 'BUDGETS' && (
               <BudgetManager budgets={data.budgets} categories={data.categories} transactions={data.transactions} currentChurchId={currentUser?.churchId || ''} currentUser={currentUser!} onUpdate={onDataChange} />
            )}

            {activeTab === 'BACKUP' && (
               <BackupRestore onImport={onDataChange} />
            )}

         </div>

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

export default Settings;
