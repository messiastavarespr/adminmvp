
import { ScheduledTransaction, TransactionType } from '../types';

// Email configurado para recebimento dos alertas
const ALERT_EMAIL = 'msig12@gmail.com';

export const notificationService = {
  // Solicita permissão ao usuário para enviar notificações do navegador
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações de sistema.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  // Verifica itens agendados e dispara notificação se houver pendências
  checkAndNotify: (scheduled: ScheduledTransaction[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Controle de frequência: Evita spam notificando apenas uma vez por dia
    const lastCheck = localStorage.getItem('mvpfin_last_notification_date');
    const todayStr = new Date().toDateString();

    // Se já notificou hoje, retorna (Comente esta linha para testar sempre)
    if (lastCheck === todayStr) {
       return; 
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueItems: ScheduledTransaction[] = [];
    const upcomingItems: ScheduledTransaction[] = [];

    scheduled.forEach(item => {
      // Considera apenas itens ativos e DESPESAS (Contas a Pagar)
      if (!item.isActive) return;
      if (item.type !== TransactionType.EXPENSE) return; 

      // Ajuste de fuso horário para garantir comparação correta da data (YYYY-MM-DD)
      const dueDate = new Date(item.dueDate + 'T12:00:00');
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdueItems.push(item);
      } else if (diffDays >= 0 && diffDays <= 3) {
        upcomingItems.push(item);
      }
    });

    const hasAlerts = overdueItems.length > 0 || upcomingItems.length > 0;

    if (hasAlerts) {
      let title = '';
      let body = '';
      const icon = '/favicon.ico'; // Ícone padrão se disponível

      // Lógica de Prioridade e Construção do Texto da Notificação
      if (overdueItems.length > 0) {
        title = overdueItems.length === 1 
          ? '⚠️ Conta Atrasada' 
          : `⚠️ ${overdueItems.length} Contas Atrasadas`;
        
        body = overdueItems.length === 1
          ? `A conta "${overdueItems[0].title}" venceu em ${new Date(overdueItems[0].dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}. Clique para enviar alerta.`
          : 'Existem contas vencidas que precisam de atenção. Clique para enviar relatório por email.';
      
      } else if (upcomingItems.length > 0) {
        title = upcomingItems.length === 1 
          ? '📅 Vencimento Próximo' 
          : `📅 ${upcomingItems.length} Contas a Vencer`;
        
        body = upcomingItems.length === 1
          ? `"${upcomingItems[0].title}" vence em breve. Clique para notificar.`
          : 'Fique atento! Existem contas vencendo nos próximos 3 dias. Clique para enviar alerta.';
      }

      // Disparar Notificação do Sistema
      // requireInteraction mantém o alerta na tela até o usuário clicar ou fechar
      const notification = new Notification(title, { 
        body, 
        icon, 
        tag: 'finance-alert',
        requireInteraction: true 
      });

      // Ao clicar na notificação, gera o email (mailto) e abre o cliente padrão
      notification.onclick = () => {
        window.focus();
        notification.close();
        notificationService.sendEmailReport(overdueItems, upcomingItems);
      };

      // Atualiza a data da última notificação para evitar repetição no mesmo dia
      localStorage.setItem('mvpfin_last_notification_date', todayStr);
    }
  },

  // Gera e abre o link mailto com o relatório formatado das contas
  sendEmailReport: (overdue: ScheduledTransaction[], upcoming: ScheduledTransaction[]) => {
    if (!ALERT_EMAIL) return;

    const subject = `Alerta Financeiro - ${overdue.length} Atrasadas / ${upcoming.length} A Vencer`;
    
    let body = `Relatório Automático de Pendências - MVPFin\n`;
    body += `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    if (overdue.length > 0) {
      body += `🔴 CONTAS ATRASADAS (${overdue.length}):\n`;
      overdue.forEach(item => {
        const dueDate = new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
        body += `- ${item.title}: R$ ${item.amount.toFixed(2)} (Venceu: ${dueDate})\n`;
      });
      body += `\n`;
    }

    if (upcoming.length > 0) {
      body += `🟡 A VENCER EM BREVE (${upcoming.length}):\n`;
      upcoming.forEach(item => {
        const dueDate = new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
        body += `- ${item.title}: R$ ${item.amount.toFixed(2)} (Vence: ${dueDate})\n`;
      });
      body += `\n`;
    }

    body += `\nPor favor, acesse o sistema para realizar as baixas ou agendamentos.\n`;

    // Codifica para URL segura e abre o cliente de email
    const mailtoLink = `mailto:${ALERT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Abre em uma nova aba/janela para não interromper a aplicação
    window.open(mailtoLink, '_blank');
  }
};
