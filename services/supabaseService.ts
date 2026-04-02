
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

const defaultChurchId = 'a1af7de1-4415-46e1-b1f2-2bd7ced927f3'; // Sede UUID

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

        // Map Accounts and set legacy offset (do not mutate initialBalance directly)
        const mappedAccounts = mapToCamel<Account[]>(accounts || []).map((acc) => ({
            ...acc,
            legacyBalanceOffset: accountOffsets.get(acc.id) || 0
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
            theme: 'dark', // Default to Dark Mode
            memberRoles: [], // TODO: Persist if needed
            memberCategories: [] // TODO: Persist if needed
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

    getChurch: async (id: string): Promise<Church | null> => {
        const { data, error } = await supabase
            .from('churches')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return mapToCamel<Church>(data);
    },

    // --- Transactions ---
    // --- Transactions ---
    addTransaction: async (t: Transaction) => {
        const { id, ...payload } = mapToSnake(t);
        // Ensure created_by is passed explicitly if mapToSnake doesn't handle it (it should if it's dynamic, but let's be safe or rely on mapToSnake)
        // mapToSnake is dynamic: const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // createdBy -> created_by. So it should work automatically if t has createdBy.
        // However, I need to make sure 't' passed here actually HAS createdBy.
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
        // Unlink any associated transactions first to prevent FK violation
        // This allows deletion of the schedule while keeping the history of payments
        const { error: unlinkError } = await supabase
            .from('transactions')
            .update({ scheduled_id: null })
            .eq('scheduled_id', id);

        if (unlinkError) {
            console.error("Error unlinking transactions:", unlinkError);
            throw unlinkError;
        }

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

    mergeMembers: async (fromId: string, toId: string) => {
        // 1. Move Transactions
        const { error: txError } = await supabase
            .from('transactions')
            .update({ member_or_supplier_id: toId })
            .eq('member_or_supplier_id', fromId);
        if (txError) throw txError;

        // 2. Move Scheduled Transactions (Skipped - field not present in Types)
        /*
        const { error: schError } = await supabase
            .from('scheduled_transactions')
            .update({ member_or_supplier_id: toId }) // Guessing column name
            .eq('member_or_supplier_id', fromId);
        if (schError) throw schError;
        */

        // 3. Update Users linked to this member
        const { error: userError } = await supabase
            .from('users')
            .update({ member_id: toId })
            .eq('member_id', fromId);
        if (userError) throw userError;

        // 4. Update Spouse References
        const { error: spouseError } = await supabase
            .from('members')
            .update({ spouse_id: toId })
            .eq('spouse_id', fromId);
        if (spouseError) throw spouseError;

        // 5. Delete Old Member
        const { error: delError } = await supabase
            .from('members')
            .delete()
            .eq('id', fromId);
        if (delError) throw delError;
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

    // --- Storage ---
    uploadAttachment: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        return data.publicUrl;
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
            related_transaction_id: id2,
            created_by: user?.name
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
            related_transaction_id: id1,
            created_by: user?.name
        };

        await supabase.from('transactions').insert([debit, credit]);
    },

    processScheduledTransaction: async (scheduledId: string, accountId: string, paymentDate: string, user: User | null, activeChurchId?: string) => {
        // 1. Fetch Scheduled Item
        const { data: s, error: fetchError } = await supabase.from('scheduled_transactions').select('*').eq('id', scheduledId).single();
        if (fetchError || !s) {
            console.error('Erro ao buscar agendamento:', fetchError);
            return false;
        }

        const scheduledItem = mapToCamel(s) as ScheduledTransaction & { memberOrSupplierId?: string, memberOrSupplierName?: string };

        // Standardize date to YYYY-MM-DD 12:00:00 to match manual transactions
        const normalizedDate = paymentDate.includes(' ') ? paymentDate : `${paymentDate} 12:00:00`;

        // 2. Create Transaction
        const newTransaction: Partial<Transaction> = {
            date: normalizedDate,
            amount: scheduledItem.amount,
            description: `[Agendado] ${scheduledItem.title}`,
            categoryId: scheduledItem.categoryId,
            costCenterId: scheduledItem.costCenterId,
            fundId: scheduledItem.fundId,
            accountId: accountId,
            type: scheduledItem.type,
            isPaid: true,
            scheduledId: scheduledItem.id,
            churchId: activeChurchId || scheduledItem.churchId || user?.churchId || '',
            attachments: scheduledItem.documentUrl ? [scheduledItem.documentUrl] : [],
            createdBy: user?.id || undefined, // Use ID for consistency with RLS and manual transactions
            memberOrSupplierId: scheduledItem.memberOrSupplierId,
            memberOrSupplierName: scheduledItem.memberOrSupplierName,
        };

        const payload = mapToSnake(newTransaction);

        const { error: insertError } = await supabase.from('transactions').insert([payload]);
        if (insertError) {
            console.error('Erro ao inserir transação do agendamento:', insertError);
            throw new Error(`Erro ao registrar no financeiro: ${insertError.message}`);
        }

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
                const currentDue = new Date(scheduledItem.dueDate + 'T12:00:00');
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
    addUser: async (u: User, plainPassword?: string) => {
        // STRATEGY: Create Auth User using a temporary client to avoid logging out the current admin
        const { createClient } = await import('@supabase/supabase-js');

        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false, // CRITICAL: Do not overwrite current admin session
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        if (!u.email || !plainPassword) throw new Error('Email e senha são obrigatórios para criar usuário.');

        // 1. Create Auth User
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: u.email,
            password: plainPassword,
            options: {
                data: {
                    name: u.name,
                    role: u.role,
                    church_id: u.churchId
                }
            }
        });

        if (authError) {
            console.error("Auth Creation Error:", authError);
            throw new Error(`Erro ao criar login: ${authError.message}`);
        }

        if (!authData.user) throw new Error('Erro inesperado: Usuário não retornado pelo Auth.');

        // 2. Prepare Public Profile
        // We MUST use the ID generated by Auth as the PK for public.users
        const { id, ...payload } = mapToSnake(u);
        const userWithAuthId = {
            ...payload,
            id: authData.user.id, // Override with Auth ID
            // Ensure password isn't stored in plain text in the public table if possible, 
            // but the Type has it. Ideally we store the Hash or null. 
            // The User type passed in probably has the plain password for this operation.
            // Let's store the hash if we have it or just what was passed.
            // The calling component passes a Hash usually, BUT for SignUp we need Plain.
            // So we will change the calling component to pass plain password in a specific way
            // OR we rely on what is passed. 
        };

        const { error } = await supabase.from('users').insert([userWithAuthId]);
        if (error) {
            // Rollback Auth if DB fails? (Hard to do without Admin API, but rare case)
            console.error("Profile Creation Error:", error);
            throw new Error(`Login criado, mas perfil falhou: ${error.message}`);
        }
    },
    deleteUser: async (id: string) => {
        // First delete associated audit logs to avoid Foreign Key constraint violations
        const { error: logError } = await supabase.from('audit_logs').delete().eq('user_id', id);
        if (logError) {
            console.error('Error deleting user audit logs:', logError);
            throw new Error('Falha ao limpar logs do usuário: ' + logError.message);
        }

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
    },

    // --- Seeding ---
    seedStandardData: async (churchId: string) => {
        const genId = () => crypto.randomUUID();

        // 1. Accounts
        const { count: accountCount } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (accountCount === 0) {
            const accounts = [
                { id: genId(), name: 'Sicoob', initial_balance: 0, church_id: churchId, icon: 'Bank' },
                { id: genId(), name: 'CredSIS', initial_balance: 0, church_id: churchId, icon: 'Bank' },
                { id: genId(), name: 'Cora', initial_balance: 0, church_id: churchId, icon: 'Bank' },
                { id: genId(), name: 'Caixa Interna', initial_balance: 0, church_id: churchId, icon: 'Wallet' },
            ];
            await supabase.from('accounts').insert(accounts);
        }

        // 2. Funds
        const { count: fundCount } = await supabase.from('funds').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (fundCount === 0) {
            const funds = [
                { id: genId(), name: 'Fundo Geral', type: 'UNRESTRICTED', church_id: churchId, is_system_default: true },
                { id: genId(), name: 'Construção', type: 'RESTRICTED', church_id: churchId },
                { id: genId(), name: 'Missões', type: 'RESTRICTED', church_id: churchId },
                { id: genId(), name: 'Caixa Pequeno', type: 'UNRESTRICTED', church_id: churchId },
            ];
            await supabase.from('funds').insert(funds);
        }

        // 3. Categories
        const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (catCount === 0) {
            const categories = [
                // Receitas
                { id: genId(), name: 'Dízimos', type: 'INCOME', church_id: churchId, icon: 'TrendingUp' },
                { id: genId(), name: 'Ofertas de Culto', type: 'INCOME', church_id: churchId, icon: 'TrendingUp' },
                { id: genId(), name: 'Ofertas EBD', type: 'INCOME', church_id: churchId, icon: 'BookOpen' },
                { id: genId(), name: 'Ofertas de Missões', type: 'INCOME', church_id: churchId, icon: 'Globe' },
                { id: genId(), name: 'Doações Diversas', type: 'INCOME', church_id: churchId, icon: 'Heart' },
                { id: genId(), name: 'Eventos', type: 'INCOME', church_id: churchId, icon: 'Calendar' },
                // Despesas
                { id: genId(), name: 'Energia Elétrica', type: 'EXPENSE', church_id: churchId, icon: 'Zap' },
                { id: genId(), name: 'Água e Esgoto', type: 'EXPENSE', church_id: churchId, icon: 'Droplet' },
                { id: genId(), name: 'Internet e Telefone', type: 'EXPENSE', church_id: churchId, icon: 'Wifi' },
                { id: genId(), name: 'Aluguel', type: 'EXPENSE', church_id: churchId, icon: 'Home' },
                { id: genId(), name: 'Prebendas Pastorais', type: 'EXPENSE', church_id: churchId, icon: 'User' },
                { id: genId(), name: 'Salários e Encargos', type: 'EXPENSE', church_id: churchId, icon: 'Users' },
                { id: genId(), name: 'Material de Limpeza', type: 'EXPENSE', church_id: churchId, icon: 'ShoppingBag' },
                { id: genId(), name: 'Manutenção Predial', type: 'EXPENSE', church_id: churchId, icon: 'Tool' },
                { id: genId(), name: 'Ceia do Senhor', type: 'EXPENSE', church_id: churchId, icon: 'Coffee' },
                { id: genId(), name: 'Material EBD', type: 'EXPENSE', church_id: churchId, icon: 'Book' },
                { id: genId(), name: 'Evangelismo', type: 'EXPENSE', church_id: churchId, icon: 'Megaphone' },
                { id: genId(), name: 'Combustível', type: 'EXPENSE', church_id: churchId, icon: 'Truck' },
            ];
            await supabase.from('categories').insert(categories);
        }

        // 4. Cost Centers
        const { count: ccCount } = await supabase.from('cost_centers').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (ccCount === 0) {
            const costCenters = [
                { id: genId(), name: 'Geral / Sede', church_id: churchId },
                { id: genId(), name: 'Departamento de Jovens', church_id: churchId },
                { id: genId(), name: 'Departamento Infantil', church_id: churchId },
                { id: genId(), name: 'Departamento de Mulheres', church_id: churchId },
                { id: genId(), name: 'Departamento de Varões', church_id: churchId },
                { id: genId(), name: 'Escola Bíblica', church_id: churchId },
            ];
            await supabase.from('cost_centers').insert(costCenters);
        }

        // 5. Asset Categories
        const { count: acCount } = await supabase.from('asset_categories').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (acCount === 0) {
            const assetCategories = [
                { id: genId(), name: 'Imóveis', church_id: churchId },
                { id: genId(), name: 'Mobiliário', church_id: churchId },
                { id: genId(), name: 'Equipamentos de Som e Vídeo', church_id: churchId },
                { id: genId(), name: 'Instrumentos Musicais', church_id: churchId },
                { id: genId(), name: 'Veículos', church_id: churchId },
                { id: genId(), name: 'Equipamentos de Informática', church_id: churchId },
                { id: genId(), name: 'Utensílios de Cozinha', church_id: churchId },
            ];
            await supabase.from('asset_categories').insert(assetCategories);
        }

        // 6. Accounting Accounts (Plano de Contas Contábil)
        const { count: aaCount } = await supabase.from('accounting_accounts').select('*', { count: 'exact', head: true }).eq('church_id', churchId);
        if (aaCount === 0) {
            const accountingAccounts = [
                // 1. ATIVO
                { id: genId(), code: '1', name: 'ATIVO', type: 'ASSET', level: 1, church_id: churchId },
                { id: genId(), code: '1.1', name: 'CIRCULANTE', type: 'ASSET', level: 2, church_id: churchId },
                { id: genId(), code: '1.1.1', name: 'Caixa e Equivalentes', type: 'ASSET', level: 3, church_id: churchId },

                // 2. PASSIVO
                { id: genId(), code: '2', name: 'PASSIVO', type: 'LIABILITY', level: 1, church_id: churchId },
                { id: genId(), code: '2.1', name: 'CIRCULANTE', type: 'LIABILITY', level: 2, church_id: churchId },
                { id: genId(), code: '2.1.1', name: 'Obrigações Sociais', type: 'LIABILITY', level: 3, church_id: churchId },

                // 3. PATRIMÔNIO SOCIAL
                { id: genId(), code: '3', name: 'PATRIMÔNIO SOCIAL', type: 'EQUITY', level: 1, church_id: churchId },
                { id: genId(), code: '3.1', name: 'Patrimônio Líquido', type: 'EQUITY', level: 2, church_id: churchId },

                // 4. RECEITAS
                { id: genId(), code: '4', name: 'RECEITAS', type: 'INCOME', level: 1, church_id: churchId },
                { id: genId(), code: '4.1', name: 'Receitas Operacionais', type: 'INCOME', level: 2, church_id: churchId },
                { id: genId(), code: '4.1.1', name: 'Dízimos e Ofertas', type: 'INCOME', level: 3, church_id: churchId },

                // 5. DESPESAS
                { id: genId(), code: '5', name: 'DESPESAS', type: 'EXPENSE', level: 1, church_id: churchId },
                { id: genId(), code: '5.1', name: 'Despesas Operacionais', type: 'EXPENSE', level: 2, church_id: churchId },
                { id: genId(), code: '5.1.1', name: 'Pessoal e Encargos', type: 'EXPENSE', level: 3, church_id: churchId },
                { id: genId(), code: '5.1.2', name: 'Utilidades e Serviços', type: 'EXPENSE', level: 3, church_id: churchId },
            ];
            await supabase.from('accounting_accounts').insert(accountingAccounts);
        }
    }
};
