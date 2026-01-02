
import React, { useState } from 'react';
import { Member } from '../types';
import MemberSelect from './ui/MemberSelect';
import { AlertTriangle, ArrowRight, X } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';

interface MergeMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceMember: Member | null;
    onSuccess: () => void;
}

const MergeMembersModal: React.FC<MergeMembersModalProps> = ({
    isOpen,
    onClose,
    sourceMember,
    onSuccess
}) => {
    const { mergeMembers } = useFinance();
    const [targetId, setTargetId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    if (!isOpen || !sourceMember) return null;

    const handleMerge = async () => {
        if (!targetId) return;
        if (confirmText !== 'UNIFICAR') {
            alert('Digite UNIFICAR para confirmar a operação.');
            return;
        }

        setLoading(true);
        try {
            await mergeMembers(sourceMember.id, targetId);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao unificar:', error);
            alert(`Falha ao unificar cadastros: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 flex justify-between items-center border-b border-amber-100 dark:border-amber-900/40">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-amber-700 dark:text-amber-500">
                        <AlertTriangle size={20} />
                        Unificar Cadastros
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:bg-black/5 rounded-full p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-bold text-red-500">Atenção!</span> Esta ação moverá todo o histórico financeiro do membro duplicado para o membro principal e <span className="font-bold">excluirá definitivamente</span> o cadastro duplicado.
                    </p>

                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded text-center">
                            <div className="text-xs text-red-500 font-bold uppercase">CADASTRO A REMOVER</div>
                            <div className="font-bold text-gray-700 dark:text-gray-200 truncate">{sourceMember.name}</div>
                        </div>
                        <ArrowRight className="text-gray-300" />
                        <div className="flex-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded text-center">
                            <div className="text-xs text-green-600 font-bold uppercase">CADASTRO PRINCIPAL</div>
                            {targetId ? <div className="font-bold text-gray-700 dark:text-gray-200">Selecionado</div> : <div className="text-gray-400 italic">Selecione...</div>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Selecione o cadastro correto (Principal):
                        </label>
                        <MemberSelect
                            selectedId={targetId}
                            onSelect={(id) => setTargetId(id)}
                            placeholder="Busque o membro principal..."
                            filter={(m) => m.id !== sourceMember.id} // Cannot merge with self
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Confirmação de Segurança:
                        </label>
                        <input
                            type="text"
                            placeholder="Digite UNIFICAR"
                            className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 uppercase"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">
                        Cancelar
                    </button>
                    <button
                        onClick={handleMerge}
                        disabled={!targetId || confirmText !== 'UNIFICAR' || loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                        {loading ? 'Unificando...' : 'Confirmar Unificação'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeMembersModal;
