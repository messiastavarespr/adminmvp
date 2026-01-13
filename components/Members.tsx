import React, { useState } from 'react';
import { Member, UserRole } from '../types';
import { UserCheck, Plus, Trash2, Briefcase, Users, Search, Edit2, User, MapPin, Mail, Phone, Calendar, FileText, Save, X, Eye, FileSpreadsheet, LayoutList, LayoutGrid, Tag, Cake, Filter, ArrowLeftRight, Share2, Copy, AlertTriangle } from './ui/Icons';
import MergeMembersModal from './MergeMembersModal';
import { useFinance } from '../contexts/FinanceContext';
import ConfirmationModal from './ConfirmationModal';
import SearchBox from './ui/SearchBox';
import MemberDetailsModal from './MemberDetailsModal';
import ErrorMessage from './ui/ErrorMessage';
import ImportMembersModal from './ImportMembersModal';
import MemberForm from './MemberForm';
import MembershipCard from './secretary/MembershipCard';
import { FileBadge } from './ui/Icons';

interface MembersProps {
  members: Member[];
  onUpdate: () => void;
  userRole: UserRole;
  currentChurchId: string;
  systemMode: 'FINANCE' | 'SECRETARY';
}

const Members: React.FC<MembersProps> = ({ members, onUpdate, userRole, currentChurchId, systemMode }) => {
  const { deleteMember, refreshData } = useFinance();
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'SUPPLIERS'>('MEMBERS');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = () => {
    const registrationLink = `${window.location.origin}/registro?c=${currentChurchId}`;
    navigator.clipboard.writeText(registrationLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const isDuplicate = (m: Member) => {
    if (m.status !== 'PENDING') return false;
    return members.some(other =>
      other.id !== m.id &&
      (other.status === 'ACTIVE' || other.status === 'INACTIVE' || other.status === 'OBSERVATION') &&
      (
        (m.document && other.document === m.document) ||
        (m.name.trim().toLowerCase() === other.name.trim().toLowerCase())
      )
    );
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mergingMember, setMergingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [generatingCardMember, setGeneratingCardMember] = useState<Member | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const canEdit = userRole === UserRole.MASTER || userRole === UserRole.ADMIN || userRole === UserRole.TREASURER || userRole === UserRole.PASTOR || userRole === UserRole.SECRETARY;

  // Filter Logic
  const displayedMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.document && m.document.includes(search)) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

    if (activeTab === 'SUPPLIERS' && systemMode !== 'SECRETARY') {
      return m.type === 'SUPPLIER' && matchesSearch;
    }

    if (systemMode === 'SECRETARY' && m.type === 'SUPPLIER') return false;

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
    if (member) {
      setEditingMember(member);
    } else {
      setEditingMember(null);
    }
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteMember(deleteId);
        onUpdate();
        setDeleteId(null);
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Não foi possível excluir o cadastro. Verifique se existem lançamentos financeiros (Dízimos/Ofertas) ou vínculos familiares associados a este membro.");
      }
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
        {systemMode !== 'SECRETARY' && (
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
        )}
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
                title="Cards"
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
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm shrink-0 border ${copySuccess
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  title="Copiar link de cadastro público"
                >
                  {copySuccess ? <Copy size={18} /> : <Share2 size={18} />}
                  <span className="hidden lg:inline">{copySuccess ? 'Link Copiado!' : 'Link de Cadastro'}</span>
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
              <option value="PENDING">Pendentes (Novos)</option>
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

      {/* MEMBER FORM MODAL */}
      {showForm && (
        <MemberForm
          key={editingMember?.id || 'new'}
          member={editingMember}
          type={activeTab === 'MEMBERS' ? 'MEMBER' : 'SUPPLIER'}
          currentChurchId={currentChurchId}
          onClose={() => setShowForm(false)}
          onSuccess={() => { refreshData(); onUpdate(); }}
          systemMode={systemMode}
        />
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
                        m.status === 'PENDING' ? 'bg-purple-500' :
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
                          {m.status === 'PENDING' && (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 animate-pulse">
                                Pendente de Aprovação
                              </span>
                              {isDuplicate(m) && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                  <AlertTriangle size={12} /> POSSÍVEL DUPLICADO
                                </span>
                              )}
                            </div>
                          )}
                          {m.status === 'OBSERVATION' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">Observação</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(m.type === 'MEMBER' || m.type === 'VISITOR' || m.type === 'PASTOR') && (
                        <button onClick={() => setGeneratingCardMember(m)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Gerar Carteirinha">
                          <FileBadge size={16} />
                        </button>
                      )}
                      <button onClick={() => setViewingMember(m)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ver Detalhes">
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => setMergingMember(m)} className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Unificar Cadastros">
                            <ArrowLeftRight size={16} />
                          </button>
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
                          <div className="flex flex-col gap-1">
                            {m.status === 'ACTIVE' && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">Ativo</span>}
                            {m.status === 'INACTIVE' && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">Inativo</span>}
                            {m.status === 'PENDING' && (
                              <>
                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100 w-fit">Pendente</span>
                                {isDuplicate(m) && (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-red-600">
                                    <AlertTriangle size={10} /> DUPLICADO
                                  </span>
                                )}
                              </>
                            )}
                            {m.status === 'OBSERVATION' && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 w-fit">Observação</span>}
                            {!m.status && m.type === 'SUPPLIER' && <span className="text-xs text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(m.type === 'MEMBER' || m.type === 'VISITOR' || m.type === 'PASTOR') && (
                              <button onClick={() => setGeneratingCardMember(m)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded" title="Gerar Carteirinha"><Briefcase size={16} /></button>
                            )}
                            <button onClick={() => setViewingMember(m)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Eye size={16} /></button>
                            {canEdit && (
                              <>
                                <button onClick={() => setMergingMember(m)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded" title="Unificar Cadastros"><ArrowLeftRight size={16} /></button>
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

      <MergeMembersModal
        isOpen={!!mergingMember}
        sourceMember={mergingMember}
        onClose={() => setMergingMember(null)}
        onSuccess={() => { refreshData(); onUpdate(); }}
      />

      <ImportMembersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => { refreshData(); }}
        currentChurchId={currentChurchId}
      />

      {generatingCardMember && (
        <MembershipCard
          member={generatingCardMember}
          onClose={() => setGeneratingCardMember(null)}
        />
      )}
    </div>
  );
};

export default Members;
