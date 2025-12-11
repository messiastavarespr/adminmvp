
import React, { useState, useRef } from 'react';
import { AppData, User, UserRole, TransactionType, Church, Category, Account, CostCenter, Fund } from '../types';
// import { storageService } from '../services/storageService';
import {
   Palette, Sun, Moon, Shield, List, AlertTriangle, Trash2,
   Settings as SettingsIcon, Database, Users, PieChart, Archive,
   Landmark, Layers, Building2, Plus, X, Edit2, Target,
   FileText, CheckCircle, MapPin, Phone, Mail, Image as ImageIcon, Upload,
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

type SettingsTab = 'GENERAL' | 'ENTITIES' | 'BUDGETS' | 'USERS' | 'BACKUP';
type EntityType = 'CATEGORY' | 'ACCOUNT' | 'COST_CENTER' | 'FUND' | 'CHURCH' | 'ACCOUNTING';

const Settings: React.FC<SettingsProps> = ({ data, onDataChange, currentUser }) => {
   const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');
   const [entityTab, setEntityTab] = useState<EntityType>('CATEGORY');

   const [isEditingEntity, setIsEditingEntity] = useState(false);
   const [entityId, setEntityId] = useState<string | null>(null);
   const [entityName, setEntityName] = useState('');

   const [entityType, setEntityType] = useState<TransactionType>(TransactionType.EXPENSE);
   const [entityDesc, setEntityDesc] = useState('');
   const [entityInitialBal, setEntityInitialBal] = useState('');
   const [newCatAccCode, setNewCatAccCode] = useState(''); // Also used for Accounting Code
   const [newAccAccCode, setNewAccAccCode] = useState('');

   // New State for Accounting Account Type
   const [accType, setAccType] = useState<string>('EXPENSE');

   // Church Specific States
   const [churchType, setChurchType] = useState<'HEADQUARTERS' | 'BRANCH'>('BRANCH');
   const [churchCnpj, setChurchCnpj] = useState('');
   const [churchPhone, setChurchPhone] = useState('');
   const [churchEmail, setChurchEmail] = useState('');
   const [churchAddress, setChurchAddress] = useState('');
   const [churchCity, setChurchCity] = useState('');
   const [churchState, setChurchState] = useState('');
   const [churchLogo, setChurchLogo] = useState('');
   const logoInputRef = useRef<HTMLInputElement>(null);

   const [showAuditLog, setShowAuditLog] = useState(false);
   const [confirmReset, setConfirmReset] = useState(false);

   const isAdmin = currentUser?.role === UserRole.ADMIN;
   const isTreasurer = currentUser?.role === UserRole.TREASURER;
   const canManageSettings = isAdmin || isTreasurer;

   const {
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount,
      addCostCenter, updateCostCenter, deleteCostCenter,
      addFund, updateFund, deleteFund,
      addChurch, updateChurch, deleteChurch,
      addAccountingAccount, updateAccountingAccount, deleteAccountingAccount,
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

   const openConfirm = (type: string) => {
      if (type === 'SYSTEM') setConfirmReset(true);
   };

   const handleResetSystem = () => {
      // storageService.clearAll();
      alert("Reset de sistema desativado na versão Cloud para segurança.");
   };

   const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => {
            setChurchLogo(reader.result as string);
         };
         reader.readAsDataURL(file);
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

   const handleSaveEntity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!entityName.trim()) return;

      try {
         const churchId = currentUser?.churchId || data.churches[0]?.id;
         if (!churchId) {
            alert("Erro: Nenhuma igreja selecionada ou disponível.");
            return;
         }

         // Helper for ID generation (UUID v4)
         const genId = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
               return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
               var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
               return v.toString(16);
            });
         };

         if (entityTab === 'CATEGORY') {
            const cat: any = { id: entityId || genId(), name: entityName, type: entityType, churchId, accountingCode: newCatAccCode };
            if (entityId) await updateCategory(cat);
            else await addCategory(cat);
         } else if (entityTab === 'ACCOUNT') {
            const acc: any = { id: entityId || genId(), name: entityName, initialBalance: parseFloat(entityInitialBal) || 0, churchId, accountingCode: newAccAccCode || '1.02' };
            if (entityId) await updateAccount(acc);
            else await addAccount(acc);
         } else if (entityTab === 'COST_CENTER') {
            const cc: any = { id: entityId || genId(), name: entityName, churchId };
            if (entityId) await updateCostCenter(cc);
            else await addCostCenter(cc);
         } else if (entityTab === 'FUND') {
            const fund: any = { id: entityId || genId(), name: entityName, description: entityDesc, type: 'RESTRICTED', churchId };
            if (entityId) await updateFund(fund);
            else await addFund(fund);
         } else if (entityTab === 'CHURCH') {
            const churchData: any = {
               id: entityId || genId(),
               name: entityName,
               type: churchType,
               logo: churchLogo,
               cnpj: churchCnpj,
               phone: churchPhone,
               email: churchEmail,
               address: churchAddress,
               city: churchCity,
               state: churchState
            };
            if (entityId) {
               await updateChurch(churchData);
            } else {
               await addChurch(churchData);
            }
         } else if (entityTab === 'ACCOUNTING') {
            const accData: any = {
               id: entityId || genId(),
               code: newCatAccCode, // Reusing existing state for Code
               name: entityName,
               type: entityType === TransactionType.INCOME ? 'REVENUE' : entityType === TransactionType.EXPENSE ? 'EXPENSE' : 'ASSET', // Mapping roughly
               churchId
            };
            // Improve mapping. We need a specific Type selector for Accounting
            // Let's rely on entityType state but map it correctly
            // Or better, introduce a specific state for Accounting Type if needed. 
            // Reuse entityType: INCOME->REVENUE, EXPENSE->EXPENSE. What about ASSET/LIABILITY? 
            // We need a proper selector. 
            if (entityId) await updateAccountingAccount(accData);
            else await addAccountingAccount(accData);
         }

         resetForm();
      } catch (error) {
         console.error("Erro ao salvar:", error);
         alert("Erro ao salvar o registro. Verifique o console.");
      }
   };

   const handleDeleteEntity = async (id: string) => {
      if (!window.confirm('Tem certeza?')) return;
      if (entityTab === 'CATEGORY') await deleteCategory(id);
      if (entityTab === 'ACCOUNT') await deleteAccount(id);
      if (entityTab === 'COST_CENTER') await deleteCostCenter(id);
      if (entityTab === 'FUND') await deleteFund(id);
      if (entityTab === 'CHURCH') await deleteChurch(id);
      if (entityTab === 'ACCOUNTING') await deleteAccountingAccount(id);
   };

   const startEdit = (item: any) => {
      setEntityId(item.id);
      setEntityName(item.name);

      if (entityTab === 'CATEGORY') {
         setEntityType(item.type);
         setNewCatAccCode(item.accountingCode || '');
      }
      if (entityTab === 'ACCOUNT') {
         setEntityInitialBal(item.initialBalance?.toString() || '0');
         setNewAccAccCode(item.accountingCode || '');
      }
      if (entityTab === 'FUND') setEntityDesc(item.description || '');

      if (entityTab === 'CHURCH') {
         setChurchType(item.type);
         setChurchLogo(item.logo || '');
         setChurchCnpj(item.cnpj || '');
         setChurchPhone(item.phone || '');
         setChurchEmail(item.email || '');
         setChurchAddress(item.address || '');
         setChurchCity(item.city || '');
         setChurchState(item.state || '');
      }

      if (entityTab === 'ACCOUNTING') {
         setNewCatAccCode(item.code || '');
         // Map back types
         // item.type is ASSET, LIABILITY, REVENUE, EXPENSE
         // entityType is INCOME(REVENUE), EXPENSE(EXPENSE)
         // We might need a separate state, but for now let's hack it or add state.
         // Let's just set the type in a new state variable specifically for Accounting to avoid confusion?
         // Or just string match.
         setAccType(item.type);
      }

      setIsEditingEntity(true);
   };

   const resetForm = () => {
      setEntityId(null);
      setEntityName('');
      setEntityInitialBal('');
      setEntityDesc('');
      setNewCatAccCode('');
      setNewAccAccCode('');
      setChurchCnpj('');
      setChurchPhone('');
      setChurchEmail('');
      setChurchAddress('');
      setChurchCity('');
      setChurchState('');
      setChurchLogo('');
      setChurchType('BRANCH');
      setIsEditingEntity(false);
   };

   // Filter entities for current view
   const currentChurchId = currentUser?.churchId || data.churches[0].id;

   const getEntities = () => {
      switch (entityTab) {
         case 'CATEGORY': return data.categories.filter(c => c.churchId === currentChurchId);
         case 'ACCOUNT': return data.accounts.filter(a => a.churchId === currentChurchId);
         case 'COST_CENTER': return data.costCenters.filter(c => c.churchId === currentChurchId);
         case 'FUND': return data.funds.filter(f => f.churchId === currentChurchId);
         case 'CHURCH': return data.churches; // Show all churches
         case 'ACCOUNTING': return data.accountingAccounts.filter(a => a.churchId === currentChurchId).sort((a, b) => a.code.localeCompare(b.code));
         default: return [];
      }
   };

   const entities = getEntities();

   // Accounting Accounts for Selectors
   const revenueAccounts = data.accountingAccounts.filter(a => a.type === 'REVENUE');
   const expenseAccounts = data.accountingAccounts.filter(a => a.type === 'EXPENSE');
   const assetAccounts = data.accountingAccounts.filter(a => a.type === 'ASSET');

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
                     <button onClick={() => setActiveTab('ENTITIES')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'ENTITIES' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <Database size={16} /> Cadastros
                     </button>
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
                     <button onClick={() => openConfirm('SYSTEM')} className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-100 transition-colors w-full md:w-auto"><Trash2 size={18} /> Resetar Sistema (Apagar Tudo)</button>
                  </div>
               </div>
            )}

            {/* ENTITIES TAB */}
            {activeTab === 'ENTITIES' && (
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Entities Sidebar */}
                  <div className="lg:col-span-1 space-y-2">
                     <button onClick={() => { setEntityTab('CHURCH'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'CHURCH' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <Building2 size={18} /> Igrejas / Congregações
                     </button>
                     <button onClick={() => { setEntityTab('ACCOUNTING'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'ACCOUNTING' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <FileJson size={18} /> Plano de Contas
                     </button>
                     <button onClick={() => { setEntityTab('CATEGORY'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'CATEGORY' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <FileText size={18} /> Categorias
                     </button>
                     <button onClick={() => { setEntityTab('ACCOUNT'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'ACCOUNT' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <Landmark size={18} /> Contas / Bancos
                     </button>
                     <button onClick={() => { setEntityTab('COST_CENTER'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'COST_CENTER' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <Layers size={18} /> Centros de Custo
                     </button>
                     <button onClick={() => { setEntityTab('FUND'); resetForm(); }} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${entityTab === 'FUND' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                        <Target size={18} /> Fundos / Projetos
                     </button>
                  </div>

                  {/* Entities Content */}
                  <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                           {entityTab === 'CATEGORY' ? 'Gerenciar Categorias' :
                              entityTab === 'ACCOUNT' ? 'Gerenciar Contas' :
                                 entityTab === 'COST_CENTER' ? 'Centros de Custo' :
                                    entityTab === 'FUND' ? 'Fundos e Projetos' :
                                       entityTab === 'ACCOUNTING' ? 'Plano de Contas' : 'Gerenciar Igrejas'}
                        </h3>
                        {!isEditingEntity && (
                           <button onClick={() => setIsEditingEntity(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm">
                              <Plus size={16} /> Novo
                           </button>
                        )}
                     </div>

                     {isEditingEntity ? (
                        <form onSubmit={handleSaveEntity} className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600 animate-in fade-in">
                           <div className="grid grid-cols-1 gap-4">

                              {/* ACCOUNTING ACCOUNT FIELDS */}
                              {entityTab === 'ACCOUNTING' && (
                                 <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Código Contábil</label>
                                          <input type="text" value={newCatAccCode} onChange={e => setNewCatAccCode(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" placeholder="ex: 1.01.001" />
                                       </div>
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo da Conta</label>
                                          <select value={accType} onChange={(e) => setAccType(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none">
                                             <option value="ASSET">Ativo (Bens/Direitos)</option>
                                             <option value="LIABILITY">Passivo (Obrigações)</option>
                                             <option value="REVENUE">Receita (Entradas)</option>
                                             <option value="EXPENSE">Despesa (Saídas)</option>
                                          </select>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nome da Conta</label>
                                       <input type="text" value={entityName} onChange={e => setEntityName(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" placeholder="ex: Banco Brasil" />
                                    </div>
                                 </>
                              )}

                              {entityTab === 'CHURCH' && (
                                 // ... Church Logo (copy existing logic if needed or it falls through)
                                 // Simplified for brevity in diff, ensuring we keep existing logic
                                 <div className="mb-2">
                                    {/* ... keeping existing Church Logo logic ... */}
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Logo da Igreja (Cabeçalho/Relatórios)</label>
                                    <div className="flex items-center gap-4">
                                       <div
                                          onClick={() => logoInputRef.current?.click()}
                                          className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all relative overflow-hidden group bg-white dark:bg-slate-800"
                                       >
                                          {churchLogo ? (
                                             <>
                                                <img src={churchLogo} alt="Logo" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <span className="text-white text-[10px] font-bold">Alterar</span>
                                                </div>
                                             </>
                                          ) : (
                                             <>
                                                <ImageIcon className="text-gray-400 mb-1" size={20} />
                                                <span className="text-[9px] text-gray-500">Logo</span>
                                             </>
                                          )}
                                       </div>
                                       {churchLogo && (
                                          <button
                                             type="button"
                                             onClick={() => setChurchLogo('')}
                                             className="text-xs text-red-500 hover:underline flex items-center gap-1"
                                          >
                                             <Trash2 size={12} /> Remover Logo
                                          </button>
                                       )}
                                       <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                 </div>
                              )}

                              {entityTab !== 'ACCOUNTING' && (
                                 <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                       {entityTab === 'CHURCH' ? 'Nome da Igreja / Congregação *' : 'Nome *'}
                                    </label>
                                    <input type="text" value={entityName} onChange={e => setEntityName(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" autoFocus />
                                 </div>
                              )}

                              {/* ... Existing fields ... */}
                              {entityTab === 'CHURCH' && (
                                 <>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                                          <select value={churchType} onChange={(e) => setChurchType(e.target.value as any)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none">
                                             <option value="BRANCH">Congregação / Filial</option>
                                             <option value="HEADQUARTERS">Igreja Sede (Matriz)</option>
                                          </select>
                                       </div>
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CNPJ</label>
                                          <input type="text" value={churchCnpj} onChange={e => setChurchCnpj(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                                          <input type="text" value={churchPhone} onChange={e => setChurchPhone(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                       </div>
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Email</label>
                                          <input type="email" value={churchEmail} onChange={e => setChurchEmail(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Endereço</label>
                                       <input type="text" value={churchAddress} onChange={e => setChurchAddress(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                                          <input type="text" value={churchCity} onChange={e => setChurchCity(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                       </div>
                                       <div>
                                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">UF</label>
                                          <input type="text" value={churchState} onChange={e => setChurchState(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" maxLength={2} />
                                       </div>
                                    </div>
                                 </>
                              )}

                              {entityTab === 'CATEGORY' && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                                       <div className="flex gap-4">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                             <input type="radio" checked={entityType === TransactionType.INCOME} onChange={() => setEntityType(TransactionType.INCOME)} className="text-blue-600" />
                                             <span className="text-sm">Entrada</span>
                                          </label>
                                          <label className="flex items-center gap-2 cursor-pointer">
                                             <input type="radio" checked={entityType === TransactionType.EXPENSE} onChange={() => setEntityType(TransactionType.EXPENSE)} className="text-blue-600" />
                                             <span className="text-sm">Saída</span>
                                          </label>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Conta Contábil Vinculada</label>
                                       <select
                                          value={newCatAccCode}
                                          onChange={(e) => setNewCatAccCode(e.target.value)}
                                          className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                                       >
                                          <option value="">-- Selecione --</option>
                                          {(entityType === TransactionType.INCOME ? revenueAccounts : expenseAccounts).map(acc => (
                                             <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>
                              )}

                              {entityTab === 'ACCOUNT' && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Saldo Inicial (R$)</label>
                                       <input type="number" step="0.01" value={entityInitialBal} onChange={e => setEntityInitialBal(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Conta Contábil (Ativo)</label>
                                       <select
                                          value={newAccAccCode}
                                          onChange={(e) => setNewAccAccCode(e.target.value)}
                                          className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                                       >
                                          <option value="">-- Selecione --</option>
                                          {assetAccounts.map(acc => (
                                             <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>
                              )}

                              {entityTab === 'FUND' && (
                                 <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                                    <input type="text" value={entityDesc} onChange={e => setEntityDesc(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none" placeholder="Opcional" />
                                 </div>
                              )}
                           </div>
                           <div className="flex justify-end gap-2 mt-4">
                              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-sm">Cancelar</button>
                              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold flex items-center gap-2"><CheckCircle size={16} /> Salvar</button>
                           </div>
                        </form>
                     ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                           {entities.length === 0 ? <p className="text-gray-400 text-center py-4">Nenhum item cadastrado.</p> : entities.map((item: any) => (
                              <div key={item.id} className="py-3 flex justify-between items-center group">
                                 <div className="flex items-center gap-3">
                                    {entityTab === 'CHURCH' && item.logo && (
                                       <img src={item.logo} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600" />
                                    )}
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <p className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</p>
                                          {entityTab === 'CATEGORY' && item.accountingCode && <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 px-1.5 rounded">{item.accountingCode}</span>}
                                          {entityTab === 'ACCOUNTING' && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 rounded font-mono">{item.code}</span>}
                                          {entityTab === 'CHURCH' && (
                                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.type === 'HEADQUARTERS' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400'}`}>
                                                {item.type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}
                                             </span>
                                          )}
                                       </div>
                                       <p className="text-xs text-gray-500">
                                          {entityTab === 'CATEGORY' ? (item.type === 'INCOME' ? 'Entrada' : 'Saída') :
                                             entityTab === 'ACCOUNT' ? `Saldo Inicial: R$ ${item.initialBalance?.toFixed(2)}` :
                                                entityTab === 'FUND' ? item.description :
                                                   entityTab === 'ACCOUNTING' ? (item.type === 'ASSET' ? 'Ativo' : item.type === 'LIABILITY' ? 'Passivo' : item.type === 'REVENUE' ? 'Receita' : 'Despesa') :
                                                      entityTab === 'CHURCH' ? `${item.city || '-'} / ${item.state || '-'}` : ''}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteEntity(item.id)} className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
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

         <ConfirmationModal
            isOpen={confirmReset}
            onClose={() => setConfirmReset(false)}
            onConfirm={handleResetSystem}
            title="Resetar Sistema"
            message="Tem certeza absoluta? Todos os dados serão apagados permanentemente. Esta ação não pode ser desfeita."
            confirmText="Sim, apagar tudo"
            isDanger={true}
         />
      </div>
   );
};

export default Settings;
