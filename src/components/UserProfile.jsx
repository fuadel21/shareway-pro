import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Loader2, Star, Calendar, Pencil, Music, MessageCircle } from 'lucide-react'; // <-- NUEVOS ICONOS
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { UserRating } from './UserRating.jsx';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

// --- DICCIONARIO PARA MOSTRAR PREFERENCIAS ---
const preferenceLabels = {
    music: {
        any: 'Indiferente',
        rock: 'Rock',
        pop: 'Pop',
        electronic: 'Electrónica',
        reggaeton: 'Reggaetón',
        none: 'Silencio',
    },
    conversation: {
        any: 'Me adapto',
        talkative: 'Me gusta charlar',
        quiet: 'Prefiero ir tranquilo/a',
    }
};

const ReviewItem = ({ review }) => { /* ... (sin cambios) ... */ };

function UserProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { profile: currentUser } = useOutletContext();
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = currentUser?.uid === userId;

    useEffect(() => { /* ... (sin cambios) ... */ }, [userId]);

    if (loading) { /* ... (sin cambios) ... */ }
    if (!profile) { /* ... (sin cambios) ... */ }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-cover bg-center h-40" style={{ backgroundImage: `url('https://source.unsplash.com/1600x900/?landscape,nature,${profile.id}')` }} />
            
            <main className="container mx-auto p-4 max-w-3xl -mt-20">
                <Card className="overflow-hidden shadow-2xl rounded-3xl">
                    <CardHeader className="flex flex-col items-center text-center p-6">{/* ... (sin cambios) ... */}</CardHeader>
                    
                    <Tabs defaultValue="about" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-100">{/* ... (sin cambios) ... */}</TabsList>

                        <TabsContent value="about" className="p-6 space-y-6"> {/* <-- AÑADIDO space-y-6 */}
                            <p className="italic text-gray-700 text-center">
                                {profile.bio || (isOwnProfile ? "Aún no has añadido una biografía. ¡Cuéntale a la comunidad un poco sobre ti!" : "Este usuario aún no ha añadido una biografía.")}
                            </p>

                            {/* --- NUEVA SECCIÓN DE PREFERENCIAS -- */}
                            {profile.preferences && (
                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-semibold mb-4 text-center">Preferencias de Viaje</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                                        <div className="bg-gray-100/70 p-4 rounded-lg">
                                            <Music className="h-6 w-6 mx-auto text-primary mb-2" />
                                            <p className="text-sm font-semibold">Música</p>
                                            <p className="text-muted-foreground">{preferenceLabels.music[profile.preferences.music] || 'No especificado'}</p>
                                        </div>
                                        <div className="bg-gray-100/70 p-4 rounded-lg">
                                            <MessageCircle className="h-6 w-6 mx-auto text-primary mb-2" />
                                            <p className="text-sm font-semibold">Conversación</p>
                                            <p className="text-muted-foreground">{preferenceLabels.conversation[profile.preferences.conversation] || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="reviews" className="p-6">{/* ... (sin cambios) ... */}</TabsContent>
                        {profile.vehicle && (<TabsContent value="vehicle" className="p-6 space-y-4">{/* ... (sin cambios) ... */}</TabsContent>)}

                    </Tabs>
                </Card>
            </main>
        </div>
    );
}

export default UserProfile;
