
import React from 'react';
import { Member } from '../types';
import { X, Printer, User, Briefcase, Phone, Mail, MapPin, Calendar, FileText } from './ui/Icons';
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
    };

    printRow("Nome / Razão Social:", member.name);

    if (member.type === 'SUPPLIER' || member.document) {
      printRow("CNPJ / CPF:", member.document || '-');
    }

    if (member.rg) {
      printRow("RG:", member.rg);
    }

    printRow("Telefone:", member.phone || '-');
    printRow("Email:", member.email || '-');

    const fullAddress = [member.address, member.addressNumber, member.city, member.state].filter(Boolean).join(' - ');
    printRow("Endereço:", fullAddress || '-');

    if (member.gender) printRow("Sexo:", getGenderLabel(member.gender));
    if (member.maritalStatus) printRow("Estado Civil:", getMaritalStatusLabel(member.maritalStatus));

    if (member.type !== 'SUPPLIER') {
      if (member.birthDate) {
        printRow("Data de Nascimento:", new Date(member.birthDate).toLocaleDateString('pt-BR'));
      }
      if (member.baptismDate) {
        printRow("Data de Batismo:", new Date(member.baptismDate).toLocaleDateString('pt-BR'));
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className={`p-6 flex justify-between items-center text-white ${member.type === 'SUPPLIER' ? 'bg-slate-600' : member.type === 'VISITOR' ? 'bg-amber-500' : 'bg-blue-600'
          }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {member.type === 'SUPPLIER' ? <Briefcase size={24} /> : <User size={24} />}
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
        <div className="p-6 overflow-y-auto space-y-6">

          <div className="grid grid-cols-1 gap-4">
            {member.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <Phone className="text-gray-400" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Telefone</p>
                  <p className="text-gray-800 dark:text-white">{member.phone}</p>
                </div>
              </div>
            )}

            {member.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <Mail className="text-gray-400" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                  <p className="text-gray-800 dark:text-white">{member.email}</p>
                </div>
              </div>
            )}

            {(member.address || member.city) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <MapPin className="text-gray-400" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Endereço</p>
                  <p className="text-gray-800 dark:text-white">{[member.address, member.addressNumber, member.city, member.state].filter(Boolean).join(' - ')}</p>
                </div>
              </div>
            )}

            {member.document && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <FileText className="text-gray-400" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">CPF / CNPJ</p>
                  <p className="text-gray-800 dark:text-white">{member.document}</p>
                </div>
              </div>
            )}

            {member.rg && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <FileText className="text-gray-400" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">RG</p>
                  <p className="text-gray-800 dark:text-white">{member.rg}</p>
                </div>
              </div>
            )}

            {(member.gender || member.maritalStatus) && (
              <div className="grid grid-cols-2 gap-4">
                {member.gender && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold text-gray-400">Sexo</p>
                    <p className="text-gray-800 dark:text-white">{getGenderLabel(member.gender)}</p>
                  </div>
                )}
                {member.maritalStatus && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold text-gray-400">Estado Civil</p>
                    <p className="text-gray-800 dark:text-white">{getMaritalStatusLabel(member.maritalStatus)}</p>
                  </div>
                )}
              </div>
            )}

            {member.type !== 'SUPPLIER' && (
              <div className="grid grid-cols-2 gap-4">
                {member.birthDate && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <Calendar className="text-gray-400" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Nascimento</p>
                      <p className="text-gray-800 dark:text-white">{new Date(member.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )}
                {member.baptismDate && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <Calendar className="text-gray-400" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Batismo</p>
                      <p className="text-gray-800 dark:text-white">{new Date(member.baptismDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {member.type === 'SUPPLIER' && (
              <>
                {member.document && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <FileText className="text-gray-400" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">CNPJ / CPF</p>
                      <p className="text-gray-800 dark:text-white">{member.document}</p>
                    </div>
                  </div>
                )}
                {member.notes && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Observações</p>
                    <p className="text-gray-800 dark:text-white text-sm">{member.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
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
