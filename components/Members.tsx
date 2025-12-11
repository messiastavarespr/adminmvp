
import React, { useState } from 'react';
import { Member, UserRole } from '../types';
import { UserCheck, Plus, Trash2, Briefcase, Users, Search, Edit2, User, MapPin, Mail, Phone, Calendar, FileText, Save, X, Eye } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import ConfirmationModal from './ConfirmationModal';
import SearchBox from './ui/SearchBox';
import MemberDetailsModal from './MemberDetailsModal';
import ErrorMessage from './ui/ErrorMessage';

interface MembersProps {
  members: Member[];
  onUpdate: () => void;
  userRole: UserRole;
  currentChurchId: string;
}

const Members: React.FC<MembersProps> = ({ members, onUpdate, userRole, currentChurchId }) => {
  const { addMember, updateMember, deleteMember } = useFinance();
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'SUPPLIERS'>('MEMBERS');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Common Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<Member['type']>('MEMBER');

  // Member Specific
  const [birthDate, setBirthDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');

  // Supplier Specific
  const [document, setDocument] = useState(''); // CPF/CNPJ
  const [notes, setNotes] = useState('');

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.TREASURER;

  // Filter Logic
  const displayedMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.document && m.document.includes(search));

    if (activeTab === 'MEMBERS') {
      return (m.type === 'MEMBER' || m.type === 'VISITOR') && matchesSearch;
    } else {
      return m.type === 'SUPPLIER' && matchesSearch;
    }
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
      setCity(member.city || '');
      setType(member.type);
      setBirthDate(member.birthDate || '');
      setBaptismDate(member.baptismDate || '');
      setDocument(member.document || '');
      setNotes(member.notes || '');
    } else {
      // Create Mode
      setEditingId(null);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setType(activeTab === 'MEMBERS' ? 'MEMBER' : 'SUPPLIER');
      setBirthDate('');
      setBaptismDate('');
      setDocument('');
      setNotes('');
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
      city,
      // Specific fields based on type
      birthDate: type !== 'SUPPLIER' ? birthDate : undefined,
      baptismDate: type !== 'SUPPLIER' ? baptismDate : undefined,
      document: type === 'SUPPLIER' ? document : undefined,
      notes: type === 'SUPPLIER' ? notes : undefined
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

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <SearchBox value={search} onChange={setSearch} placeholder={activeTab === 'MEMBERS' ? "Buscar membro..." : "Buscar fornecedor..."} />
        {canEdit && (
          <button
            onClick={() => handleOpenForm()}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /> {activeTab === 'MEMBERS' ? 'Novo Membro' : 'Novo Fornecedor'}
          </button>
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedMembers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-400 mb-3">
              <Search size={20} />
            </div>
            <p className="text-gray-500 dark:text-gray-400">Nenhum cadastro encontrado.</p>
          </div>
        ) : (
          displayedMembers.map(m => (
            <div key={m.id} className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${m.type === 'SUPPLIER' ? 'bg-slate-500' : m.type === 'VISITOR' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}>
                    {m.type === 'SUPPLIER' ? <Briefcase size={18} /> : <User size={18} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{m.name}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${m.type === 'SUPPLIER' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                      m.type === 'VISITOR' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                      {m.type === 'MEMBER' ? 'Membro' : m.type === 'VISITOR' ? 'Visitante' : 'Fornecedor'}
                    </span>
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

              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {m.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" /> {m.phone}
                  </div>
                )}
                {m.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" /> <span className="truncate">{m.email}</span>
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
                    <Calendar size={14} className="text-gray-400" />
                    Nasc: {new Date(m.birthDate).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {m.type === 'SUPPLIER' && m.document && (
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" /> CNPJ/CPF: {m.document}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
    </div>
  );
};

export default Members;
