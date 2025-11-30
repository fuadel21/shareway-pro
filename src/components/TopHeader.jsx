import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';

const MAIN_TABS = ['/dashboard', '/my-rides', '/chats'];

const PATH_TITLES = {
    '/create-ride': 'Crear Viaje',
    '/profile': 'Mi Perfil',
    '/settings': 'Ajustes',
    '/settings/account': 'Cuenta',
    '/settings/appearance': 'Apariencia',
    '/settings/notifications': 'Notificaciones',
    '/settings/billing': 'Facturación',
    '/settings/security': 'Seguridad',
    '/settings/verification': 'Centro de Verificación',
    '/settings/payouts': 'Ajustes de Pago',
    '/security/emergency-contacts': 'Contactos de Emergencia',
    '/security/share-my-trip': 'Compartir mi Viaje',
    '/security/audio-recording': 'Grabación de Audio',
    '/security/pin-verification': 'Verificación por PIN',
};

const getTitle = (pathname) => {
    if (PATH_TITLES[pathname]) {
        return PATH_TITLES[pathname];
    }
    if (pathname.startsWith('/ride/')) return 'Detalles del Viaje';
    if (pathname.startsWith('/chat/')) return 'Chat';
    if (pathname.startsWith('/profile/')) return 'Perfil de Usuario';
    if (pathname.startsWith('/review/')) return 'Dejar Reseña';
    return '';
};

const TopHeader = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isMainTab = MAIN_TABS.includes(location.pathname);
    const title = getTitle(location.pathname);

    // Don't show header on main tabs or if there's no title
    if (isMainTab || !title) {
        return null;
    }

    return (
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b dark:border-slate-700">
            <div className="container mx-auto flex items-center justify-between h-14 px-4">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Volver</span>
                    </Button>
                    <h1 className="text-lg font-semibold truncate">
                        {title}
                    </h1>
                </div>
                <ThemeToggle />
            </div>
        </header>
    );
};

export default TopHeader;
