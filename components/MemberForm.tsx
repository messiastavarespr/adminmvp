import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { Save, X, User, MapPin, Church, Phone, FileText, Heart, Camera } from './ui/Icons';
import ErrorMessage from './ui/ErrorMessage';

interface MemberFormProps {
    member?: Member | null;
    type: 'MEMBER' | 'SUPPLIER' | 'VISITOR'; // Type to initialize with if new
    onClose: () => void;
    onSuccess: () => void;
    currentChurchId: string;
}

type TabType = 'BASIC' | 'PERSONAL' | 'ECCLESIASTICAL' | 'FAMILY';

const MemberForm: React.FC<MemberFormProps> = ({ member, type: initialType, onClose, onSuccess, currentChurchId }) => {
    const { addMember, updateMember } = useFinance();
    const [activeTab, setActiveTab] = useState<TabType>('BASIC');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Member>>({
        type: initialType,
        status: 'ACTIVE',
        churchId: currentChurchId
    });

    useEffect(() => {
        if (member) {
            setFormData(member);
        } else {
            setFormData(prev => ({ ...prev, type: initialType })); // Ensure type is set for new
        }
    }, [member, initialType]);

    const handleChange = (field: keyof Member, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório.';

        if (formData.type === 'SUPPLIER' && formData.document) {
            const cleanDoc = formData.document.replace(/\D/g, '');
            if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
                newErrors.document = 'Documento inválido (CPF ou CNPJ).';
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
            const dataToSave = { ...formData } as Member;

            // Auto-generate ID if missing (for new records)
            if (!dataToSave.id) {
                dataToSave.id = crypto.randomUUID();
            }

            if (member?.id) {
                await updateMember(dataToSave);
            } else {
                await addMember(dataToSave);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const isMember = formData.type === 'MEMBER';

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
                                <div className="flex gap-4 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-700">
                                    {['MEMBER', 'VISITOR', 'SUPPLIER'].map(t => (
                                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                checked={formData.type === t}
                                                onChange={() => handleChange('type', t)}
                                                className="text-blue-600"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t === 'MEMBER' ? 'Membro' : t === 'VISITOR' ? 'Visitante' : 'Fornecedor'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
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
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white">Foto do Perfil</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recomendado: 400x400px</p>
                                    <input
                                        type="text"
                                        placeholder="URL da foto (Cole o link aqui por enquanto)"
                                        value={formData.photoUrl || ''}
                                        onChange={e => handleChange('photoUrl', e.target.value)}
                                        className="text-xs w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    />
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

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data de Casamento</label>
                                <input
                                    type="date"
                                    value={formData.weddingDate || ''}
                                    onChange={e => handleChange('weddingDate', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    disabled={formData.maritalStatus === 'SINGLE'}
                                />
                            </div>

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

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filhos (Nomes e Idades)</label>
                                <textarea
                                    rows={4}
                                    value={formData.children || ''}
                                    onChange={e => handleChange('children', e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    placeholder="Ex: João (10 anos), Maria (5 anos)..."
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
        </div>
    );
};

export default MemberForm;
