import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { submitReview } from '../services/rideService.js'; // <-- IMPORTADO

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

const StarRating = ({ rating, setRating }) => { /* ... (sin cambios) ... */ };

const LeaveReview = () => {
    const { rideId, revieweeId } = useParams();
    const navigate = useNavigate();
    const { profile: currentUserProfile } = useOutletContext();

    const [reviewee, setReviewee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => { /* ... (lógica de carga sin cambios) ... */ }, [revieweeId, navigate]);

    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast.warning("Por favor, selecciona al menos una estrella.");
            return;
        }
        setSubmitting(true);
        try {
            await submitReview({
                rideId,
                reviewerId: currentUserProfile.uid,
                revieweeId,
                rating,
                comment,
            });
            toast.success("¡Gracias por tu calificación!");
            navigate('/my-rides'); // Redirigir después de calificar
        } catch (error) {
            console.error("Error al enviar la calificación:", error);
            toast.error("No se pudo guardar tu calificación.", { description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 /></div>;
    if (!reviewee) return null;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                 {/* ... (renderizado sin cambios) ... */}
            </Card>
        </div>
    );
};

export default LeaveReview;
