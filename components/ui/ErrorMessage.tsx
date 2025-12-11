
import React from 'react';
import { AlertCircle } from './Icons';

interface ErrorMessageProps {
  message?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="flex items-center gap-1 mt-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle size={12} />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};

export default ErrorMessage;