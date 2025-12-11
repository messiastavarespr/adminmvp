
import { useFinance } from '../contexts/FinanceContext';

export const useToast = () => {
    const { logAction } = useFinance();

    // Since we don't have a direct 'addNotification' exposed in the restored Context yet,
    // we will map toast actions to logActions for now, preventing crash.
    // Ideally, we would add 'addNotification' to context.

    const toast = {
        success: (message: string) => {
            console.log(`[TOAST SUCCESS]: ${message}`);
            // logAction('NOTIFICATION', 'INFO', message); // Optional: log it
        },
        error: (message: string) => {
            console.error(`[TOAST ERROR]: ${message}`);
            // logAction('NOTIFICATION', 'ERROR', message);
        },
        info: (message: string) => {
            console.log(`[TOAST INFO]: ${message}`);
        }
    };

    return { toast };
};
