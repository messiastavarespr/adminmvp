
import React from 'react';
import { Search, X } from './Icons';

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange, placeholder = "Buscar..." }) => {
  return (
    <div className="relative w-full md:w-64">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all focus:bg-white dark:focus:bg-slate-800"
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBox;
