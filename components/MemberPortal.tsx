
import React, { useState } from 'react';
import { Transaction, TransactionType, User, Member } from '../types';
import { LogOut, Heart, TrendingUp, CalendarRange, User as UserIcon, Building2, ChurchCross } from './ui/Icons';

interface MemberPortalProps {
  user: User;
  memberProfile?: Member;
  transactions: Transaction[];
  onLogout: () => void;
  logoUrl?: string;
}

const MemberPortal: React.FC<MemberPortalProps> = ({ user, memberProfile, transactions, onLogout, logoUrl }) => {
  // Filter transactions linked to this member
  const myTransactions = transactions.filter(t => 
    (t.memberOrSupplierId === user.memberId || t.memberOrSupplierId === memberProfile?.id) && 
    t.type === TransactionType.INCOME
  );

  const totalContribution = myTransactions.reduce((acc, t) => acc + t.amount, 0);

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
             ) : (
                 <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Building2 size={20} />
                 </div>
             )}
             <div>
               <h1 className="font-bold text-gray-800 dark:text-white text-lg leading-none flex items-center gap-1">
                 MVPFin <ChurchCross className="text-blue-600" size={16}/>
               </h1>
               <p className="text-xs text-gray-500 dark:text-gray-400">Portal do Membro - {user.name}</p>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-xl font-bold mb-2">Obrigado pela sua fidelidade!</h2>
          <p className="opacity-90 text-sm mb-6 max-w-lg">
            "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." (2 Coríntios 9:7)
          </p>
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm w-fit">
            <Heart className="text-pink-300 fill-pink-300" size={24} />
            <div>
              <p className="text-xs opacity-75 uppercase font-semibold">Total Ofertado em 2024</p>
              <p className="text-2xl font-bold">{formatter.format(totalContribution)}</p>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <CalendarRange className="text-blue-500" size={20} />
              Histórico de Contribuições
            </h3>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {myTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>Nenhuma contribuição registrada vinculada ao seu perfil ainda.</p>
              </div>
            ) : (
              myTransactions.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600">
                    {formatter.format(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberPortal;
