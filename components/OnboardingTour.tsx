import React, { useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useLocation } from 'react-router-dom';

export const OnboardingTour: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('mvpfin_tour_seen_v1');

        if (!hasSeenTour && location.pathname === '/dashboard') {
            const driverObj = driver({
                showProgress: true,
                steps: [
                    {
                        element: '#dashboard-header',
                        popover: {
                            title: 'Bem-vindo ao MVPFin!',
                            description: 'Este é o seu painel de controle financeiro. Aqui você tem uma visão geral rápida do caixa da igreja.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#action-buttons',
                        popover: {
                            title: 'Ações Rápidas',
                            description: 'Comece por aqui! Registre novas entradas (dízimos, ofertas) ou saídas (contas pagas) com apenas um clique.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#kpi-grid',
                        popover: {
                            title: 'Indicadores',
                            description: 'Acompanhe o saldo atual, entradas e saídas do mês. Fique de olho nos alertas!',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#sidebar-nav',
                        popover: {
                            title: 'Menu Principal',
                            description: 'Navegue por todas as áreas do sistema: Relatórios, Membros, Configurações e muito mais.',
                            side: "right",
                            align: 'start'
                        }
                    }
                ],
                onDestroyStarted: () => {
                    localStorage.setItem('mvpfin_tour_seen_v1', 'true');
                    driverObj.destroy();
                },
            });

            // Small delay to ensure elements are rendered
            setTimeout(() => {
                driverObj.drive();
            }, 1500);
        }
    }, [location.pathname]);

    return null; // This component handles side effects only
};
