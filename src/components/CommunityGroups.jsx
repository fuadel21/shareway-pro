import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, Info } from 'lucide-react';
import { COMMUNITY_TYPES, getCommunityType } from '@/lib/communityTypes';
import SubPageHeader from './SubPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';

const CommunityGroups = () => {
    const { profile, refreshProfile } = useOutletContext();
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'communities'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const communitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCommunities(communitiesData);
            setLoading(false);
        }, (error) => {
            toast.error("Error al cargar las comunidades.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleJoinCommunity = async (community) => {
        if (!profile?.email) {
            toast.error("Error", { description: "No se pudo encontrar tu email para la verificación." });
            return;
        }

        const userEmailDomain = profile.email.split('@')[1];
        if (userEmailDomain !== community.allowedDomain) {
            toast.error("No puedes unirte a esta comunidad", {
                description: `Tu email debe pertenecer al dominio \"@${community.allowedDomain}\".`
            });
            return;
        }

        setIsJoining(community.id);
        try {
            const userDocRef = doc(db, 'users', profile.uid);
            await updateDoc(userDocRef, {
                communityId: community.id,
                communityName: community.name,
                communityType: community.type || 'university',
            });
            toast.success(`¡Te has unido a la comunidad \"${community.name}\"!`);
            await refreshProfile();
        } catch (error) {
            toast.error("Error al unirse a la comunidad.", { description: error.message });
        } finally {
            setIsJoining(null);
        }
    };

    const handleLeaveCommunity = async () => {
        if (!confirm("¿Estás seguro de que quieres abandonar tu comunidad?")) return;
        setIsJoining('leave');
        try {
            const userDocRef = doc(db, 'users', profile.uid);
            await updateDoc(userDocRef, {
                communityId: null,
                communityName: null,
                communityType: null,
            });
            toast.success("Has abandonado la comunidad.");
            await refreshProfile();
        } catch (error) {
            toast.error("Error al abandonar la comunidad.", { description: error.message });
        } finally {
            setIsJoining(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Comunidades" />
            <main className="container mx-auto p-4 max-w-3xl pb-12">

                {profile?.communityId ? (
                    <Card className="mb-8 border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-green-600" /> Perteneces a una Comunidad</CardTitle>
                            <CardDescription>Actualmente eres miembro de <strong>{profile.communityName}</strong>. Los viajes dentro de tu comunidad tendrán una insignia especial.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" onClick={handleLeaveCommunity} disabled={isJoining === 'leave'}>
                                {isJoining === 'leave' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Abandonar Comunidad'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="mb-8 border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Info className="h-6 w-6 text-blue-600" /> Únete a una Comunidad</CardTitle>
                            <CardDescription>Si te unes a una comunidad verificada (usando tu email del trabajo o de la universidad), podrás ver viajes exclusivos y generar más confianza.</CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Comunidades Disponibles</h2>
                    {loading ? (
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    ) : communities.length > 0 ? (
                        communities.map((community) => {
                            const isMember = profile?.communityId === community.id;
                            const communityType = getCommunityType(community.type);
                            const TypeIcon = communityType.icon;

                            return (
                                <Card key={community.id} className={`border-2 ${communityType.borderColor} hover:shadow-lg transition-shadow`}>
                                    <div className={`p-4 ${communityType.bgColor} rounded-t-lg`}>
                                        <div className="flex items-center gap-3">
                                            <TypeIcon className={`h-8 w-8 ${communityType.iconColor}`} />
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg">{community.name}</h3>
                                                <p className={`text-sm ${communityType.textColor} font-medium`}>{communityType.label}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <p className="text-sm text-muted-foreground">{communityType.description}</p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Verificación: {community.allowedDomain ? `@${community.allowedDomain}` : 'Por invitación'}</span>
                                        </div>
                                        <Button
                                            variant={isMember ? 'secondary' : 'default'}
                                            disabled={isMember || isJoining === community.id || !!profile?.communityId}
                                            onClick={() => handleJoinCommunity(community)}
                                            className="w-full"
                                        >
                                            {isJoining === community.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (isMember ? 'Ya eres miembro' : 'Unirse')}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <p className="text-gray-500">No hay comunidades disponibles en este momento.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CommunityGroups;
