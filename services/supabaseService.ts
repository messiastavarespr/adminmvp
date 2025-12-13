
import { supabase } from './supabaseClient';
import { AppData, Transaction, ScheduledTransaction, Category, CostCenter, Account, TransactionType, RecurrenceType, User, UserRole, Member, Church, AuditLog, Budget, Fund, AccountingAccount, Asset } from '../types';

// Helper to map DB snake_case to CamelCase if needed, but for now we assume 1:1 or manual mapping
// Our SQL uses snake_case keys (e.g. church_id), Types use camelCase (churchId).
// We need to map them.

const mapToCamel = <T>(obj: any): T => {
    if (Array.isArray(obj)) return obj.map(mapToCamel) as any;
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            acc[camelKey] = mapToCamel(obj[key]);
            return acc;
        }, {} as any) as T;
    }
    return obj as T;
};

const mapToSnake = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(mapToSnake);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = mapToSnake(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

const defaultChurchId = 'ch_hq'; // Fallback

export const supabaseService = {
    // --- Core Fetch ---
    getData: async (startDate?: string): Promise<AppData> => {
        // Default: Last 12 months if not specified
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 1);
        const filterDate = startDate || defaultDate.toISOString().split('T')[0];

        // Parallel fetch
        const [
            { data: recentTransactions },
            { data: legacyTransactions }, // Fetch light version for math
            { data: categories },
            { data: accounts },
            { data: members },
            { data: churches },
            { data: scheduled },
            { data: funds },
            { data: costCenters },
            { data: accountingAccounts },
            { data: budgets },
            { data: auditLogs },
            { data: users },
            { data: notifications },
            { data: assets },
            { data: assetCategories }
        ] = await Promise.all([
            // 1. Recent Transactions (Full)
            supabase.from('transactions').select('*').gte('date', filterDate),
            // 2. Old Transactions (Light - Just for Balance)
            supabase.from('transactions').select('id, amount, type, account_id, fund_id, transfer_direction').lt('date', filterDate),

            supabase.from('categories').select('*'),
            supabase.from('accounts').select('*'),
            supabase.from('members').select('*'),
            supabase.from('churches').select('*'),
            supabase.from('scheduled_transactions').select('*'),
            supabase.from('funds').select('*'),
            supabase.from('cost_centers').select('*'),
            supabase.from('accounting_accounts').select('*'),
            supabase.from('budgets').select('*'),
            // Limit Audit Logs
            supabase.from('audit_logs').select('*').order('date', { ascending: false }).limit(50),
            supabase.from('users').select('*'),
            supabase.from('notifications').select('*'),
            supabase.from('assets').select('*'),
            supabase.from('asset_categories').select('*')
        ]);

        // --- PROCESS LEGACY BALANCES ---
        // We calculate the net result of all excluded transactions and add to the account's initialBalance
        const accountOffsets = new Map<string, number>();

        // Type definition for raw DB transaction subset
        interface RawLegacyTransaction {
            id: string;
            amount: number;
            type: string;
            account_id: string;
            fund_id: string;
            transfer_direction?: string;
        }

        (legacyTransactions as RawLegacyTransaction[] || []).forEach((t) => {
            const amount = Number(t.amount);
            const type = t.type;
            const accId = t.account_id;
            const direction = t.transfer_direction;

            if (type === 'INCOME') {
                accountOffsets.set(accId, (accountOffsets.get(accId) || 0) + amount);
            } else if (type === 'EXPENSE') {
                accountOffsets.set(accId, (accountOffsets.get(accId) || 0) - amount);
            } else if (type === 'TRANSFER') {
                if (direction === 'IN') accountOffsets.set(accId, (accountOffsets.get(accId) || 0) + amount);
                if (direction === 'OUT') accountOffsets.set(accId, (accountOffsets.get(accId) || 0) - amount);
            }
        });

        // Map Accounts and adjust Initial Balance
        const mappedAccounts = mapToCamel<Account[]>(accounts || []).map((acc) => ({
            ...acc,
            initialBalance: acc.initialBalance + (accountOffsets.get(acc.id) || 0)
        }));

        return {
            transactions: mapToCamel<Transaction[]>(recentTransactions || []),
            categories: mapToCamel<Category[]>(categories || []),
            accounts: mappedAccounts,
            members: mapToCamel<Member[]>(members || []),
            churches: mapToCamel<Church[]>(churches || []),
            scheduled: mapToCamel<ScheduledTransaction[]>(scheduled || []),
            funds: mapToCamel<Fund[]>(funds || []),
            costCenters: mapToCamel<CostCenter[]>(costCenters || []),
            accountingAccounts: mapToCamel<AccountingAccount[]>(accountingAccounts || []),
            budgets: mapToCamel<Budget[]>(budgets || []),
            auditLogs: mapToCamel<AuditLog[]>(auditLogs || []),
            users: mapToCamel<User[]>(users || []),
            notifications: mapToCamel<any[]>(notifications || []), // Notifications type might be loose or defined
            assets: mapToCamel<Asset[]>(assets || []),
            assetCategories: mapToCamel<any[]>(assetCategories || []),
            theme: 'light', // Local preference only
        };
    },

    getMoreAuditLogs: async (page: number, pageSize: number = 50): Promise<AuditLog[]> => {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        return mapToCamel(data || []) as AuditLog[];
    },

    // --- Transactions ---
    // --- Transactions ---
    addTransaction: async (t: Transaction) => {
        const { id, ...payload } = mapToSnake(t);
        const { error } = await supabase.from('transactions').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    updateTransaction: async (t: Transaction) => {
        const { id, ...payload } = mapToSnake(t);
        const { error } = await supabase.from('transactions').update(payload).eq('id', id);
        if (error) throw error;
    },

    deleteTransaction: async (id: string) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Categories ---
    addCategory: async (c: Category) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('categories').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    deleteCategory: async (id: string) => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Asset Categories ---
    addAssetCategory: async (c: any) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('asset_categories').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    updateAssetCategory: async (c: any) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('asset_categories').update(payload).eq('id', id);
        if (error) throw error;
    },

    deleteAssetCategory: async (id: string) => {
        const { error } = await supabase.from('asset_categories').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Accounts ---
    addAccount: async (a: Account) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('accounts').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    updateAccount: async (a: Account) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('accounts').update(payload).eq('id', id);
        if (error) throw error;
    },

    deleteAccount: async (id: string) => {
        const { error } = await supabase.from('accounts').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Scheduled ---
    addScheduled: async (s: ScheduledTransaction) => {
        const { id, ...payload } = mapToSnake(s);
        const { error } = await supabase.from('scheduled_transactions').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    updateScheduled: async (s: ScheduledTransaction) => {
        const { id, ...payload } = mapToSnake(s);
        const { error } = await supabase.from('scheduled_transactions').update(payload).eq('id', id);
        if (error) throw error;
    },

    deleteScheduled: async (id: string) => {
        const { error } = await supabase.from('scheduled_transactions').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Members ---
    addMember: async (m: Member) => {
        const { id, ...payload } = mapToSnake(m);
        const { error } = await supabase.from('members').insert([{ id, ...payload }]);
        if (error) throw error;
    },

    updateMember: async (m: Member) => {
        const { id, ...payload } = mapToSnake(m);
        const { error } = await supabase.from('members').update(payload).eq('id', id);
        if (error) throw error;
    },

    deleteMember: async (id: string) => {
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Audit ---
    logAction: async (user: User | null, action: string, entity: string, details: string) => {
        if (!user) return;
        const log = {
            date: new Date().toISOString(),
            user_id: user.id,
            user_name: user.name,
            action,
            entity,
            details,
            church_id: user.churchId
        };
        await supabase.from('audit_logs').insert([log]);
    },

    // --- Specialized Operations ---

    addTransfer: async (
        amount: number,
        fromAccountId: string,
        toAccountId: string,
        fundId: string,
        date: string,
        description: string,
        churchId: string,
        user: User | null
    ) => {
        // Generate IDs locally or rely on DB defaults. 
        // We need the IDs for the relationship.
        // UUID v4 generation? supabase-js has no built-in generator? 
        // We can use crypto.randomUUID() if env supports it, or Math hack.
        const genUuid = () => crypto.randomUUID();

        // We must fetch account names for description? Or pass them?
        // StorageService fetched them. We might skip fetching and trust IDs, 
        // but the description needs names? Old logic: "Transferência para {name}"
        // Let's just use generic description or fetch. Fetching is safer.

        const { data: accounts } = await supabase.from('accounts').select('id, name').in('id', [fromAccountId, toAccountId]);
        const fromName = accounts?.find((a: any) => a.id === fromAccountId)?.name || 'Conta Origem';
        const toName = accounts?.find((a: any) => a.id === toAccountId)?.name || 'Conta Destino';

        const id1 = genUuid();
        const id2 = genUuid();

        const debit = {
            id: id1,
            date,
            amount,
            description: `Transferência para ${toName} - ${description}`,
            account_id: fromAccountId,
            fund_id: fundId,
            type: TransactionType.TRANSFER, // 'TRANSFER'
            transfer_direction: 'OUT',
            is_paid: true,
            church_id: churchId,
            related_transaction_id: id2
        };

        const credit = {
            id: id2,
            date,
            amount,
            description: `Transferência de ${fromName} - ${description}`,
            account_id: toAccountId,
            fund_id: fundId,
            type: TransactionType.TRANSFER, // 'TRANSFER'
            transfer_direction: 'IN',
            is_paid: true,
            church_id: churchId,
            related_transaction_id: id1
        };

        await supabase.from('transactions').insert([debit, credit]);
    },

    processScheduledTransaction: async (scheduledId: string, accountId: string, paymentDate: string, user: User | null) => {
        // 1. Fetch Scheduled Item
        const { data: s } = await supabase.from('scheduled_transactions').select('*').eq('id', scheduledId).single();
        if (!s) return;

        const scheduledItem = mapToCamel(s) as ScheduledTransaction;

        // 2. Create Transaction
        const newTx: any = {
            date: paymentDate,
            amount: scheduledItem.amount,
            description: scheduledItem.title,
            category_id: scheduledItem.categoryId,
            cost_center_id: scheduledItem.costCenterId,
            fund_id: scheduledItem.fundId,
            account_id: accountId,
            type: scheduledItem.type,
            is_paid: true,
            scheduled_id: scheduledItem.id,
            church_id: scheduledItem.churchId,
            attachments: [] // Todo
        };

        await supabase.from('transactions').insert([newTx]);

        // 3. Update Scheduled Item Recurrence
        let updates: any = {};
        if (scheduledItem.recurrence === RecurrenceType.NONE) {
            updates.is_active = false;
        } else {
            let shouldContinue = true;
            let newOccurrences = scheduledItem.occurrences;

            if (typeof scheduledItem.occurrences === 'number') {
                if (scheduledItem.occurrences > 1) {
                    newOccurrences = scheduledItem.occurrences - 1;
                } else {
                    shouldContinue = false;
                    newOccurrences = 0;
                    updates.is_active = false;
                }
                updates.occurrences = newOccurrences;
            }

            if (shouldContinue) {
                const currentDue = new Date(scheduledItem.dueDate);
                let nextDue = new Date(currentDue);
                switch (scheduledItem.recurrence) {
                    case RecurrenceType.WEEKLY: nextDue.setDate(currentDue.getDate() + 7); break;
                    case RecurrenceType.MONTHLY: nextDue.setMonth(currentDue.getMonth() + 1); break;
                    case RecurrenceType.YEARLY: nextDue.setFullYear(currentDue.getFullYear() + 1); break;
                }
                updates.due_date = nextDue.toISOString().split('T')[0];
            }
        }

        if (Object.keys(updates).length > 0) {
            await supabase.from('scheduled_transactions').update(updates).eq('id', scheduledId);
        }

        // Log
        await supabaseService.logAction(user, 'UPDATE', 'TRANSACTION', `Baixou agendamento: ${scheduledItem.title}`);
    },

    // --- Budgets ---
    setBudget: async (budget: Budget) => {
        // Upsert based on category_id + church_id unique constraint
        // DB Schema: unique(category_id, church_id)
        // budget has 'id', if unique violation it updates? 
        // We should use upsert.
        const payload = mapToSnake(budget);
        // Ensure we don't send 'id' if we want to rely on conflict? 
        // Or we send ID if it exists.
        // If we are setting a budget, we might not know the ID if it's new but the pair exists.
        // Best is to use onConflict: 'category_id, church_id'.

        await supabase.from('budgets').upsert(payload, { onConflict: 'category_id,church_id' });
    },

    deleteBudget: async (categoryId: string) => {
        await supabase.from('budgets').delete().eq('category_id', categoryId);
    },

    // --- Other CRUD ---
    addCostCenter: async (cc: CostCenter) => {
        const { id, ...payload } = mapToSnake(cc);
        await supabase.from('cost_centers').insert([{ id, ...payload }]);
    },
    updateCostCenter: async (cc: CostCenter) => {
        const { id, ...payload } = mapToSnake(cc);
        await supabase.from('cost_centers').update(payload).eq('id', id);
    },
    deleteCostCenter: async (id: string) => {
        await supabase.from('cost_centers').delete().eq('id', id);
    },

    // --- Funds ---
    addFund: async (f: Fund) => {
        const { id, ...payload } = mapToSnake(f);
        const { error } = await supabase.from('funds').insert([{ id, ...payload }]);
        if (error) throw error;
    },
    updateFund: async (f: Fund) => {
        const { id, ...payload } = mapToSnake(f);
        const { error } = await supabase.from('funds').update(payload).eq('id', id);
        if (error) throw error;
    },
    deleteFund: async (id: string) => {
        const { error } = await supabase.from('funds').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Churches ---
    addChurch: async (c: Church) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('churches').insert([{ id, ...payload }]);
        if (error) throw error;
    },
    updateChurch: async (c: Church) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('churches').update(payload).eq('id', id);
        if (error) throw error;
    },
    deleteChurch: async (id: string) => {
        const { error } = await supabase.from('churches').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Users ---
    updateUser: async (u: User) => {
        const { id, ...payload } = mapToSnake(u);
        const { error } = await supabase.from('users').update(payload).eq('id', id);
        if (error) throw error;
    },
    addUser: async (u: User) => {
        const { id, ...payload } = mapToSnake(u);
        const { error } = await supabase.from('users').insert([{ id, ...payload }]);
        if (error) throw error;
    },
    deleteUser: async (id: string) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    },

    updateCategory: async (c: Category) => {
        const { id, ...payload } = mapToSnake(c);
        const { error } = await supabase.from('categories').update(payload).eq('id', id);
        if (error) throw error;
    },

    // --- Accounting Accounts ---
    addAccountingAccount: async (a: AccountingAccount) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('accounting_accounts').insert([{ id, ...payload }]);
        if (error) throw error;
    },
    updateAccountingAccount: async (a: AccountingAccount) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('accounting_accounts').update(payload).eq('id', id);
        if (error) throw error;
    },
    deleteAccountingAccount: async (id: string) => {
        const { error } = await supabase.from('accounting_accounts').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Assets ---
    addAsset: async (a: Asset) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('assets').insert([{ id, ...payload }]);
        if (error) throw error;
    },
    updateAsset: async (a: Asset) => {
        const { id, ...payload } = mapToSnake(a);
        const { error } = await supabase.from('assets').update(payload).eq('id', id);
        if (error) throw error;
    },
    deleteAsset: async (id: string) => {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    },

    // --- System Reset ---
    resetData: async (options: { transactions: boolean; members: boolean; budgets: boolean; settings: boolean; audit: boolean }) => {
        // Order matters for FK constraints. 
        // 1. Transactions (depend on almost everything)
        if (options.transactions || options.settings) { // Settings reset implies transactions reset
            await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            await supabase.from('scheduled_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // 2. Budgets (depend on Categories)
        if (options.budgets || options.settings) {
            await supabase.from('budgets').delete().neq('id', 0); // Delete all
        }

        // 3. Members
        if (options.members) {
            await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // 4. Settings (Categories, Accounts, etc.) - These are independent of each other mostly, but transactions depend on them.
        if (options.settings) {
            // Delete in safe order or parallel if no inter-dependencies
            await Promise.all([
                supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('cost_centers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('funds').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('accounting_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('asset_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('churches').delete().neq('id', 'ch_hq'), // Keep HQ? Maybe specific policy needed.
            ]);
        }

        // 5. Audit Log
        if (options.audit) {
            await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
    }
};
