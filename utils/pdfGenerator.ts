import jsPDF from 'jspdf';
import { Member, Church } from '../types';

export const generateMemberDataSheet = async (member: Member, church?: Church, spouseName?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper Functions
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

    // --- HEADER BACKGROUND ---
    doc.setFillColor(248, 250, 252); // Slate-50 approx
    doc.rect(0, 0, pageWidth, 45, 'F');

    // --- LOGO (Left) ---
    if (church?.logo) {
        try {
            // Assuming church.logo is a base64 string or a valid URL that jsPDF can handle
            // If it's a URL, it might need to be converted to base64 first, but let's try direct first or handle error
            doc.addImage(church.logo, 'PNG', 15, 5, 30, 30, undefined, 'FAST');
        } catch (e) {
            console.warn("Could not load church logo", e);
        }
    }

    // --- TITLE (Center) ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("FICHA CADASTRAL", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(getTypeLabel(member.type).toUpperCase(), pageWidth / 2, 28, { align: 'center' });

    if (church?.name) {
        doc.setFontSize(9);
        doc.text(church.name, pageWidth / 2, 35, { align: 'center' });
    }


    // --- PHOTO (Right) ---
    if (member.photoUrl) {
        try {
            // Circle clipping is complex in raw jsPDF, square is standard for official docs often
            doc.addImage(member.photoUrl, 'JPEG', pageWidth - 45, 5, 30, 30, undefined, 'FAST');
        } catch (e) {
            console.warn("Could not load member photo", e);
        }
    }

    // --- CONTENT ---
    let y = 60;
    const leftMargin = 20;
    const valueCol = 70;

    // Helper to print a row
    const printRow = (label: string, value: string) => {
        if (!value && value !== '-') return;

        // Check page break
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(label, leftMargin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);

        // Handle long text (multi-line)
        const splitTitle = doc.splitTextToSize(value, pageWidth - valueCol - 20);
        doc.text(splitTitle, valueCol, y);

        const lineCount = splitTitle.length;
        const rowHeight = lineCount * 5;

        doc.setDrawColor(240);
        doc.line(leftMargin, y + 2, pageWidth - leftMargin, y + 2);

        y += Math.max(8, rowHeight + 4);
    };

    // Header Section Helper
    const printSectionHeader = (title: string) => {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }
        y += 5;
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.rect(leftMargin - 2, y - 6, pageWidth - (leftMargin * 2) + 4, 10, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.text(title.toUpperCase(), leftMargin, y);
        y += 10;
        doc.setFontSize(10);
    };

    // 1. Dados Básicos
    printSectionHeader("Dados Básicos");
    printRow("Nome Completo:", member.name);
    printRow("Categoria:", member.category || '-');
    if (member.type === 'SUPPLIER' || member.document) {
        printRow("CPF/CNPJ:", member.document || '-');
    }
    if (member.rg) printRow("RG:", `${member.rg} ${member.documentIssuer ? `(${member.documentIssuer})` : ''}`);

    const contactInfo = [];
    if (member.phone) contactInfo.push(member.phone);
    if (member.email) contactInfo.push(member.email);
    printRow("Contatos:", contactInfo.join(' | ') || '-');

    const fullAddress = [member.address, member.addressNumber, member.city, member.state].filter(Boolean).join(' - ');
    printRow("Endereço:", fullAddress || '-');

    // 2. Dados Pessoais (Skip for Suppliers)
    if (member.type !== 'SUPPLIER') {
        printSectionHeader("Dados Pessoais");
        if (member.gender) printRow("Sexo:", getGenderLabel(member.gender));
        printRow("Data de Nascimento:", formatDate(member.birthDate));
        printRow("Nacionalidade:", member.nationality || '-');
        printRow("Naturalidade:", member.naturalness || '-');
        printRow("Profissão:", member.profession || '-');
        printRow("Escolaridade:", member.educationLevel || '-');
        printRow("Filiação:", `Pai: ${member.fatherName || '-'}\nMãe: ${member.motherName || '-'}`);

        // 3. Família
        printSectionHeader("Dados Familiares");
        if (member.maritalStatus) printRow("Estado Civil:", getMaritalStatusLabel(member.maritalStatus));

        if (member.maritalStatus === 'MARRIED' || member.maritalStatus === 'STABLE_UNION') {
            if (member.weddingDate) printRow("Data Casamento:", formatDate(member.weddingDate));
            if (spouseName) {
                printRow("Cônjuge:", spouseName);
            } else if (member.spouseId) {
                printRow("Cônjuge (ID):", member.spouseId);
            }
        }

        // Parse Children
        let childrenText = member.children || '-';
        try {
            if (member.children && (member.children.startsWith('[') || member.children.startsWith('{'))) {
                const childrenList = JSON.parse(member.children);
                if (Array.isArray(childrenList) && childrenList.length > 0) {
                    childrenText = childrenList.map((c: any) => {
                        let desc = c.name;
                        if (c.birthDate) {
                            const age = new Date().getFullYear() - new Date(c.birthDate).getFullYear();
                            desc += ` (${age} anos)`;
                        }
                        return desc;
                    }).join(', ');
                } else {
                    childrenText = '-';
                }
            }
        } catch (e) {
            console.warn("Error parsing children JSON for PDF", e);
        }

        printRow("Filhos:", childrenText);


        // 4. Eclesiásticos
        printSectionHeader("Dados Eclesiásticos");
        printRow("Cargo Eclesiástico:", member.role || '-');
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
        // Suppliers only
        printRow("Observações:", member.notes || '-');
    }

    // --- SIGNATURES ---
    // Ensure enough space at bottom, else add page
    if (y > pageHeight - 60) {
        doc.addPage();
        y = 40;
    } else {
        y = pageHeight - 50;
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(0);

    // Signature 1
    doc.line(leftMargin, y, 90, y);
    doc.setFontSize(8);
    doc.text("Assinatura do Membro", leftMargin, y + 5);

    // Signature 2
    doc.line(120, y, pageWidth - leftMargin, y);
    doc.text("Secretaria / Pasta Responsável", 120, y + 5);


    // --- FOOTER ---
    const today = new Date().toLocaleDateString('pt-BR');
    const now = new Date().toLocaleTimeString('pt-BR');
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Emitido em: ${today} às ${now}`, leftMargin, pageHeight - 10);
    doc.text("Sistema MVPFin - Gestão Eclesiástica Inteligente", pageWidth - leftMargin, pageHeight - 10, { align: 'right' });

    doc.save(`Ficha_${member.name.replace(/\s/g, '_')}_${today.replace(/\//g, '-')}.pdf`);
};
