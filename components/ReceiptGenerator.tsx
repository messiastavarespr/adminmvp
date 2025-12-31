import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { FileText, Printer, CheckCircle, Copy, Download, Building2, Eye, X } from './ui/Icons';
import { Autocomplete } from './ui/Autocomplete';
import jsPDF from 'jspdf';
import { numberToWords } from '../utils/numberToWords';

interface ReceiptData {
    igreja: {
        nome: string;
        cnpj: string;
        endereco: string;
        cidade: string;
        estado: string;
    };
    documento: {
        tipo: string;
        numero_referencia: string;
    };
    beneficiario: {
        nome: string;
        cpf_cnpj: string;
        funcao_descricao: string;
        dados_bancarios_pix: string;
    };
    pagamento: {
        valor_numerico: number;
        valor_extenso: string;
        forma_pagamento: string;
        data_pagamento: string;
    };
    descricao: string;
}

export const ReceiptGenerator: React.FC = () => {
    const { data, activeChurchId, currentUser } = useFinance();
    const currentChurch = data.churches.find(c => c.id === (activeChurchId === 'ALL' ? currentUser?.churchId : activeChurchId));

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState<ReceiptData>({
        igreja: {
            nome: currentChurch?.name || '',
            cnpj: currentChurch?.cnpj || '',
            endereco: currentChurch?.address || '',
            cidade: '', // User to fill
            estado: '', // User to fill
        },
        documento: {
            tipo: 'RECIBO DE PAGAMENTO',
            numero_referencia: '',
        },
        beneficiario: {
            nome: '',
            cpf_cnpj: '',
            funcao_descricao: '',
            dados_bancarios_pix: '',
        },
        pagamento: {
            valor_numerico: 0,
            valor_extenso: '',
            forma_pagamento: 'PIX',
            data_pagamento: new Date().toISOString().split('T')[0],
        },
        descricao: '',
    });

    const handleInputChange = (section: keyof ReceiptData, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section] as any,
                [field]: value
            }
        }));
    };

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setFormData(prev => ({
            ...prev,
            pagamento: {
                ...prev.pagamento,
                valor_numerico: val,
                valor_extenso: numberToWords(val || 0)
            }
        }));
    };

    const handleRootChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.igreja.nome || !formData.igreja.cidade || !formData.igreja.estado) return false;
        if (!formData.beneficiario.nome || !formData.beneficiario.cpf_cnpj || !formData.beneficiario.funcao_descricao) return false;
        if (formData.pagamento.valor_numerico <= 0 || !formData.pagamento.valor_extenso || !formData.pagamento.data_pagamento) return false;
        if (!formData.descricao) return false;
        return true;
    };

    const generatePDF = (action: 'preview' | 'download') => {
        if (!validateForm()) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Helper to draw a single receipt at a specific Y offset
        const drawReceipt = (startY: number, copyLabel: string) => {
            const pageWidth = 210;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // Border
            doc.setDrawColor(80);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, startY, contentWidth, 135, 3, 3); // ~Half page height

            // Header Background
            doc.setFillColor(245, 247, 250); // Light gray/blue
            doc.roundedRect(margin + 0.5, startY + 0.5, contentWidth - 1, 25, 3, 3, 'F');

            // Logo / Church Name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text(formData.igreja.nome.toUpperCase(), margin + 5, startY + 12);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100);
            const headerText = formData.igreja.cidade + " - " + formData.igreja.estado + " | CNPJ: " + (formData.igreja.cnpj || '____________');
            doc.text(headerText, margin + 5, startY + 19);

            // Receipt Title & Number
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(30);
            doc.text(formData.documento.tipo.toUpperCase(), pageWidth - margin - 5, startY + 12, { align: 'right' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            const valueText = "Valor: R$ " + formData.pagamento.valor_numerico.toFixed(2);
            doc.text(valueText, pageWidth - margin - 5, startY + 19, { align: 'right' });

            // Line under header
            doc.setDrawColor(200);
            doc.line(margin, startY + 26, pageWidth - margin, startY + 26);

            // Body Content
            let y = startY + 40;
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            doc.setTextColor(0);

            const text = "Recebi(emos) de " + formData.igreja.nome + ", a importância supra de R$ " + formData.pagamento.valor_numerico.toFixed(2) + " (" + formData.pagamento.valor_extenso + "), referente a " + formData.descricao + ".";

            const splitText = doc.splitTextToSize(text, contentWidth - 20);
            doc.text(splitText, margin + 10, y);

            y += (splitText.length * 6) + 5;

            const paymentInfo = "O pagamento foi efetuado nesta data, em " + formData.pagamento.forma_pagamento + ", dando plena e geral quitação.";
            const splitPayment = doc.splitTextToSize(paymentInfo, contentWidth - 20);
            doc.text(splitPayment, margin + 10, y);

            // Date Location
            y += 20;
            const dateObj = new Date(formData.pagamento.data_pagamento);
            // Adjusting for timezone offset to prevent one-day-off error often interacting with pure dates
            const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);

            const dateStr = adjustedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.setFont("helvetica", "italic");
            doc.text(formData.igreja.cidade + "/" + formData.igreja.estado + ", " + dateStr, pageWidth - margin - 10, y, { align: 'right' });

            // Signatures
            y += 25;

            // Beneficiary Signature
            doc.setLineWidth(0.3);
            doc.line(margin + 20, y, margin + 80, y);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(formData.beneficiario.nome, margin + 50, y + 5, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const cpfCnpjText = "CPF / CNPJ: " + formData.beneficiario.cpf_cnpj;
            doc.text(cpfCnpjText, margin + 50, y + 9, { align: 'center' });
            const roleText = "(" + formData.beneficiario.funcao_descricao + ")";
            doc.text(roleText, margin + 50, y + 13, { align: 'center' });

            // Church Signature
            doc.line(pageWidth - margin - 80, y, pageWidth - margin - 20, y);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Tesouraria / Responsável", pageWidth - margin - 50, y + 5, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(formData.igreja.nome, pageWidth - margin - 50, y + 9, { align: 'center' });

            // Copy Label
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(copyLabel, margin + 5, startY + 132);
        };

        // Draw 1st Copy
        drawReceipt(10, "1ª VIA - CONTABILIDADE / IGREJA");

        // Cut Line
        doc.setDrawColor(150);
        doc.setLineDashPattern([3, 3], 0);
        doc.line(10, 148, 200, 148);
        doc.setLineDashPattern([], 0); // Reset

        // Draw 2nd Copy
        drawReceipt(158, "2ª VIA - BENEFICIÁRIO");

        if (action === 'download') {
            const fileName = "recibo_" + new Date().getTime() + ".pdf";
            doc.save(fileName);
        } else {
            const blobUrl = doc.output('bloburl');
            setPreviewUrl(blobUrl);
        }
    };

    const closePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-blue-600" /> Gerador de Recibos Profissional
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gere recibos em A4 (2 vias) pronto para impressão e recorte.</p>
            </div>

            {/* Preview Modal/Overlay */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Eye size={20} className="text-blue-600" /> Visualização do Recibo
                            </h3>
                            <button onClick={closePreview} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
                            <iframe src={previewUrl} className="w-full h-full rounded-lg shadow-sm bg-white" title="PDF Preview" />
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                            <button onClick={closePreview} className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                Fechar
                            </button>
                            <button onClick={() => generatePDF('download')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                <Download size={20} /> Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* FORM */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Church & Date */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                <Building2 size={16} /> Dados da Igreja / Emissor
                            </h3>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Igreja</label>
                                <input type="text" value={formData.igreja.nome} onChange={e => handleInputChange('igreja', 'nome', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
                                    <input type="text" value={formData.igreja.cidade} onChange={e => handleInputChange('igreja', 'cidade', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                                    <input type="text" value={formData.igreja.estado} onChange={e => handleInputChange('igreja', 'estado', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">CNPJ</label>
                                <input type="text" value={formData.igreja.cnpj} onChange={e => handleInputChange('igreja', 'cnpj', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-700">Detalhes do Pagamento</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor (R$)</label>
                                    <input type="number" value={formData.pagamento.valor_numerico} onChange={handleValorChange} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2 font-bold text-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                                    <input type="date" value={formData.pagamento.data_pagamento} onChange={e => handleInputChange('pagamento', 'data_pagamento', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Valor por Extenso</label>
                                <input type="text" value={formData.pagamento.valor_extenso} onChange={e => handleInputChange('pagamento', 'valor_extenso', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" placeholder="Ex: cem reais" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Forma de Pagamento</label>
                                <select value={formData.pagamento.forma_pagamento} onChange={e => handleInputChange('pagamento', 'forma_pagamento', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2">
                                    <option>PIX</option>
                                    <option>Dinheiro</option>
                                    <option>Transferência Bancária</option>
                                    <option>Cartão de Débito</option>
                                    <option>Cartão de Crédito</option>
                                    <option>Cheque</option>
                                </select>
                            </div>
                        </div>
                    </div>


                    {/* Beneficiary & Description */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-700">Beneficiário e Motivo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Autocomplete
                                    label="Nome Beneficiário (Quem recebeu)"
                                    value={formData.beneficiario.nome}
                                    onChange={val => handleInputChange('beneficiario', 'nome', val)}
                                    items={data.members || []}
                                    itemKey="name"
                                    onSelect={(member: any) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            beneficiario: {
                                                ...prev.beneficiario,
                                                nome: member.name,
                                                cpf_cnpj: member.document || '',
                                                funcao_descricao: member.type === 'SUPPLIER' ? 'Fornecedor' : (member.type === 'MEMBER' ? 'Membro' : '')
                                            }
                                        }));
                                    }}
                                    renderItem={(item: any) => (
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-xs text-slate-500">{item.document ? `CPF/CNPJ: ${item.document}` : 'Sem documento'} ({item.type === 'SUPPLIER' ? 'Fornecedor' : 'Outro'})</span>
                                        </div>
                                    )}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">CPF/CNPJ</label>
                                <input type="text" value={formData.beneficiario.cpf_cnpj} onChange={e => handleInputChange('beneficiario', 'cpf_cnpj', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Função / Cargo</label>
                                <input type="text" value={formData.beneficiario.funcao_descricao} onChange={e => handleInputChange('beneficiario', 'funcao_descricao', e.target.value)} className="w-full rounded-lg border-2 border-slate-600 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm p-2" placeholder="Ex: Prestador de Serviços" />
                            </div>
                            <div>
                                <Autocomplete
                                    label="Motivo / Descrição"
                                    value={formData.descricao}
                                    onChange={val => handleRootChange('descricao', val)}
                                    items={data.categories || []}
                                    itemKey="name"
                                    placeholder="Ex: pagamento de serviços..."
                                    onSelect={(cat: any) => handleRootChange('descricao', cat.name)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 gap-4">
                        <button onClick={() => generatePDF('preview')} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold py-4 px-8 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-3 text-lg">
                            <Eye size={24} /> Visualizar
                        </button>
                        <button onClick={() => generatePDF('download')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-3 text-lg">
                            <Printer size={24} /> Imprimir / Baixar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

