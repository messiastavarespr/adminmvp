
import React, { useState } from 'react';
import { User, UserRole, Church, UserPermissions } from '../types';
import { Users as UsersIcon, Plus, Trash2, Edit2, Shield, CheckCircle, X, Search, Building2, Lock, CheckSquare, Layers, Database, Target, Save, FileText, AlertTriangle } from './ui/Icons';
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
  const { hashPassword, addUser, updateUser, deleteUser } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TREASURER);
  const [churchId, setChurchId] = useState('');
  const [observations, setObservations] = useState('');
  const [password, setPassword] = useState('');

  // Permissions State
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  // Helper to determine defaults based on role
  const getRoleDefaults = (r: UserRole): UserPermissions => {
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
    return defaultPermissions;
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setName(user.name);
    setRole(user.role);
    setChurchId(user.churchId);
    setObservations(user.observations || '');
    setPassword(''); // Don't show existing hash

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
    setRole(UserRole.TREASURER);
    setChurchId(churches[0]?.id || '');
    setObservations('');
    setPassword('');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Hash password if provided
    let passwordHash = undefined;
    if (password.trim()) {
      passwordHash = await hashPassword(password);
    }

    // Force ADMIN permissions to full if role is ADMIN
    const finalPermissions = role === UserRole.ADMIN ? getRoleDefaults(UserRole.ADMIN) : permissions;

    if (editingId) {
      // Update
      const existingUser = users.find(u => u.id === editingId);
      if (existingUser) {
        await updateUser({
          ...existingUser,
          name,
          role,
          churchId,
          observations,
          avatarInitials: initials,
          password: passwordHash || existingUser.password, // Keep old hash if no new password
          permissions: finalPermissions
        });
      }
    } else {
      // Create - Require default password if none provided? Or set default
      const finalPass = passwordHash || await hashPassword('123456');

      const newUser = {
        id: crypto.randomUUID(),
        name,
        role,
        churchId,
        observations,
        avatarInitials: initials,
        password: finalPass,
        permissions: finalPermissions
      };
      await addUser(newUser);
    }

    onUpdate();
    setShowForm(false);
    setEditingId(null);
    setName('');
    setObservations('');
    setPassword('');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteUser(deleteId);
      onUpdate();
      setDeleteId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getChurchName = (id: string) => churches.find(c => c.id === id)?.name || 'N/A';

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case UserRole.ADMIN: return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-200 dark:border-red-800">Admin</span>;
      case UserRole.PASTOR: return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded text-xs font-bold border border-purple-200 dark:border-purple-800">Pastor</span>;
      case UserRole.TREASURER: return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">Tesoureiro</span>;
      case UserRole.MEMBER: return <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold border border-gray-200 dark:border-gray-600">Membro</span>;
    }
  };

  const PermissionCheckbox = ({ label, pKey }: { label: string, pKey: keyof UserPermissions }) => (
    <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${permissions[pKey] ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'}`}>
      <input
        type="checkbox"
        checked={permissions[pKey]}
        onChange={() => togglePermission(pKey)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-500"
        disabled={role === UserRole.ADMIN} // Admin has all permissions forced
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
            Gerencie quem tem acesso ao sistema e suas permissões detalhadas.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <SearchBox value={searchTerm} onChange={setSearchTerm} />
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} /> Novo Usuário
          </button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: João da Silva"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Perfil de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                  <option value={UserRole.TREASURER}>Tesoureiro (Financeiro)</option>
                  <option value={UserRole.PASTOR}>Pastor (Visualização/Relatórios)</option>
                  <option value={UserRole.MEMBER}>Membro (Apenas seus dados)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Igreja Vinculada</label>
                <select
                  value={churchId}
                  onChange={(e) => setChurchId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Lock size={12} /> Senha de Acesso
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingId ? "Deixe em branco para manter a senha atual" : "Crie uma senha (Padrão: 123456)"}
                />
                <p className="text-[10px] text-gray-400 mt-1">A senha será criptografada antes de salvar.</p>
              </div>
            </div>

            {/* Permissions Panel */}
            {role !== UserRole.ADMIN && role !== UserRole.MEMBER && (
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas ou observações sobre o usuário..."
                rows={2}
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
                <Save size={16} /> Salvar Usuário
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
              <th className="px-6 py-3">Perfil</th>
              <th className="px-6 py-3">Igreja</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum usuário encontrado.</td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                        {u.avatarInitials}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">{u.name}</span>
                        {u.observations && <span className="text-xs text-gray-500 dark:text-gray-400">{u.observations}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    <Building2 size={14} className="text-gray-400" />
                    {getChurchName(u.churchId)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
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
