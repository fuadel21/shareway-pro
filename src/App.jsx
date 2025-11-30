import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import './App.css';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';

// Firebase
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Capacitor
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Google Maps removed
// import { useJsApiLoader } from '@react-google-maps/api';
// import { GOOGLE_MAPS_API_KEY } from '@/lib/firebaseConfig';

// Componentes
import MainLayout from '@/components/MainLayout';
import Login from '@/components/Login';
import Register from '@/components/Register';
import Dashboard from '@/components/Dashboard';
import CreateRide from '@/components/CreateRide';
import RideDetails from '@/components/RideDetails';
import MyRides from '@/components/MyRides';
import Wallet from '@/components/Wallet';
import PublicTracking from './components/PublicTracking';
import { ReferralProgram } from './components/ReferralProgram';
import EditProfile from '@/components/EditProfile';
import CreateRequest from '@/components/CreateRequest';
import RequestDetails from '@/components/RequestDetails';
import ChatList from '@/components/ChatList';
import Chat from '@/components/Chat';
import Account from '@/components/Account';
import Settings from '@/components/Settings';
import NotificationSettings from '@/components/NotificationSettings';
import AppearanceSettings from '@/components/AppearanceSettings';
import VerificationSettings from '@/components/VerificationSettings';
import SecuritySettings from '@/components/SecuritySettings';
import CommunityGroups from '@/components/CommunityGroups';
import FavoriteRoutes from '@/components/FavoriteRoutes';
import ExplorePage from '@/components/ExplorePage';
import { requestNotificationPermission, onMessageListener } from '@/lib/notificationUtils';
// (Se asumen los demás imports)

// const LIBRARIES = ['places', 'geometry'];

const FullScreenLoader = ({ text = 'Cargando...', showLogout = false }) => (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p>{text}</p>
        {showLogout && (
            <Button variant="outline" onClick={() => signOut(auth).then(() => window.location.reload())}>
                Cerrar Sesión
            </Button>
        )}
    </div>
);

const ProtectedRoute = ({ user, profile, isLoading, ...outletContext }) => {
    const location = useLocation();
    // Efecto para inicializar notificaciones FCM
    useEffect(() => {
        if (user) {
            requestNotificationPermission(user.uid);

            const unsubscribe = onMessageListener().then(payload => {
                if (payload && payload.notification) {
                    const { title, body } = payload.notification;
                    const rideId = payload.data?.rideId;

                    // FIX: Ignore generic "Viaje expirado" notifications that are sent without a specific ride context.
                    // These were appearing on login for all users, causing confusion.
                    if (title.includes('Viaje expirado') && !rideId) {
                        console.log('Ignoring generic expired ride notification.');
                        return; // Don't show the toast
                    }

                    toast(title, {
                        description: body,
                        action: rideId ? {
                            label: 'Ver',
                            onClick: () => window.location.href = `/ride/${rideId}`
                        } : undefined,
                    });
                }
            });

            return () => {
                // onMessageListener returns a promise that resolves to the unsubscribe function
                // but for simplicity in the util, we might not have it. Assuming the cleanup is handled.
            };
        }
    }, [user]);

    if (isLoading) return <FullScreenLoader text="Verificando sesión..." />;
    if (!user || !profile) return <Navigate to="/login" state={{ from: location }} replace />;
    if (profile.role === 'admin' && !location.pathname.startsWith('/admin')) return <Navigate to="/admin" replace />;
    return <Outlet context={outletContext} />;
};

const AuthRedirect = ({ user, profile, isLoading }) => {
    if (isLoading) return <FullScreenLoader />;
    if (!user) return <Navigate to="/login" replace />;

    if (profile) {
        if (profile.role === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    // Si llegamos aquí, tenemos usuario pero no perfil y no está cargando.
    return <FullScreenLoader text="Error: No se pudo cargar el perfil." showLogout={true} />;
};

// Hook de notificaciones para el conductor
const useDriverNotificationListener = (user) => {
    const activeToasts = useRef(new Set());
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, "rides"), where("driver.id", "==", user.uid), where("status", "==", "in_progress"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    const ride = { id: change.doc.id, ...change.doc.data() };
                    if ((ride.pendingJoinRequests?.length || 0) > 0) {
                        const newRequester = ride.pendingJoinRequests[ride.pendingJoinRequests.length - 1];
                        if (newRequester && !activeToasts.current.has(newRequester.id)) {
                            const toastId = `req-${newRequester.id}`;
                            activeToasts.current.add(toastId);
                            toast.info(`${newRequester.displayName} quiere unirse`, {
                                id: toastId, description: "¿Aceptar en tu viaje en curso?", duration: 30000,
                                onDismiss: () => activeToasts.current.delete(toastId), onAutoClose: () => activeToasts.current.delete(toastId),
                                action: (
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => { httpsCallable(getFunctions(), 'respondToJoinRequest')({ rideId: ride.id, requesterId: newRequester.id, action: 'reject' }); toast.dismiss(toastId); }}>Rechazar</Button>
                                        <Button size="sm" onClick={() => { httpsCallable(getFunctions(), 'respondToJoinRequest')({ rideId: ride.id, requesterId: newRequester.id, action: 'accept' }); toast.dismiss(toastId); }}>Aceptar</Button>
                                    </div>
                                )
                            });
                        }
                    }
                }
            });
        });
        return () => unsubscribe();
    }, [user]);
};

function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [totalUnreadChats, setTotalUnreadChats] = useState(0);

    // Función para refrescar el perfil del usuario
    const refreshProfile = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                setProfile({ uid: user.uid, ...docSnap.data() });
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    }, [user]);

    // (Google Maps loader removed)

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const backButtonListenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    CapacitorApp.exitApp();
                }
            });

            return () => {
                backButtonListenerPromise.then(listener => listener.remove());
            };
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            if (!authUser) {
                setProfile(null);
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setProfile({ uid: docSnap.id, ...docSnap.data() });
            } else {
                console.error("Perfil no encontrado para el usuario:", user.uid);
                // No cerrar sesión automáticamente aquí para evitar bucles si es un error temporal
                // pero sí mostrar un error.
                toast.error('Perfil no encontrado. Contacta soporte o cierra sesión.');
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error cargando perfil:", error);
            toast.error(`Error cargando perfil: ${error.message}`);
            setIsLoading(false);
        });
        return () => profileUnsubscribe();
    }, [user]);

    useDriverNotificationListener(user);

    const handleSignOut = () => signOut(auth).then(() => toast.success("Has cerrado sesión."));

    const outletContext = {
        user,
        profile,
        isLoading,
        handleSignOut,
        totalUnreadChats,
        refreshProfile,
    };

    return (
        <Router>
            <Toaster richColors position="top-center" />
            <Routes>
                <Route path="/" element={<AuthRedirect {...outletContext} />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/track/:token" element={<PublicTracking />} />
                <Route element={<ProtectedRoute {...outletContext} />}>
                    <Route element={<MainLayout {...outletContext} onUnreadChange={setTotalUnreadChats} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/my-rides" element={<MyRides />} />
                        <Route path="/create-ride" element={<CreateRide />} />
                        <Route path="/ride/:id" element={<RideDetails />} />
                        <Route path="/wallet" element={<Wallet />} />
                        <Route path="/edit-profile" element={<EditProfile />} />
                        <Route path="/create-request" element={<CreateRequest />} />
                        <Route path="/request-details/:id" element={<RequestDetails />} />
                        <Route path="/chats" element={<ChatList />} />
                        <Route path="/chat/:chatId" element={<Chat />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/referrals" element={<ReferralProgram />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/notifications" element={<NotificationSettings />} />
                        <Route path="/settings/appearance" element={<AppearanceSettings />} />
                        <Route path="/settings/verification" element={<VerificationSettings />} />
                        <Route path="/settings/security" element={<SecuritySettings />} />
                        <Route path="/community-groups" element={<CommunityGroups />} />
                        <Route path="/favorite-routes" element={<FavoriteRoutes />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        {/* ... el resto de tus rutas */}
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;