
import React, { useState } from 'react';
import { AppData, TransactionType } from '../types';
import { Download, FileCheck, Search, FileText } from './ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TithingReportProps {
  data: AppData;
}

const TithingReport: React.FC<TithingReportProps> = ({ data }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today

  // Filter Members (only Members and Visitors, not Suppliers)
  const eligibleMembers = data.members.filter(m => m.type === 'MEMBER' || m.type === 'VISITOR');

  // Logic to find relevant transactions
  const getReportData = () => {
    if (!selectedMemberId) return [];

    return data.transactions.filter(t => {
      const isMember = t.memberOrSupplierId === selectedMemberId;
      const isIncome = t.type === TransactionType.INCOME;
      const inDateRange = t.date >= startDate && t.date <= endDate;
      return isMember && isIncome && inDateRange;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const reportData = getReportData();

  // Totals
  const totalAmount = reportData.reduce((sum, t) => sum + t.amount, 0);
  
  // Categorize based on Category Name (Simplistic heuristic for Tithe vs Offering)
  const titheCategoryIds = data.categories
    .filter(c => c.name.toLowerCase().includes('dízimo') || c.name.toLowerCase().includes('dizimo'))
    .map(c => c.id);

  const totalTithes = reportData
    .filter(t => titheCategoryIds.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOfferings = totalAmount - totalTithes;

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const getCategoryName = (id: string) => data.categories.find(c => c.id === id)?.name || 'Outros';
  const getMemberName = () => data.members.find(m => m.id === selectedMemberId)?.name || '';

  const exportPDF = () => {
    if (!selectedMemberId) return;

    const doc = new jsPDF();
    const memberName = getMemberName();
    const hq = data.churches.find(c => c.type === 'HEADQUARTERS') || data.churches[0];

    // --- HEADER ---
    // 1. CHURCH NAME (TOP)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(hq.name.toUpperCase(), 105, 20, { align: 'center' });

    // 2. REPORT TITLE (BELOW CHURCH NAME)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue
    doc.text('Declaração Anual de Dízimos e Ofertas', 105, 28, { align: 'center' });

    // 3. DETAILS (CNPJ)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    let yPos = 35;
    if (hq.cnpj) {
      doc.text(`CNPJ: ${hq.cnpj}`, 105, yPos, { align: 'center' });
      yPos += 4;
    }
    
    // 4. ADDRESS
    const addressParts = [hq.address, hq.city, hq.state, hq.zipCode].filter(Boolean);
    if (addressParts.length > 0) {
       doc.text(addressParts.join(' - '), 105, yPos, { align: 'center' });
       yPos += 4;
    }

    // 5. EMAIL (BELOW ADDRESS)
    const contactParts = [hq.phone, hq.email].filter(Boolean);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), 105, yPos, { align: 'center' });
      yPos += 8;
    }

    // Separator Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // --- MEMBER INFO ---
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Membro: ${memberName}`, 14, yPos);
    yPos += 5;
    doc.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`, 14, yPos);
    yPos += 5;
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPos);
    yPos += 8;

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yPos, 180, 25, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text('RESUMO DO PERÍODO', 104, yPos + 8, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Total de Dízimos: ${formatter.format(totalTithes)}`, 20, yPos + 18);
    doc.text(`Total de Ofertas: ${formatter.format(totalOfferings)}`, 100, yPos + 18);
    
    // Table
    yPos += 35;

    autoTable(doc, {
      startY: yPos,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: reportData.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        getCategoryName(t.categoryId),
        formatter.format(t.amount)
      ]),
      // FOOTER TOTAL
      foot: [[
        { content: 'CONTRIBUIÇÃO TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatter.format(totalAmount), styles: { halign: 'right', fontStyle: 'bold', textColor: [41, 128, 185] } }
      ]],
      headStyles: { 
        fillColor: [41, 128, 185],
        fontSize: 9 // Header font size
      },
      styles: {
        fontSize: 8, // Body Font Size 8 as requested
        cellPadding: 3
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [50, 50, 50],
        fontSize: 9
      },
      columnStyles: {
        3: { halign: 'right' }
      }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    
    doc.setLineWidth(0.5);
    doc.line(30, finalY, 90, finalY);
    doc.line(120, finalY, 180, finalY);
    
    doc.setFontSize(8);
    doc.text('Tesouraria', 60, finalY + 5, { align: 'center' });
    doc.text('Contribuinte', 150, finalY + 5, { align: 'center' });

    doc.save(`relatorio_dizimos_${memberName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Membro</label>
            <div className="relative">
               <Search className="absolute left-3 top-2.5 text-gray-400" size={14}/>
               <select
                 value={selectedMemberId}
                 onChange={(e) => setSelectedMemberId(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value="">Selecione um membro...</option>
                 {eligibleMembers.map(m => (
                   <option key={m.id} value={m.id}>{m.name}</option>
                 ))}
               </select>
            </div>
          </div>
          <div className="w-full md:w-auto">
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Início</label>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"/>
          </div>
          <div className="w-full md:w-auto">
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fim</label>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"/>
          </div>
          <button 
            onClick={exportPDF}
            disabled={!selectedMemberId}
            className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 ${
               selectedMemberId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <Download size={16}/> Gerar PDF
          </button>
       </div>

       {/* Report Preview */}
       {selectedMemberId && (
         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-500"/> Extrato de Contribuição
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getMemberName()}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total do Período</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatter.format(totalAmount)}</p>
               </div>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-slate-700">
               <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Dízimos</span>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatter.format(totalTithes)}</p>
               </div>
               <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Ofertas</span>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatter.format(totalOfferings)}</p>
               </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 sticky top-0">
                     <tr>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Descrição</th>
                        <th className="px-4 py-2">Categoria</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                     {reportData.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500">Nenhuma contribuição no período.</td></tr>
                     ) : (
                        reportData.map(t => (
                           <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{t.description}</td>
                              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{getCategoryName(t.categoryId)}</td>
                              <td className="px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatter.format(t.amount)}</td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
       )}
       
       {!selectedMemberId && (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
             <FileCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2"/>
             <p className="text-gray-500 dark:text-gray-400">Selecione um membro para gerar o relatório anual ou mensal de dízimos.</p>
          </div>
       )}
    </div>
  );
};

export default TithingReport;
