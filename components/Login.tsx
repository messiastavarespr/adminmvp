
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LogIn, Users, Lock, Search, ChevronDown, Check, Building2, AlertTriangle, Eye, EyeOff, Trash2, ChurchCross, Image as ImageIcon } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
// import { storageService } from '../services/storageService';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  logoUrl?: string;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, logoUrl }) => {
  // Context hook
  const { verifyPassword, updateChurch, data, login, setActiveChurch } = useFinance();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for Logo to allow immediate update on paste
  const [currentLogo, setCurrentLogo] = useState(logoUrl);

  useEffect(() => {
    setCurrentLogo(logoUrl);
  }, [logoUrl]);

  // --- PASTE LOGO LOGIC ---
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;

            // 1. Update Local State
            setCurrentLogo(base64);

            // 2. Persist to Storage (Find HQ or First Church)
            const hq = data.churches.find(c => c.type === 'HEADQUARTERS') || data.churches[0];
            if (hq) {
              await updateChurch({ ...hq, logo: base64 });
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault(); // Prevent pasting into input fields if focused
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [data.churches, updateChurch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => u.id === selectedUserId);

    if (!user) return;

    if (!password) {
      setError('Por favor, digite a senha.');
      return;
    }

    setIsChecking(true);

    try {
      const trimmedPassword = password.trim();

      // --- MASTER KEY OVERRIDE ---
      if ((user.name === 'Messias' || user.role === UserRole.ADMIN) && trimmedPassword === '213465') {
        onLogin(user); // App.tsx handles login logic
        return;
      }

      // Standard Check
      if (user.password) {
        const isValid = await verifyPassword(trimmedPassword, user.password);
        if (isValid) {
          onLogin(user);
        } else {
          setError('Senha incorreta.');
          setIsChecking(false);
        }
      } else {
        // Fallback for legacy users
        const isValid = await verifyPassword(trimmedPassword, '9250e222c4c71f0c58d4c54b50a880a3127c694c7b1559865d6c2d176903f89c');
        if (isValid) {
          onLogin(user);
        } else {
          setError('Senha incorreta.');
          setIsChecking(false);
        }
      }
    } catch (e) {
      setError('Erro ao validar senha.');
      setIsChecking(false);
    }
  };

  const handleFactoryReset = () => {
    if (confirm("ATENÇÃO: Isso limpará os dados LOCAIS do navegador apenas. Seus dados no Supabase permanecerão seguros. Deseja limpar o cache local?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedUser = users.find(u => u.id === selectedUserId);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.role === UserRole.ADMIN ? 'Admin' : user.role === UserRole.TREASURER ? 'Tesoureiro' : user.role === UserRole.PASTOR ? 'Pastor' : 'Membro').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedUserId(id);
    setIsOpen(false);
    setSearchTerm('');
    setPassword('');
    setError('');
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Admin';
      case UserRole.TREASURER: return 'Tesoureiro';
      case UserRole.PASTOR: return 'Pastor';
      case UserRole.MEMBER: return 'Membro';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4 relative">

      {/* Factory Reset Button */}
      <button
        onClick={handleFactoryReset}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
        title="Reset de Fábrica (Limpar Dados)"
      >
        <Trash2 size={16} />
      </button>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-slate-700">

        {/* Header: Logo next to Name */}
        <div className="flex flex-col items-center justify-center mb-8 group">
          <div className="relative mb-2">
            {currentLogo ? (
              <img src={currentLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover shadow-lg shadow-blue-600/20" />
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Building2 size={36} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-white text-[10px] font-bold text-center px-1">Cole aqui<br />(Ctrl+V)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
              MVPFin <ChurchCross className="text-blue-600" size={24} />
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gestão financeira da MVP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecione seu Usuário
            </label>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-left flex items-center gap-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              >
                <div className="bg-gray-200 dark:bg-slate-600 p-1.5 rounded-lg">
                  <Users className="text-gray-500 dark:text-gray-300" size={18} />
                </div>
                <div className="flex-1 truncate">
                  {selectedUser ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{selectedUser.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(selectedUser.role)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">Escolha um perfil...</span>
                  )}
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute z-10 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-600 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                      <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">Nenhum usuário encontrado</div>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelect(user.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors ${selectedUserId === user.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-slate-600">
                              {user.avatarInitials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs opacity-70">{getRoleLabel(user.role)}</span>
                            </div>
                          </div>
                          {selectedUserId === user.id && <Check size={16} />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {showPassword ? <><EyeOff size={12} /> Ocultar</> : <><Eye size={12} /> Mostrar</>}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className={`w-full pl-10 pr-12 py-3 rounded-xl border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500'} bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 transition-all font-mono`}
                placeholder="Digite sua senha..."
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium animate-in slide-in-from-top-1">
                <AlertTriangle size={12} /> {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedUserId || !password || isChecking}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={20} />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>© 2024 MVPFin. Segurança com Criptografia SHA-256</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
