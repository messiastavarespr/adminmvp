
import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js
// Método mais robusto para Vite/Webpack: Importação dinâmica direta
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Define o worker globalmente
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const apiKey = import.meta.env.VITE_AISTUDIO_KEY;
// Initialize lazily or check existence to avoid top-level crash
const getAiClient = () => {
  if (!apiKey) {
    console.warn("VITE_AISTUDIO_KEY not set. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_PROMPT = `
  You are a specialized financial data assistant. Your ONLY task is to convert unstructured bank statement data (text or PDF content) into a valid OFX (Open Financial Exchange) format.
  
  Rules:
  1. Output ONLY the OFX code block. Do not add markdown backticks, explanations, or preambles.
  2. Use the "Etc/GMT" timezone for dates.
  3. If the input contains "Debit" or negative signs, use TRNTYPE:DEBIT and negative amounts.
  4. If the input contains "Credit" or deposits, use TRNTYPE:CREDIT and positive amounts.
  5. Generate a unique FITID for each transaction based on date and amount if not present.
  6. The BANKID should be "001" and ACCTID should be "00001" if not specified.
  7. Use CURDEF:BRL.
  8. Ensure the format is strictly compatible with standard accounting software.
`;

const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Local PDF Extraction ---
const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF localmente:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se o arquivo é válido.");
  }
};

// Fallback: Local Regex Parser for copied text or extracted PDF text
const localParseOFX = (text: string): string => {
  const lines = text.split('\n');
  const nowStr = new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14);
  let transactions = '';

  // Matches: Date (DD/MM/YYYY or DD/MM) + Space + Description + Space + Amount
  // Examples: "12/05/2024 Pix Enviado -120,50" or "12/05 Supermercado 50.00"
  // Improved Regex to handle more variations commonly found in PDF extractions
  // Looks for Date, then arbitrary text, then a number at the end
  const regex = /(\d{2}\/\d{2}(?:\/\d{2,4})?).*?([A-Za-z].*?)\s+(-?[\d\.,]+)/;

  lines.forEach(line => {
    // Clean up line
    const cleanLine = line.trim();
    if (!cleanLine) return;

    // Simple heuristic parser
    // Try to find a date
    const dateMatch = cleanLine.match(/(\d{2}\/\d{2}(?:\/\d{2,4})?)/);
    if (!dateMatch) return;

    // Try to find an amount (last number in the line usually)
    const amountMatch = cleanLine.match(/(-?[\d\.,]+)$/);
    if (!amountMatch) return;

    const dateStr = dateMatch[1];
    const amountStr = amountMatch[1];

    // Description is everything else? This is risky but a good fallback attempt
    // Let's use the explicit regex if possible, otherwise fallback to this split
    let desc = cleanLine.replace(dateStr, '').replace(amountStr, '').trim();

    // Validate numeric amount
    // Clean amount string: remove dots (thousands), replace comma with dot (decimal) if PT-BR format detected
    let cleanAmount = amountStr;
    if (amountStr.includes(',') && amountStr.includes('.')) {
      // 1.200,50 -> 1200.50
      cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');
    } else if (amountStr.includes(',')) {
      // 120,50 -> 120.50
      cleanAmount = amountStr.replace(',', '.');
    }

    const amount = parseFloat(cleanAmount);
    if (isNaN(amount)) return;


    const parts = dateStr.split('/');
    const year = parts.length > 2 ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : new Date().getFullYear().toString();
    // Ensure month/day are 2 digits
    const month = parts[1].padStart(2, '0');
    const day = parts[0].padStart(2, '0');
    const dtPosted = `${year}${month}${day}120000`;

    const type = amount < 0 ? 'DEBIT' : 'CREDIT';

    transactions += `
<STMTTRN>
<TRNTYPE>${type}
<DTPOSTED>${dtPosted}
<TRNAMT>${amount}
<FITID>${dtPosted}${Math.floor(Math.random() * 100000)}
<MEMO>${desc.trim() || 'Importado'}
</STMTTRN>`;
  });

  if (!transactions) {
    throw new Error("IA indisponível e falha na conversão manual. O formato do texto extraído não foi reconhecido.");
  }

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${nowStr}
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>00001
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${nowStr}
<DTEND>${nowStr}
${transactions}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0
<DTASOF>${nowStr}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
};

export const convertToOFX = async (input: string | File): Promise<string> => {
  // 1. Try AI Conversion (Primary)
  try {
    const ai = getAiClient();
    if (ai) {
      let contentPart;
      if (input instanceof File) contentPart = await fileToPart(input);
      else contentPart = { text: input };

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }, contentPart]
        }
      });

      let result = response.text || '';
      if (result.startsWith('```ofx')) result = result.replace('```ofx', '');
      if (result.startsWith('```xml')) result = result.replace('```xml', '');
      if (result.startsWith('```')) result = result.replace('```', '');
      if (result.endsWith('```')) result = result.slice(0, -3);
      return result.trim();
    }
  } catch (error) {
    console.warn("AI Conversion failed, attempting local fallback.", error);
  }

  // 2. Local Fallback (Text or PDF)
  try {
    let textToParse = '';

    if (input instanceof File) {
      if (input.type === 'application/pdf') {
        // Extract text from PDF locally
        console.log("Tentando extração local de PDF...");
        textToParse = await extractTextFromPDF(input);
        console.log("Texto extraído do PDF:", textToParse.substring(0, 100) + "...");
      } else if (input.type === 'text/plain') {
        textToParse = await input.text();
      } else {
        // Should simple text files be supported locally without FileReader?
        // Usually 'input' as string covers the copy-paste case.
        // If Input is a File but NOT pdf (e.g. .txt), we need to read it.
        throw new Error("Formato de arquivo não suportado localmente (apenas PDF ou Texto copiado).");
      }
    } else {
      textToParse = input;
    }

    return localParseOFX(textToParse);

  } catch (localError: any) {
    console.error("Local fallback failed:", localError);
    throw new Error(`A API de IA falhou e a conversão local também não foi possível: ${localError.message}`);
  }
};
