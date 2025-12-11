import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, Check, AlertCircle, FileSpreadsheet, Loader2 } from './ui/Icons';
import { Member } from '../types';
import { useFinance } from '../contexts/FinanceContext';

interface ImportMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentChurchId: string;
}

const ImportMembersModal: React.FC<ImportMembersModalProps> = ({ isOpen, onClose, onSuccess, currentChurchId }) => {
    const { addMember } = useFinance();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState(0);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setPreviewData([]);
        setIsProcessing(true);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                setError("O arquivo parece estar vazio ou não pôde ser lido.");
            } else {
                setPreviewData(jsonData);
            }
        } catch (err) {
            console.error(err);
            setError("Erro ao ler o arquivo. Certifique-se de que é um Excel (.xlsx, .xls) válido.");
        } finally {
            setIsProcessing(false);
        }
    };

    const mapRowToMember = (row: any): Partial<Member> => {
        // Normalização de chaves para minúsculo para facilitar o match
        const normalizedRow: Record<string, string> = {};
        Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = String(row[key] || "").trim();
        });

        return {
            name: normalizedRow['nome'] || normalizedRow['name'] || normalizedRow['nome completo'] || '',
            email: normalizedRow['email'] || normalizedRow['e-mail'] || '',
            phone: normalizedRow['telefone'] || normalizedRow['phone'] || normalizedRow['celular'] || normalizedRow['whatsapp'] || '',
            type: 'MEMBER', // Default to MEMBER
            churchId: currentChurchId,
            address: normalizedRow['endereço'] || normalizedRow['endereco'] || normalizedRow['address'] || '',
            city: normalizedRow['cidade'] || normalizedRow['city'] || '',
            state: normalizedRow['uf'] || normalizedRow['estado'] || normalizedRow['state'] || '',
            document: normalizedRow['cpf'] || normalizedRow['documento'] || '',
            notes: 'Importado via Excel'
        };
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsImporting(true);
        let count = 0;

        try {
            for (const row of previewData) {
                const memberData = mapRowToMember(row);

                // Validação mínima
                if (memberData.name) {
                    // Gerar ID se necessário (o contexto/serviço geralmente lida com isso se omitido, mas vamos garantir o objeto completo)
                    const newMember: Member = {
                        id: crypto.randomUUID(),
                        churchId: currentChurchId,
                        name: memberData.name,
                        type: 'MEMBER',
                        email: memberData.email,
                        phone: memberData.phone,
                        address: memberData.address,
                        city: memberData.city,
                        state: memberData.state,
                        document: memberData.document,
                        notes: memberData.notes
                    };

                    await addMember(newMember);
                    count++;
                }
            }
            setSuccessCount(count);
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1500);

        } catch (err) {
            console.error(err);
            setError("Ocorreu um erro durante a importação. Alguns registros podem não ter sido salvos.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        setSuccessCount(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <Upload size={20} className="text-blue-600" />
                        Importar Membros
                    </h3>
                    <button onClick={handleClose} disabled={isImporting} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {successCount > 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-green-600 mb-2">Sucesso!</h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                {successCount} membros foram importados corretamente.
                            </p>
                        </div>
                    ) : (
                        <>
                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all group"
                                >
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet size={32} />
                                    </div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Clique para selecionar um arquivo Excel</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Suporta .xlsx ou .xls</p>
                                    <p className="text-xs text-gray-400 mt-4">Colunas esperadas: Nome, Email, Telefone, CPF, Endereço...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="text-blue-600" size={24} />
                                            <div>
                                                <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">{file.name}</p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setFile(null); setPreviewData([]); }} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Trocar</button>
                                    </div>

                                    {isProcessing ? (
                                        <div className="py-8 text-center text-gray-500">
                                            <Loader2 className="animate-spin mx-auto mb-2" />
                                            <p>Lendo arquivo...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg flex items-center gap-2">
                                            <AlertCircle size={20} />
                                            {error}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-gray-700 dark:text-gray-300">Pré-visualização ({previewData.length} registros)</h4>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-medium sticky top-0">
                                                        <tr>
                                                            <th className="p-2">Nome</th>
                                                            <th className="p-2">Email</th>
                                                            <th className="p-2">Telefone</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                        {previewData.slice(0, 10).map((row, idx) => {
                                                            const m = mapRowToMember(row);
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                                    <td className="p-2 text-gray-800 dark:text-gray-200">{m.name || <span className="text-red-400 italic">Sem Nome</span>}</td>
                                                                    <td className="p-2 text-gray-600 dark:text-gray-400">{m.email}</td>
                                                                    <td className="p-2 text-gray-600 dark:text-gray-400">{m.phone}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {previewData.length > 10 && (
                                                    <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700">
                                                        E mais {previewData.length - 10} registros...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                        disabled={isImporting}
                    >
                        {successCount > 0 ? 'Fechar' : 'Cancelar'}
                    </button>

                    {file && !successCount && !error && (
                        <button
                            onClick={handleImport}
                            disabled={isImporting || previewData.length === 0}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isImporting ? 'Importando...' : 'Confirmar Importação'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportMembersModal;
