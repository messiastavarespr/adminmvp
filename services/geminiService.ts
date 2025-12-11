
import { GoogleGenAI } from "@google/genai";

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

// Fallback: Local Regex Parser for copied text
const localParseOFX = (text: string): string => {
  const lines = text.split('\n');
  const nowStr = new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14);
  let transactions = '';

  // Matches: Date (DD/MM/YYYY or DD/MM) + Space + Description + Space + Amount
  // Examples: "12/05/2024 Pix Enviado -120,50" or "12/05 Supermercado 50.00"
  const regex = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.*?)\s+(-?[\d\.,]+)/;

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      let [_, dateStr, desc, amountStr] = match;

      const parts = dateStr.split('/');
      const year = parts.length > 2 ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : new Date().getFullYear().toString();
      const dtPosted = `${year}${parts[1]}${parts[0]}120000`;

      let cleanAmount = amountStr;
      // Heuristic: If comma exists and is after dot (1.000,00) or just comma (100,00) -> PT-BR
      if (amountStr.includes(',')) cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');

      const amount = parseFloat(cleanAmount);
      if (isNaN(amount)) return;

      const type = amount < 0 ? 'DEBIT' : 'CREDIT';

      transactions += `
<STMTTRN>
<TRNTYPE>${type}
<DTPOSTED>${dtPosted}
<TRNAMT>${amount}
<FITID>${dtPosted}${Math.floor(Math.random() * 100000)}
<MEMO>${desc.trim()}
</STMTTRN>`;
    }
  });

  if (!transactions) {
    throw new Error("IA indisponível e falha na conversão manual. Verifique se o texto copiado está no formato 'Data Descrição Valor'.");
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

  // 2. Local Fallback (Text Only)
  if (typeof input === 'string') {
    return localParseOFX(input);
  }

  throw new Error("A API de IA falhou e não é possível converter arquivos PDF localmente. Por favor, COPIE O TEXTO do PDF e cole na caixa de entrada para usar o conversor manual.");
};
