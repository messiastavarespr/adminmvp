
import React from 'react';
import { Transaction, Church } from '../types';
import { X, CheckCircle, Share2, Download, Building2, Printer } from './ui/Icons';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  church: Church;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction, church }) => {
  if (!isOpen || !transaction) return null;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateStr = new Date(transaction.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleAction = (action: 'print' | 'download') => {
    // PDF Config: Small receipt format (80mm width approx) or A6
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150] // Receipt printer style
    });

    const centerX = 40; // Middle of 80mm

    // Header Background
    doc.setFillColor(243, 244, 246);
    doc.rect(0, 0, 80, 40, 'F');

    // Church Name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(church.name.substring(0, 25), centerX, 15, { align: 'center' });
    if (church.name.length > 25) {
       doc.text(church.name.substring(25, 50), centerX, 19, { align: 'center' });
    }

    // Amount
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(formatter.format(transaction.amount), centerX, 30, { align: 'center' });

    // Body
    let y = 50;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');

    const addLine = (label: string, value: string) => {
       doc.text(label, 5, y);
       doc.setFont('helvetica', 'bold');
       doc.setTextColor(0);
       doc.text(value, 75, y, { align: 'right' });
       doc.setFont('helvetica', 'normal');
       doc.setTextColor(100);
       y += 8;
    };

    addLine("Data:", new Date(transaction.date).toLocaleDateString('pt-BR'));
    addLine("Tipo:", transaction.description);
    
    if (transaction.memberOrSupplierName) {
      addLine("Pagador:", transaction.memberOrSupplierName.substring(0, 20));
    }
    
    doc.line(5, y, 75, y);
    y += 5;
    
    doc.setFontSize(7);
    doc.text("ID Transação:", 40, y, { align: 'center' });
    y += 4;
    doc.text(transaction.id, 40, y, { align: 'center' });
    y += 10;
    
    doc.text("Comprovante Digital MVPFin", 40, y, { align: 'center' });

    if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    } else {
        doc.save(`recibo_${transaction.id}.pdf`);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-black/10 p-1.5 rounded-full transition-colors dark:text-white">
          <X size={20} />
        </button>

        {/* Receipt Visual */}
        <div className="flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-gray-50 dark:bg-slate-700 p-8 flex flex-col items-center border-b-2 border-dashed border-gray-200 dark:border-slate-600 relative">
               <div className="w-6 h-6 bg-gray-100 dark:bg-slate-800 rounded-full absolute -bottom-3 -left-3"></div>
               <div className="w-6 h-6 bg-gray-100 dark:bg-slate-800 rounded-full absolute -bottom-3 -right-3"></div>
               
               <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                 <CheckCircle size={24} />
               </div>
               <h3 className="text-emerald-600 dark:text-emerald-400 font-bold text-lg mb-1">Recebimento Confirmado</h3>
               <p className="text-gray-500 dark:text-gray-400 text-xs">{dateStr}</p>
            </div>

            {/* Body */}
            <div className="w-full p-8 space-y-6">
               <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Total</p>
                  <h2 className="text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
                    {formatter.format(transaction.amount)}
                  </h2>
               </div>

               <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500 dark:text-gray-400">Descrição</span>
                     <span className="font-bold text-gray-800 dark:text-white">{transaction.description}</span>
                  </div>
                  {transaction.memberOrSupplierName && (
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500 dark:text-gray-400">Origem</span>
                       <span className="font-bold text-gray-800 dark:text-white">{transaction.memberOrSupplierName}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500 dark:text-gray-400">Instituição</span>
                     <span className="font-bold text-gray-800 dark:text-white flex items-center gap-1">
                       <Building2 size={12}/> {church.name}
                     </span>
                  </div>
               </div>
            </div>

            {/* Footer Actions */}
            <div className="w-full p-4 bg-gray-50 dark:bg-slate-700/50 flex gap-3">
               <button 
                 onClick={() => handleAction('print')}
                 className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 py-3 rounded-xl font-bold text-sm transition-colors"
               >
                 <Printer size={18} /> Imprimir
               </button>
               <button 
                 onClick={() => handleAction('download')}
                 className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
               >
                 <Download size={18} /> Salvar PDF
               </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
