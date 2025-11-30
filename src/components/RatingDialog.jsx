import { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';

// --- Firebase Imports ---
import { db } from '../lib/firebase';
import { runTransaction, doc, collection, serverTimestamp, arrayUnion } from 'firebase/firestore';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

const StarRating = ({ rating, setRating }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={`cursor-pointer h-7 w-7 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} onClick={() => setRating(star)} />
        ))}
    </div>
);

export function RatingDialog({ isOpen, onOpenChange, ride, currentUser, participants }) {
    const [ratings, setRatings] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!ride || !currentUser) return null;

    // Usamos `passengerIds` para asegurar que solo valoramos a quienes viajaron.
    const participantIdsToRate = [ride.creator.id, ...(ride.passengerIds || [])]
        .filter(id => id !== currentUser.uid)
        .filter((id, i, self) => i === self.findIndex(pId => pId === id));

    const handleRatingChange = (userId, newRating) => setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], rating: newRating } }));
    const handleReviewChange = (userId, newReview) => setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], review: newReview } }));

    const handleSubmit = async () => {
        const ratedUserIds = Object.keys(ratings).filter(id => ratings[id]?.rating > 0);
        if (ratedUserIds.length === 0) return toast.error("Debes dar al menos una valoración (con estrellas).");
        
        setIsSubmitting(true);
        const promise = runTransaction(db, async (transaction) => {
            const rideRef = doc(db, 'rides', ride.id);
            const rideDoc = await transaction.get(rideRef);
            if (!rideDoc.exists() || rideDoc.data().ratedBy?.includes(currentUser.uid)) throw new Error("El viaje ya no existe o ya lo has valorado.");

            for (const userId of ratedUserIds) {
                const ratingData = ratings[userId];
                const userRef = doc(db, 'users', userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) continue;

                const { averageRating = 0, reviewsCount = 0 } = userDoc.data();
                const newAverage = ((averageRating * reviewsCount) + ratingData.rating) / (reviewsCount + 1);

                transaction.update(userRef, { averageRating: parseFloat(newAverage.toFixed(2)), reviewsCount: reviewsCount + 1 });
                transaction.set(doc(collection(db, 'users', userId, 'reviews')), {
                    rideId: ride.id, rating: ratingData.rating, comment: ratingData.review || '',
                    authorId: currentUser.uid, authorName: currentUser.displayName, authorPhoto: currentUser.photoURL,
                    createdAt: serverTimestamp()
                });
            }
            transaction.update(rideRef, { ratedBy: arrayUnion(currentUser.uid) });
        });

        toast.promise(promise, {
            loading: 'Enviando valoraciones...',
            success: () => { onOpenChange(false); setRatings({}); return '¡Gracias por tu feedback!'; },
            error: (err) => `${err.message || 'No se pudieron guardar las valoraciones.'}`,
            finally: () => setIsSubmitting(false)
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Valora a los participantes</DialogTitle>
                    <DialogDescription>Tu feedback ayuda a construir una comunidad de confianza.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    {participantIdsToRate.length > 0 ? participantIdsToRate.map(pId => {
                        const profile = participants[pId];
                        if (!profile) return null;
                        return (
                            <div key={pId} className="p-4 border rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <Avatar><AvatarImage src={profile.photoURL} /><AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback></Avatar>
                                    <p className="font-semibold text-lg">{profile.displayName}</p>
                                </div>
                                <div className="my-3"><StarRating rating={ratings[pId]?.rating || 0} setRating={r => handleRatingChange(pId, r)} /></div>
                                <Textarea placeholder={`(Opcional) Deja un comentario sobre ${profile.displayName}...`} value={ratings[pId]?.review || ''} onChange={e => handleReviewChange(pId, e.target.value)} />
                            </div>
                        )
                    }) : <p>No hay otros participantes a quienes valorar.</p>}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || participantIdsToRate.length === 0}>{isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Enviando...</> : 'Enviar Valoraciones'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
