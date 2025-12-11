
import React from 'react';
import { Transaction, TransactionType, Category, Account, CostCenter, Member, Church } from '../types';
import { X, CalendarClock, ArrowLeftRight, TrendingUp, TrendingDown, Paperclip, Download, User, Layers, Landmark, FileText, Printer } from './ui/Icons';
import jsPDF from 'jspdf';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  costCenters: CostCenter[];
  members: Member[];
  currentChurch?: Church; // Added prop
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ 
  isOpen, onClose, transaction, categories, accounts, costCenters, members, currentChurch
}) => {
  if (!isOpen || !transaction) return null;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateStr = new Date(transaction.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const categoryName = categories.find(c => c.id === transaction.categoryId)?.name || 'N/A';
  const accountName = accounts.find(a => a.id === transaction.accountId)?.name || 'Conta Excluída';
  const costCenterName = costCenters.find(cc => cc.id === transaction.costCenterId)?.name || 'Geral';
  const memberName = transaction.memberOrSupplierName || members.find(m => m.id === transaction.memberOrSupplierId)?.name || '-';

  // For Transfers
  const isTransfer = transaction.type === TransactionType.TRANSFER;
  const transferDirectionLabel = transaction.transferDirection === 'IN' ? 'Recebimento' : 'Envio';

  const downloadAttachment = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReceipt = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6' // Compact format for receipts
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    // --- HEADER ---
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, 40, 'F');

    if (currentChurch) {
        // Logo Logic
        let hasLogo = false;
        if (currentChurch.logo && currentChurch.logo.startsWith('data:image')) {
            try {
                // Add Logo (Left aligned)
                doc.addImage(currentChurch.logo, 'JPEG', 10, 8, 20, 20);
                hasLogo = true;
            } catch (e) {
                console.error("Error adding logo to PDF", e);
            }
        }

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        
        if (hasLogo) {
            // Text to the right of logo
            doc.text(currentChurch.name.substring(0, 35), 35, 12);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            
            let infoY = 17;
            if (currentChurch.cnpj) {
                doc.text(`CNPJ: ${currentChurch.cnpj}`, 35, infoY);
                infoY += 4;
            }
            const contact = [currentChurch.phone, currentChurch.email].filter(Boolean).join(' | ');
            if (contact) {
                doc.text(contact.substring(0, 40), 35, infoY);
            }
        } else {
            // Centered Text
            doc.text(currentChurch.name.substring(0, 40), pageWidth / 2, 12, { align: 'center' });
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            
            let infoY = 17;
            if (currentChurch.cnpj) {
                doc.text(`CNPJ: ${currentChurch.cnpj}`, pageWidth / 2, infoY, { align: 'center' });
                infoY += 4;
            }
            const contact = [currentChurch.phone, currentChurch.email].filter(Boolean).join(' | ');
            if (contact) {
                doc.text(contact.substring(0, 60), pageWidth / 2, infoY, { align: 'center' });
            }
        }
    }
    
    y = 50;

    // --- TITLE ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("RECIBO DE TRANSAÇÃO", pageWidth / 2, y, { align: 'center' });
    y += 10;

    // --- DETAILS ---
    const addLine = (label: string, value: string) => {
       doc.setFontSize(9);
       doc.setFont('helvetica', 'bold');
       doc.setTextColor(100);
       doc.text(label, 10, y);
       
       doc.setFont('helvetica', 'normal');
       doc.setTextColor(0);
       // Right align value
       doc.text(value, pageWidth - 10, y, { align: 'right' });
       
       doc.setDrawColor(230);
       doc.line(10, y + 2, pageWidth - 10, y + 2);
       y += 8;
    };

    addLine("Data:", new Date(transaction.date).toLocaleDateString('pt-BR'));
    addLine("Tipo:", transaction.type === 'INCOME' ? 'Entrada' : transaction.type === 'EXPENSE' ? 'Saída' : 'Transferência');
    addLine("Valor:", formatter.format(transaction.amount));
    
    y += 2; // Spacing
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text("Descrição / Histórico:", 10, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    // Wrap description
    const splitDesc = doc.splitTextToSize(transaction.description, pageWidth - 20);
    doc.text(splitDesc, 10, y);
    y += (splitDesc.length * 5) + 5;

    if (!isTransfer) {
       addLine("Categoria:", categoryName);
       if (memberName !== '-') {
          addLine(transaction.type === 'INCOME' ? "Recebido de:" : "Pago a:", memberName.substring(0, 25));
       }
    }

    // --- ATTACHMENTS (Images Only) ---
    if (transaction.attachments && transaction.attachments.length > 0) {
        y += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Comprovantes Anexos:", 10, y);
        y += 10;

        transaction.attachments.forEach((att, idx) => {
            if (att.startsWith('data:image')) {
                // If it's an image, try to add it
                // Check if we need a new page
                if (y > 100) {
                    doc.addPage();
                    y = 10;
                }
                
                try {
                    const imgProps = doc.getImageProperties(att);
                    const pdfWidth = pageWidth - 20;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    
                    // Max height check
                    const availableHeight = 140 - y; // A6 height approx 148
                    let finalH = pdfHeight;
                    let finalW = pdfWidth;

                    if (pdfHeight > availableHeight) {
                         // Scale down to fit
                         const ratio = availableHeight / pdfHeight;
                         finalH = availableHeight;
                         finalW = pdfWidth * ratio;
                    }

                    doc.addImage(att, 'JPEG', 10, y, finalW, finalH);
                    y += finalH + 5;
                } catch (e) {
                    doc.setFontSize(8);
                    doc.text(`(Erro ao renderizar imagem do anexo ${idx + 1})`, 10, y);
                    y += 10;
                }
            } else {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text(`Anexo ${idx + 1}: Formato não suportado para impressão direta.`, 10, y);
                y += 6;
            }
        });
    }

    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Gerado por MVPFin System", pageWidth / 2, pageHeight - 5, { align: 'center' });

    doc.save(`recibo_${transaction.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-6 flex justify-between items-start text-white ${
           transaction.type === TransactionType.INCOME ? 'bg-emerald-600' : 
           transaction.type === TransactionType.EXPENSE ? 'bg-rose-600' : 'bg-blue-600'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-1 uppercase tracking-wider">
               {transaction.type === TransactionType.INCOME && <><TrendingUp size={16}/> Entrada</>}
               {transaction.type === TransactionType.EXPENSE && <><TrendingDown size={16}/> Saída</>}
               {transaction.type === TransactionType.TRANSFER && <><ArrowLeftRight size={16}/> Transferência ({transferDirectionLabel})</>}
            </div>
            <h2 className="text-3xl font-bold">{formatter.format(transaction.amount)}</h2>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
              <CalendarClock size={14}/> {dateStr}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Descrição</label>
               <p className="text-gray-800 dark:text-white font-medium text-lg leading-snug">{transaction.description}</p>
             </div>
             
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Conta / Banco</label>
               <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                 <Landmark size={18} className="text-gray-400 dark:text-gray-500"/>
                 {accountName}
               </div>
             </div>

             {!isTransfer && (
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Categoria</label>
                 <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                   <FileText size={18} className="text-gray-400 dark:text-gray-500"/>
                   {categoryName}
                 </div>
               </div>
             )}

             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Centro de Custo</label>
               <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                 <Layers size={18} className="text-gray-400 dark:text-gray-500"/>
                 {costCenterName}
               </div>
             </div>

             {!isTransfer && (
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                    {transaction.type === TransactionType.INCOME ? 'Membro / Doador' : 'Fornecedor / Favorecido'}
                 </label>
                 <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                   <User size={18} className="text-gray-400 dark:text-gray-500"/>
                   {memberName}
                 </div>
               </div>
             )}
          </div>

          {/* Attachments Section */}
          <div className="border-t border-gray-100 dark:border-slate-700 pt-6">
             <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
               <Paperclip size={16} /> Anexos ({transaction.attachments?.length || 0})
             </h3>
             
             {transaction.attachments && transaction.attachments.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {transaction.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-600 dark:text-blue-400">
                           <FileText size={16} />
                         </div>
                         <span className="text-sm text-gray-700 dark:text-gray-300 truncate">Comprovante {idx + 1}</span>
                       </div>
                       <button 
                         onClick={() => downloadAttachment(att, `anexo_${idx+1}_${transaction.description.replace(/\s/g, '_')}`)}
                         className="p-2 text-gray-400 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"
                         title="Baixar"
                       >
                         <Download size={18} />
                       </button>
                    </div>
                  ))}
               </div>
             ) : (
               <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum comprovante anexado.</p>
             )}
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-4 text-xs text-gray-400 dark:text-gray-500 flex justify-between">
            <span>ID: {transaction.id}</span>
            <span>Status: {transaction.isPaid ? 'Conciliado' : 'Pendente'}</span>
          </div>

        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex gap-3 justify-end">
           <button 
             onClick={handleGenerateReceipt}
             className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
           >
             <Printer size={16} /> Recibo Digital
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

export default TransactionDetailsModal;
