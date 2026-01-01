import React from 'react';
import { Member } from '../types';
import { X, Printer, User, Briefcase, Phone, Mail, MapPin, Calendar, FileText, Heart, BookOpen, GraduationCap } from './ui/Icons';
import jsPDF from 'jspdf';

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

  const handlePrint = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("FICHA CADASTRAL", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(getTypeLabel(member.type).toUpperCase(), pageWidth / 2, 28, { align: 'center' });

    let y = 50;

    // Helper to print a row
    const printRow = (label: string, value: string) => {
      if (!value) return;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50);
      doc.text(label, 20, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(value, 70, y);

      doc.setDrawColor(230);
      doc.line(20, y + 2, pageWidth - 20, y + 2);
      y += 10;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    };

    // Header Section
    const printSectionHeader = (title: string) => {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), 20, y);
      y += 8;
      doc.setFontSize(10);
    };

    printSectionHeader("Dados Básicos");
    printRow("Nome / Razão Social:", member.name);

    if (member.type === 'SUPPLIER' || member.document) {
      printRow("CNPJ / CPF:", member.document || '-');
    }
    if (member.rg) printRow("RG:", member.rg);

    printRow("Telefone:", member.phone || '-');
    printRow("Email:", member.email || '-');

    const fullAddress = [member.address, member.addressNumber, member.city, member.state].filter(Boolean).join(' - ');
    printRow("Endereço:", fullAddress || '-');

    if (member.type !== 'SUPPLIER') {
      printSectionHeader("Dados Pessoais");
      if (member.gender) printRow("Sexo:", getGenderLabel(member.gender));
      printRow("Data de Nascimento:", formatDate(member.birthDate));
      printRow("Nacionalidade:", member.nationality || '-');
      printRow("Naturalidade:", member.naturalness || '-');
      printRow("Profissão:", member.profession || '-');
      printRow("Escolaridade:", member.educationLevel || '-');
      printRow("Nome do Pai:", member.fatherName || '-');
      printRow("Nome da Mãe:", member.motherName || '-');

      printSectionHeader("Dados Famíliares");
      if (member.maritalStatus) printRow("Estado Civil:", getMaritalStatusLabel(member.maritalStatus));
      printRow("Data Casamento:", formatDate(member.weddingDate));
      // Spouse will be ID, ideally fetch name, but for print let's skip complex lookup for now or show ID
      // printRow("Cônjuge ID:", member.spouseId || '-'); 
      printRow("Filhos:", member.children || '-');

      printSectionHeader("Dados Eclesiásticos");
      printRow("Data Conversão:", formatDate(member.conversionDate));
      printRow("Data Batismo:", formatDate(member.baptismDate));
      printRow("Batismo Espírito Santo:", member.baptismHolySpirit ? 'Sim' : 'Não');
      printRow("Igreja Anterior:", member.previousChurch || '-');
      printRow("Forma de Entrada:", member.entryMethod || '-');
      if (member.status === 'INACTIVE') {
        printRow("Data Saída:", formatDate(member.exitDate));
        printRow("Motivo Saída:", member.exitReason || '-');
      }
    } else {
      printRow("Observações:", member.notes || '-');
    }

    // Footer
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Emitido em: ${today}`, 20, 280);
    doc.text("Sistema MVPFin", pageWidth - 20, 280, { align: 'right' });

    doc.save(`ficha_${member.name.replace(/\s/g, '_')}.pdf`);
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
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Filhos</p>
                    <p className="text-sm text-gray-800 dark:text-white">{member.children || '-'}</p>
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
