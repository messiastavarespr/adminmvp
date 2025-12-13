
import React, { useState, useRef } from 'react';
import { AppData, User, UserRole, TransactionType } from '../types';
import {
    Database, Layers, Building2, Plus, Edit2, Target,
    FileText, CheckCircle, Landmark, Trash2, Image as ImageIcon,
    List, ChevronUp, ChevronDown,
    ShoppingBag, Utensils, Home, Car, Lightbulb, Wifi, Gift, GraduationCap, Plane, Music, Film, Gamepad2, Coffee, Shirt,
    Wallet, Briefcase, Heart, Phone, MapPin, Activity, Zap, Upload, Archive
} from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import ChartOfAccounts from './ChartOfAccounts';
import { ICON_MAP } from './ui/IconMap';

// Reusing types locally for this component
type RegistryTab = 'CATEGORY' | 'ACCOUNT' | 'COST_CENTER' | 'FUND' | 'CHURCH' | 'CHART_OF_ACCOUNTS' | 'ASSET_CATEGORY';

export default function Registries() {
    const {
        data, currentUser,
        addCategory, updateCategory, deleteCategory,
        addAccount, updateAccount, deleteAccount, reorderAccounts,
        addCostCenter, updateCostCenter, deleteCostCenter,
        addFund, updateFund, deleteFund,
        addChurch, updateChurch, deleteChurch,
        addAccountingAccount, updateAccountingAccount, deleteAccountingAccount,
        addAssetCategory, updateAssetCategory, deleteAssetCategory
    } = useFinance();

    const [activeTab, setActiveTab] = useState<RegistryTab>('CHART_OF_ACCOUNTS');

    const [isEditingEntity, setIsEditingEntity] = useState(false);
    const [entityId, setEntityId] = useState<string | null>(null);
    const [entityName, setEntityName] = useState('');

    const [entityType, setEntityType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [entityDesc, setEntityDesc] = useState('');
    const [entityInitialBal, setEntityInitialBal] = useState('');
    const [newCatAccCode, setNewCatAccCode] = useState('');
    const [newAccAccCode, setNewAccAccCode] = useState('');

    // Church Specific States
    const [churchType, setChurchType] = useState<'HEADQUARTERS' | 'BRANCH'>('BRANCH');
    const [fundType, setFundType] = useState<'UNRESTRICTED' | 'RESTRICTED'>('RESTRICTED');
    const [churchCnpj, setChurchCnpj] = useState('');
    const [churchPhone, setChurchPhone] = useState('');
    const [churchEmail, setChurchEmail] = useState('');
    const [churchAddress, setChurchAddress] = useState('');
    const [churchCity, setChurchCity] = useState('');
    const [churchState, setChurchState] = useState('');
    const [churchLogo, setChurchLogo] = useState('');
    const [entityIcon, setEntityIcon] = useState('');
    const logoInputRef = useRef<HTMLInputElement>(null);

    const currentChurchId = currentUser?.churchId || data.churches[0]?.id;

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setChurchLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- DATA HELPERS ---
    const getEntities = () => {
        switch (activeTab) {
            case 'CATEGORY': return data.categories.filter(c => c.churchId === currentChurchId);
            case 'ACCOUNT': return data.accounts.filter(a => a.churchId === currentChurchId).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
            case 'COST_CENTER': return data.costCenters.filter(c => c.churchId === currentChurchId);
            case 'FUND': return data.funds.filter(f => f.churchId === currentChurchId).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
            case 'CHURCH': return data.churches;
            case 'ASSET_CATEGORY': return data.assetCategories?.filter(c => c.churchId === currentChurchId) || [];
            default: return [];
        }
    };

    const entities = getEntities();
    // Accounting Accounts for Selectors
    const revenueAccounts = data.accountingAccounts.filter(a => a.type === 'REVENUE');
    const expenseAccounts = data.accountingAccounts.filter(a => a.type === 'EXPENSE');
    const assetAccounts = data.accountingAccounts.filter(a => a.type === 'ASSET');

    // --- ACTION HANDLERS ---
    const resetForm = () => {
        setEntityId(null);
        setEntityName('');
        setEntityInitialBal('');
        setEntityDesc('');
        setNewCatAccCode('');
        setNewAccAccCode('');
        setChurchCnpj('');
        setChurchPhone('');
        setChurchEmail('');
        setChurchAddress('');
        setChurchCity('');
        setChurchState('');
        setChurchLogo('');
        setChurchLogo('');
        setChurchType('BRANCH');
        setFundType('RESTRICTED');
        setEntityIcon('');
        setIsEditingEntity(false);
    };

    const startEdit = (item: any) => {
        setEntityId(item.id);
        setEntityName(item.name);

        if (activeTab === 'CATEGORY') {
            setEntityType(item.type);
            setNewCatAccCode(item.accountingCode || '');
        }
        if (activeTab === 'ACCOUNT') {
            setEntityInitialBal(item.initialBalance?.toString() || '0');
            setNewAccAccCode(item.accountingCode || '');
        }
        if (activeTab === 'FUND') {
            setEntityDesc(item.description || '');
            setFundType(item.type || 'RESTRICTED');
        }

        if (activeTab === 'CHURCH') {
            setChurchType(item.type);
            setChurchLogo(item.logo || '');
            setChurchCnpj(item.cnpj || '');
            setChurchPhone(item.phone || '');
            setChurchEmail(item.email || '');
            setChurchAddress(item.address || '');
            setChurchCity(item.city || '');
            setChurchState(item.state || '');
        }

        if (activeTab === 'ASSET_CATEGORY') {
            // Nothing special for now
        }

        setEntityIcon(item.icon || item.image || ''); // Support legacy image prop
        setIsEditingEntity(true);
    };

    const handleDeleteEntity = async (id: string) => {
        if (!window.confirm('Tem certeza?')) return;
        if (activeTab === 'CATEGORY') await deleteCategory(id);
        if (activeTab === 'ACCOUNT') await deleteAccount(id);
        if (activeTab === 'COST_CENTER') await deleteCostCenter(id);
        if (activeTab === 'FUND') await deleteFund(id);
        if (activeTab === 'CHURCH') await deleteChurch(id);
        if (activeTab === 'ASSET_CATEGORY') await deleteAssetCategory(id);
    };

    const handleMoveFund = async (index: number, direction: 'UP' | 'DOWN') => {
        const sortedFunds = [...entities]; // Copy current sorted list
        if (direction === 'UP' && index === 0) return;
        if (direction === 'DOWN' && index === sortedFunds.length - 1) return;

        const otherIndex = direction === 'UP' ? index - 1 : index + 1;

        // Swap in array
        const temp = sortedFunds[index];
        sortedFunds[index] = sortedFunds[otherIndex];
        sortedFunds[otherIndex] = temp;

        // Update ALL funds with new order derived from index
        // This ensures the order is always clean and sequential (0, 1, 2...)
        // We only await the updates that actually changed to save bandwidth, 
        // but given the small list size, updating all or just the swapped ones is fine.
        // For 100% robustness, let's update all that have a diff order.

        for (let i = 0; i < sortedFunds.length; i++) {
            const fund = sortedFunds[i];
            if (fund.order !== i) {
                await updateFund({ ...fund, order: i });
            }
        }
    };

    const handleMoveAccount = async (index: number, direction: 'up' | 'down') => {
        const sortedAccounts = [...getEntities()];
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sortedAccounts.length - 1) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = sortedAccounts[index];
        sortedAccounts[index] = sortedAccounts[otherIndex];
        sortedAccounts[otherIndex] = temp;

        const updates: any[] = [];
        for (let i = 0; i < sortedAccounts.length; i++) {
            if ((sortedAccounts[i].order ?? -1) !== i) {
                const updated = { ...sortedAccounts[i], order: i };
                updates.push(updated);
            }
        }

        if (updates.length > 0) {
            await reorderAccounts(updates);
        }
    };




    const handleSaveEntity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entityName.trim()) return;

        try {
            const genId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

            if (activeTab === 'CATEGORY') {
                const cat: any = { id: entityId || genId(), name: entityName, type: entityType, churchId: currentChurchId!, accountingCode: newCatAccCode, icon: entityIcon };
                if (entityId) await updateCategory(cat); else await addCategory(cat);
            } else if (activeTab === 'ACCOUNT') {
                const acc: any = { id: entityId || genId(), name: entityName, initialBalance: parseFloat(entityInitialBal) || 0, churchId: currentChurchId!, accountingCode: newAccAccCode || '1.02', icon: entityIcon };
                if (entityId) await updateAccount(acc); else await addAccount(acc);
            } else if (activeTab === 'COST_CENTER') {
                const cc: any = { id: entityId || genId(), name: entityName, churchId: currentChurchId! };
                if (entityId) await updateCostCenter(cc); else await addCostCenter(cc);
            } else if (activeTab === 'FUND') {
                const fund: any = { id: entityId || genId(), name: entityName, description: entityDesc, type: fundType, churchId: currentChurchId! };
                if (entityId) await updateFund(fund); else await addFund(fund);
            } else if (activeTab === 'CHURCH') {
                const churchData: any = {
                    id: entityId || genId(),
                    name: entityName, type: churchType, logo: churchLogo,
                    cnpj: churchCnpj, phone: churchPhone, email: churchEmail,
                    address: churchAddress, city: churchCity, state: churchState
                };
                if (entityId) await updateChurch(churchData); else await addChurch(churchData);
            } else if (activeTab === 'ASSET_CATEGORY') {
                const ac: any = { id: entityId || genId(), name: entityName, churchId: currentChurchId! };
                if (entityId) await updateAssetCategory(ac); else await addAssetCategory(ac);
            }

            resetForm();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar o registro.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4 lg:p-6 flex flex-col gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Database className="text-blue-600" /> Cadastros
                </h1>

                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto custom-scrollbar gap-1">
                    <TabButton active={activeTab === 'CHART_OF_ACCOUNTS'} onClick={() => setActiveTab('CHART_OF_ACCOUNTS')} icon={List} label="Plano de Contas" />
                    <TabButton active={activeTab === 'CATEGORY'} onClick={() => { setActiveTab('CATEGORY'); resetForm(); }} icon={FileText} label="Categorias" />
                    <TabButton active={activeTab === 'ACCOUNT'} onClick={() => { setActiveTab('ACCOUNT'); resetForm(); }} icon={Landmark} label="Contas / Bancos" />
                    <TabButton active={activeTab === 'COST_CENTER'} onClick={() => { setActiveTab('COST_CENTER'); resetForm(); }} icon={Layers} label="Centros de Custo" />
                    <TabButton active={activeTab === 'FUND'} onClick={() => { setActiveTab('FUND'); resetForm(); }} icon={Target} label="Fundos / Projetos" />
                    <TabButton active={activeTab === 'CHURCH'} onClick={() => { setActiveTab('CHURCH'); resetForm(); }} icon={Building2} label="Igrejas" />
                    <TabButton active={activeTab === 'ASSET_CATEGORY'} onClick={() => { setActiveTab('ASSET_CATEGORY'); resetForm(); }} icon={Archive} label="Categorias Patrimônio" />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">

                {activeTab === 'CHART_OF_ACCOUNTS' ? (
                    <ChartOfAccounts /> // Reusing the powerful component we just built
                ) : (

                    // Standard CRUD Interface for other Entities
                    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                    {activeTab === 'CATEGORY' ? 'Categorias de Receitas e Despesas' :
                                        activeTab === 'ACCOUNT' ? 'Contas Bancárias e Caixas' :
                                            activeTab === 'COST_CENTER' ? 'Centros de Custo / Departamentos' :
                                                activeTab === 'FUND' ? 'Projetos e Fundos Especiais' :
                                                    activeTab === 'ASSET_CATEGORY' ? 'Categorias de Patrimônio' : 'Igrejas e Congregações'}
                                </h2>
                                {!isEditingEntity && (
                                    <button onClick={() => setIsEditingEntity(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
                                        <Plus size={16} /> Novo Registro
                                    </button>
                                )}
                            </div>

                            {isEditingEntity ? (
                                <form onSubmit={handleSaveEntity} className="bg-gray-50 dark:bg-slate-700/30 p-6 rounded-xl border border-gray-200 dark:border-slate-600">
                                    <div className="grid grid-cols-1 gap-4">

                                        {/* --- FORM FIELDS START --- */}

                                        {/* CHURCH Fields */}
                                        {activeTab === 'CHURCH' && (
                                            <div className="mb-4 space-y-4">
                                                <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                                                    <div
                                                        onClick={() => logoInputRef.current?.click()}
                                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors relative overflow-hidden group bg-gray-50 dark:bg-slate-700"
                                                    >
                                                        {churchLogo ? (
                                                            <img src={churchLogo} alt="Logo" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="text-gray-400" size={24} />
                                                        )}
                                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">Logo da Instituição</p>
                                                        <p className="text-xs text-gray-500">Usado em relatórios e cabeçalho.</p>
                                                        {churchLogo && <button type="button" onClick={() => setChurchLogo('')} className="text-xs text-red-500 underline mt-1">Remover</button>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Input label="Nome da Igreja *" value={entityName} onChange={e => setEntityName(e.target.value)} autoFocus />
                                                    <Select label="Tipo" value={churchType} onChange={e => setChurchType(e.target.value as any)}>
                                                        <option value="BRANCH">Congregação / Filial</option>
                                                        <option value="HEADQUARTERS">Sede / Matriz</option>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Input label="CNPJ" value={churchCnpj} onChange={e => setChurchCnpj(e.target.value)} />
                                                    <Input label="Telefone" value={churchPhone} onChange={e => setChurchPhone(e.target.value)} />
                                                </div>
                                                <Input label="Email" value={churchEmail} onChange={e => setChurchEmail(e.target.value)} type="email" />
                                                <Input label="Endereço" value={churchAddress} onChange={e => setChurchAddress(e.target.value)} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="Cidade" value={churchCity} onChange={e => setChurchCity(e.target.value)} />
                                                    <Input label="UF" value={churchState} onChange={e => setChurchState(e.target.value)} maxLength={2} />
                                                </div>
                                            </div>
                                        )}

                                        {/* GENERIC NAME Field (Excluded for Church as it has custom layout above) */}
                                        {activeTab !== 'CHURCH' && (
                                            <Input label="Nome do Registro *" value={entityName} onChange={e => setEntityName(e.target.value)} autoFocus />
                                        )}

                                        {(activeTab === 'CATEGORY' || activeTab === 'ACCOUNT') && (
                                            <IconSelector selected={entityIcon} onSelect={setEntityIcon} />
                                        )}

                                        {/* DATA SPECIFIC Fields */}
                                        {activeTab === 'CATEGORY' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo de Movimentação</label>
                                                    <div className="flex gap-4 p-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" checked={entityType === TransactionType.INCOME} onChange={() => setEntityType(TransactionType.INCOME)} className="text-blue-600" />
                                                            <span className="text-sm font-medium">Entrada (Receita)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" checked={entityType === TransactionType.EXPENSE} onChange={() => setEntityType(TransactionType.EXPENSE)} className="text-blue-600" />
                                                            <span className="text-sm font-medium">Saída (Despesa)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Vínculo Contábil (Opcional)</label>
                                                    <select
                                                        value={newCatAccCode}
                                                        onChange={(e) => setNewCatAccCode(e.target.value)}
                                                        className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                                                    >
                                                        <option value="">-- Sem Vínculo --</option>
                                                        {(entityType === TransactionType.INCOME ? revenueAccounts : expenseAccounts).map(acc => (
                                                            <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'ACCOUNT' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input label="Saldo Inicial (R$)" type="number" step="0.01" value={entityInitialBal} onChange={e => setEntityInitialBal(e.target.value)} />
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Conta Ativo Vinculada</label>
                                                    <select
                                                        value={newAccAccCode}
                                                        onChange={(e) => setNewAccAccCode(e.target.value)}
                                                        className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                                                    >
                                                        <option value="">-- Selecione --</option>
                                                        {assetAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'FUND' && (
                                            <>
                                                <Input label="Descrição / Finalidade" value={entityDesc} onChange={e => setEntityDesc(e.target.value)} placeholder="Ex: Arrecadação para reforma do telhado" />
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo de Fundo</label>
                                                    <div className="flex gap-4 p-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" checked={fundType === 'UNRESTRICTED'} onChange={() => setFundType('UNRESTRICTED')} className="text-blue-600" />
                                                            <span className="text-sm font-medium">Geral / Livre (Caixa Comum)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" checked={fundType === 'RESTRICTED'} onChange={() => setFundType('RESTRICTED')} className="text-blue-600" />
                                                            <span className="text-sm font-medium">Restrito (Projeto Específico)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* --- FORM FIELDS END --- */}

                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                                        <button type="button" onClick={resetForm} className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                                        <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"><CheckCircle size={16} /> Salvar Registro</button>
                                    </div>
                                </form>
                            ) : (
                                // LIST VIEW
                                activeTab === 'CATEGORY' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* INCOME COLUMN */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg flex items-center justify-between border border-green-100 dark:border-green-900/30">
                                                <span>Entradas (Receitas)</span>
                                                <span className="text-xs bg-white dark:bg-green-900/40 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800 shadow-sm text-green-700 dark:text-green-400">
                                                    {entities.filter((e: any) => e.type === 'INCOME').length}
                                                </span>
                                            </h3>
                                            <div className="space-y-2">
                                                {entities.filter((e: any) => e.type === 'INCOME').map((item: any) => (
                                                    <div key={item.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all">
                                                        <div className="flex items-center">
                                                            {(item.icon || item.image) && (
                                                                <div className="mr-3 w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {ICON_MAP[item.icon || item.image] ? (
                                                                        React.createElement(ICON_MAP[item.icon || item.image], { size: 18 })
                                                                    ) : (
                                                                        <img src={item.icon || item.image} className="w-full h-full object-cover" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</div>
                                                                {item.accountingCode && (
                                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                                        <List size={10} /> {item.accountingCode}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteEntity(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {entities.filter((e: any) => e.type === 'INCOME').length === 0 && (
                                                    <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">None registered</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* EXPENSE COLUMN */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center justify-between border border-red-100 dark:border-red-900/30">
                                                <span>Saídas (Despesas)</span>
                                                <span className="text-xs bg-white dark:bg-red-900/40 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800 shadow-sm text-red-700 dark:text-red-400">
                                                    {entities.filter((e: any) => e.type === 'EXPENSE').length}
                                                </span>
                                            </h3>
                                            <div className="space-y-2">
                                                {entities.filter((e: any) => e.type === 'EXPENSE').map((item: any) => (
                                                    <div key={item.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-800 transition-all">
                                                        <div className="flex items-center">
                                                            {(item.icon || item.image) && (
                                                                <div className="mr-3 w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {ICON_MAP[item.icon || item.image] ? (
                                                                        React.createElement(ICON_MAP[item.icon || item.image], { size: 18 })
                                                                    ) : (
                                                                        <img src={item.icon || item.image} className="w-full h-full object-cover" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</div>
                                                                {item.accountingCode && (
                                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                                        <List size={10} /> {item.accountingCode}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteEntity(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {entities.filter((e: any) => e.type === 'EXPENSE').length === 0 && (
                                                    <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">None registered</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {entities.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                                                    <Database size={24} className="opacity-50" />
                                                </div>
                                                <p className="text-sm font-medium">Nenhum registro encontrado.</p>
                                                <p className="text-xs mt-1">Clique em "Novo Registro" para começar.</p>
                                            </div>
                                        ) : (
                                            entities.map((item: any, index: number) => (
                                                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50 dark:hover:bg-slate-700/30 px-2 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        {activeTab === 'FUND' && (
                                                            <div className="flex flex-col gap-1 mr-2">
                                                                <button
                                                                    onClick={() => handleMoveFund(index, 'UP')}
                                                                    disabled={index === 0}
                                                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronUp size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveFund(index, 'DOWN')}
                                                                    disabled={index === entities.length - 1}
                                                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {activeTab === 'ACCOUNT' && (
                                                            <div className="flex flex-col gap-1 mr-2">
                                                                <button
                                                                    onClick={() => handleMoveAccount(index, 'up')}
                                                                    disabled={index === 0}
                                                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronUp size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveAccount(index, 'down')}
                                                                    disabled={index === entities.length - 1}
                                                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                                            {activeTab === 'CHURCH' && item.logo ? (
                                                                <img src={item.logo} className="w-full h-full object-cover" />
                                                            ) : (item.icon || item.image) ? (
                                                                ICON_MAP[item.icon || item.image] ? (
                                                                    React.createElement(ICON_MAP[item.icon || item.image], { size: 20 })
                                                                ) : (
                                                                    <img src={item.icon || item.image} className="w-full h-full object-cover" />
                                                                )
                                                            ) : (
                                                                item.name.substring(0, 2).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
                                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                                                                {activeTab === 'ACCOUNT' && `Saldo Inicial: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.initialBalance)}`}
                                                                {activeTab === 'FUND' && (
                                                                    <>
                                                                        <span className={`px-1.5 py-0.5 rounded ${item.type === 'UNRESTRICTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {item.type === 'UNRESTRICTED' ? 'Geral / Livre' : 'Restrito'}
                                                                        </span>
                                                                        {item.description}
                                                                    </>
                                                                )}
                                                                {activeTab === 'CHURCH' && (
                                                                    <span className={`px-1.5 py-0.5 rounded ${item.type === 'HEADQUARTERS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        {item.type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow transition-all"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteEntity(item.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow transition-all"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// UI Components
const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${active
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
    >
        <Icon size={16} /> {label}
    </button>
);

const Input = ({ label, ...props }: any) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <input
            className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
            {...props}
        />
    </div>
);

const Select = ({ label, children, ...props }: any) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <select
            className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
            {...props}
        >
            {children}
        </select>
    </div>
);

const IconSelector = ({ selected, onSelect }: { selected: string; onSelect: (icon: string) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const icons = [
        'Wallet', 'Landmark', 'Briefcase', 'Building2', 'PiggyBank', 'CreditCard', // Finance
        'ShoppingBag', 'Utensils', 'Home', 'Car', 'Lightbulb', 'Wifi', 'Phone', 'Shirt', // Expenses
        'Gift', 'GraduationCap', 'Plane', 'Music', 'Film', 'Gamepad2', 'Coffee', 'Heart', // Leisure/Misc
        'Target', 'MapPin', 'Activity', 'Zap', 'Database', 'FileText', 'Layers', 'CheckCircle' // System
    ];

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 50 * 1024) { // 50KB limit
                alert("A imagem deve ter no máximo 50KB para ser usada como ícone. Por favor, escolha uma imagem menor.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => onSelect(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const isCustom = selected && !ICON_MAP[selected];

    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Ícone (Opcional)</label>
            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600 max-h-40 overflow-y-auto custom-scrollbar">

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg transition-all border border-dashed border-gray-300 dark:border-slate-500 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Upload Personalizado"
                >
                    <Upload size={20} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />

                {isCustom && (
                    <button
                        type="button"
                        className="p-1 rounded-lg bg-blue-600 text-white shadow-md scale-110 overflow-hidden w-9 h-9 flex items-center justify-center"
                        title="Ícone Personalizado"
                    >
                        <img src={selected} className="w-full h-full object-cover rounded" />
                    </button>
                )}

                {icons.map(iconName => {
                    const Icon = ICON_MAP[iconName];
                    if (!Icon) return null;
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onSelect(iconName)}
                            className={`p-2 rounded-lg transition-all ${selected === iconName
                                ? 'bg-blue-600 text-white shadow-md scale-110'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:scale-105'
                                }`}
                            title={iconName}
                        >
                            <Icon size={20} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
