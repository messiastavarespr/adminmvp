import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps<T> {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onSelect: (item: T) => void;
    items: T[];
    itemKey: keyof T; // e.g. 'name'
    placeholder?: string;
    renderItem?: (item: T) => React.ReactNode;
}

export function Autocomplete<T>({ label, value, onChange, onSelect, items, itemKey, placeholder, renderItem }: AutocompleteProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredItems = value ? items.filter(item => {
        const val = String(item[itemKey] || '').toLowerCase();
        return val.toLowerCase().includes(value.toLowerCase());
    }) : [];

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (value) setIsOpen(true);
                }}
                className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2"
                placeholder={placeholder}
            />
            {isOpen && filteredItems.length > 0 && (
                <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredItems.map((item, idx) => (
                        <li
                            key={idx}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-900 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 last:border-0"
                            onClick={() => {
                                onSelect(item);
                                setIsOpen(false);
                            }}
                        >
                            {renderItem ? renderItem(item) : String(item[itemKey])}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
