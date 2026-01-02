import React from 'react';
import { Member } from '../types';
import { X, Printer, User, Briefcase, Phone, Mail, MapPin, Calendar, FileText, Heart, BookOpen, GraduationCap } from './ui/Icons';
import jsPDF from 'jspdf';
import { generateMemberDataSheet } from '../utils/pdfGenerator';
import { useFinance } from '../contexts/FinanceContext';

interface MemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
}

const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ isOpen, onClose, member }) => {
  if (!isOpen || !member) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MEMBER': return 'Membro';
      case 'VISITOR': return 'Visitante';
      case 'SUPPLIER': return 'Fornecedor';
      default: return type;
    }
  };

  const getMaritalStatusLabel = (status?: string) => {
    switch (status) {
      case 'SINGLE': return 'Solteiro(a)';
      case 'MARRIED': return 'Casado(a)';
      case 'DIVORCED': return 'Divorciado(a)';
      case 'WIDOWED': return 'Viúvo(a)';
      case 'STABLE_UNION': return 'União Estável';
      default: return status || '-';
    }
  };

  const getGenderLabel = (g?: string) => {
    if (g === 'MALE') return 'Masculino';
    if (g === 'FEMALE') return 'Feminino';
    return g || '-';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const { data } = useFinance();

  const handlePrint = async () => {
    try {
      const church = data.churches.find(c => c.id === member.churchId);
      const spouse = member.spouseId ? data.members.find(m => m.id === member.spouseId) : null;
      await generateMemberDataSheet(member, church, spouse?.name);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erro ao gerar PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className={`p-6 flex justify-between items-center text-white ${member.type === 'SUPPLIER' ? 'bg-slate-600' : member.type === 'VISITOR' ? 'bg-amber-500' : 'bg-blue-600'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/20 rounded-lg overflow-hidden ${member.photoUrl ? 'p-0' : ''}`}>
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="Foto" className="w-12 h-12 object-cover" />
              ) : (
                member.type === 'SUPPLIER' ? <Briefcase size={24} /> : <User size={24} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{member.name}</h2>
              <span className="text-white/80 text-xs font-medium bg-black/10 px-2 py-0.5 rounded">
                {getTypeLabel(member.type)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

          {/* 1. CONTACT INFO */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1 mb-3">Contatos & Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {member.phone && (
                <div className="flex items-center gap-3 p-2">
                  <Phone className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Telefone</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{member.phone}</p>
                  </div>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3 p-2">
                  <Mail className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Email</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{member.email}</p>
                  </div>
                </div>
              )}
              {(member.address || member.city) && (
                <div className="flex items-center gap-3 p-2 col-span-full">
                  <MapPin className="text-gray-400 shrink-0" size={18} />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Endereço</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{[member.address, member.addressNumber, member.city, member.state].filter(Boolean).join(' - ')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {member.type !== 'SUPPLIER' && (
            <>
              {/* 2. PERSONAL INFO */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1 mb-3">Dados Pessoais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">CPF</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.document || '-'}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">RG</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.rg || '-'}</p>
                    {member.documentIssuer && <span className="text-[10px] text-gray-400">{member.documentIssuer}</span>}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Nascimento</p>
                    <p className="text-sm text-gray-800 dark:text-white">{formatDate(member.birthDate)}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Gênero</p>
                    <p className="text-sm text-gray-800 dark:text-white">{getGenderLabel(member.gender)}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Nacionalidade</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.nationality || '-'}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Naturalidade</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.naturalness || '-'}</p>
                  </div>
                  <div className="p-2 col-span-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Profissão</p>
                    <p className="text-sm text-gray-800 dark:text-white flex items-center gap-1">
                      <Briefcase size={12} className="text-gray-400" /> {member.profession || '-'}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Escolaridade</p>
                    <p className="text-sm text-gray-800 dark:text-white flex items-center gap-1">
                      <GraduationCap size={12} className="text-gray-400" /> {member.educationLevel || '-'}
                    </p>
                  </div>
                  <div className="p-2 col-span-full">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Filiação</p>
                    <p className="text-sm text-gray-800 dark:text-white">Pai: {member.fatherName || '-'}</p>
                    <p className="text-sm text-gray-800 dark:text-white">Mãe: {member.motherName || '-'}</p>
                  </div>
                </div>
              </section>

              {/* 3. FAMILY INFO */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1 mb-3">Família</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Estado Civil</p>
                    <p className="text-sm text-gray-800 dark:text-white">{getMaritalStatusLabel(member.maritalStatus)}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Data Casamento</p>
                    <p className="text-sm text-gray-800 dark:text-white">{formatDate(member.weddingDate)}</p>
                  </div>
                  <div className="p-2 col-span-full">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Cônjuge</p>
                    <p className="text-sm text-gray-800 dark:text-white">
                      {(() => {
                        if (!member.spouseId) return '-';
                        const spouse = data.members.find(m => m.id === member.spouseId);
                        return spouse ? spouse.name : '(Não encontrado)';
                      })()}
                    </p>
                  </div>
                  <div className="p-2 col-span-full">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Filhos</p>
                    <div className="text-sm text-gray-800 dark:text-white">
                      {(() => {
                        if (!member.children) return '-';
                        try {
                          // Check if JSON
                          if (member.children.startsWith('[') || member.children.startsWith('{')) {
                            const list = JSON.parse(member.children);
                            if (Array.isArray(list) && list.length > 0) {
                              return (
                                <ul className="list-disc pl-4 space-y-1">
                                  {list.map((c: any, i: number) => (
                                    <li key={i}>
                                      {c.name}
                                      {c.birthDate && <span className="text-gray-400 text-xs ml-2">({new Date(c.birthDate).toLocaleDateString('pt-BR')})</span>}
                                      {c.memberId && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 rounded ml-2">Vínculado</span>}
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                          }
                          return member.children; // Fallback to raw text
                        } catch (e) {
                          return member.children;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. ECCLESIASTICAL INFO */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1 mb-3">Dados Eclesiásticos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Conversão</p>
                    <p className="text-sm text-gray-800 dark:text-white flex items-center gap-1">
                      <Heart size={12} className="text-rose-400" /> {formatDate(member.conversionDate)}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Batismo Águas</p>
                    <p className="text-sm text-gray-800 dark:text-white">{formatDate(member.baptismDate)}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Batismo Espírito Santo</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.baptismHolySpirit ? 'Sim 🔥' : 'Não'}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Forma Entrada</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.entryMethod || '-'}</p>
                  </div>
                  <div className="p-2 col-span-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Igreja Anterior</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.previousChurch || '-'}</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {member.type === 'SUPPLIER' && member.notes && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-slate-700 pb-1 mb-3">Observações</h3>
              <p className="text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">{member.notes}</p>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors"
          >
            <Printer size={18} /> Imprimir Ficha
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailsModal;
