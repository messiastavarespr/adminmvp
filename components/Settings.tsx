
import React, { useState } from 'react';
import { AppData, User, UserRole } from '../types';
import {
   Settings as SettingsIcon, Users, PieChart, Archive
} from './ui/Icons';
import UsersManager from './Users';
import BudgetManager from './BudgetManager';
import BackupRestore from './BackupRestore';
import SettingsGeneral from './SettingsGeneral';
import SettingsDangerZone from './SettingsDangerZone';
import SettingsRegistries from './SettingsRegistries';

interface SettingsProps {
   data: AppData;
   onDataChange: () => void;
   currentUser: User | null;
}

type SettingsTab = 'GENERAL' | 'BUDGETS' | 'USERS' | 'BACKUP' | 'REGISTRIES';

const Settings: React.FC<SettingsProps> = ({ data, onDataChange, currentUser }) => {
   const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');

   const isActiveMaster = currentUser?.role === UserRole.MASTER;
   const isAdmin = currentUser?.role === UserRole.ADMIN;
   const isTreasurer = currentUser?.role === UserRole.TREASURER;
   // Settings: MASTER, ADMIN or TREASURER
   const canManageSettings = isActiveMaster || isAdmin || isTreasurer;

   // Backup: ONLY MASTER
   // Danger Zone: ONLY MASTER (handled in component)

   return (
      <div className="space-y-6 animate-in fade-in">
         {/* Top Navigation */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <SettingsIcon className="text-blue-600" /> Configurações
               {isActiveMaster && (
                  <button className="ml-4 flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors" title="Download PRD (Master Only)">
                     <Archive size={12} /> PRD
                  </button>
               )}
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
               <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'USERS' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Users size={16} /> Usuários
               </button>

               <button onClick={() => setActiveTab('REGISTRIES')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'REGISTRIES' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Archive size={16} /> Cadastros
               </button>

               {isActiveMaster && (
                  <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'BACKUP' ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                     <Archive size={16} /> Backup
                  </button>
               )}
            </div>
         </div>

         {/* Content Area */}
         <div className="space-y-6">

            {/* GENERAL TAB */}
            {activeTab === 'GENERAL' && (
               <>
                  <SettingsGeneral data={data} currentUser={currentUser} />
                  {/* Danger Zone: Only MASTER */}
                  {isActiveMaster && <SettingsDangerZone currentUser={currentUser} />}
               </>
            )}

            {/* OTHER TABS */}
            {activeTab === 'USERS' && (
               <UsersManager users={data.users} churches={data.churches} onUpdate={onDataChange} />
            )}

            {activeTab === 'BUDGETS' && (
               <BudgetManager budgets={data.budgets} categories={data.categories} transactions={data.transactions} currentChurchId={currentUser?.churchId || ''} currentUser={currentUser!} onUpdate={onDataChange} />
            )}

            {activeTab === 'REGISTRIES' && (
               <SettingsRegistries />
            )}

            {activeTab === 'BACKUP' && (
               <BackupRestore onImport={onDataChange} />
            )}

         </div>
      </div>
   );
};

export default Settings;
