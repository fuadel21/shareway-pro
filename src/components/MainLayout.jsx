import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useOutletContext, NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageSquare, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TopHeader from './TopHeader';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button.jsx';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

const BottomNavBar = ({ user, handleSignOut, totalUnreadChats }) => {
  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/my-rides', icon: Compass, label: 'Mis Viajes' },
    { to: '/chats', icon: MessageSquare, label: 'Mensajes', badge: totalUnreadChats },
    { to: '/account', icon: User, label: 'Cuenta' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t z-20">
      <nav className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cn(
            "flex flex-col items-center justify-center text-xs gap-1 relative w-full h-full transition-colors",
            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-white',
          )}>
            {item.badge > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">{item.badge}</span>
            )}
            <item.icon className="h-6 w-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </footer>
  );
};

const MainLayout = ({ handleSignOut, totalUnreadChats, profile: propProfile }) => {
  const parentContext = useOutletContext();
  const navigate = useNavigate();

  const profile = propProfile || parentContext?.profile;

  const [rides, setRides] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const unsubscribersRef = useRef([]);

  useEffect(() => {
    if (!profile?.uid) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const ridesQuery = query(collection(db, 'rides'), where('status', 'in', ['scheduled', 'in_progress']));
    const unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => { console.error("Error en rides listener:", error); });

    const requestsQuery = query(collection(db, 'rideRequests'), where('driverId', '==', profile.uid), where('status', '==', 'pending'));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setRideRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => { console.error("Error en requests listener:", error); });

    const historyQuery = query(collection(db, `users/${profile.uid}/rideHistory`), orderBy('dateTime', 'desc'));
    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      setRideHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingData(false);
    }, (error) => { console.error("Error en history listener:", error); setLoadingData(false); });

    unsubscribersRef.current = [unsubscribeRides, unsubscribeRequests, unsubscribeHistory];

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
    };
  }, [profile?.uid]);

  // Listener de notificaciones en tiempo real
  useEffect(() => {
    if (!profile?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      // Mostrar toast solo para notificaciones nuevas (added)
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          toast.info(notif.title, {
            description: notif.message,
            duration: 8000,
            action: notif.data?.requestId ? {
              label: 'Ver',
              onClick: () => navigate(`/request-details/${notif.data.requestId}`)
            } : undefined
          });
        }
      });
    }, (error) => {
      console.error('Error en listener de notificaciones:', error);
    });

    return () => unsubscribe();
  }, [profile?.uid, navigate]);

  const upcomingRides = useMemo(() => rides.filter(r => r.status === 'scheduled'), [rides]);
  const activeRides = useMemo(() => rides.filter(r => r.status === 'in_progress'), [rides]);

  const newContext = {
    ...parentContext,
    user: propProfile ? { uid: propProfile.uid, ...propProfile } : parentContext?.user,
    profile,
    rides,
    upcomingRides,
    activeRides,
    rideRequests,
    rideHistory,
    loadingData,
  };

  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Cargando perfil...</p>
        </div>
        <Button variant="outline" onClick={() => signOut(auth).then(() => window.location.reload())}>
          Cerrar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopHeader />
      <main className="pb-20">
        <Outlet context={newContext} />
      </main>
      <BottomNavBar
        user={profile}
        handleSignOut={handleSignOut}
        totalUnreadChats={totalUnreadChats}
      />
    </div>
  );
};

export default MainLayout;
