import React, { useState } from 'react';
import { Wrench, Clock, Lock } from './ui/Icons';

interface MaintenanceScreenProps {
    onUnlock: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onUnlock }) => {
    const [showInput, setShowInput] = useState(false);
    const [password, setPassword] = useState('');

    const handleUnlock = () => {
        if (password.toLowerCase().trim() === 'messias') {
            onUnlock();
        } else {
            alert('Senha incorreta');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-lg w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center">
                <div className="w-20 h-20 mx-auto bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
                    <Wrench size={40} className="text-blue-500 animate-pulse" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-3">Sistema em Manutenção</h1>
                <p className="text-slate-300 mb-8 text-lg">
                    Estamos realizando melhorias e atualizações importantes.
                    O sistema voltará em breve.
                </p>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <Clock size={16} />
                        <span>Previsão de retorno: <strong>Em breve</strong></span>
                    </div>
                </div>

                {/* Secret Unlock Area */}
                <div className="mt-8 pt-6 border-t border-slate-700/50 text-slate-500 text-xs flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => setShowInput(!showInput)}>
                        <Lock size={12} />
                        <span>&copy; 2025 MVP Financeiro.</span>
                    </div>
                    {showInput && (
                        <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2">
                            <input
                                type="password"
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none focus:border-blue-500"
                                placeholder="Senha..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                            />
                            <button
                                onClick={handleUnlock}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
                            >
                                Entrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
