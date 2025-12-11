import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';

// Interface para User
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  active: boolean;
  createdAt: string;
}

interface UsersProps {
  data?: any;
  onDataChange?: (newData: any) => void;
}

const Users: React.FC<UsersProps> = ({ data, onDataChange }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'VIEWER';
  }>({ name: '', email: '', role: 'USER' });
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar usuários do localStorage
  useEffect(() => {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  }, []);

  // Salvar usuários no localStorage
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
    if (onDataChange) {
      onDataChange({ users });
    }
  }, [users, onDataChange]);

  // Adicionar novo usuário
  const handleAddUser = () => {
    if (formData.name && formData.email) {
      const newUser: User = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
      setFormData({ name: '', email: '', role: 'USER' });
      setShowForm(false);
    }
  };

  // Editar usuário
  const handleEditUser = (user: User) => {
    setEditingId(user.id);
    setFormData({ name: user.name, email: user.email, role: user.role });
    setShowForm(true);
  };

  // Atualizar usuário
  const handleUpdateUser = () => {
    if (editingId && formData.name && formData.email) {
      setUsers(
        users.map((u) =>
          u.id === editingId
            ? {
                ...u,
                name: formData.name,
                email: formData.email,
                role: formData.role,
              }
            : u
        )
      );
      setFormData({ name: '', email: '', role: 'USER' });
      setEditingId(null);
      setShowForm(false);
    }
  };

  // Excluir usuário
  const handleDeleteUser = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCancel = () => {
    setFormData({ name: '', email: '', role: 'USER' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestão de Usuários</h2>

        {/* Botão adicionar */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', email: '', role: 'USER' });
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
          >
            <Plus size={18} />
            Adicionar Usuário
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do usuário"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email do usuário"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="VIEWER">Visualizador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={editingId ? handleUpdateUser : handleAddUser}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
              >
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Barra de busca */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela de usuários */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 border-b border-gray-300">
              <th className="px-4 py-2 text-left text-gray-700 font-semibold">Nome</th>
              <th className="px-4 py-2 text-left text-gray-700 font-semibold">Email</th>
              <th className="px-4 py-2 text-left text-gray-700 font-semibold">Perfil</th>
              <th className="px-4 py-2 text-left text-gray-700 font-semibold">Status</th>
              <th className="px-4 py-2 text-left text-gray-700 font-semibold">Data de Criação</th>
              <th className="px-4 py-2 text-center text-gray-700 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-300 hover:bg-gray-100">
                  <td className="px-4 py-2 text-gray-800">{user.name}</td>
                  <td className="px-4 py-2 text-gray-600">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'USER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {users.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total de usuários */}
      <div className="mt-4 text-sm text-gray-600">
        Total de usuários: <span className="font-semibold">{users.length}</span>
      </div>
    </div>
  );
};

export default Users;
