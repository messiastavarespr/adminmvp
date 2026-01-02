
import React, { useState } from 'react';
import { User } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { supabase } from '../services/supabaseClient';
import { Save, Lock, User as UserIcon, AlertTriangle, Check, Camera } from './ui/Icons';
import { notificationService } from '../services/notificationService';

interface ProfilePageProps {
    user: User;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
    const { updateUser, refreshData } = useFinance();

    const [name, setName] = useState(user.name);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            // 1. Update Name/Avatar in Public Table
            if (name !== user.name) {
                await updateUser({
                    ...user,
                    name: name
                });
                // Update local context
                refreshData(); // Triggers reload
            }

            // 2. Update Password (if provided)
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error("As novas senhas não coincidem.");
                }
                if (newPassword.length < 6) {
                    throw new Error("A senha deve ter pelo menos 6 caracteres.");
                }

                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
            }

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                    <UserIcon size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meu Perfil</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas informações pessoais e de acesso.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Avatar & Basic Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col items-center text-center">
                        <div className="relative group cursor-pointer mb-4">
                            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-gray-400 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user.avatarInitials}</span>
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Camera size={24} />
                            </div>
                        </div>

                        <div className="w-full">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white break-words">{user.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{user.email}</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 2: Edit Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 space-y-6">

                        {/* Personal Info */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <UserIcon size={20} className="text-gray-400" />
                                Informações Pessoais
                            </h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed"
                                        title="Para alterar o email, contate o administrador."
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-slate-700" />

                        {/* Security */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Lock size={20} className="text-gray-400" />
                                Segurança
                            </h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 flex gap-2">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <p>Preencha os campos abaixo apenas se desejar alterar sua senha. Caso contrário, deixe em branco.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Senha</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Nova Senha</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4">
                            {message && (
                                <div className={`text-sm flex items-center gap-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                    {message.text}
                                </div>
                            )}
                            <div className="flex-1"></div> {/* Spacer */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
                            >
                                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
