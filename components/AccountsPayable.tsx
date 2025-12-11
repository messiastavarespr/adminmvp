import React, { useState } from 'react';
import { Transaction, ScheduledTransaction, TransactionType, Category, CostCenter } from '../types';
import { ClipboardList, Filter, AlertTriangle, CheckCircle, Clock, Download, Calendar } from './ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AccountsPayableProps {
  transactions: Transaction[];
  scheduled: ScheduledTransaction[];
  categories: Category[];
  costCenters: CostCenter[];
}

type PayableStatus = 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE';

interface PayableItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryName: string;
  costCenterName: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  source: 'TRANSACTION' | 'SCHEDULED';
  paymentDate?: string;
}

const AccountsPayable: React.FC<AccountsPayableProps> = ({ transactions, scheduled, categories, costCenters }) => {
  // Date State: Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [statusFilter, setStatusFilter] = useState<PayableStatus>('ALL');
  const [specificPaymentDate, setSpecificPaymentDate] = useState('');

  // Helper Functions
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';
  const getCostCenterName = (id?: string) => costCenters.find(c => c.id === id)?.name || '-';
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Data Processing
  const getUnifiedData = (): PayableItem[] => {
    const items: PayableItem[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Paid Expenses (Transactions)
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        items.push({
          id: t.id,
          date: t.date, // Transaction date is payment date
          description: t.description,
          amount: t.amount,
          categoryName: getCategoryName(t.categoryId || ''),
          costCenterName: getCostCenterName(t.costCenterId),
          status: 'PAID',
          source: 'TRANSACTION',
          paymentDate: t.date
        });
      });

    // 2. Pending/Overdue Expenses (Scheduled)
    scheduled
      .filter(s => s.isActive && s.type === TransactionType.EXPENSE)
      .forEach(s => {
        const isOverdue = s.dueDate < todayStr;
        items.push({
          id: s.id,
          date: s.dueDate, // Scheduled date is Due Date
          description: s.title,
          amount: s.amount,
          categoryName: getCategoryName(s.categoryId),
          costCenterName: getCostCenterName(s.costCenterId),
          status: isOverdue ? 'OVERDUE' : 'PENDING',
          source: 'SCHEDULED',
          paymentDate: undefined
        });
      });

    return items;
  };

  const allItems = getUnifiedData();

  // Apply Filters
  const filteredItems = allItems.filter(item => {
    const dateMatch = item.date >= startDate && item.date <= endDate;
    const statusMatch = statusFilter === 'ALL' || item.status === statusFilter;
    
    // Additional specific payment date filter
    const paymentDateMatch = !specificPaymentDate || (item.paymentDate === specificPaymentDate);

    return dateMatch && statusMatch && paymentDateMatch;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculations
  const totalPaid = filteredItems.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = filteredItems.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = filteredItems.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0);
  const totalTotal = totalPaid + totalPending + totalOverdue;

  // --- PDF Export Function ---
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("RELATÓRIO DE CONTAS A PAGAR", 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`, 105, 22, { align: 'center' });
    
    let statusLabel = 'Todos';
    if (statusFilter === 'PAID') statusLabel = 'Pagas';
    if (statusFilter === 'PENDING') statusLabel = 'Pendentes';
    if (statusFilter === 'OVERDUE') statusLabel = 'Vencidas';
    
    if (specificPaymentDate) {
        statusLabel += ` | Pgto em: ${new Date(specificPaymentDate).toLocaleDateString('pt-BR')}`;
    }
    
    doc.text(`Filtro: ${statusLabel}`, 105, 27, { align: 'center' });

    // Table Body
    const tableBody = filteredItems.map(item => {
      let statusText = '';
      let statusColor = [0, 0, 0]; // Black default

      if (item.status === 'PAID') { statusText = 'Pago'; statusColor = [16, 185, 129]; }
      else if (item.status === 'PENDING') { statusText = 'Pendente'; statusColor = [245, 158, 11]; }
      else if (item.status === 'OVERDUE') { statusText = 'Vencido'; statusColor = [239, 68, 68]; }

      return [
        new Date(item.date).toLocaleDateString('pt-BR'), // Vencimento
        item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('pt-BR') : '-', // Pagamento
        item.description,
        item.categoryName,
        item.costCenterName,
        { content: statusText, styles: { textColor: statusColor, fontStyle: 'bold' as 'bold' } },
        formatter.format(item.amount)
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Vencimento', 'Pagamento', 'Descrição', 'Categoria', 'Centro de Custo', 'Status', 'Valor']],
      body: tableBody as any,
      styles: { fontSize: 8, cellPadding: 1.4, valign: 'middle' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        5: { cellWidth: 20 },
        6: { cellWidth: 25, halign: 'right' as const, fontStyle: 'bold' as const }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Summary Section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, finalY, 180, 25, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text("RESUMO FINANCEIRO", 105, finalY + 7, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Pagas:`, 25, finalY + 16);
    doc.setTextColor(16, 185, 129);
    doc.text(formatter.format(totalPaid), 50, finalY + 16);

    doc.setTextColor(50, 50, 50);
    doc.text(`A Vencer:`, 70, finalY + 16);
    doc.setTextColor(245, 158, 11);
    doc.text(formatter.format(totalPending), 100, finalY + 16);

    doc.setTextColor(50, 50, 50);
    doc.text(`Vencidas:`, 125, finalY + 16);
    doc.setTextColor(239, 68, 68);
    doc.text(formatter.format(totalOverdue), 155, finalY + 16);

    doc.setDrawColor(200);
    doc.line(20, finalY + 20, 190, finalY + 20);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL:`, 130, finalY + 24); 
    (doc as any).text(formatter.format(totalTotal), 175, finalY + 24, { align: 'right' });

    doc.save('contas_a_pagar.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-rose-600" />
            Contas a Pagar
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Relatório consolidado de despesas pagas e pendentes.
          </p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
        >
          <Download size={18} /> Imprimir Relatório
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
           <div className="relative">
             <Filter className="absolute left-3 top-2.5 text-gray-400" size={14} />
             <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value as PayableStatus)}
               className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 w-full"
             >
               <option value="ALL">Todos</option>
               <option value="PAID">Pagas</option>
               <option value="PENDING">Pendentes (A Vencer)</option>
               <option value="OVERDUE">Vencidas</option>
             </select>
           </div>
        </div>
        
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">De (Vencimento/Pagto)</label>
           <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
           />
        </div>
        
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Até</label>
           <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
           />
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filtrar Data Pagamento</label>
           <div className="relative">
             <Calendar className="absolute left-3 top-2.5 text-gray-400" size={14} />
             <input 
              type="date" 
              value={specificPaymentDate} 
              onChange={e => setSpecificPaymentDate(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Selecionar data..."
             />
           </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
           <p className="text-xs font-bold text-gray-500 uppercase">Total Geral</p>
           <p className="text-xl font-bold text-gray-800 dark:text-white">{formatter.format(totalTotal)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
           <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><CheckCircle size={12}/> Pagas</p>
           <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatter.format(totalPaid)}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
           <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><Clock size={12}/> A Vencer</p>
           <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatter.format(totalPending)}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30">
           <p className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1"><AlertTriangle size={12}/> Vencidas</p>
           <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{formatter.format(totalOverdue)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Data Pagto</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Centro de Custo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">Nenhuma conta encontrada para os filtros selecionados.</td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={`${item.source}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {item.paymentDate ? (
                        <span className="text-emerald-600 font-medium">{new Date(item.paymentDate).toLocaleDateString('pt-BR')}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {item.categoryName}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {item.costCenterName}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'PAID' && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Pago
                        </span>
                      )}
                      {item.status === 'PENDING' && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Pendente
                        </span>
                      )}
                      {item.status === 'OVERDUE' && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                          Vencido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white">
                      {formatter.format(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayable;