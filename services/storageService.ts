
import { AppData, Transaction, ScheduledTransaction, Category, CostCenter, Account, TransactionType, RecurrenceType, User, UserRole, Member, Church, AuditLog, Budget, Fund, AccountingAccount } from '../types';

const STORAGE_KEY = 'church_finance_mvp_v12'; // Incremented to v12

const genId = () => Math.random().toString(36).substr(2, 9);

const defaultChurch: Church = { 
  id: 'ch_hq', 
  name: 'IGREJA VIDA NA PALAVRA', 
  type: 'HEADQUARTERS',
  login: 'mvpcerejeiras',
  password: 'vida1293',
  cnpj: '43.307.026/0001-90',
  email: 'mvpcerejeiras@gmail.com',
  phone: '(69) 99282-1283',
  address: 'Rua Porto Velho, 1293 – Bairro Alvorada',
  city: 'Cerejeiras',
  state: 'RO',
  zipCode: '76997-000',
  logo: 'https://kakeru-hosting.s3.us-east-1.amazonaws.com/images/1741132792200_d4c00449-9a3b-4396-bd78-8370be7f27ce.png'
};

// -- DEFAULT CHART OF ACCOUNTS (Simplified) --
const defaultAccountingAccounts: AccountingAccount[] = [
  // 1. ATIVO (ASSETS)
  { id: 'acc_101', code: '1.01', name: 'Caixa Geral', type: 'ASSET', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_102', code: '1.02', name: 'Bancos Conta Movimento', type: 'ASSET', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_103', code: '1.03', name: 'Aplicações Financeiras', type: 'ASSET', churchId: defaultChurch.id, isSystemDefault: true },
  
  // 2. PASSIVO (LIABILITIES)
  { id: 'acc_201', code: '2.01', name: 'Fornecedores a Pagar', type: 'LIABILITY', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_202', code: '2.02', name: 'Obrigações Sociais/Fiscais', type: 'LIABILITY', churchId: defaultChurch.id, isSystemDefault: true },

  // 3. PATRIMÔNIO (EQUITY)
  { id: 'acc_301', code: '3.01', name: 'Patrimônio Social', type: 'EQUITY', churchId: defaultChurch.id, isSystemDefault: true },

  // 4. RECEITAS (REVENUE)
  { id: 'acc_401', code: '4.01', name: 'Dízimos', type: 'REVENUE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_402', code: '4.02', name: 'Ofertas', type: 'REVENUE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_403', code: '4.03', name: 'Doações Diversas', type: 'REVENUE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_404', code: '4.04', name: 'Receitas Financeiras', type: 'REVENUE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_409', code: '4.99', name: 'Outras Receitas', type: 'REVENUE', churchId: defaultChurch.id, isSystemDefault: true },

  // 5. DESPESAS (EXPENSES)
  { id: 'acc_501', code: '5.01', name: 'Despesas com Pessoal', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_502', code: '5.02', name: 'Serviços de Terceiros', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_503', code: '5.03', name: 'Materiais de Consumo', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_504', code: '5.04', name: 'Utilidades e Serviços', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_505', code: '5.05', name: 'Manutenção e Reparos', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_506', code: '5.06', name: 'Evangelismo e Missões', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_507', code: '5.07', name: 'Assistência Social', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
  { id: 'acc_509', code: '5.99', name: 'Outras Despesas', type: 'EXPENSE', churchId: defaultChurch.id, isSystemDefault: true },
];

const defaultCategories: Category[] = [
  { id: 'c1', name: 'Dízimos', type: TransactionType.INCOME, churchId: defaultChurch.id, accountingCode: '4.01' },
  { id: 'c2', name: 'Ofertas Específicas', type: TransactionType.INCOME, churchId: defaultChurch.id, accountingCode: '4.02' },
  { id: 'c3', name: 'Ofertas de Culto', type: TransactionType.INCOME, churchId: defaultChurch.id, accountingCode: '4.02' },
  { id: 'c4', name: 'Vendas/Eventos', type: TransactionType.INCOME, churchId: defaultChurch.id, accountingCode: '4.03' },
  { id: 'c5', name: 'Pessoal (Salários/Prebendas)', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.01' },
  { id: 'c6', name: 'Utilidades (Luz, Água, Internet)', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.04' },
  { id: 'c7', name: 'Aluguel/Condomínio', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.04' },
  { id: 'c8', name: 'Material de Consumo/Limpeza', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.03' },
  { id: 'c9', name: 'Manutenção Predial', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.05' },
  { id: 'c10', name: 'Evangelismo e Missões', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.06' },
  { id: 'c11', name: 'Assistência Social', type: TransactionType.EXPENSE, churchId: defaultChurch.id, accountingCode: '5.07' },
];

const defaultCostCenters: CostCenter[] = [
  { id: 'cc1', name: 'Geral / Administrativo', churchId: defaultChurch.id },
  { id: 'cc2', name: 'Ministério Infantil', churchId: defaultChurch.id },
  { id: 'cc3', name: 'Jovens e Adolescentes', churchId: defaultChurch.id },
  { id: 'cc4', name: 'Louvor e Adoração', churchId: defaultChurch.id },
  { id: 'cc5', name: 'Missões e Evangelismo', churchId: defaultChurch.id },
];

const defaultFunds: Fund[] = [
  { id: 'fd_general', name: 'Fundo Geral', type: 'UNRESTRICTED', description: 'Recursos livres para manutenção geral.', churchId: defaultChurch.id },
  { id: 'fd_missions', name: 'Missões', type: 'RESTRICTED', description: 'Recursos exclusivos para missionários e projetos evangelísticos.', churchId: defaultChurch.id },
  { id: 'fd_building', name: 'Construção', type: 'RESTRICTED', description: 'Campanha de reforma e ampliação.', churchId: defaultChurch.id },
  { id: 'fd_social', name: 'Ação Social', type: 'RESTRICTED', description: 'Cestas básicas e auxílio a necessitados.', churchId: defaultChurch.id },
];

const defaultAccounts: Account[] = [
  { id: 'a2', name: 'Sicoob', initialBalance: 0, churchId: defaultChurch.id, accountingCode: '1.02' },
  { id: 'a3', name: 'CrediSIS', initialBalance: 0, churchId: defaultChurch.id, accountingCode: '1.02' },
];

const DEFAULT_PASS_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
const MESSIAS_PASS_HASH = '9250e222c4c71f0c58d4c54b50a880a3127c694c7b1559865d6c2d176903f89c';

const defaultUsers: User[] = [
  { id: 'u1', name: 'Messias', role: UserRole.ADMIN, avatarInitials: 'ME', churchId: defaultChurch.id, password: MESSIAS_PASS_HASH }
];

const getInitialData = (): AppData => ({
  transactions: [],
  scheduled: [],
  categories: defaultCategories,
  costCenters: defaultCostCenters,
  funds: defaultFunds,
  accountingAccounts: defaultAccountingAccounts,
  accounts: defaultAccounts,
  users: defaultUsers,
  members: [],
  churches: [defaultChurch],
  budgets: [],
  auditLogs: [],
  notifications: [],
  theme: 'light',
});

// Helper for audit logging
const createAuditLog = (
  userId: string, 
  userName: string, 
  action: AuditLog['action'], 
  entity: AuditLog['entity'], 
  details: string,
  churchId: string
): AuditLog => ({
  id: genId(),
  date: new Date().toISOString(),
  userId,
  userName,
  action,
  entity,
  details,
  churchId
});

export const storageService = {
  getData: (): AppData => {
    try {
      let dataStr = localStorage.getItem(STORAGE_KEY);
      
      // Migration Logic
      if (!dataStr) {
        const prevKeys = [
          'church_finance_mvp_v11', 'church_finance_mvp_v10',
          'church_finance_mvp_v9', 'church_finance_mvp_v8', 
          'church_finance_mvp_v7', 'church_finance_mvp_v6',
          'church_finance_mvp_v5', 'church_finance_mvp_v4',
          'church_finance_mvp_v3', 'church_finance_mvp_v2'
        ];
        
        for (const key of prevKeys) {
          const val = localStorage.getItem(key);
          if (val) {
            dataStr = val;
            break;
          }
        }
      }

      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        
        // MIGRATION V11: Accounting
        if (!parsed.accountingAccounts || parsed.accountingAccounts.length === 0) {
          parsed.accountingAccounts = defaultAccountingAccounts;
          
          if (parsed.categories) {
            parsed.categories = parsed.categories.map((c: Category) => {
              if (c.accountingCode) return c; 
              
              const lowerName = c.name.toLowerCase();
              let code = '';
              if (c.type === TransactionType.INCOME) {
                 if (lowerName.includes('dízimo')) code = '4.01';
                 else if (lowerName.includes('oferta')) code = '4.02';
                 else code = '4.99';
              } else {
                 if (lowerName.includes('pessoal') || lowerName.includes('salário')) code = '5.01';
                 else if (lowerName.includes('luz') || lowerName.includes('água') || lowerName.includes('internet')) code = '5.04';
                 else if (lowerName.includes('manutenção') || lowerName.includes('reforma')) code = '5.05';
                 else if (lowerName.includes('missões')) code = '5.06';
                 else if (lowerName.includes('social')) code = '5.07';
                 else code = '5.99';
              }
              return { ...c, accountingCode: code };
            });
          }

          if (parsed.accounts) {
            parsed.accounts = parsed.accounts.map((a: Account) => ({
              ...a,
              accountingCode: a.accountingCode || '1.02'
            }));
          }
        }

        // MIGRATION V10: Funds
        if (!parsed.funds || parsed.funds.length === 0) {
          parsed.funds = defaultFunds;
        }

        if (parsed.transactions) {
          parsed.transactions = parsed.transactions.map((t: any) => ({
            ...t,
            fundId: t.fundId || defaultFunds[0].id
          }));
        }

        if (parsed.scheduled) {
          parsed.scheduled = parsed.scheduled.map((s: any) => ({
            ...s,
            fundId: s.fundId || defaultFunds[0].id
          }));
        }

        if (!parsed.budgets) parsed.budgets = [];
        if (!parsed.auditLogs) parsed.auditLogs = [];
        if (!parsed.notifications) parsed.notifications = [];
        if (!parsed.churches || parsed.churches.length === 0) parsed.churches = [defaultChurch];
        if (!parsed.costCenters) parsed.costCenters = defaultCostCenters;

        // Ensure Admin user
        if (parsed.users) {
           let adminFound = false;
           parsed.users = parsed.users.map((u: User) => {
             if (u.id === 'u1' || (u.role === UserRole.ADMIN && !adminFound)) {
                adminFound = true;
                return { ...u, id: 'u1', name: 'Messias', password: MESSIAS_PASS_HASH };
             }
             return u;
           });
           if (!adminFound) parsed.users.push(defaultUsers[0]);
        } else {
          parsed.users = defaultUsers;
        }

        return parsed as AppData;
      }
      return getInitialData();
    } catch (e) {
      console.error("Error reading storage", e);
      return getInitialData();
    }
  },

  saveData: (data: AppData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  clearAll: (): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.clear();
    window.location.reload();
  },

  exportData: (): AppData => {
    const data = storageService.getData();
    storageService.logAction(data.users[0], 'EXPORT', 'SYSTEM', 'Exportou backup completo');
    return data;
  },

  importData: (data: any): boolean => {
    try {
      if (!data.transactions || !data.categories) {
        throw new Error("Formato inválido");
      }
      storageService.saveData(data as AppData);
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- Simulation Data Generator ---
  generateSimulationData: (user: User | null): void => {
    const data = storageService.getData();
    const churchId = data.churches[0].id;
    
    // Ensure accounts exist (use Sicoob/CrediSIS or create if missing)
    let accountId = data.accounts[0]?.id;
    if (!accountId) {
       // If deleted, re-add default
       data.accounts = defaultAccounts;
       accountId = defaultAccounts[0].id;
    }
    
    // Ensure we have categories
    const incomeCats = data.categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCats = data.categories.filter(c => c.type === TransactionType.EXPENSE);
    
    if (incomeCats.length === 0 || expenseCats.length === 0) return;

    const transactions: Transaction[] = [];
    const today = new Date();

    // Helper to format date YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // 15 INCOME Transactions
    const incomeDescriptions = [
      'Dízimo Irmão João', 'Oferta de Culto Domingo', 'Dízimo Maria Silva', 'Oferta Missões', 
      'Venda Cantina', 'Dízimo Pedro', 'Oferta Escola Dominical', 'Doação Anônima',
      'Dízimo Ana', 'Oferta Especial', 'Venda Bazar', 'Dízimo Lucas',
      'Oferta de Gratidão', 'Dízimo Tiago', 'Oferta Culto Jovens'
    ];

    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
      
      transactions.push({
        id: genId(),
        date: formatDate(date),
        amount: Math.floor(Math.random() * 500) + 50, // 50 to 550
        description: incomeDescriptions[i],
        categoryId: incomeCats[Math.floor(Math.random() * incomeCats.length)].id,
        costCenterId: defaultCostCenters[0].id,
        fundId: defaultFunds[0].id, 
        accountId: accountId,
        type: TransactionType.INCOME,
        churchId: churchId,
        isPaid: true,
        attachments: []
      });
    }

    // 12 EXPENSE Transactions
    const expenseDescriptions = [
      'Conta de Luz', 'Conta de Água', 'Internet Fibra', 'Material de Limpeza',
      'Manutenção Ar Condicionado', 'Combustível Pastoral', 'Ajuda de Custo', 'Compra de Copos',
      'Impressão Boletins', 'Lanche das Crianças', 'Corda Violão', 'Manutenção Som'
    ];

    for (let i = 0; i < 12; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - Math.floor(Math.random() * 30));
      
      transactions.push({
        id: genId(),
        date: formatDate(date),
        amount: Math.floor(Math.random() * 300) + 30, // 30 to 330
        description: expenseDescriptions[i],
        categoryId: expenseCats[Math.floor(Math.random() * expenseCats.length)].id,
        costCenterId: defaultCostCenters[0].id,
        fundId: defaultFunds[0].id, 
        accountId: accountId,
        type: TransactionType.EXPENSE,
        churchId: churchId,
        isPaid: true,
        attachments: []
      });
    }

    data.transactions = [...data.transactions, ...transactions];
    storageService.saveData(data);
    storageService.logAction(user, 'CREATE', 'SYSTEM', 'Gerou dados de simulação (15 entradas, 12 saídas)');
  },

  // --- Audit ---
  logAction: (user: User | null, action: AuditLog['action'], entity: AuditLog['entity'], details: string) => {
    if (!user) return;
    const data = storageService.getData();
    const log = createAuditLog(user.id, user.name, action, entity, details, user.churchId);
    data.auditLogs.unshift(log); // Add to top
    
    // Keep log size manageable (last 500)
    if (data.auditLogs.length > 500) {
      data.auditLogs = data.auditLogs.slice(0, 500);
    }
    
    storageService.saveData(data);
  },

  // --- Transactions ---
  addTransaction: (transaction: Transaction, user: User | null): void => {
    const data = storageService.getData();
    data.transactions.push(transaction);
    storageService.saveData(data);
    
    // Log
    const typeLabel = transaction.type === TransactionType.INCOME ? 'Entrada' : 'Saída';
    storageService.logAction(user, 'CREATE', 'TRANSACTION', `Criou ${typeLabel}: ${transaction.description} (${transaction.amount})`);
  },

  updateTransaction: (transaction: Transaction, user: User | null): void => {
    const data = storageService.getData();
    data.transactions = data.transactions.map(t => t.id === transaction.id ? transaction : t);
    storageService.saveData(data);
    storageService.logAction(user, 'UPDATE', 'TRANSACTION', `Atualizou lançamento: ${transaction.description}`);
  },

  // New: Atomic Transfer
  addTransfer: (
    amount: number, 
    fromAccountId: string, 
    toAccountId: string, 
    fundId: string, 
    date: string, 
    description: string, 
    churchId: string, 
    user: User | null
  ): void => {
    const data = storageService.getData();
    const transferId1 = genId();
    const transferId2 = genId();

    const fromAccount = data.accounts.find(a => a.id === fromAccountId);
    const toAccount = data.accounts.find(a => a.id === toAccountId);

    if (!fromAccount || !toAccount) return;

    // 1. Debit (Expense-like) - OUT
    const debit: Transaction = {
      id: transferId1,
      date,
      amount,
      description: `Transferência para ${toAccount.name} - ${description}`,
      accountId: fromAccountId,
      fundId,
      type: TransactionType.TRANSFER, // Using TRANSFER type
      transferDirection: 'OUT',
      isPaid: true,
      churchId,
      attachments: [],
      relatedTransactionId: transferId2
    };

    // 2. Credit (Income-like) - IN
    const credit: Transaction = {
      id: transferId2,
      date,
      amount,
      description: `Transferência de ${fromAccount.name} - ${description}`,
      accountId: toAccountId,
      fundId,
      type: TransactionType.TRANSFER, // Using TRANSFER type
      transferDirection: 'IN',
      isPaid: true,
      churchId,
      attachments: [],
      relatedTransactionId: transferId1
    };

    data.transactions.push(debit, credit);
    storageService.saveData(data);
    
    storageService.logAction(user, 'CREATE', 'TRANSACTION', `Realizou transferência de R$${amount} entre contas`);
  },

  deleteTransaction: (id: string, user: User | null): void => {
    const data = storageService.getData();
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;

    // If it's a transfer, delete both parts
    if (tx.type === TransactionType.TRANSFER && tx.relatedTransactionId) {
      data.transactions = data.transactions.filter(t => t.id !== id && t.id !== tx.relatedTransactionId);
    } else {
      data.transactions = data.transactions.filter(t => t.id !== id);
    }

    storageService.saveData(data);
    storageService.logAction(user, 'DELETE', 'TRANSACTION', `Excluiu lançamento: ${tx.description}`);
  },

  // --- Budgets ---
  setBudget: (budget: Budget, user: User | null): void => {
    const data = storageService.getData();
    const existingIndex = data.budgets.findIndex(b => b.categoryId === budget.categoryId && b.churchId === budget.churchId);
    
    if (existingIndex >= 0) {
      data.budgets[existingIndex] = budget;
      storageService.logAction(user, 'UPDATE', 'BUDGET', `Atualizou orçamento da categoria`);
    } else {
      data.budgets.push(budget);
      storageService.logAction(user, 'CREATE', 'BUDGET', `Definiu novo orçamento`);
    }
    storageService.saveData(data);
  },

  deleteBudget: (categoryId: string, user: User | null): void => {
    const data = storageService.getData();
    data.budgets = data.budgets.filter(b => b.categoryId !== categoryId);
    storageService.saveData(data);
    storageService.logAction(user, 'DELETE', 'BUDGET', `Removeu orçamento`);
  },

  // --- Wrappers for other CRUD with Logging ---
  addCategory: (category: Omit<Category, 'id'>, user: User | null = null): void => {
    const data = storageService.getData();
    const newCat = { ...category, id: genId() };
    data.categories.push(newCat);
    storageService.saveData(data);
    if (user) storageService.logAction(user, 'CREATE', 'CATEGORY', `Criou categoria: ${category.name}`);
  },

  deleteCategory: (id: string, user: User | null = null): void => {
    const data = storageService.getData();
    data.categories = data.categories.filter(c => c.id !== id);
    storageService.saveData(data);
    if (user) storageService.logAction(user, 'DELETE', 'CATEGORY', `Excluiu categoria`);
  },

  addFund: (fund: Omit<Fund, 'id'>) => {
    const data = storageService.getData();
    data.funds.push({ ...fund, id: genId() });
    storageService.saveData(data);
  },
  updateFund: (fund: Fund) => {
    const data = storageService.getData();
    data.funds = data.funds.map(f => f.id === fund.id ? fund : f);
    storageService.saveData(data);
  },
  deleteFund: (id: string) => {
    const data = storageService.getData();
    data.funds = data.funds.filter(f => f.id !== id);
    storageService.saveData(data);
  },

  // --- Accounting Account CRUD ---
  addAccountingAccount: (acc: Omit<AccountingAccount, 'id'>) => {
    const data = storageService.getData();
    data.accountingAccounts.push({ ...acc, id: genId() });
    storageService.saveData(data);
  },
  updateAccountingAccount: (acc: AccountingAccount) => {
    const data = storageService.getData();
    data.accountingAccounts = data.accountingAccounts.map(a => a.id === acc.id ? acc : a);
    storageService.saveData(data);
  },
  deleteAccountingAccount: (id: string) => {
    const data = storageService.getData();
    // Removed system default check to allow deletion of any account
    data.accountingAccounts = data.accountingAccounts.filter(a => a.id !== id);
    storageService.saveData(data);
  },

  addMember: (member: Omit<Member, 'id'>, user: User | null = null): void => {
    const data = storageService.getData();
    const newMember = { ...member, id: genId() };
    data.members.push(newMember);
    storageService.saveData(data);
    if (user) storageService.logAction(user, 'CREATE', 'MEMBER', `Cadastrou membro: ${member.name}`);
  },
  updateMember: (member: Member, user: User | null = null): void => {
    const data = storageService.getData();
    data.members = data.members.map(m => m.id === member.id ? member : m);
    storageService.saveData(data);
    if (user) storageService.logAction(user, 'UPDATE', 'MEMBER', `Atualizou cadastro: ${member.name}`);
  },
  deleteMember: (id: string) => {
    const data = storageService.getData();
    data.members = data.members.filter(m => m.id !== id);
    storageService.saveData(data);
  },

  // --- Scheduled Processing ---
  processScheduledTransaction: (scheduledId: string, accountId: string, paymentDate: string, user: User | null = null): void => {
    const data = storageService.getData();
    const scheduledItem = data.scheduled.find(s => s.id === scheduledId);
    
    if (!scheduledItem) return;

    const newTransaction: Transaction = {
      id: genId(),
      date: paymentDate,
      amount: scheduledItem.amount,
      description: scheduledItem.title,
      categoryId: scheduledItem.categoryId,
      costCenterId: scheduledItem.costCenterId,
      fundId: scheduledItem.fundId,
      accountId: accountId,
      type: scheduledItem.type,
      isPaid: true,
      scheduledId: scheduledItem.id,
      churchId: scheduledItem.churchId,
      attachments: []
    };
    data.transactions.push(newTransaction);

    if (scheduledItem.recurrence === RecurrenceType.NONE) {
      scheduledItem.isActive = false;
    } else {
      // Handle Finite Recurrence (Fixed Quantity)
      let shouldContinue = true;
      if (typeof scheduledItem.occurrences === 'number') {
          if (scheduledItem.occurrences > 1) {
              scheduledItem.occurrences -= 1;
          } else {
              shouldContinue = false;
              scheduledItem.occurrences = 0; // Ensure it shows 0
              scheduledItem.isActive = false;
          }
      }

      if (shouldContinue) {
          const currentDue = new Date(scheduledItem.dueDate);
          let nextDue = new Date(currentDue);
          switch (scheduledItem.recurrence) {
            case RecurrenceType.WEEKLY: nextDue.setDate(currentDue.getDate() + 7); break;
            case RecurrenceType.MONTHLY: nextDue.setMonth(currentDue.getMonth() + 1); break;
            case RecurrenceType.YEARLY: nextDue.setFullYear(currentDue.getFullYear() + 1); break;
          }
          scheduledItem.dueDate = nextDue.toISOString().split('T')[0];
      }
    }

    data.notifications.push({
      id: genId(),
      title: 'Agendamento Realizado',
      message: `O agendamento "${scheduledItem.title}" foi baixado com sucesso.`,
      type: 'SUCCESS',
      read: false,
      date: new Date().toISOString()
    });

    data.scheduled = data.scheduled.map(s => s.id === scheduledId ? scheduledItem : s);
    storageService.saveData(data);
    storageService.logAction(user, 'UPDATE', 'TRANSACTION', `Baixou agendamento: ${scheduledItem.title}`);
  },

  // --- CRUD Stubs for existing calls ---
  addCostCenter: (cc: Omit<CostCenter, 'id'>) => {
    const data = storageService.getData();
    data.costCenters.push({ ...cc, id: genId() });
    storageService.saveData(data);
  },
  updateCostCenter: (cc: CostCenter) => {
    const data = storageService.getData();
    data.costCenters = data.costCenters.map(c => c.id === cc.id ? cc : c);
    storageService.saveData(data);
  },
  deleteCostCenter: (id: string) => {
    const data = storageService.getData();
    data.costCenters = data.costCenters.filter(c => c.id !== id);
    storageService.saveData(data);
  },
  addAccount: (acc: Omit<Account, 'id'>) => {
    const data = storageService.getData();
    data.accounts.push({ ...acc, id: genId() });
    storageService.saveData(data);
  },
  updateAccount: (acc: Account) => {
    const data = storageService.getData();
    data.accounts = data.accounts.map(a => a.id === acc.id ? acc : a);
    storageService.saveData(data);
  },
  deleteAccount: (id: string) => {
    const data = storageService.getData();
    data.accounts = data.accounts.filter(a => a.id !== id);
    storageService.saveData(data);
  },
  addUser: (u: Omit<User, 'id'>) => {
    const data = storageService.getData();
    data.users.push({ ...u, id: genId() });
    storageService.saveData(data);
  },
  updateUser: (u: User) => {
    const data = storageService.getData();
    data.users = data.users.map(user => user.id === u.id ? u : user);
    storageService.saveData(data);
  },
  deleteUser: (id: string) => {
    const data = storageService.getData();
    data.users = data.users.filter(u => u.id !== id);
    storageService.saveData(data);
  },
  addChurch: (c: Omit<Church, 'id'>) => {
    const data = storageService.getData();
    data.churches.push({ ...c, id: genId() });
    storageService.saveData(data);
  },
  updateChurch: (c: Church) => {
    const data = storageService.getData();
    data.churches = data.churches.map(church => church.id === c.id ? c : church);
    storageService.saveData(data);
  },
  deleteChurch: (id: string) => {
    const data = storageService.getData();
    data.churches = data.churches.filter(c => c.id !== id);
    storageService.saveData(data);
  },
  updateCategory: (c: Category) => {
    const data = storageService.getData();
    data.categories = data.categories.map(cat => cat.id === c.id ? c : cat);
    storageService.saveData(data);
  },
  addScheduled: (s: ScheduledTransaction) => {
    const data = storageService.getData();
    data.scheduled.push(s);
    storageService.saveData(data);
  },
  updateScheduled: (s: ScheduledTransaction) => {
    const data = storageService.getData();
    data.scheduled = data.scheduled.map(item => item.id === s.id ? s : item);
    storageService.saveData(data);
  },
  deleteScheduled: (id: string) => {
    const data = storageService.getData();
    data.scheduled = data.scheduled.filter(s => s.id !== id);
    storageService.saveData(data);
  }
};
