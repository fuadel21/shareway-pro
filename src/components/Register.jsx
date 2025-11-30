import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { CarTaxiFront as Taxi, Loader2 } from 'lucide-react';
import '../App.css';
import { toast } from 'sonner';

import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setIsSubmitting(true);
    console.log("[REGISTER] Submitting form...");

    try {
      console.log("[REGISTER] 1. Awaiting user creation...");
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      console.log("[REGISTER] 2. User creation call finished.");

      if (!userCredential || !userCredential.user) {
        console.error("[REGISTER] CRITICAL: userCredential or userCredential.user is falsy.", userCredential);
        throw new Error("La creación del usuario no devolvió un resultado válido.");
      }
      const user = userCredential.user;
      console.log("[REGISTER] 3. User object obtained:", user.uid);

      await updateProfile(user, { displayName: formData.name });
      console.log("[REGISTER] 4. Profile updated in Auth.");
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: formData.name, // <-- CORRECCIÓN: Usar 'name' en lugar de 'displayName'
        email: user.email,
        emailVerified: user.emailVerified,
        phone: formData.phone || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        averageRating: 0,
        reviewsCount: 0,
      });
      console.log("[REGISTER] 5. Firestore document created.");

      await sendEmailVerification(user);
      console.log("[REGISTER] 6. Verification email sent.");

      toast.success('¡Cuenta creada!', {
          description: 'Te hemos enviado un correo para verificar tu cuenta.',
          onDismiss: () => navigate('/login'),
          duration: 5000
      });

    } catch (err) {
        console.log("[REGISTER] CATCH: Entering catch block.");
        let friendlyError = 'Ocurrió un error inesperado al registrar.';
        if (err.code) {
            console.log(`[REGISTER] CATCH: Firebase error code: ${err.code}`);
            switch (err.code) {
                case 'auth/email-already-in-use':
                    friendlyError = 'Este correo electrónico ya está registrado.'; break;
                case 'auth/invalid-email':
                    friendlyError = 'El formato del correo electrónico no es válido.'; break;
                case 'auth/weak-password':
                    friendlyError = 'La contraseña es demasiado débil (mín. 6 caracteres).'; break;
                default:
                    friendlyError = 'Error de autenticación. Por favor, revisa tus datos.';
            }
        } else {
           console.log(`[REGISTER] CATCH: Non-Firebase error: ${err.message}`);
           friendlyError = err.message;
        }
        setError(friendlyError);
        console.error("[REGISTER] CATCH: Full error object:", err);
    } finally {
      setIsSubmitting(false);
      console.log("[REGISTER] FINALLY: Process complete.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-4 text-center">
           <div className="flex justify-center"><div className="bg-gradient-to-br from-blue-500 to-yellow-500 p-4 rounded-2xl shadow-lg"><Taxi className="h-12 w-12 text-white" /></div></div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-yellow-600 bg-clip-text text-transparent">Crear Cuenta</CardTitle>
          <CardDescription className="text-base">Únete y comienza a compartir viajes</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div className="space-y-2"><Label htmlFor="name">Nombre Completo *</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
            <div className="space-y-2"><Label htmlFor="email">Correo Electrónico *</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required /></div>
            <div className="space-y-2"><Label htmlFor="phone">Teléfono (Opcional)</Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="password">Contraseña * (mín. 6 caracteres)</Label><Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required /></div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar Contraseña *</Label><Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required /></div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-700">{isSubmitting ? <><Loader2 className="animate-spin mr-2"/>Creando cuenta...</> : 'Crear Cuenta'}</Button>
            <div className="text-sm text-center text-muted-foreground">¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold">Inicia sesión</Link></div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default Register;
