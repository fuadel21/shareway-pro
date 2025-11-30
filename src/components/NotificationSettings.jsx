import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { MessageSquare, Briefcase, Clock, Sparkles } from 'lucide-react';

const get = (obj, path, def) => path.split('.').reduce((a, b) => (a && a[b] !== undefined) ? a[b] : def, obj);

const NOTIFICATION_OPTIONS = [
  { id: 'messages', icon: MessageSquare, title: 'Mensajes en el chat', description: 'Alertas de nuevos mensajes.' },
  { id: 'rideUpdates', icon: Briefcase, title: 'Actualizaciones de viaje', description: 'Cambios en tus viajes.' },
  { id: 'reminders', icon: Clock, title: 'Recordatorios de viaje', description: 'Alertas antes de un viaje.' },
  { id: 'promotions', icon: Sparkles, title: 'Promociones y novedades', description: 'Ofertas y noticias de la app.' },
];

function NotificationSettings() {
    const [notifications, setNotifications] = useState(() => 
        JSON.parse(localStorage.getItem('notification_settings') || 'null') || 
        { messages: true, rideUpdates: true, reminders: true, promotions: false }
    );

    useEffect(() => {
        localStorage.setItem('notification_settings', JSON.stringify(notifications));
    }, [notifications]);

    const handleNotificationChange = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 my-6">Notificaciones</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Preferencias de Notificaciones</CardTitle>
                        <CardDescription>Elige cómo y cuándo quieres que te informemos.</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {NOTIFICATION_OPTIONS.map(({ id, icon: Icon, title, description }) => (
                          <div key={id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <Icon className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{title}</p>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>
                            </div>
                            <Switch 
                                checked={get(notifications, id, false)} 
                                onCheckedChange={() => handleNotificationChange(id)} 
                            />
                          </div>
                        ))}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default NotificationSettings;
