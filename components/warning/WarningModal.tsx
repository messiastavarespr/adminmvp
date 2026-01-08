import React, { useEffect, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { warningService } from '../../services/warningService';
import { SystemWarning } from '../../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const WarningModal: React.FC = () => {
    const { currentUser } = useFinance();
    const [activeWarning, setActiveWarning] = useState<SystemWarning | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkWarnings = async () => {
            // Wait for user to be loaded
            if (!currentUser) return;

            try {
                const warnings = await warningService.fetchActiveWarnings();
                const readWarnings = await warningService.fetchUserReadWarnings(currentUser.id);

                // Find the first active warning that hasn't been read
                const unreadWarning = warnings.find(w => !readWarnings.includes(w.id));

                if (unreadWarning) {
                    setActiveWarning(unreadWarning);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Failed to check warnings', error);
            }
        };

        if (currentUser) {
            checkWarnings();
        }
    }, [currentUser]);

    const handleDismiss = async () => {
        if (!currentUser || !activeWarning) return;

        try {
            await warningService.markWarningAsRead(activeWarning.id, currentUser.id);
            setIsOpen(false);
            setActiveWarning(null);
        } catch (error) {
            console.error('Failed to mark warning as read', error);
        }
    };

    if (!isOpen || !activeWarning) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="bg-amber-500 p-4 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-white" />
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {activeWarning.title}
                    </h2>
                    <div className="text-gray-600 dark:text-gray-300 mb-8 text-left max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {activeWarning.message}
                    </div>
                    {activeWarning.users?.name && (
                        <div className="text-xs text-gray-400 text-right mb-4 italic">
                            Enviado por: {activeWarning.users.name}
                        </div>
                    )}

                    {/* Footer / Button */}
                    <button
                        onClick={handleDismiss}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="h-5 w-5" />
                        Eu li e entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarningModal;
