
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LogIn, Users, Lock, Search, ChevronDown, Check, Building2, AlertTriangle, Eye, EyeOff, Trash2, ChurchCross, Image as ImageIcon, Wallet, BookOpen, Mail } from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  users: User[];
  onLogin: (user: User, mode: 'FINANCE' | 'SECRETARY') => void;
  logoUrl?: string;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, logoUrl }) => {
  // Context hook
  const { updateChurch, data, addUser } = useFinance();

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Login Mode State: 'FINANCE' | 'SECRETARY'
  const [loginMode, setLoginMode] = useState<'FINANCE' | 'SECRETARY'>('FINANCE');

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

    if (!email || !password) {
      setError('Por favor, preencha email e senha.');
      return;
    }

    setIsChecking(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      // --- STRATEGY: DIRECT RAW FETCH (Bypassing Supabase Client) ---
      // Diagnosis confirmed Client Library timeouts, but REST API works.

      const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`;

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const dataStr = await response.text();
      let authData;
      try {
        authData = JSON.parse(dataStr);
      } catch (e) {
        throw new Error("Erro ao processar resposta do servidor.");
      }

      if (!response.ok) {
        // Handle Auth Errors
        const msg = authData.error_description || authData.msg || 'Erro na autenticação';
        console.error("Auth Fail:", msg);
        if (msg.includes("Email not confirmed")) setError('Email não confirmado.');
        else if (msg.includes("Invalid login")) setError('Email ou senha incorretos.');
        else setError(msg);
        setIsChecking(false);
        return;
      }

      // LOGIN SUCCESS!
      if (authData.access_token) {

        // Try to hydrate client (best effort), but don't await/block on it
        // Try to hydrate client (best effort), but don't await/block on it
        try {
          // CRITICAL: Await this to ensure localStorage is written before reload
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
          });
          if (sessionError) console.error("Session set error:", sessionError);
        } catch (e) {
          console.error("Client hydration failed (ignorable)", e);
        }

        // --- MASTER USER FLOW ---
        if (trimmedEmail === 'msig12@gmail.com') {
          const safeChurchId = (data?.churches && data.churches.length > 0) ? data.churches[0].id : 'ch_hq';

          const masterUser: User = {
            id: authData.user.id,
            name: 'Messias (Master)',
            email: trimmedEmail,
            role: UserRole.MASTER,
            avatarInitials: 'MS',
            churchId: safeChurchId,
            permissions: {
              manageCategories: true, manageAccounts: true, manageCostCenters: true,
              manageBudgets: true, manageChurches: true, manageUsers: true,
              manageFunds: true, viewAuditLog: true, performBackup: true, performRestore: true
            }
          };

          onLogin(masterUser, loginMode);
          window.location.href = '/'; // Force reload to clear any bad state
          return;
        }

        // --- STANDARD USER FLOW ---
        // Fetch full profile to pass to onLogin
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !userProfile) {
          // If profile fetch fails (rare but possible during race conditions), 
          // allow reload to handle it but we lose the mode. 
          // Ideally we should wait or retry, but for now:
          console.error("Profile fetch error on login:", profileError);
          window.location.href = '/';
          return;
        }

        const standardUser: User = {
          ...userProfile,
          // Map DB fields to User type if needed (supabaseService does this, but here we are raw)
          // Actually, let's trust the context to reload execution, OR:
          // Better: Call onLogin with the fetched user
        };

        // Convert snake_case to camelCase manually if needed or just use what we have if the types match
        // Assuming database columns match User type or close enough for now.
        // Actually, let's use the helper if possible, or Map:
        const mappedUser: User = {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: userProfile.role,
          avatarInitials: userProfile.avatar_initials || (userProfile.name ? userProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'US'),
          churchId: userProfile.church_id || userProfile.churchId,
          avatarUrl: userProfile.avatar_url,
          accessMvpSec: userProfile.access_mvp_sec,
          accessMvpFin: userProfile.access_mvp_fin,
          allowedChurches: userProfile.allowed_churches,
          permissions: userProfile.permissions
        };

        onLogin(mappedUser, loginMode);
        return;
      }

    } catch (e: any) {
      console.error(e);
      setError('Erro de Conexão: ' + (e.message || 'Verifique sua internet.'));
      setIsChecking(false);
    }
  };

  const handleFactoryReset = () => {
    if (confirm("ATENÇÃO: Isso limpará os dados LOCAIS do navegador apenas. Seus dados no Supabase permanecerão seguros. Deseja limpar o cache local?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleTestConnection = async () => {
    // 1. Immediate Alert to prove execution started and show Env Vars
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    alert(`INICIANDO DIAGNÓSTICO:\n\nURL: ${url || 'NÃO DEFINIDA'}\nKey: ${key ? (key.substring(0, 5) + '...') : 'NÃO DEFINIDA'}\n\nClique OK para continuar (pode levar 10s)...`);

    setIsChecking(true);
    let report = `Relatório Técnico:\n`;

    // Helper for timeout
    const fetchWithTimeout = (timeoutMs: number, promise: Promise<any>) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs))
      ]);
    };

    try {
      const start = Date.now();
      // Force Timeout on Fetch
      const res: any = await fetchWithTimeout(5000, fetch(`${url}/rest/v1/`, { method: 'HEAD', headers: { 'apikey': key || '' } }));
      const ping = Date.now() - start;
      report += `Ping HTTP (Root): OK (${ping}ms) - Status: ${res.status}\n`;
    } catch (e: any) {
      report += `Ping HTTP (Root): FALHA (${e.message})\n`;
    }

    try {
      // 1.5 DIRECT REST API TEST (Bypass JS Client)
      const start = Date.now();
      const res: any = await fetchWithTimeout(5000, fetch(`${url}/rest/v1/users?select=count`, {
        method: 'GET',
        headers: {
          'apikey': key || '',
          'Authorization': `Bearer ${key || ''}`
        }
      }));
      const ping = Date.now() - start;
      if (res.ok) report += `Ping API Users (Fetch): OK (${ping}ms) - Status: ${res.status}\n`;
      else report += `Ping API Users (Fetch): ERRO Status ${res.status}\n`;
    } catch (e: any) {
      report += `Ping API Users (Fetch): FALHA (${e.message})\n`;
    }

    try {
      // Force Timeout on DB
      const dbPromise = supabase.from('users').select('*', { count: 'exact', head: true }).then(); // .then() ensures it's a Promise
      const { count, error }: any = await fetchWithTimeout(5000, dbPromise);

      if (error) report += `DB Select: Erro (${error.message})\n`;
      else report += `DB Select: OK (Registros: ${count})\n`;
    } catch (e: any) {
      report += `DB Select: FALHA CRÍTICA (${e.message})\n`;
    }

    alert(report);
    setIsChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4 relative">

      {/* Connection Test Button */}
      <button
        type="button"
        onClick={handleTestConnection}
        className="absolute bottom-4 right-4 text-xs text-gray-400 hover:text-blue-500 underline"
      >
        Testar Conexão
      </button>

      {/* Factory Reset Button */}
      <button
        type="button"
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
              {loginMode === 'FINANCE' ? 'MVPFin' : 'MVPSec'} <ChurchCross className="text-blue-600" size={24} />
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {loginMode === 'FINANCE' ? 'Gestão Financeira da MVP' : 'Gestão de Secretaria da MVP'}
          </p>
        </div>

        {/* System Toggle - Modern Segmented Control */}
        <div className="relative p-1.5 bg-gray-100 dark:bg-slate-700 rounded-2xl mb-8 flex relative overflow-hidden">
          {/* Slider Background Animation */}
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-600 rounded-xl shadow-sm transition-all duration-300 ease-out z-0 ${loginMode === 'FINANCE' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
          />

          <button
            type="button"
            onClick={() => { setLoginMode('FINANCE'); }}
            className={`flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors duration-300 flex items-center justify-center gap-2 ${loginMode === 'FINANCE' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <Wallet size={18} className={loginMode === 'FINANCE' ? 'animate-pulse-subtle' : ''} />
            Financeiro
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('SECRETARY'); }}
            className={`flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors duration-300 flex items-center justify-center gap-2 ${loginMode === 'SECRETARY' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <BookOpen size={18} className={loginMode === 'SECRETARY' ? 'animate-pulse-subtle' : ''} />
            Secretaria
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 focus:ring-blue-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 transition-all"
                placeholder="seu.email@exemplo.com"
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
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
            disabled={!email || !password || isChecking}
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
          <p>© 2024 MVPFin. Autenticação Segura via Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
