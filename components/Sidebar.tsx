
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  BarChart3,
  Settings as SettingsIcon,
  X,
  Building2,
  LogOut,
  Moon,
  Sun,
  ClipboardList,
  Link,
  ChurchCross,
  FileJson,
  Database,
  DollarSign,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Package,
  Archive
} from './ui/Icons';
import { useFinance } from '../contexts/FinanceContext';
import { AppView } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItemProps {
  id: AppView;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: (id: AppView) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, icon: Icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { data, currentUser, logout, activeTab, setActiveTab, toggleTheme } = useFinance();

  // State to track expanded sections
  const [expandedSections, setExpandedSections] = useState<string[]>(['Principal', 'Financeiro']);

  const handleNavigation = (id: AppView) => {
    setActiveTab(id);
    onClose();
  };

  const currentChurch = data.churches.find(c => c.id === currentUser?.churchId) || data.churches[0];
  const sidebarLogo = currentChurch?.logo;

  const menuSections: { title: string; icon?: React.ElementType; items: { id: AppView; label: string; icon: React.ElementType }[] }[] = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard' as AppView, label: 'Visão Geral', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { id: 'ledger' as AppView, label: 'Livro Caixa', icon: BookOpen },
        { id: 'tithes' as AppView, label: 'Dízimos', icon: DollarSign },
        { id: 'payables' as AppView, label: 'Contas a Pagar', icon: ClipboardList },
        { id: 'scheduled' as AppView, label: 'Agendamentos', icon: CalendarClock },
        { id: 'reconciliation' as AppView, label: 'Conciliação', icon: Link },
      ]
    },
    {
      title: 'Cadastros',
      items: [
        { id: 'members' as AppView, label: 'Pessoas', icon: UserCheck },
        { id: 'registries' as AppView, label: 'Categorias & Contas', icon: Database },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { id: 'reports' as AppView, label: 'Relatórios', icon: BarChart3 },
        { id: 'assets' as AppView, label: 'Patrimônio', icon: Archive },
        { id: 'tools' as AppView, label: 'Ferramentas', icon: FileJson },
        { id: 'settings' as AppView, label: 'Configurações', icon: SettingsIcon },
      ]
    }
  ];

  // Auto-expand the section containing the active tab on mount or tab change
  useEffect(() => {
    const activeSection = menuSections.find(section =>
      section.items.some(item => item.id === activeTab)
    );

    if (activeSection && !expandedSections.includes(activeSection.title)) {
      setExpandedSections(prev => [...prev, activeSection.title]);
    }
  }, [activeTab]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800">
          {sidebarLogo ? (
            <img src={sidebarLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Building2 size={24} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white leading-tight flex items-center gap-1">
              MVPFin <ChurchCross className="text-blue-600" size={16} />
            </h1>
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">v2.0 Pro</span>
          </div>
          <button onClick={onClose} className="lg:hidden ml-auto text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {menuSections.map((section, idx) => {
            const isExpanded = expandedSections.includes(section.title);
            const hasActiveChild = section.items.some(item => item.id === activeTab);

            return (
              <div key={idx}>
                {section.title !== 'Principal' ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={`w-full flex items-center justify-between px-4 py-2 mb-1 text-xs font-semibold uppercase tracking-wider transition-colors group ${hasActiveChild ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon && <section.icon size={14} className={hasActiveChild ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"} />}
                      {section.title}
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <div className="px-4 py-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    {section.icon && <section.icon size={14} />}
                    {section.title}
                  </div>
                )}

                {/* Always show Principal, toggle others */}
                <div className={`space-y-1 transition-all overflow-hidden ${section.title === 'Principal' || isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      icon={item.icon}
                      isActive={activeTab === item.id}
                      onClick={handleNavigation}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer User Profile & Theme */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              {currentUser?.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentUser?.role === 'ADMIN' ? 'Admin' : 'Tesoureiro'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 p-2 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Alternar Tema"
            >
              {data.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={logout}
              className="flex-1 p-2 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="mt-4 pb-2 text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-600 font-medium">
            Desenvolvido por Messias Tavares
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
