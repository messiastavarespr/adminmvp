import React, { useState } from 'react';
import { History, Trash2, Calculator as CalculatorIcon } from './ui/Icons';

export const Calculator: React.FC = () => {
    const [display, setDisplay] = useState('0');
    const [history, setHistory] = useState<string[]>([]);
    const [memory, setMemory] = useState<number>(0);
    const [lastResult, setLastResult] = useState(false);

    const handleNumber = (num: string) => {
        if (lastResult) {
            setDisplay(num);
            setLastResult(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleOperator = (op: string) => {
        setLastResult(false);
        const lastChar = display.slice(-1);
        if (['+', '-', '*', '/', '.'].includes(lastChar)) {
            setDisplay(display.slice(0, -1) + op);
        } else {
            setDisplay(display + op);
        }
    };

    const calculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(display.replace(/x/g, '*').replace(/÷/g, '/'));
            const formattedResult = Number(result).toString();

            setHistory(prev => [`${display} = ${formattedResult}`, ...prev].slice(0, 10));
            setDisplay(formattedResult);
            setLastResult(true);
        } catch (e) {
            setDisplay('Erro');
            setLastResult(true);
        }
    };

    const clear = () => {
        setDisplay('0');
        setLastResult(false);
    };

    const deleteChar = () => {
        if (lastResult) {
            clear();
        } else {
            setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
        }
    };

    const percentage = () => {
        try {
            const val = parseFloat(display);
            setDisplay((val / 100).toString());
            setLastResult(true);
        } catch {
            setDisplay('Erro');
        }
    };

    const buttons = [
        { label: 'C', onClick: clear, className: 'bg-red-100 text-red-600 hover:bg-red-200' },
        { label: '⌫', onClick: deleteChar, className: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
        { label: '%', onClick: percentage, className: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
        { label: '÷', onClick: () => handleOperator('/'), className: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
        { label: '7', onClick: () => handleNumber('7'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '8', onClick: () => handleNumber('8'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '9', onClick: () => handleNumber('9'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: 'x', onClick: () => handleOperator('*'), className: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
        { label: '4', onClick: () => handleNumber('4'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '5', onClick: () => handleNumber('5'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '6', onClick: () => handleNumber('6'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '-', onClick: () => handleOperator('-'), className: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
        { label: '1', onClick: () => handleNumber('1'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '2', onClick: () => handleNumber('2'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '3', onClick: () => handleNumber('3'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '+', onClick: () => handleOperator('+'), className: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
        { label: '0', onClick: () => handleNumber('0'), className: 'col-span-2 bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '.', onClick: () => handleOperator('.'), className: 'bg-white hover:bg-slate-50 border border-slate-200' },
        { label: '=', onClick: calculate, className: 'bg-emerald-500 text-white hover:bg-emerald-600 font-bold' },
    ];

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="mb-6 bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-right">
                    <span className="text-4xl font-mono text-slate-800 dark:text-slate-100 tracking-wider overflow-x-auto block">
                        {display}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {buttons.map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={btn.onClick}
                            className={`h-14 rounded-xl text-xl font-medium transition-all active:scale-95 flex items-center justify-center ${btn.className} dark:bg-opacity-10 dark:text-white dark:border-slate-600`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <History size={18} className="text-blue-500" /> Histórico
                    </h3>
                    <button onClick={() => setHistory([])} className="text-slate-400 hover:text-red-500 transition-colors" title="Limpar Histórico">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center text-slate-400 py-8 text-sm italic">
                            Nenhum cálculo recente
                        </div>
                    ) : (
                        history.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                <span className="font-mono text-slate-700 dark:text-slate-300">{item}</span>
                                <button
                                    onClick={() => setDisplay(item.split('=')[1].trim())}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity"
                                >
                                    Usar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
