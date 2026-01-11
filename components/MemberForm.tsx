import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { Save, X, User, MapPin, Church, Phone, FileText, Heart, Camera, Plus, Trash2, Settings, Upload } from './ui/Icons';
import ErrorMessage from './ui/ErrorMessage';
import MemberSelect from './ui/MemberSelect';
import DataListManager from './ui/DataListManager';

interface MemberFormProps {
    member?: Member | null;
    type: 'MEMBER' | 'SUPPLIER' | 'VISITOR'; // Type to initialize with if new
    onClose: () => void;
    onSuccess: () => void;
    currentChurchId: string;
    initialValues?: Partial<Member>; // New prop for manual initialization
    onSaved?: (member: Member) => void; // New prop to capture created member
}

type TabType = 'BASIC' | 'PERSONAL' | 'ECCLESIASTICAL' | 'FAMILY';

// Helper Component for Children List... (ChildListManager code omitted for brevity as it is unchanged, but tool requires contiguous block if I don't select carefuly. I will try to target specific blocks or replace the component definition and main body separately if needed. 
// Actually, to be safe and clean, I will just update the props interface first, then the specific "Family" tab section, and finally the state logic.)

// WAIT. replace_file_content requires SINGLE CONTIGUOUS BLOCK. 
// I have changes in:
// 1. Interface definition (top)
// 2. Component signature (top)
// 3. State (top)
// 4. Family Tab (middle/bottom)
// 5. Render of nested modal (bottom, outside main div or absolute)

// This spans the whole file. I should use `multi_replace_file_content` or make targeted `replace_file_content` calls. 
// Since I can't use multi_replace in this turn alongside others easily if I want to be precise? Actually I can.
// But the prompt says "Do NOT make multiple parallel calls to this tool... for the same file."
// So I will use `multi_replace_file_content`.


// Helper Component for Children List
const ChildListManager: React.FC<{ value?: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    // Parse initial value: try JSON, else treat as text description (legacy support)
    const [mode, setMode] = useState<'LIST' | 'TEXT'>('LIST');
    const [childrenList, setChildrenList] = useState<{ id: string, name: string, memberId?: string, birthDate?: string }[]>([]);
    const [legacyText, setLegacyText] = useState('');

    useEffect(() => {
        if (!value) {
            setChildrenList([]);
            return;
        }
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                setChildrenList(parsed);
                setMode('LIST');
            } else {
                setLegacyText(value);
                setMode('TEXT');
            }
        } catch (e) {
            setLegacyText(value);
            setMode('TEXT');
        }
    }, []); // Run once on mount to init, avoiding loop if we update parent. 
    // Actually we should sync BUT we are controlling the parent.
    // Let's rely on internal state and just push updates up.

    const updateParent = (list: typeof childrenList) => {
        onChange(JSON.stringify(list));
    };

    const handleAddChild = () => {
        const newChild = { id: crypto.randomUUID(), name: '' };
        const newList = [...childrenList, newChild];
        setChildrenList(newList);
        updateParent(newList);
    };

    const handleRemoveChild = (id: string) => {
        const newList = childrenList.filter(c => c.id !== id);
        setChildrenList(newList);
        updateParent(newList);
    };

    const handleUpdateChild = (id: string, field: string, val: string) => {
        const newList = childrenList.map(c => c.id === id ? { ...c, [field]: val } : c);
        setChildrenList(newList);
        updateParent(newList);
    };

    // Switch to manual text mode
    if (mode === 'TEXT') {
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Filhos (Descrição)</label>
                    <button onClick={() => { setMode('LIST'); setChildrenList([]); onChange('[]'); }} className="text-xs text-blue-500 hover:underline">
                        Mudar para Lista Avançada
                    </button>
                </div>
                <textarea
                    rows={4}
                    value={legacyText}
                    onChange={e => { setLegacyText(e.target.value); onChange(e.target.value); }}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Filhos</label>
                <button onClick={handleAddChild} type="button" className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                    <Plus size={14} /> Adicionar Filho
                </button>
            </div>

            {childrenList.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    Nenhum filho cadastrado.
                </div>
            )}

            <div className="space-y-2">
                {childrenList.map((child, index) => (
                    <div key={child.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-700 flex gap-3 items-start animate-in slide-in-from-bottom-2">
                        <span className="text-xs text-gray-400 mt-2.5">#{index + 1}</span>
                        <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Nome do Filho"
                                        value={child.name}
                                        onChange={e => handleUpdateChild(child.id, 'name', e.target.value)}
                                        className="w-full p-2 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <input
                                        type="date"
                                        value={child.birthDate || ''}
                                        onChange={e => handleUpdateChild(child.id, 'birthDate', e.target.value)}
                                        className="w-full p-2 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Linked Member Selection for Child */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 uppercase font-bold whitespace-nowrap">Vínculo:</span>
                                <div className="flex-1">
                                    <MemberSelect
                                        selectedId={child.memberId}
                                        onSelect={(id, name) => {
                                            const newList = childrenList.map(c => c.id === child.id ? { ...c, memberId: id, name: name || c.name } : c);
                                            setChildrenList(newList);
                                            updateParent(newList);
                                        }}
                                        placeholder="Buscar cadastro (opcional)..."
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleRemoveChild(child.id)} type="button" className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MemberForm: React.FC<MemberFormProps> = ({ member, type: initialType, onClose, onSuccess, currentChurchId, initialValues, onSaved }) => {
    const { addMember, updateMember, data, addMemberRole, removeMemberRole, updateMemberRole, addMemberCategory, removeMemberCategory, updateMemberCategory } = useFinance();
    const [activeTab, setActiveTab] = useState<TabType>('BASIC');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    // Quick Spouse Creation State
    const [showSpouseModal, setShowSpouseModal] = useState(false);

    // List Manager State
    const [managingList, setManagingList] = useState<'ROLES' | 'CATEGORIES' | null>(null);

    const defaultFormValues: Partial<Member> = {
        type: 'MEMBER',
        status: 'ACTIVE',
        churchId: currentChurchId,
        name: '',
        email: '',
        phone: '',
        address: '',
        addressNumber: '',
        city: '',
        state: '',
        birthDate: '', // Date string
        document: '',
        rg: '',
        documentIssuer: '',
        nationality: 'Brasileira',
        naturalness: '',
        profession: '',
        educationLevel: '',
        photoUrl: '',
        spouseId: null,
        weddingDate: '',
        children: '',
        fatherName: '',
        motherName: '',
        previousChurch: '',
        conversionDate: '',
        baptismHolySpirit: false,
        entryMethod: '',
        exitDate: '',
        exitReason: ''
    };

    // Form State
    const [formData, setFormData] = useState<Partial<Member>>({
        ...defaultFormValues,
        type: initialType
    });

    useEffect(() => {
        if (member) {
            // Apply defaults to ensure we clear previous state for missing keys
            setFormData({ ...defaultFormValues, ...member });
        } else if (initialValues) {
            setFormData(prev => ({ ...defaultFormValues, ...initialValues, type: initialType }));
        } else {
            setFormData({ ...defaultFormValues, type: initialType });
        }
    }, [member, initialType, initialValues]);

    const handleChange = (field: keyof Member, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        // 1. Validate Name
        if (!formData.name?.trim()) {
            newErrors.name = 'Nome é obrigatório.';
        } else {
            // Check for duplicate name (normalizing spaces)
            const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
            const normalizedName = normalize(formData.name);

            const duplicateName = data.members?.find(m =>
                m.id !== formData.id && // Exclude self
                normalize(m.name) === normalizedName
            );

            if (duplicateName) {
                newErrors.name = 'Já existe um membro cadastrado com este nome.';
            }
        }

        // 2. Validate Document (CPF)
        if (formData.type === 'SUPPLIER' && formData.document) {
            const cleanDoc = formData.document.replace(/\D/g, '');
            if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
                newErrors.document = 'Documento inválido (CPF ou CNPJ).';
            }
        }

        // Check for duplicate document if present (for any type)
        if (formData.document) {
            const duplicateDoc = data.members?.find(m =>
                m.id !== formData.id && // Exclude self
                m.document === formData.document
            );
            if (duplicateDoc) {
                newErrors.document = 'Já existe um cadastro com este CPF/CNPJ.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);

        try {
            // Sanitize Strings: Empty date strings "" cause PG error "invalid input syntax for type date"
            const sanitize = (val: any) => (val === '' ? null : val);

            const dataToSave = {
                ...formData,
                birthDate: sanitize(formData.birthDate),
                weddingDate: sanitize(formData.weddingDate),
                conversionDate: sanitize(formData.conversionDate),
                baptismDate: sanitize(formData.baptismDate),
                exitDate: sanitize(formData.exitDate)
            } as Member;

            // Auto-generate ID if missing (for new records)
            if (!dataToSave.id) {
                dataToSave.id = crypto.randomUUID();
            }

            if (member?.id) {
                await updateMember(dataToSave);
            } else {
                await addMember(dataToSave);
            }

            if (onSaved) {
                onSaved(dataToSave);
            } else {
                onSuccess();
            }
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao salvar: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const isMember = formData.type === 'MEMBER';

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('photoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {member ? 'Editar Cadastro' : 'Novo Cadastro'}
                            <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                                {formData.type === 'MEMBER' ? 'Membro' : formData.type === 'VISITOR' ? 'Visitante' : 'Fornecedor'}
                            </span>
                        </h2>

                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs (Only for Members) */}
                {isMember && (
                    <div className="flex border-b border-gray-100 dark:border-slate-700 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('BASIC')}
                            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'BASIC' ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                            <User size={16} /> Dados Básicos
                        </button>
                        <button
                            onClick={() => setActiveTab('PERSONAL')}
                            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'PERSONAL' ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                            <FileText size={16} /> Pessoais e Doc.
                        </button>
                        <button
                            onClick={() => setActiveTab('ECCLESIASTICAL')}
                            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'ECCLESIASTICAL' ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                            <Church size={16} /> Eclesiástico
                        </button>
                        <button
                            onClick={() => setActiveTab('FAMILY')}
                            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'FAMILY' ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                            <Heart size={16} /> Família
                        </button>
                    </div>
                )}

                {/* Form Content */}
                <div className="p-6 space-y-6 flex-1">

                    {/* TAB: BASIC (Always visible or if active) */}
                    {(activeTab === 'BASIC' || !isMember) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-300">
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className={`w-full p-2.5 rounded-lg border ${errors.name ? 'border-rose-500' : 'border-gray-200 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
                                    autoFocus
                                />
                                <ErrorMessage message={errors.name} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo de Cadastro</label>
                                <div className="flex p-1 bg-gray-100 dark:bg-slate-700/50 rounded-lg gap-1 border border-gray-200 dark:border-slate-600">
                                    {['MEMBER', 'VISITOR', 'SUPPLIER'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleChange('type', t)}
                                            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${formData.type === t
                                                ? 'bg-emerald-500 text-white shadow-sm scale-[1.02]'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                                }`}
                                        >
                                            {t === 'MEMBER' && <User size={16} />}
                                            {t === 'VISITOR' && <Heart size={16} />}
                                            {t === 'SUPPLIER' && <FileText size={16} />}
                                            {t === 'MEMBER' ? 'Membro' : t === 'VISITOR' ? 'Visitante' : 'Fornecedor'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                {formData.type === 'SUPPLIER' ? (
                                    <>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CNPJ</label>
                                        <input
                                            type="text"
                                            value={formData.document || ''}
                                            onChange={e => handleChange('document', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Categoria de Membro</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={formData.category || ''}
                                                onChange={e => handleChange('category', e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                            >
                                                <option value="">Selecione...</option>
                                                {(data.memberCategories || []).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setManagingList('CATEGORIES')}
                                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                                title="Gerenciar Categorias"
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                <select
                                    value={formData.status || 'ACTIVE'}
                                    onChange={e => handleChange('status', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                >
                                    <option value="ACTIVE">Ativo</option>
                                    <option value="INACTIVE">Inativo</option>
                                    <option value="OBSERVATION">Em Observação</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    onChange={e => handleChange('phone', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="col-span-full border-t border-gray-100 dark:border-slate-700 pt-4 mt-2">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><MapPin size={16} /> Endereço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Logradouro</label>
                                        <input
                                            type="text"
                                            value={formData.address || ''}
                                            onChange={e => handleChange('address', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Número</label>
                                        <input
                                            type="text"
                                            value={formData.addressNumber || ''}
                                            onChange={e => handleChange('addressNumber', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={formData.city || ''}
                                            onChange={e => handleChange('city', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">UF (Estado)</label>
                                        <input
                                            type="text"
                                            value={formData.state || ''}
                                            onChange={e => handleChange('state', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data Nascimento</label>
                                        <input
                                            type="date"
                                            value={formData.birthDate || ''}
                                            onChange={e => handleChange('birthDate', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: PERSONAL */}
                    {activeTab === 'PERSONAL' && isMember && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="col-span-full bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
                                <div className="w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-300 shrink-0 border-4 border-white dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                    {formData.photoUrl ? (
                                        <img src={formData.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={32} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-white">Foto do Perfil</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recomendado: 400x400px</p>

                                    <label className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors w-fit">
                                        <Upload size={16} />
                                        Escolher Imagem
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.document || ''}
                                    onChange={e => handleChange('document', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    placeholder="000.000.000-00"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">RG</label>
                                <input
                                    type="text"
                                    value={formData.rg || ''}
                                    onChange={e => handleChange('rg', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Órgão Emissor</label>
                                <input
                                    type="text"
                                    value={formData.documentIssuer || ''}
                                    onChange={e => handleChange('documentIssuer', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    placeholder="Ex: SSP/SP"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nacionalidade</label>
                                <input
                                    type="text"
                                    value={formData.nationality || 'Brasileira'}
                                    onChange={e => handleChange('nationality', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Naturalidade</label>
                                <input
                                    type="text"
                                    value={formData.naturalness || ''}
                                    onChange={e => handleChange('naturalness', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    placeholder="Cidade - UF"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Profissão</label>
                                <input
                                    type="text"
                                    value={formData.profession || ''}
                                    onChange={e => handleChange('profession', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Escolaridade</label>
                                <select
                                    value={formData.educationLevel || ''}
                                    onChange={e => handleChange('educationLevel', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="FUNDAMENTAL">Ensino Fundamental</option>
                                    <option value="MEDIO">Ensino Médio</option>
                                    <option value="SUPERIOR">Ensino Superior</option>
                                    <option value="POS">Pós-Graduação/MBA</option>
                                    <option value="MESTRADO">Mestrado</option>
                                    <option value="DOUTORADO">Doutorado</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* TAB: ECCLESIASTICAL */}
                    {activeTab === 'ECCLESIASTICAL' && isMember && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data de Conversão / Decisão</label>
                                <input
                                    type="date"
                                    value={formData.conversionDate || ''}
                                    onChange={e => handleChange('conversionDate', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data de Batismo</label>
                                <input
                                    type="date"
                                    value={formData.baptismDate || ''}
                                    onChange={e => handleChange('baptismDate', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Igreja de Procedência</label>
                                <input
                                    type="text"
                                    value={formData.previousChurch || ''}
                                    onChange={e => handleChange('previousChurch', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Forma de Entrada</label>
                                <select
                                    value={formData.entryMethod || ''}
                                    onChange={e => handleChange('entryMethod', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="BATISMO">Batismo</option>
                                    <option value="ACLAMAÇÃO">Aclamação</option>
                                    <option value="CARTA">Carta de Mudança</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cargo Eclesiástico</label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.role || ''}
                                        onChange={e => handleChange('role', e.target.value)}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {(data.memberRoles || []).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setManagingList('ROLES')}
                                        className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                        title="Gerenciar Cargos"
                                    >
                                        <Settings size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-700">
                                <input
                                    type="checkbox"
                                    checked={formData.baptismHolySpirit || false}
                                    onChange={e => handleChange('baptismHolySpirit', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batizado no Espírito Santo?</label>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Observações Eclesiásticas</label>
                                <textarea
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB: FAMILY */}
                    {activeTab === 'FAMILY' && isMember && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Estado Civil</label>
                                <select
                                    value={formData.maritalStatus || ''}
                                    onChange={e => handleChange('maritalStatus', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="SINGLE">Solteiro(a)</option>
                                    <option value="MARRIED">Casado(a)</option>
                                    <option value="DIVORCED">Divorciado(a)</option>
                                    <option value="WIDOWED">Viúvo(a)</option>
                                    <option value="STABLE_UNION">União Estável</option>
                                </select>
                            </div>

                            {(formData.maritalStatus === 'MARRIED' || formData.maritalStatus === 'STABLE_UNION') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cônjuge (Vínculo Membro)</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <MemberSelect
                                                    onSelect={(id, name) => handleChange('spouseId', id)}
                                                    selectedId={formData.spouseId}
                                                    excludeId={formData.id}
                                                    placeholder="Buscar cônjuge no cadastro..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => setShowSpouseModal(true)}
                                                type="button"
                                                title="Cadastrar Cônjuge Agora"
                                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Se o cônjuge já for membro, busque. Se não, clique em <strong className="text-blue-500">+</strong> para cadastrar.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data de Casamento</label>
                                        <input
                                            type="date"
                                            value={formData.weddingDate || ''}
                                            onChange={e => handleChange('weddingDate', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nome do Pai</label>
                                <input
                                    type="text"
                                    value={formData.fatherName || ''}
                                    onChange={e => handleChange('fatherName', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nome da Mãe</label>
                                <input
                                    type="text"
                                    value={formData.motherName || ''}
                                    onChange={e => handleChange('motherName', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div className="md:col-span-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                                <ChildListManager
                                    value={formData.children}
                                    onChange={(val) => handleChange('children', val)}
                                />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        {loading ? 'Salvando...' : <><Save size={18} /> Salvar Cadastro</>}
                    </button>
                </div>
            </div>
            {/* NESTED SPOUSE MODAL */}
            {showSpouseModal && (
                <div className="fixed inset-0 z-[60]">
                    <MemberForm
                        type="MEMBER"
                        currentChurchId={currentChurchId}
                        onClose={() => setShowSpouseModal(false)}
                        onSuccess={() => { }} // Not used because we use onSaved
                        initialValues={{
                            ...formData, // Copy data from current form
                            id: undefined, // IMPORTANT: New ID will be generated
                            name: '', // Reset name
                            gender: formData.gender === 'MALE' ? 'FEMALE' : 'MALE', // Guess opposite gender
                            maritalStatus: formData.maritalStatus,
                            weddingDate: formData.weddingDate,
                            spouseId: formData.id, // Reciprocal link (if current has ID)
                            // Clear personal stuff
                            birthDate: undefined,
                            document: '',
                            rg: '',
                            phone: formData.phone,
                            email: '',
                        }}
                        onSaved={(newSpouse) => {
                            handleChange('spouseId', newSpouse.id);
                            setShowSpouseModal(false);
                        }}
                    />
                </div>
            )}

            {/* DATA LIST MANAGERS */}
            {managingList === 'CATEGORIES' && (
                <DataListManager
                    title="Categorias de Membros"
                    items={data.memberCategories || []}
                    onAdd={addMemberCategory}
                    onRemove={removeMemberCategory}
                    onClose={() => setManagingList(null)}
                />
            )}

            {managingList === 'ROLES' && (
                <DataListManager
                    title="Cargos Eclesiásticos"
                    items={data.memberRoles || []}
                    onAdd={addMemberRole}
                    onRemove={removeMemberRole}
                    onClose={() => setManagingList(null)}
                />
            )}
        </div>
    );
};

export default MemberForm;
