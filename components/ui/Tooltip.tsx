import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 mt-2 -left-1/2 ml-4 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg dark:bg-slate-700 animate-in fade-in zoom-in-95 duration-200">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 dark:bg-slate-700 transform rotate-45 -top-1 left-4"></div>
        </div>
      )}
    </div>
  );
};
