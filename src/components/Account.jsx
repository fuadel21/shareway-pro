import React from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';

// --- UI & Icons ---
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { LogOut, Star, User, Settings, Wallet, Route, ShieldCheck, Car, Cigarette, Dog, Music, MessageCircle, ChevronRight, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCommunityType } from '@/lib/communityTypes';

const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : words[0].substring(0, 2).toUpperCase();
};

const StarRating = ({ rating, count }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    if (count === 0) return <p className="text-sm text-muted-foreground">Sin valoraciones</p>;

    return (
        <div className="flex items-center gap-1">
            {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
            {halfStar && <Star key="half" className="h-5 w-5 text-yellow-400 fill-yellow-200" />}
            {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)}
            <span className="text-sm text-muted-foreground ml-1">({count})</span>
        </div>
    );
};

const PreferenceIcon = ({ icon: Icon, label, status }) => {
    const statusMap = {
        yes: { text: `Permite ${label.toLowerCase()}`, color: 'text-green-600' },
        no: { text: `No permite ${label.toLowerCase()}`, color: 'text-red-600' },
        any: { text: `Indiferente a ${label.toLowerCase()}`, color: 'text-gray-500' }
    };
    const current = statusMap[status] || statusMap.any;
    return (
        <div className="flex items-center gap-2" title={current.text}>
            <Icon className={cn("h-6 w-6", current.color)} />
            <span className="font-medium md:hidden">{current.text}</span>
        </div>
    );
};

function Account() {
    const { profile, handleSignOut } = useOutletContext();
    const navigate = useNavigate();

    if (!profile) return <div className="h-screen w-screen flex items-center justify-center">Cargando perfil...</div>;

    const memberSince = profile.metadata?.creationTime ?
        `Miembro desde hace ${formatDistanceToNow(new Date(profile.metadata.creationTime), { locale: es })}` : '';

    const ActionButton = ({ to, icon: Icon, children }) => (
        <Button variant="outline" size="lg" asChild className="justify-start text-base py-8">
            <Link to={to} className="flex items-center gap-4">
                <Icon className="h-7 w-7 text-primary" />
                <span className="flex-grow font-semibold">{children}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
        </Button>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            <main className="container mx-auto p-4 max-w-2xl">
                {/* --- Tarjeta de Perfil Principal --- */}
                <Card className="overflow-hidden shadow-lg mb-6">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <Avatar className="h-28 w-28 border-4 border-white dark:border-slate-800 shadow-md mb-4">
                            <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                            <AvatarFallback className="text-4xl">{getInitials(profile.displayName)}</AvatarFallback>
                        </Avatar>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{profile.displayName}</h1>
                        <p className="text-base text-muted-foreground dark:text-slate-400">{profile.email}</p>
                        <p className="text-sm text-muted-foreground mt-1">{memberSince}</p>
                        <div className="my-4">
                            <StarRating rating={profile.rating?.average || 0} count={profile.rating?.count || 0} />
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {profile.verification?.status === 'verified' && (
                                <div className="flex items-center gap-2 text-green-600 bg-green-100 dark:bg-green-900/50 rounded-full px-3 py-1 text-sm font-semibold">
                                    <ShieldCheck className="h-5 w-5" /> Identidad Verificada
                                </div>
                            )}
                            {profile.phoneVerified && (
                                <div className="flex items-center gap-2 text-blue-600 bg-blue-100 dark:bg-blue-900/50 rounded-full px-3 py-1 text-sm font-semibold">
                                    <Phone className="h-4 w-4" /> Teléfono Verificado
                                </div>
                            )}
                            {profile.communityName && (() => {
                                const communityType = getCommunityType(profile.communityType);
                                const TypeIcon = communityType.icon;
                                return (
                                    <div className={`flex items-center gap-2 ${communityType.bgColor} ${communityType.textColor} rounded-full px-3 py-1 text-sm font-semibold border ${communityType.borderColor}`}>
                                        <TypeIcon className="h-5 w-5" /> {profile.communityName}
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* --- Botones de Acción Principales --- */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                    <ActionButton to="/edit-profile" icon={User}>Editar Perfil</ActionButton>
                    <ActionButton to="/favorite-routes" icon={Star}>Mis Rutas Favoritas</ActionButton>
                    <ActionButton to="/wallet" icon={Wallet}>Mi Cartera</ActionButton>
                    <ActionButton to="/my-rides" icon={Route}>Mis Viajes</ActionButton>
                    <ActionButton to="/referrals" icon={Gift}>Invita y Gana</ActionButton>
                    <ActionButton to="/settings" icon={Settings}>Ajustes</ActionButton>
                </div>

                {/* --- Tarjeta de Vehículo (si existe) --- */}
                {profile.vehicle && profile.vehicle.make && (
                    <Card className="mb-6">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Car /> Mi Vehículo</CardTitle></CardHeader>
                        <CardContent className="flex items-center gap-4">
                            {profile.vehicle.photoURL && <Avatar className="h-20 w-20 rounded-md"><AvatarImage src={profile.vehicle.photoURL} className="rounded-md" /></Avatar>}
                            <div>
                                <p className="font-bold text-lg">{profile.vehicle.make} {profile.vehicle.model}</p>
                                <p className="text-muted-foreground">{profile.vehicle.color} - {profile.vehicle.year}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* --- Tarjeta de Preferencias --- */}
                {profile.preferences && (
                    <Card className="mb-6">
                        <CardHeader><CardTitle>Preferencias de Viaje</CardTitle></CardHeader>
                        <CardContent className="flex justify-around items-center pt-2">
                            <PreferenceIcon icon={Cigarette} label="Fumar" status={profile.preferences.smoking} />
                            <PreferenceIcon icon={Dog} label="Mascotas" status={profile.preferences.pets} />
                            <PreferenceIcon icon={Music} label="Música" status={profile.preferences.music} />
                            <PreferenceIcon icon={MessageCircle} label="Conversación" status={profile.preferences.talkativeness} />
                        </CardContent>
                    </Card>
                )}

                {/* --- Cerrar Sesión y Zona de Peligro --- */}
                <div className="space-y-4 pt-4">
                    <Button variant="ghost" size="lg" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-5 w-5" />
                        Cerrar Sesión
                    </Button>
                    <p className="text-center text-xs text-muted-foreground pt-8">
                        ¿Necesitas ayuda? Contacta a <a href="mailto:soporte@taxicompartido.com" className="underline">soporte@taxicompartido.com</a>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default Account;
