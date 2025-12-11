
import React from 'react';
import { AuditLog } from '../types';
import { History, Search } from './ui/Icons';
import SearchBox from './ui/SearchBox';

interface AuditLogProps {
  logs: AuditLog[];
}

const AuditLogViewer: React.FC<AuditLogProps> = ({ logs }) => {
  const [search, setSearch] = React.useState('');

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <History size={20} className="text-blue-500" /> Histórico de Alterações (Auditoria)
        </h3>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar no histórico..." />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 sticky top-0">
              <tr>
                <th className="px-6 py-3">Data/Hora</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Ação</th>
                <th className="px-6 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(log.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                      {log.userName}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
