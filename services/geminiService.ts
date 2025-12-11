
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

export const convertToOFX = async (input: string | File): Promise<string> => {
  try {
    let contentPart;

    if (input instanceof File) {
      contentPart = await fileToPart(input);
    } else {
      contentPart = { text: input };
    }

    const ai = getAiClient();
    if (!ai) throw new Error("Chave de API do Gemini não configurada.");

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Using standard model or the one requested
      contents: {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          contentPart
        ]
      }
    });

    let result = response.text || '';

    // Cleanup if the model ignored the "no markdown" rule
    if (result.startsWith('```ofx')) result = result.replace('```ofx', '');
    if (result.startsWith('```xml')) result = result.replace('```xml', '');
    if (result.startsWith('```')) result = result.replace('```', '');
    if (result.endsWith('```')) result = result.slice(0, -3);

    return result.trim();
  } catch (error: any) {
    console.error("Gemini Conversion Error:", error);
    throw new Error("Falha na conversão via IA. Verifique se o arquivo é legível.");
  }
};
