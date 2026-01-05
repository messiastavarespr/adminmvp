import React, { useState } from 'react';
import { User, UserRole, Church, UserPermissions } from '../types';
import { Users as UsersIcon, Plus, Trash2, Edit2, Shield, CheckCircle, X, Search, Building2, Lock, CheckSquare, Layers, Database, Target, Save, FileText, AlertTriangle, Eye, EyeOff, Camera, Upload } from './ui/Icons';
import SearchBox from './ui/SearchBox';
import ConfirmationModal from './ConfirmationModal';
import { useFinance } from '../contexts/FinanceContext';

interface UsersProps {
  users: User[];
  churches: Church[];
  onUpdate: () => void;
}

const defaultPermissions: UserPermissions = {
  manageCategories: false,
  manageAccounts: false,
  manageCostCenters: false,
  manageBudgets: false,
  manageChurches: false,
  manageUsers: false,
  manageFunds: false,
  viewAuditLog: false,
  performBackup: false,
  performRestore: false
};

const UsersManager: React.FC<UsersProps> = ({ users, churches, onUpdate }) => {
  const { hashPassword, addUser, updateUser, deleteUser, currentUser, uploadAttachment } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isMaster = currentUser?.role === UserRole.MASTER;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isMaster;

  // Confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // New State
  const [role, setRole] = useState<UserRole>(UserRole.TREASURER);
  const [churchId, setChurchId] = useState('');
  const [observations, setObservations] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [allowedChurches, setAllowedChurches] = useState<string[]>([]);
  const [accessMvpSec, setAccessMvpSec] = useState(false);
  const [accessMvpFin, setAccessMvpFin] = useState(true); // New State

  // Permissions State
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  // Helper to determine defaults based on role
  const getRoleDefaults = (r: UserRole): UserPermissions => {
    if (r === UserRole.MASTER) {
      return {
        manageCategories: true, manageAccounts: true, manageCostCenters: true,
        manageBudgets: true, manageChurches: true, manageUsers: true,
        manageFunds: true,
        viewAuditLog: true, performBackup: true, performRestore: true
      };
    }
    if (r === UserRole.ADMIN) {
      return {
        manageCategories: true, manageAccounts: true, manageCostCenters: true,
        manageBudgets: true, manageChurches: true, manageUsers: true,
        manageFunds: true,
        viewAuditLog: true, performBackup: true, performRestore: true
      };
    }
    if (r === UserRole.TREASURER) {
      return {
        manageCategories: true, manageAccounts: false, manageCostCenters: true,
        manageBudgets: true, manageChurches: false, manageUsers: false,
        manageFunds: true,
        viewAuditLog: false, performBackup: true, performRestore: false
      };
    }
    if (r === UserRole.SECRETARY) {
      return {
        manageCategories: true, manageAccounts: false, manageCostCenters: false,
        manageBudgets: false, manageChurches: false, manageUsers: false,
        manageFunds: false,
        viewAuditLog: false, performBackup: false, performRestore: false
      };
    }
    if (r === UserRole.PASTOR) {
      return {
        manageCategories: false, manageAccounts: false, manageCostCenters: false,
        manageBudgets: false, manageChurches: false, manageUsers: false,
        manageFunds: false,
        viewAuditLog: true, performBackup: false, performRestore: false
      };
    }
    return defaultPermissions;
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email || '');
    setRole(user.role);
    setChurchId(user.churchId);
    setObservations(user.observations || '');
    setAvatarUrl(user.avatarUrl || '');
    setAllowedChurches(user.allowedChurches || [user.churchId]);
    setAccessMvpSec(user.accessMvpSec || false);
    setAccessMvpFin(user.accessMvpFin !== undefined ? user.accessMvpFin : true);
    setPassword('');
    setShowPassword(false);

    if (user.permissions) {
      setPermissions(user.permissions);
    } else {
      setPermissions(getRoleDefaults(user.role));
    }

    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole(UserRole.TREASURER);
    setChurchId(churches[0]?.id || '');
    setObservations('');
    setAvatarUrl('');
    setAllowedChurches(churches[0]?.id ? [churches[0].id] : []);
    setAccessMvpSec(false);
    setAccessMvpFin(true);
    setPassword('');
    setShowPassword(false);
    setPermissions(getRoleDefaults(UserRole.TREASURER));
    setShowForm(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    // Reset permissions to default for that role to avoid confusion
    setPermissions(getRoleDefaults(newRole));
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setIsUploading(true);
      const url = await uploadAttachment(file);
      setAvatarUrl(url);
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert("Erro ao fazer upload da imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      let passwordHash = undefined;
      if (password.trim()) {
        passwordHash = await hashPassword(password);
      }

      const finalPermissions = (role === UserRole.ADMIN || role === UserRole.MASTER) ? getRoleDefaults(role) : permissions;

      // Ensure primary church is in allowed list
      const finalAllowedChurches = Array.from(new Set([...allowedChurches, churchId])).filter(Boolean);

      if (editingId) {
        const existingUser = users.find(u => u.id === editingId);
        if (existingUser) {
          await updateUser({
            ...existingUser,
            name,
            email,
            role,
            churchId,
            observations,
            avatarInitials: initials,
            avatarUrl,
            password: passwordHash || existingUser.password,
            permissions: finalPermissions,
            allowedChurches: finalAllowedChurches,
            accessMvpSec,
            accessMvpFin
          });
        }
      } else {
        const plainPass = password.trim() || '123456';
        const finalPassHash = passwordHash || await hashPassword(plainPass);

        const newUser = {
          id: crypto.randomUUID(), // Will be overwritten by Auth ID
          name,
          email,
          role,
          churchId,
          observations,
          avatarInitials: initials,
          avatarUrl,
          password: finalPassHash, // Store Hash in DB (legacy/backup)
          permissions: finalPermissions,
          allowedChurches: finalAllowedChurches,
          accessMvpSec,
          accessMvpFin
        };
        await addUser(newUser, plainPass); // Pass Plain Password for Auth Creation
      }

      onUpdate();
      setShowForm(false);
      setEditingId(null);
      setName('');
      setEmail('');
      setAvatarUrl('');
      setObservations('');
      setPassword('');
      alert('Usuário salvo com sucesso!');
    } catch (error: any) {

      console.error("Erro ao salvar usuário:", error);
      alert(`Erro ao salvar usuário: ${error.message || error.toString()}. \n\nSe o erro persistir ao usar o perfil Master, verifique se o banco de dados foi atualizado com o script de migração.`);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteUser(deleteId);
        onUpdate();
        setDeleteId(null);
        alert('Usuário excluído com sucesso!');
      } catch (error: any) {
        console.error("Erro ao excluir usuário:", error);
        alert(`Erro ao excluir usuário: ${error.message || error.toString()}. \n\nVerifique se o usuário possui registros vinculados (como logs ou transações) que impedem a exclusão.`);
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (isAdmin) return matchesSearch;
    return u.id === currentUser?.id; // Non-admins only see themselves
  });

  const getChurchName = (id: string) => churches.find(c => c.id === id)?.name || 'N/A';

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case UserRole.MASTER: return <span className="bg-slate-800 text-white dark:bg-black dark:text-gray-200 px-2 py-0.5 rounded text-xs font-bold border border-slate-700 dark:border-gray-700">Master</span>;
      case UserRole.ADMIN: return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-200 dark:border-red-800">Admin</span>;
      case UserRole.PASTOR: return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded text-xs font-bold border border-purple-200 dark:border-purple-800">Pastor</span>;
      case UserRole.SECRETARY: return <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-0.5 rounded text-xs font-bold border border-teal-200 dark:border-teal-800">Secretaria</span>;
      case UserRole.TREASURER: return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">Tesoureiro</span>;
      case UserRole.MEMBER: return <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold border border-gray-200 dark:border-gray-600">Membro</span>;
    }
  };

  const PermissionCheckbox = ({ label, pKey }: { label: string, pKey: keyof UserPermissions }) => (
    <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${permissions[pKey] ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={permissions[pKey]}
        onChange={() => togglePermission(pKey)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-500"
        disabled={!isAdmin} // Only admin can change permissions
      />
      <span className={`text-xs font-semibold ${permissions[pKey] ? 'text-blue-800 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UsersIcon className="text-blue-600" size={24} /> Gestão de Usuários
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Gerencie quem tem acesso ao sistema e suas permissões.' : 'Gerencie seus dados de acesso.'}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {isAdmin && <SearchBox value={searchTerm} onChange={setSearchTerm} />}
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={18} /> Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-blue-100 dark:border-blue-900 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            {editingId ? <Edit2 size={18} className="text-amber-500" /> : <Plus size={18} className="text-emerald-500" />}
            {editingId ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSave} className="space-y-6">

            {/* Avatar Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-md ${avatarUrl ? 'bg-transparent' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-3xl'}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <UsersIcon size={32} />
                  )}
                </div>
                {/* Overlay Button */}
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105">
                  {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Camera size={16} />}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={(!isAdmin && currentUser?.id !== editingId && !!editingId) || isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ex: João da Silva"
                  autoFocus
                  disabled={!isAdmin && !!editingId}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email de Acesso</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="usuario@email.com"
                  disabled={!isAdmin && !!editingId} // Email is immutable generally to avoid auth mismatch, or needs deep logic
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Perfil de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isAdmin && !!editingId}
                >
                  {isMaster && <option value={UserRole.MASTER}>Master (Sistema & Config Avançada)</option>}
                  <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                  <option value={UserRole.SECRETARY}>Secretaria (Membros & Cadastros)</option>
                  <option value={UserRole.TREASURER}>Tesoureiro (Financeiro)</option>
                  <option value={UserRole.PASTOR}>Pastor (Visualização/Relatórios)</option>
                  <option value={UserRole.MEMBER}>Membro (Apenas seus dados)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Igreja Principal (Sede)</label>
                <select
                  value={churchId}
                  onChange={(e) => setChurchId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isAdmin && !!editingId}
                >
                  {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Lock size={12} /> Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {showPassword ? <><EyeOff size={10} /> Ocultar</> : <><Eye size={10} /> Mostrar</>}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 pr-10 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder={editingId ? "Deixe em branco para manter a senha atual" : "Crie uma senha (Padrão: 123456)"}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">A senha será criptografada antes de salvar.</p>
              </div>
            </div>

            {/* Multi-Church & System Access Block - Only for Admins */}
            {isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-700/30 p-5 rounded-xl border border-gray-100 dark:border-slate-700">

                {/* 1. Multi-Church Access */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-600">
                    <Building2 size={16} className="text-blue-600" /> Acesso a Igrejas (Multi-Site)
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {churches.map(c => {
                      const isPrimary = c.id === churchId;
                      const isChecked = allowedChurches.includes(c.id) || isPrimary;
                      return (
                        <label key={c.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-600 ${isPrimary ? 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 opacity-80' : 'bg-transparent border-transparent'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isPrimary) return; // Prevent unchecking primary
                              if (isChecked) {
                                setAllowedChurches(prev => prev.filter(id => id !== c.id));
                              } else {
                                setAllowedChurches(prev => [...prev, c.id]);
                              }
                            }}
                            disabled={isPrimary} // Always checked/disabled for primary
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-xs ${isPrimary ? 'font-bold text-blue-800 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {c.name} {isPrimary && '(Principal)'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">O usuário poderá alternar entre as igrejas selecionadas.</p>
                </div>

                {/* 2. MVPSec Access */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-600">
                    <Layers size={16} className="text-purple-600" /> Módulos do Sistema
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 cursor-pointer hover:shadow-md transition-all">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${accessMvpSec ? 'bg-purple-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${accessMvpSec ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={accessMvpSec}
                        onChange={() => setAccessMvpSec(!accessMvpSec)}
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">MVPSec (Secretaria)</p>
                        <p className="text-[10px] text-gray-500">Acesso ao módulo de gestão de membros e eclesiástico.</p>
                      </div>
                    </label>

                    {/* MVPFin Module Toggle */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 cursor-pointer hover:shadow-md transition-all">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${accessMvpFin ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${accessMvpFin ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={accessMvpFin}
                        onChange={() => setAccessMvpFin(!accessMvpFin)}
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">MVPFin (Financeiro)</p>
                        <p className="text-[10px] text-gray-500">Acesso ao módulo de gestão financeira.</p>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* Permissions Panel - Only show for customizable roles */}
            {isAdmin && role !== UserRole.ADMIN && role !== UserRole.MASTER && role !== UserRole.MEMBER && (
              <div className="bg-gray-50 dark:bg-slate-700/30 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-slate-600">
                  <CheckSquare size={16} className="text-blue-600" /> Permissões de Acesso (Granular)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Group 1: Financeiro */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Database size={10} /> Cadastros Financeiros</p>
                    <PermissionCheckbox label="Categorias" pKey="manageCategories" />
                    <PermissionCheckbox label="Contas / Bancos" pKey="manageAccounts" />
                    <PermissionCheckbox label="Centros de Custo" pKey="manageCostCenters" />
                    <PermissionCheckbox label="Fundos / Projetos" pKey="manageFunds" />
                  </div>

                  {/* Group 2: Admin */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={10} /> Administrativo</p>
                    <PermissionCheckbox label="Orçamentos" pKey="manageBudgets" />
                    <PermissionCheckbox label="Usuários do Sistema" pKey="manageUsers" />
                    <PermissionCheckbox label="Igrejas / Filiais" pKey="manageChurches" />
                  </div>

                  {/* Group 3: System */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Shield size={10} /> Sistema & Segurança</p>
                    <PermissionCheckbox label="Realizar Backup" pKey="performBackup" />
                    <PermissionCheckbox label="Restaurar Backup" pKey="performRestore" />
                    <PermissionCheckbox label="Logs de Auditoria" pKey="viewAuditLog" />
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 p-2 rounded text-xs text-blue-700 dark:text-blue-300">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <p>Marque as caixas para conceder acesso. Desmarcar revogará o acesso à funcionalidade imediatamente.</p>
                </div>
              </div>
            )}

            <div className="w-full">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Observações</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Notas ou observações sobre o usuário..."
                rows={2}
                disabled={!isAdmin && !!editingId}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm dark:text-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <Save size={16} /> Salvar {isAdmin ? 'Usuário' : 'Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-medium">
            <tr>
              <th className="px-6 py-3">Usuário</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Perfil</th>
              <th className="px-6 py-3">Igreja</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhum usuário encontrado.</td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs overflow-hidden border border-gray-100 dark:border-slate-600">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.avatarInitials
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">{u.name}</span>
                        {u.observations && <span className="text-xs text-gray-500 dark:text-gray-400">{u.observations}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-xs">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    <Building2 size={14} className="text-gray-400" />
                    {getChurchName(u.churchId)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {/* Prevent Non-Master from editing Master */}
                      {(!isMaster && u.role === UserRole.MASTER) ? (
                        <span className="text-xs text-gray-400 italic px-2">Protegido</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title={isAdmin ? "Editar" : "Alterar Senha"}
                          >
                            {isAdmin ? <Edit2 size={16} /> : <Lock size={16} />}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteId(u.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Usuário"
        message="Tem certeza que deseja remover este usuário? Ele perderá o acesso ao sistema imediatamente."
        confirmText="Excluir"
        isDanger={true}
      />
    </div>
  );
};

export default UsersManager;
