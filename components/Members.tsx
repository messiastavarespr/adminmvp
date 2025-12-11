
import React, { useState } from 'react';
import { Member, UserRole } from '../types';
import { UserCheck, Plus, Trash2, Briefcase, Users, Search, Edit2, User, MapPin, Mail, Phone, Calendar, FileText, Save, X, Eye, FileSpreadsheet, LayoutList, LayoutGrid, Tag, Cake, Filter } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import ConfirmationModal from './ConfirmationModal';
import SearchBox from './ui/SearchBox';
import MemberDetailsModal from './MemberDetailsModal';
import ErrorMessage from './ui/ErrorMessage';
import ImportMembersModal from './ImportMembersModal';

interface MembersProps {
  members: Member[];
  onUpdate: () => void;
  userRole: UserRole;
  currentChurchId: string;
}

const Members: React.FC<MembersProps> = ({ members, onUpdate, userRole, currentChurchId }) => {
  const { addMember, updateMember, deleteMember } = useFinance();
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'SUPPLIERS'>('MEMBERS');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showBirthdays, setShowBirthdays] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { refreshData } = useFinance();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Common Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState<Member['type']>('MEMBER');

  // Member Specific
  const [birthDate, setBirthDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [gender, setGender] = useState('');
  const [rg, setRg] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'OBSERVATION'>('ACTIVE');
  const [tagsInput, setTagsInput] = useState('');

  // Supplier Specific
  const [document, setDocument] = useState(''); // CPF/CNPJ
  const [notes, setNotes] = useState('');

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  // Filter Logic
  const displayedMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.document && m.document.includes(search)) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

    if (activeTab === 'SUPPLIERS') {
      return m.type === 'SUPPLIER' && matchesSearch;
    }

    // Member Filters
    const isMemberOrVisitor = m.type === 'MEMBER' || m.type === 'VISITOR';
    if (!isMemberOrVisitor) return false;

    if (!matchesSearch) return false;

    if (filterStatus !== 'ALL') {
      // Default to ACTIVE if undefined for backward compatibility
      const s = m.status || 'ACTIVE';
      if (s !== filterStatus) return false;
    }

    if (showBirthdays && m.birthDate) {
      const birth = new Date(m.birthDate);
      const today = new Date();
      // Check for current month
      if (birth.getUTCMonth() !== today.getUTCMonth()) return false;
    }

    return true;
  });

  const handleOpenForm = (member?: Member) => {
    setErrors({});
    if (member) {
      // Edit Mode
      setEditingId(member.id);
      setName(member.name);
      setPhone(member.phone || '');
      setEmail(member.email || '');
      setAddress(member.address || '');
      setAddressNumber(member.addressNumber || '');
      setCity(member.city || '');
      setState(member.state || '');
      setType(member.type);
      setBirthDate(member.birthDate || '');
      setBaptismDate(member.baptismDate || '');
      setMaritalStatus(member.maritalStatus || '');
      setGender(member.gender || '');
      setRg(member.rg || '');
      setDocument(member.document || '');
      setNotes(member.notes || '');
      setStatus(member.status || 'ACTIVE');
      setTagsInput(member.tags ? member.tags.join(', ') : '');
    } else {
      // Create Mode
      setEditingId(null);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setAddressNumber('');
      setCity('');
      setState('');
      setType(activeTab === 'MEMBERS' ? 'MEMBER' : 'SUPPLIER');
      setBirthDate('');
      setBaptismDate('');
      setMaritalStatus('');
      setGender('');
      setRg('');
      setDocument('');
      setNotes('');
      setStatus('ACTIVE');
      setTagsInput('');
    }
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório.';
    }

    // Validação básica de CPF/CNPJ
    if (type === 'SUPPLIER' && document.trim()) {
      const cleanDoc = document.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        newErrors.document = 'Documento inválido. Digite 11 (CPF) ou 14 (CNPJ) números.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const memberData: Member = {
      id: editingId || '', // Will be generated
      churchId: currentChurchId,
      name,
      type,
      phone,
      email,
      address,
      addressNumber,
      city,
      state,
      // Specific fields based on type
      birthDate: type !== 'SUPPLIER' ? birthDate : undefined,
      baptismDate: type !== 'SUPPLIER' ? baptismDate : undefined,
      maritalStatus: type !== 'SUPPLIER' ? maritalStatus : undefined,
      gender: type !== 'SUPPLIER' ? gender : undefined,
      rg: type !== 'SUPPLIER' ? rg : undefined,
      // Document is now used for Member (CPF) and Supplier (CNPJ/CPF)
      document: document || undefined,
      notes: type === 'SUPPLIER' ? notes : undefined,
      status: type !== 'SUPPLIER' ? status : undefined,
      tags: type !== 'SUPPLIER' ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined
    };

    if (editingId) {
      await updateMember(memberData);
    } else {
      // Remove ID to let storage/db generate it or we generate here? 
      // Context addMember takes 'Member'. Supabase usually gen ID.
      // If we need client ID for optimistic, we can gen.
      // Assuming context handles it or takes Omit<Member, 'id'>?
      // Type is Member. So let's gen random ID or check if SupabaseService generates it.
      // SupabaseService maps to snake. If ID is empty string, problem?
      // Let's generate one if empty.
      const newMb = { ...memberData, id: memberData.id || crypto.randomUUID() };
      await addMember(newMb);
    }

    onUpdate();
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMember(deleteId);
      onUpdate();
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {activeTab === 'MEMBERS' ? <Users className="text-blue-600" /> : <Briefcase className="text-blue-600" />}
            {activeTab === 'MEMBERS' ? 'Membros e Visitantes' : 'Fornecedores e Prestadores'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {activeTab === 'MEMBERS'
              ? 'Gerencie o cadastro de membros, datas importantes e contatos.'
              : 'Cadastre empresas e prestadores de serviço para o financeiro.'}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('MEMBERS'); setShowForm(false); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'MEMBERS' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Membros
          </button>
          <button
            onClick={() => { setActiveTab('SUPPLIERS'); setShowForm(false); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'SUPPLIERS' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Fornecedores
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder={activeTab === 'MEMBERS' ? "Buscar membro..." : "Buscar fornecedor..."} />

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-600 shadow text-blue-600' : 'text-gray-500'}`}
                title="cards"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-2 rounded-md transition-all ${viewMode === 'TABLE' ? 'bg-white dark:bg-slate-600 shadow text-blue-600' : 'text-gray-500'}`}
                title="Lista"
              >
                <LayoutList size={18} />
              </button>
            </div>

            {canEdit && (
              <>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0"
                  title="Importar Excel"
                >
                  <FileSpreadsheet size={18} /> <span className="hidden lg:inline">Importar</span>
                </button>
                <button
                  onClick={() => handleOpenForm()}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0"
                >
                  <Plus size={18} /> <span className="hidden sm:inline">{activeTab === 'MEMBERS' ? 'Novo' : 'Novo'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        {activeTab === 'MEMBERS' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
            <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
              <Filter size={14} /> Filtros:
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-sm rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
              <option value="OBSERVATION">Em Observação</option>
            </select>

            <button
              onClick={() => setShowBirthdays(!showBirthdays)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showBirthdays
                ? 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                }`}
            >
              <Cake size={16} className={showBirthdays ? "text-pink-500" : "text-gray-400"} />
              Aniversariantes do Mês
            </button>
          </div>
        )}
      </div>

      {/* FORM SECTION (Toggleable) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-blue-100 dark:border-blue-900 overflow-hidden animate-in slide-in-from-top-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900 flex justify-between items-center">
            <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              {editingId ? 'Editar Cadastro' : 'Novo Cadastro'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-blue-400 hover:text-blue-600"><X size={20} /></button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section: Basic Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Dados Principais</h4>

                {activeTab === 'MEMBERS' && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={type === 'MEMBER'} onChange={() => setType('MEMBER')} className="text-blue-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Membro</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={type === 'VISITOR'} onChange={() => setType('VISITOR')} className="text-blue-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Visitante</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                          <option value="OBSERVATION">Em Observação</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {activeTab === 'MEMBERS' ? 'Nome Completo *' : 'Razão Social / Nome *'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${errors.name ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <ErrorMessage message={errors.name} />
                </div>

                {activeTab === 'MEMBERS' ? (
                  <div className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                        <input
                          type="text"
                          value={document}
                          onChange={e => setDocument(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">RG</label>
                        <input
                          type="text"
                          value={rg}
                          onChange={e => setRg(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado Civil</label>
                        <select
                          value={maritalStatus}
                          onChange={e => setMaritalStatus(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sexo</label>
                        <select
                          value={gender}
                          onChange={e => setGender(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione...</option>
                          <option value="MALE">Masculino</option>
                          <option value="FEMALE">Feminino</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CNPJ / CPF</label>
                    <input
                      type="text"
                      value={document}
                      onChange={e => setDocument(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${errors.document ? 'border-rose-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="00.000.000/0000-00"
                    />
                    <ErrorMessage message={errors.document} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Details & Address */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">
                  {activeTab === 'MEMBERS' ? 'Dados Pessoais & Endereço' : 'Endereço & Serviços'}
                </h4>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Número</label>
                    <input
                      type="text"
                      value={addressNumber}
                      onChange={e => setAddressNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">UF</label>
                    <input
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={2}
                    />
                  </div>
                </div>

                {activeTab === 'MEMBERS' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Nascimento</label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Batismo</label>
                      <input
                        type="date"
                        value={baptismDate}
                        onChange={e => setBaptismDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição do Serviço / Obs</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Manutenção de Ar Condicionado"
                    />
                  </div>
                )}

                {activeTab === 'MEMBERS' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etiquetas (Tags) - Separe por vírgula</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={e => setTagsInput(e.target.value)}
                        className="w-full pl-9 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Coral, Jovens, Liderança"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md">
                <Save size={16} /> Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIST */}
      {displayedMembers.length === 0 ? (
        <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-400 mb-3">
            <Search size={20} />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Nenhum cadastro encontrado.</p>
        </div>
      ) : (
        <>
          {viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedMembers.map(m => (
                <div key={m.id} className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all relative overflow-hidden">

                  {/* Status Indicator Stripe */}
                  {m.type !== 'SUPPLIER' && (
                    <div className={`absolute top-0 left-0 w-1 h-full ${m.status === 'INACTIVE' ? 'bg-gray-300' :
                        m.status === 'OBSERVATION' ? 'bg-amber-400' :
                          'bg-blue-500'
                      }`}></div>
                  )}

                  <div className="flex justify-between items-start pl-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${m.type === 'SUPPLIER' ? 'bg-slate-500' : m.type === 'VISITOR' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>
                        {m.type === 'SUPPLIER' ? <Briefcase size={18} /> : <User size={18} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{m.name}</h3>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${m.type === 'SUPPLIER' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                            m.type === 'VISITOR' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}>
                            {m.type === 'MEMBER' ? 'Membro' : m.type === 'VISITOR' ? 'Visitante' : 'Fornecedor'}
                          </span>
                          {m.status === 'INACTIVE' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Inativo</span>}
                          {m.status === 'OBSERVATION' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">Observação</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewingMember(m)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ver Detalhes">
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => handleOpenForm(m)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteId(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-2">
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {m.phone}
                      </div>
                    )}
                    {(m.address || m.city) && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{[m.address, m.city].filter(Boolean).join(' - ')}</span>
                      </div>
                    )}
                    {m.type !== 'SUPPLIER' && m.birthDate && (
                      <div className="flex items-center gap-2">
                        <Cake size={14} className={new Date(m.birthDate).getUTCMonth() === new Date().getUTCMonth() ? "text-pink-500" : "text-gray-400"} />
                        <span className={new Date(m.birthDate).getUTCMonth() === new Date().getUTCMonth() ? "text-pink-600 font-medium" : ""}>
                          {new Date(m.birthDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-slate-700">
                        {m.tags.slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Tag size={10} /> {tag}
                          </span>
                        ))}
                        {m.tags.length > 3 && <span className="text-[10px] text-gray-400">+{m.tags.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 font-medium border-b border-gray-100 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Contato</th>
                      <th className="p-3">Cidade/Bairro</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {displayedMembers.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                        <td className="p-3">
                          <div className="font-bold text-gray-800 dark:text-gray-200">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.type === 'MEMBER' ? 'Membro' : m.type === 'VISITOR' ? 'Visitante' : 'Fornecedor'}</div>
                          {m.tags && (
                            <div className="flex gap-1 mt-1">
                              {m.tags.map((t, i) => <span key={i} className="text-[9px] bg-gray-100 dark:bg-slate-700 px-1 rounded">{t}</span>)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          <div>{m.phone}</div>
                          <div className="text-xs opacity-70">{m.email}</div>
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {[m.city, m.address ? m.address.split(',')[0] : ''].filter(Boolean).join(' - ')}
                        </td>
                        <td className="p-3">
                          {m.status === 'ACTIVE' && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Ativo</span>}
                          {m.status === 'INACTIVE' && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Inativo</span>}
                          {m.status === 'OBSERVATION' && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">Observação</span>}
                          {!m.status && m.type === 'SUPPLIER' && <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingMember(m)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Eye size={16} /></button>
                            {canEdit && (
                              <>
                                <button onClick={() => handleOpenForm(m)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => setDeleteId(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Cadastro"
        message="Tem certeza que deseja excluir? O histórico financeiro será mantido, mas o vínculo com o cadastro será perdido."
        confirmText="Excluir"
        isDanger={true}
      />

      <MemberDetailsModal
        isOpen={!!viewingMember}
        onClose={() => setViewingMember(null)}
        member={viewingMember}
      />

      <ImportMembersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => { refreshData(); }}
        currentChurchId={currentChurchId}
      />
    </div >
  );
};

export default Members;
