import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { CarTaxiFront as Taxi } from 'lucide-react';
import '../App.css';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Función para redirigir después de un inicio de sesión exitoso
  const handleLoginSuccess = async (user) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      // Comprobar si el usuario tiene el rol de 'admin'
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/'); // Redirigir a la página de inicio para usuarios normales
      }
    } catch (docError) {
      setError('No se pudo verificar el rol del usuario.');
      console.error("Error fetching user role: ", docError);
      navigate('/'); // Ir a la página de inicio por defecto en caso de error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleLoginSuccess(userCredential.user);
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('El correo o la contraseña son incorrectos.');
          break;
        case 'auth/invalid-email':
          setError('El formato del correo electrónico no es válido.');
          break;
        default:
          setError('Ocurrió un error al iniciar sesión.');
          console.error("Firebase login error: ", err);
      }
      setIsSubmitting(false); // Solo detener el loader si hay un error
    }
    // No establecer isSubmitting a false en el 'finally' porque la navegación puede tardar
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        let userRole = 'user';
        
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL,
                role: 'user',
                createdAt: serverTimestamp()
            });
        } else {
            userRole = userDoc.data().role;
        }

        if (userRole === 'admin') {
            navigate('/admin');
        } else {
            navigate('/');
        }
    } catch (err) {
        setError('Ocurrió un error al iniciar sesión con Google.');
        console.error("Firebase Google sign-in error: ", err);
        setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-yellow-500 p-4 rounded-2xl shadow-lg">
              <Taxi className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-yellow-600 bg-clip-text text-transparent">
            Taxi Compartido
          </CardTitle>
          <CardDescription className="text-base">
            Comparte tu viaje y ahorra dinero
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center">
              <Link to="/forgot-password"
                className="ml-auto inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                ¿Has olvidado tu contraseña?
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-700">
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  O continúa con
                </span>
              </div>
            </div>
            <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full">
               Iniciar Sesión con Google
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                Regístrate aquí
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default Login;
