
import React, { useState, useEffect } from 'react';
import { AppData, TransactionType, Transaction } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { FileText, Download, TrendingUp, TrendingDown, Wallet, List, CalendarRange, FileCheck, History, CalendarClock, Filter, Eye, X, PieChart as PieIcon, Calculator, Scale, Users, Target } from './ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TithingReport from './TithingReport';
import AuditLogViewer from './AuditLog';
import AccountingReports from './AccountingReports';
import { FinancialStatement } from './FinancialStatement';

interface ReportsProps {
  data: AppData;
}

type ReportPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY';

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'categories' | 'accounts' | 'detailed' | 'tithing' | 'audit' | 'accounting' | 'council' | 'statement'>('financial');

  // -- Financial Report States --
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('MONTHLY');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculatedRange, setCalculatedRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [fundFilter, setFundFilter] = useState('ALL');

  // -- Fiscal Council States --
  const [councilMembers, setCouncilMembers] = useState([
    { name: '', cpf: '' },
    { name: '', cpf: '' },
    { name: '', cpf: '' }
  ]);

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const date = new Date(referenceDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    let start = new Date(date);
    let end = new Date(date);

    switch (reportPeriod) {
      case 'WEEKLY':
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(date.setDate(diff));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'MONTHLY':
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;
      case 'QUARTERLY':
        const quarter = Math.floor(month / 3);
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, (quarter + 1) * 3, 0);
        break;
      case 'SEMIANNUAL':
        const semester = month < 6 ? 0 : 1;
        start = new Date(year, semester * 6, 1);
        end = new Date(year, (semester + 1) * 6, 0);
        break;
      case 'YEARLY':
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
    }

    const offsetStart = start.getTimezoneOffset() * 60000;
    const offsetEnd = end.getTimezoneOffset() * 60000;

    setCalculatedRange({
      start: new Date(start.getTime() - offsetStart).toISOString().split('T')[0],
      end: new Date(end.getTime() - offsetEnd).toISOString().split('T')[0]
    });

    setShowPreview(false);
  }, [reportPeriod, referenceDate]);

  const getFinancialData = () => {
    const { start, end } = calculatedRange;
    if (!start || !end) return { initialBalance: 0, income: 0, expense: 0, finalBalance: 0, transactions: [] };

    const filterFn = (t: Transaction) => fundFilter === 'ALL' || t.fundId === fundFilter;

    const prevTransactions = data.transactions.filter(t => t.date < start && filterFn(t));

    const calculatedInitialBalance = prevTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) return acc + t.amount;
      if (t.type === TransactionType.EXPENSE) return acc - t.amount;
      return acc;
    }, 0);

    const accountInitials = fundFilter === 'ALL' ? data.accounts.reduce((sum, acc) => sum + acc.initialBalance, 0) : 0;
    const adjustedInitialBalance = accountInitials + calculatedInitialBalance;

    const periodTransactions = data.transactions.filter(t => t.date >= start && t.date <= end && filterFn(t)).sort((a, b) => a.date.localeCompare(b.date));

    const income = periodTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = periodTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

    const finalBalance = adjustedInitialBalance + income - expense;

    return { initialBalance: adjustedInitialBalance, income, expense, finalBalance, transactions: periodTransactions };
  };

  const financialData = getFinancialData();

  const getEvolutionData = () => {
    const { transactions } = financialData;
    const isLongPeriod = ['QUARTERLY', 'SEMIANNUAL', 'YEARLY'].includes(reportPeriod);
    const groupedData: Record<string, { name: string, income: number, expense: number, date: string }> = {};

    transactions.forEach(t => {
      let key = t.date;
      let label = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (isLongPeriod) {
        key = t.date.substring(0, 7);
        const [y, m] = key.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
        label = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
      }

      if (!groupedData[key]) {
        groupedData[key] = { name: label, income: 0, expense: 0, date: key };
      }

      if (t.type === TransactionType.INCOME) groupedData[key].income += t.amount;
      if (t.type === TransactionType.EXPENSE) groupedData[key].expense += t.amount;
    });

    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  };

  const evolutionData = getEvolutionData();

  const getChartData = () => {
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};
    let totalInc = 0;
    let totalExp = 0;

    financialData.transactions.forEach(t => {
      const catName = data.categories.find(c => c.id === t.categoryId)?.name || '...';
      if (t.type === TransactionType.INCOME) { incomeCats[catName] = (incomeCats[catName] || 0) + t.amount; totalInc += t.amount; }
      if (t.type === TransactionType.EXPENSE) { expenseCats[catName] = (expenseCats[catName] || 0) + t.amount; totalExp += t.amount; }
    });

    const incomeList = Object.entries(incomeCats).map(([name, value]) => ({ name, value, percent: totalInc ? (value / totalInc) * 100 : 0 })).sort((a, b) => b.value - a.value);
    const expenseList = Object.entries(expenseCats).map(([name, value]) => ({ name, value, percent: totalExp ? (value / totalExp) * 100 : 0 })).sort((a, b) => b.value - a.value);

    return { income: incomeList, expense: expenseList, totalInc, totalExp };
  };

  const charts = getChartData();
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const exportFiscalCouncilPDF = () => {
    const doc = new jsPDF();
    const hq = data.churches.find(c => c.type === 'HEADQUARTERS') || data.churches[0];
    const { start, end } = calculatedRange;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // -- PAGE 1: CAPA --
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(hq.name.toUpperCase(), pageWidth / 2, 60, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("CNPJ: " + (hq.cnpj || "Não informado"), pageWidth / 2, 70, { align: 'center' });

    doc.setFontSize(26);
    doc.setTextColor(0);
    doc.text("RELATÓRIO FINANCEIRO", pageWidth / 2, 110, { align: 'center' });
    doc.setFontSize(18);
    doc.text("CONSELHO FISCAL", pageWidth / 2, 120, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(`Período de Análise:`, pageWidth / 2, 150, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`, pageWidth / 2, 160, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Emitido em ${today}`, pageWidth / 2, 250, { align: 'center' });

    doc.addPage();

    // -- PAGE 2 --
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(hq.name.toUpperCase(), 14, 15);
    doc.line(14, 17, pageWidth - 14, 17);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text("1. DECLARAÇÃO DO CONSELHO FISCAL", 14, 28);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const declarationText = `O Conselho Fiscal da ${hq.name}, no uso de suas atribuições estatutárias, declara que procedeu à análise minuciosa das movimentações financeiras referentes ao período supracitado. A verificação compreendeu o exame do Livro-Caixa, extratos bancários, comprovantes de despesas, relatórios de entradas (dízimos e ofertas) e a conformidade dos gastos com o estatuto da igreja e as boas práticas de gestão eclesiástica.`;

    const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 28);
    doc.text(splitDeclaration, 14, 38);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("2. RESUMO FINANCEIRO DO PERÍODO", 14, 75);

    autoTable(doc, {
      startY: 85,
      head: [['Conceito', 'Valor (R$)']],
      body: [
        ['Saldo Anterior (Inicial)', formatter.format(financialData.initialBalance)],
        ['Total de Entradas (+)', formatter.format(financialData.income)],
        ['Total de Saídas (-)', formatter.format(financialData.expense)],
        ['Saldo Final (=)', { content: formatter.format(financialData.finalBalance), styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("3. DETALHAMENTO DAS MOVIMENTAÇÕES", 14, finalY);

    const groups = {
      dizimos: 0,
      ofertas: 0,
      eventos: 0,
      fixas: 0,
      variaveis: 0,
      patrimonio: 0
    };

    const costCenterTotals: Record<string, number> = {};

    financialData.transactions.forEach(t => {
      const catName = data.categories.find(c => c.id === t.categoryId)?.name.toLowerCase() || '';
      const isIncome = t.type === TransactionType.INCOME;

      if (t.costCenterId) {
        const ccName = data.costCenters.find(cc => cc.id === t.costCenterId)?.name || 'Geral';
        if (!costCenterTotals[ccName]) costCenterTotals[ccName] = 0;
        if (isIncome) costCenterTotals[ccName] += t.amount; else costCenterTotals[ccName] -= t.amount;
      }

      if (isIncome) {
        if (catName.includes('dízimo') || catName.includes('dizimo')) groups.dizimos += t.amount;
        else if (catName.includes('oferta')) groups.ofertas += t.amount;
        else groups.eventos += t.amount;
      } else {
        if (catName.includes('aluguel') || catName.includes('energia') || catName.includes('água') || catName.includes('internet') || catName.includes('salário') || catName.includes('pessoal')) groups.fixas += t.amount;
        else if (catName.includes('compra') || catName.includes('equipamento') || catName.includes('obra')) groups.patrimonio += t.amount;
        else groups.variaveis += t.amount;
      }
    });

    const deptRows = Object.entries(costCenterTotals)
      .filter(([name]) => name !== 'Geral')
      .map(([name, val]) => [`Departamento: ${name}`, formatter.format(val)]);

    autoTable(doc, {
      startY: finalY + 10,
      head: [['Categoria / Natureza', 'Total (R$)']],
      body: [
        [{ content: 'ENTRADAS', colSpan: 2, styles: { fillColor: [220, 252, 231], fontStyle: 'bold' } }],
        ['Dízimos', formatter.format(groups.dizimos)],
        ['Ofertas', formatter.format(groups.ofertas)],
        ['Eventos/Outros', formatter.format(groups.eventos)],
        [{ content: 'SAÍDAS', colSpan: 2, styles: { fillColor: [254, 226, 226], fontStyle: 'bold' } }],
        ['Despesas Fixas/Operacionais', formatter.format(groups.fixas)],
        ['Despesas Variáveis/Consumo', formatter.format(groups.variaveis)],
        ['Patrimônio/Investimento', formatter.format(groups.patrimonio)],
        [{ content: 'RESULTADO POR DEPARTAMENTO (Saldo)', colSpan: 2, styles: { fillColor: [230, 230, 230], fontStyle: 'bold' } }],
        ...deptRows
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 1: { halign: 'right' } }
    });

    doc.addPage();

    // -- PAGE 3 --
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(hq.name.toUpperCase(), 14, 15);
    doc.line(14, 17, pageWidth - 14, 17);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text("4. ANÁLISE TÉCNICA E INDICADORES", 14, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const result = financialData.income - financialData.expense;
    const isPositive = result >= 0;
    const savingsRate = financialData.income > 0 ? ((financialData.income - financialData.expense) / financialData.income) * 100 : 0;

    let analysisText = "";
    analysisText += `O período apresentou um resultado ${isPositive ? 'superavitário' : 'deficitário'} de ${formatter.format(result)}. `;
    analysisText += `A taxa de poupança/reserva do período foi de ${savingsRate.toFixed(1)}%. `;

    if (groups.fixas > (financialData.expense * 0.7)) {
      analysisText += "Ponto de Atenção: As despesas fixas representam mais de 70% das saídas, indicando alta rigidez orçamentária. ";
    } else {
      analysisText += "As despesas fixas estão dentro de um patamar saudável de controle. ";
    }

    if (financialData.finalBalance < 0) {
      analysisText += "ALERTA DE RISCO: O saldo final está negativo, exigindo aporte imediato ou revisão urgente de gastos. ";
    } else {
      analysisText += "O saldo final positivo demonstra capacidade de solvência imediata. ";
    }

    const splitAnalysis = doc.splitTextToSize(analysisText, pageWidth - 28);
    doc.text(splitAnalysis, 14, 40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("5. PARECER DO CONSELHO FISCAL", 14, 80);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const status = financialData.finalBalance >= 0 ? "REGULARES" : "REGULARES COM RESSALVAS";

    const opinionText = `Após a verificação da documentação apresentada e considerando os demonstrativos acima expostos, este Conselho Fiscal conclui que as contas e demonstrações financeiras referentes ao período analisado encontram-se ${status}, refletindo adequadamente a posição patrimonial e financeira da instituição. Recomendamos a aprovação das mesmas pela Assembleia.`;

    const splitOpinion = doc.splitTextToSize(opinionText, pageWidth - 28);
    doc.text(splitOpinion, 14, 90);

    let sigY = 160;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("CONSELHO FISCAL - TITULARES", pageWidth / 2, sigY - 20, { align: 'center' });

    councilMembers.forEach((member, index) => {
      doc.setLineWidth(0.5);
      doc.line(40, sigY, pageWidth - 40, sigY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(member.name || `Membro Titular ${index + 1}`, pageWidth / 2, sigY + 5, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`CPF: ${member.cpf || '___.___.___-__'}`, pageWidth / 2, sigY + 9, { align: 'center' });
      sigY += 35;
    });

    doc.save('relatorio_conselho_fiscal.pdf');
  };

  const exportFinancialPDF = () => {
    const doc = new jsPDF();
    const hq = data.churches.find(c => c.type === 'HEADQUARTERS') || data.churches[0];
    const { start, end } = calculatedRange;
    const fundName = fundFilter === 'ALL' ? 'Todos os Fundos' : data.funds.find(f => f.id === fundFilter)?.name || 'Fundo Específico';

    doc.setFillColor(248, 250, 252); doc.rect(0, 0, 210, 55, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59); doc.text(hq.name.toUpperCase(), 105, 15, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    let yPos = 22;
    const details = [hq.cnpj ? `CNPJ: ${hq.cnpj}` : '', hq.phone ? `Tel: ${hq.phone}` : ''].filter(Boolean).join('  |  ');
    doc.text(details, 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text([hq.address, hq.city, hq.state].filter(Boolean).join(' - '), 105, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
    doc.text('RELATÓRIO FINANCEIRO', 105, yPos, { align: 'center' });
    yPos += 5;
    doc.setFontSize(10); doc.setTextColor(50);
    doc.text(`Fundo/Projeto: ${fundName}`, 105, yPos, { align: 'center' });
    yPos += 5;
    const periodLabel = { 'WEEKLY': 'Semanal', 'MONTHLY': 'Mensal', 'QUARTERLY': 'Trimestral', 'SEMIANNUAL': 'Semestral', 'YEARLY': 'Anual' }[reportPeriod];
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text(`${periodLabel}: ${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`, 105, yPos, { align: 'center' });
    yPos += 10;

    let runningBalance = financialData.initialBalance;

    autoTable(doc, {
      startY: yPos,
      head: [['Data', 'Descrição', 'Categoria', 'Fundo', 'Valor', 'Saldo']],
      body: financialData.transactions.map(t => {
        const isCredit = t.type === TransactionType.INCOME;
        if (isCredit) runningBalance += t.amount; else runningBalance -= t.amount;
        return [
          new Date(t.date).toLocaleDateString('pt-BR'), t.description,
          data.categories.find(c => c.id === t.categoryId)?.name || '-',
          data.funds.find(f => f.id === t.fundId)?.name || '-',
          { content: (isCredit ? '+ ' : '- ') + formatter.format(t.amount), styles: { textColor: isCredit ? [16, 185, 129] : [239, 68, 68], fontStyle: 'bold', halign: 'right' } },
          { content: formatter.format(runningBalance), styles: { textColor: runningBalance >= 0 ? [37, 99, 235] : [239, 68, 68], fontStyle: 'bold', halign: 'right' } }
        ];
      }),
      styles: { fontSize: 8, cellPadding: 1.4, valign: 'middle' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200);
    doc.roundedRect(14, finalY, 182, 25, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);

    doc.text('Total Entradas:', 20, finalY + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(formatter.format(financialData.income), 20, finalY + 18);

    doc.setTextColor(50);
    doc.text('Total Saídas:', 80, finalY + 10);
    doc.setTextColor(239, 68, 68);
    doc.text(formatter.format(financialData.expense), 80, finalY + 18);

    doc.setTextColor(50);
    doc.text('Saldo Atual:', 140, finalY + 10);
    doc.setTextColor(37, 99, 235);
    doc.text(formatter.format(financialData.finalBalance), 140, finalY + 18);

    let sigY = finalY + 45;

    if (sigY > 260) {
      doc.addPage();
      sigY = 40;
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.line(65, sigY, 145, sigY);
    doc.text('Presidente Administrador Geral', 105, sigY + 5, { align: 'center' });

    sigY += 25;

    doc.line(20, sigY, 90, sigY);
    doc.text('Administrador Executivo', 55, sigY + 5, { align: 'center' });

    doc.line(120, sigY, 190, sigY);
    doc.text('Tesoureiro', 155, sigY + 5, { align: 'center' });

    doc.save(`relatorio_${reportPeriod.toLowerCase()}_${start}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><FileText className="text-blue-600" /> Central de Relatórios</h1>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 pb-1 scrollbar-hide">
        {[{ id: 'financial', label: 'Relatório Financeiro', icon: Wallet }, { id: 'statement', label: 'Balancete (Oficial)', icon: FileText }, { id: 'categories', label: 'Por Categoria', icon: PieIcon }, { id: 'council', label: 'Conselho Fiscal', icon: Scale }, { id: 'tithing', label: 'Dízimos & Ofertas', icon: FileCheck }, { id: 'accounting', label: 'Contabilidade', icon: Calculator }, { id: 'audit', label: 'Auditoria', icon: History }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}><tab.icon size={16} /> {tab.label}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
        {(activeTab === 'financial' || activeTab === 'categories' || activeTab === 'council') && (
          <div className="flex flex-col xl:flex-row gap-4 items-end bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 mb-6">
            <div className="w-full xl:w-auto">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tipo de Relatório</label>
              <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-1 overflow-x-auto">
                {[{ id: 'WEEKLY', label: 'Semanal' }, { id: 'MONTHLY', label: 'Mensal' }, { id: 'QUARTERLY', label: 'Trimestral' }, { id: 'SEMIANNUAL', label: 'Semestral' }, { id: 'YEARLY', label: 'Anual' }].map(type => (
                  <button key={type.id} onClick={() => setReportPeriod(type.id as ReportPeriod)} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${reportPeriod === type.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{type.label}</button>
                ))}
              </div>
            </div>
            {activeTab !== 'council' && (
              <div className="w-full xl:w-auto min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filtrar por Fundo</label>
                <select value={fundFilter} onChange={(e) => setFundFilter(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ALL">Todos os Fundos</option>
                  {data.funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data de Referência</label>
              <div className="flex items-center gap-2">
                <input type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">{new Date(calculatedRange.start).toLocaleDateString('pt-BR')} até {new Date(calculatedRange.end).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            {activeTab === 'financial' && (
              <div className="flex w-full xl:w-auto gap-2">
                <button onClick={() => setShowPreview(!showPreview)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${showPreview ? 'bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'}`}>{showPreview ? <X size={18} /> : <Eye size={18} />}{showPreview ? 'Ocultar' : 'Visualizar'}</button>
                <button onClick={exportFinancialPDF} className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"><Download size={18} /> PDF</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-8 animate-in fade-in">
            {showPreview ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Header do Relatório */}
                <div className="bg-gray-50 dark:bg-slate-700/50 p-6 border-b border-gray-200 dark:border-slate-700 text-center">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase mb-1">Relatório Financeiro</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Fundo: {fundFilter === 'ALL' ? 'Todos os Fundos' : data.funds.find(f => f.id === fundFilter)?.name}
                  </p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Período: {new Date(calculatedRange.start).toLocaleDateString('pt-BR')} a {new Date(calculatedRange.end).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Tabela de Transações */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Categoria</th>
                        <th className="px-6 py-3">Fundo</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {/* Saldo Inicial */}
                      <tr className="bg-gray-50/50 dark:bg-slate-800/50">
                        <td className="px-6 py-3 font-medium" colSpan={4}>Saldo Anterior (Inicial)</td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {/* Valor vazio para saldo inicial na coluna de valor */}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {formatter.format(financialData.initialBalance)}
                        </td>
                      </tr>

                      {financialData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            Nenhuma movimentação neste período
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          let runningBalance = financialData.initialBalance;
                          return financialData.transactions.map((t) => {
                            const isCredit = t.type === TransactionType.INCOME;
                            if (isCredit) runningBalance += t.amount; else runningBalance -= t.amount;

                            return (
                              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                  {new Date(t.date).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-3 max-w-[300px] truncate text-gray-900 dark:text-white font-medium">
                                  {t.description}
                                </td>
                                <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                                  {data.categories.find(c => c.id === t.categoryId)?.name || '-'}
                                </td>
                                <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                                  {data.funds.find(f => f.id === t.fundId)?.name || '-'}
                                </td>
                                <td className={`px-6 py-3 text-right font-medium ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {isCredit ? '+' : '-'} {formatter.format(t.amount)}
                                </td>
                                <td className={`px-6 py-3 text-right font-bold ${runningBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                  {formatter.format(runningBalance)}
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-slate-700/50 font-bold border-t-2 border-gray-200 dark:border-slate-600">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right text-gray-700 dark:text-gray-200">Total do Período:</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col gap-1">
                            <span className="text-emerald-600 text-xs">Entradas: {formatter.format(financialData.income)}</span>
                            <span className="text-red-500 text-xs">Saídas: {formatter.format(financialData.expense)}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right text-lg ${financialData.finalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                          {formatter.format(financialData.finalBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-[300px]">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Evolução no Período</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="Entradas" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Despesas por Categoria</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.expense} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {charts.expense.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatter.format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Entradas por Categoria</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.income} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {charts.income.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatter.format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'council' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex gap-4 items-start">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-700 dark:text-indigo-300">
                <Scale size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300">Parecer do Conselho Fiscal</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                  Gere o relatório oficial para assinatura dos membros do conselho fiscal. O documento inclui análise automática de indicadores e espaço para assinaturas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {councilMembers.map((member, idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Membro Titular {idx + 1}</label>
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    value={member.name}
                    onChange={(e) => { const newMembers = [...councilMembers]; newMembers[idx].name = e.target.value; setCouncilMembers(newMembers); }}
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="CPF"
                    value={member.cpf}
                    onChange={(e) => { const newMembers = [...councilMembers]; newMembers[idx].cpf = e.target.value; setCouncilMembers(newMembers); }}
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={exportFiscalCouncilPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95">
                <FileText size={20} /> Gerar Parecer Fiscal (PDF)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tithing' && <TithingReport data={data} />}

        {activeTab === 'accounting' && <AccountingReports data={data} />}

        {activeTab === 'statement' && <FinancialStatement />}

        {activeTab === 'audit' && <AuditLogViewer logs={data.auditLogs} />}

      </div>
    </div>
  );
};

export default Reports;
