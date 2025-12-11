
import React from 'react';
import { AlertTriangle, X } from './ui/Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        <div className={`p-4 flex justify-between items-center ${isDanger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDanger ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
            <AlertTriangle size={20} />
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-black/5 rounded-full p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-slate-600 transition-colors text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-white font-medium shadow-md transition-transform active:scale-95 text-sm ${
              isDanger 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;