import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bell, Palette, Shield, BadgeCheck, Users } from 'lucide-react';

const SettingsItem = ({ icon: Icon, title, description, onClick }) => (
    <button onClick={onClick} className="w-full text-left p-3 sm:p-4 hover:bg-accent transition-colors rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <div>
                <p className="font-semibold text-sm sm:text-base">{title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
    </button>
);

function Settings() {
    const navigate = useNavigate();

    const menuItems = {
        'General': [
            { icon: Bell, title: 'Notificaciones', description: 'Gestiona cómo te contactamos', link: '/settings/notifications' },
            { icon: Palette, title: 'Apariencia', description: 'Personaliza la interfaz (claro/oscuro)', link: '/settings/appearance' },
            { icon: Users, title: 'Grupos de Confianza', description: 'Viaja con tu comunidad verificada', link: '/community-groups' }
        ],
        'Seguridad y Verificación': [
            { icon: BadgeCheck, title: 'Verificación de Identidad', description: 'Aumenta la confianza de tu perfil', link: '/settings/verification' },
            { icon: Shield, title: 'Centro de Seguridad', description: 'Funciones para tu tranquilidad', link: '/settings/security' },
        ],
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 my-6">Ajustes</h1>
                <div className="space-y-8">
                    {Object.entries(menuItems).map(([section, items]) => (
                        <div key={section}>
                            <h2 className="text-base sm:text-lg font-semibold text-muted-foreground px-4 mb-2">{section}</h2>
                            <div className="bg-card rounded-lg border">
                                {items.map((item, index) => (
                                    <div key={item.title} className={index < items.length - 1 ? 'border-b' : ''}>
                                        <SettingsItem 
                                            icon={item.icon}
                                            title={item.title}
                                            description={item.description}
                                            onClick={() => navigate(item.link)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Settings;
