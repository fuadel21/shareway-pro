import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Hook personalizado para obtener el estado completo del wallet del usuario en tiempo real.
 * @param {object} user - El objeto de usuario autenticado de Firebase.
 * @returns {{ wallet: { balance: number, heldBalance: number } | null, loadingWallet: boolean }}
 */
export const useWallet = (user) => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setWallet(null);
      return;
    }

    setLoading(true);
    const walletRef = doc(db, 'wallets', user.uid);

    const unsubscribe = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Aseguramos que los campos existan, si no, los inicializamos a 0
        setWallet({
          balance: data.balance || 0,
          heldBalance: data.heldBalance || 0,
        });
      } else {
        // Si el wallet no existe, lo tratamos como si tuviera 0 en ambos saldos
        setWallet({ balance: 0, heldBalance: 0 });
      }
      setLoading(false);
    }, (error) => {
        console.error("Error al escuchar el wallet:", error);
        setLoading(false);
        setWallet(null);
    });

    return () => unsubscribe();
  }, [user]);

  return { wallet, loadingWallet: loading };
};
