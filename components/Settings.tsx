
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

interface SettingsProps {
   data: AppData;
   onDataChange: () => void;
   currentUser: User | null;
}

type SettingsTab = 'GENERAL' | 'BUDGETS' | 'USERS' | 'BACKUP';

const Settings: React.FC<SettingsProps> = ({ data, onDataChange, currentUser }) => {
   const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');

   const isAdmin = currentUser?.role === UserRole.ADMIN;
   const isTreasurer = currentUser?.role === UserRole.TREASURER;
   const canManageSettings = isAdmin || isTreasurer;

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
               <>
                  <SettingsGeneral data={data} currentUser={currentUser} />
                  <SettingsDangerZone />
               </>
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
      </div>
   );
};

export default Settings;
