
import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, Bell } from './Icons';
import { Notification } from '../../types';

interface ToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notifications, onDismiss }) => {
  const activeNotifications = notifications.filter(n => !n.read);

  if (activeNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {activeNotifications.map(notification => (
        <div 
          key={notification.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border min-w-[300px] max-w-sm animate-in slide-in-from-right duration-300 ${
            notification.type === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/90 border-amber-200 dark:border-amber-700' :
            notification.type === 'ERROR' ? 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700' :
            notification.type === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700' :
            'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600'
          }`}
        >
          <div className="mt-0.5">
            {notification.type === 'WARNING' && <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />}
            {notification.type === 'ERROR' && <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />}
            {notification.type === 'SUCCESS' && <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />}
            {notification.type === 'INFO' && <Bell size={18} className="text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{notification.title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
          </div>
          <button 
            onClick={() => onDismiss(notification.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
