import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabaseService } from '../../services/supabaseService';
import { Member } from '../../types';
import { User, MapPin, Phone, FileText, CheckCircle2, AlertCircle, Building2, ArrowRight, Loader2 } from '../ui/Icons';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const PublicMemberRegistration: React.FC = () => {
    const [searchParams] = useSearchParams();
    const churchId = searchParams.get('c');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [church, setChurch] = useState<Church | null>(null);

    useEffect(() => {
        if (churchId) {
            supabaseService.getChurch(churchId).then(setChurch);
        }
    }, [churchId]);

    const [formData, setFormData] = useState<Partial<Member>>({
        name: '',
        email: '',
        phone: '',
        document: '',
        birthDate: '',
        address: '',
        city: '',
        state: '',
        status: 'PENDING',
        type: 'MEMBER'
    });

    const handleChange = (field: keyof Member, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!churchId || !uuidRegex.test(churchId)) {
            setError('Código da igreja inválido ou ausente. Use o link oficial fornecido pelo administrador.');
            return;
        }

        if (!formData.name || !formData.phone) {
            setError('Por favor, preencha nome e telefone.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const newMember: Member = {
                ...formData,
                id: generateId(),
                churchId: churchId,
                status: 'PENDING',
                type: 'MEMBER'
            } as Member;

            await supabaseService.addMember(newMember);
            setSuccess(true);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-green-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Enviado!</h2>
                    <p className="text-gray-600 mb-8">
                        Seus dados foram enviados com sucesso para a secretaria da igreja.
                        Em breve seu cadastro será revisado e ativado.
                    </p>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!churchId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <AlertCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Inválido</h2>
                    <p className="text-gray-600 mb-4">
                        Este link de cadastro parece estar incompleto ou expirado.
                        Por favor, solicite um novo link ao administrador da sua igreja.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 mb-4 overflow-hidden border border-gray-100">
                        {church?.logo ? (
                            <img src={church.logo} alt={church.name} className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="w-full h-full bg-purple-600 text-white flex items-center justify-center">
                                <Building2 size={40} />
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{church?.name || 'Ficha de Membro'}</h1>
                    <p className="text-gray-600">Preencha seus dados para realizar seu cadastro no sistema da igreja.</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 p-6 md:p-10 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info Section */}
                            <div className="col-span-1 md:col-span-2 space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <User size={16} /> Dados Pessoais
                                </h3>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 ml-1">Nome Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                        placeholder="Seu nome completo"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">CPF / Documento</label>
                                        <input
                                            type="text"
                                            value={formData.document}
                                            onChange={(e) => handleChange('document', e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            value={formData.birthDate}
                                            onChange={(e) => handleChange('birthDate', e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-50">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Phone size={16} /> Contato
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">WhatsApp / Celular *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">E-mail</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-50">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={16} /> Endereço
                                </h3>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 ml-1">Logradouro (Rua, Nº, Bairro)</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                        placeholder="Ex: Rua das Flores, 123, Centro"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                            placeholder="Sua cidade"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Estado</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={formData.state}
                                            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 focus:ring-2 focus:ring-purple-500 rounded-2xl transition-all text-gray-900"
                                            placeholder="UF"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-2xl font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    <span>Enviando cadastro...</span>
                                </>
                            ) : (
                                <>
                                    <span>Enviar Cadastro</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Este formulário é seguro. Seus dados serão mantidos em conformidade com a LGPD.
                </p>
            </div>
        </div>
    );
};

export default PublicMemberRegistration;
