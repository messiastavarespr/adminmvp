import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../../types';
import { useFinance } from '../../contexts/FinanceContext';
import { Search, X, Check } from 'lucide-react';

interface MemberSelectProps {
    onSelect: (memberId: string, memberName: string) => void;
    selectedId?: string;
    excludeId?: string; // Prevent selecting self
    placeholder?: string;
    className?: string;
}

const MemberSelect: React.FC<MemberSelectProps> = ({
    onSelect,
    selectedId,
    excludeId,
    placeholder = "Buscar membro...",
    className
}) => {
    const { data } = useFinance();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayValue, setDisplayValue] = useState('');

    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize display value if ID is present
    useEffect(() => {
        if (selectedId) {
            const member = data.members.find(m => m.id === selectedId);
            if (member) {
                setDisplayValue(member.name);
            }
        } else {
            setDisplayValue('');
        }
    }, [selectedId, data.members]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredMembers = data.members.filter(m => {
        if (m.id === excludeId) return false;
        if (m.status === 'INACTIVE') return false; // Optional: restrict to active
        return m.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelect = (member: Member) => {
        onSelect(member.id, member.name);
        setDisplayValue(member.name);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect('', '');
        setDisplayValue('');
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-between cursor-pointer ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
            >
                <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {displayValue && (
                        <button onClick={handleClear} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-full text-gray-400">
                            <X size={14} />
                        </button>
                    )}
                    <Search size={16} className="text-gray-400" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-600 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-50 dark:border-slate-700">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Digite para buscar..."
                            autoFocus
                            className="w-full text-sm p-2 rounded bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="py-1">
                        {filteredMembers.length === 0 ? (
                            <div className="p-3 text-sm text-gray-400 text-center">Nenhum membro encontrado.</div>
                        ) : (
                            filteredMembers.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => handleSelect(member)}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between
                    ${member.id === selectedId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}
                  `}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{member.name}</span>
                                        {member.birthDate && <span className="text-[10px] text-gray-400">Nasc: {new Date(member.birthDate).toLocaleDateString('pt-BR')}</span>}
                                    </div>
                                    {member.id === selectedId && <Check size={14} />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberSelect;
