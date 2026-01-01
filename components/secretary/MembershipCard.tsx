import React, { useRef, useState } from 'react';
import { Member } from '../../types';
import { ChurchCross, Download, X, Printer, Share2 } from '../ui/Icons';
import QRCode from "react-qr-code";
import { toPng } from 'html-to-image';

interface MembershipCardProps {
    member: Member;
    churchName?: string;
    churchLogo?: string;
    onClose: () => void;
}

const MembershipCard: React.FC<MembershipCardProps> = ({ member, churchName = "Vida na Palavra", churchLogo, onClose }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Wait for stability
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: '#ffffff' });

            const link = document.createElement('a');
            link.download = `carteirinha-${member.name.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            console.error("Erro ao gerar carteirinha:", error);
            alert("Erro ao gerar a imagem. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Data N/A';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const currentYear = new Date().getFullYear();
    const validityYear = currentYear + 1;
    const validity = `DEZ/${currentYear}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Printer size={18} /></span>
                        Carteirinha Digital
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center gap-8">

                    {/* CARD PREVIEW AREA */}
                    <div className="scale-100 sm:scale-110 transition-transform origin-top">
                        <div
                            ref={cardRef}
                            id="membership-card"
                            className="w-[340px] h-[540px] bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[20px] shadow-2xl relative overflow-hidden font-sans border border-slate-700/50 flex flex-col"
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                            {/* HEADER */}
                            <div className="relative z-10 p-5 pb-2 text-center">
                                <h1 className="text-xl font-bold tracking-wide uppercase text-blue-100/90">{churchName}</h1>
                                <div className="h-0.5 w-12 bg-blue-500/50 mx-auto mt-2 rounded-full"></div>
                            </div>

                            {/* PHOTO AREA */}
                            <div className="relative z-10 flex flex-col items-center mt-2">
                                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg mb-3">
                                    <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden border-2 border-slate-900">
                                        {member.photo ? (
                                            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 font-bold text-3xl">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-center px-4 leading-tight mb-1 drop-shadow-md">{member.name}</h2>
                                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${member.role === 'PASTOR' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                    {member.role === 'PASTOR' ? 'Pastor' : 'Membro'}
                                </span>
                            </div>

                            {/* DETAILS */}
                            <div className="relative z-10 px-6 py-2 mt-auto space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Membro Desde</p>
                                        <p className="text-sm font-bold text-gray-200">{formatDate(member.conversionDate || member.createdAt)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Validade</p>
                                        <p className="text-sm font-bold text-gray-200">{validity}</p>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER & QR */}
                            <div className="relative z-10 bg-black/20 p-4 mt-3 flex items-center justify-between backdrop-blur-sm border-t border-white/5">
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400">Status</p>
                                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ATIVO
                                    </p>
                                    <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest">ID: {member.id.substring(0, 8)}</p>
                                </div>
                                <div className="bg-white p-1.5 rounded-lg shadow-sm w-[54px] h-[54px] flex items-center justify-center">
                                    <QRCode
                                        value={`MEMBER:${member.id}`}
                                        size={54}
                                        level="M"
                                        fgColor="#0f172a"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                        Esta é a prévia da carteirinha. Clique no botão abaixo para baixar a imagem em alta resolução.
                    </p>

                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Baixar Imagem (PNG)
                            </>
                        )}
                    </button>
                    {/* Share Button (Web Share API) - Future Enhancement */}
                    {/* <button className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-gray-200 dark:border-slate-700">
                        <Share2 size={20} />
                    </button> */}
                </div>

            </div>
        </div>
    );
};

export default MembershipCard;
