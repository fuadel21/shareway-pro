import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { onTransactionsUpdate } from '../services/walletService';
import { useWallet } from '../hooks/useWallet';
import AddFundsModal from './AddFundsModal';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Loader2, ArrowUpCircle, ArrowDownCircle, Info, Unlock, Wallet as WalletIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const TransactionItem = ({ tx }) => {
  const isPositive = tx.amount > 0;
  const Icon = isPositive ? ArrowUpCircle : ArrowDownCircle;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  // Safe date formatting
  let dateStr = 'Fecha desconocida';
  try {
    const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
    if (txDate && !isNaN(txDate.getTime())) {
      dateStr = format(txDate, 'PPp', { locale: es });
    }
  } catch (error) {
    console.error('Error formatting transaction date:', error);
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${colorClass}`} />
        <div>
          <p className="font-medium text-sm">{tx.description || 'Transacción'}</p>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
      </div>
      <span className={`font-bold ${colorClass}`}>
        {isPositive ? '+' : ''}{tx.amount.toFixed(2)} €
      </span>
    </div>
  );
};

const Wallet = () => {
  const { user } = useOutletContext();
  const { wallet, loadingWallet } = useWallet(user);

  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }
    const unsubTxs = onTransactionsUpdate(user.uid, (newTxs) => {
      setTransactions(newTxs);
    });
    return () => unsubTxs();
  }, [user]);

  const handleReleaseFunds = async () => {
    if (window.confirm("¿Estás seguro de que quieres intentar liberar los fondos retenidos? Esto solo debe hacerse si sospechas que hay un error.")) {
      setIsReleasing(true);
      try {
        const releaseHeldFunds = httpsCallable(functions, 'releaseHeldFunds');
        const result = await releaseHeldFunds();
        toast.success(result.data.message);
      } catch (error) {
        console.error("Error al liberar fondos:", error);
        toast.error("No se pudieron liberar los fondos", { description: error.message });
      } finally {
        setIsReleasing(false);
      }
    }
  };

  const balance = wallet?.balance ?? 0;
  const heldBalance = wallet?.heldBalance ?? 0;

  // Calculate stats for chart
  const stats = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d;
    }).reverse();

    return last6Months.map(date => {
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM', { locale: es });

      const monthTxs = transactions.filter(tx => {
        try {
          const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
          if (!txDate || isNaN(txDate.getTime())) return false;
          return format(txDate, 'yyyy-MM') === monthKey;
        } catch (error) {
          console.error('Error parsing transaction date:', error);
          return false;
        }
      });

      const income = monthTxs.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + tx.amount, 0);
      const expense = monthTxs.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

      return { label: monthLabel, income, expense };
    });
  }, [transactions]);

  const maxVal = Math.max(...stats.map(s => Math.max(s.income, s.expense)), 100);

  return (
    <>
      <AddFundsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Mi Billetera</h2>
          <div className="flex gap-2">
            <Button onClick={() => setIsModalOpen(true)} className="bg-primary">
              <ArrowUpCircle className="mr-2 h-4 w-4" /> Añadir Fondos
            </Button>
            <Button variant="outline" onClick={handleReleaseFunds} disabled={isReleasing || heldBalance <= 0}>
              {isReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingWallet ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{balance.toFixed(2)} €</div>
                  <p className="text-xs text-muted-foreground">
                    +{heldBalance.toFixed(2)} € en reserva
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos (Mes)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats[stats.length - 1]?.income.toFixed(2)} €
              </div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos (Mes)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats[stats.length - 1]?.expense.toFixed(2)} €
              </div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] w-full flex items-end justify-between gap-2 px-4">
                {stats.map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 w-full group">
                    <div className="flex gap-1 items-end h-[150px] w-full justify-center">
                      <div
                        className="w-3 bg-green-500 rounded-t transition-all group-hover:bg-green-400"
                        style={{ height: `${(item.income / maxVal) * 100}%` }}
                        title={`Ingresos: ${item.income.toFixed(2)}€`}
                      ></div>
                      <div
                        className="w-3 bg-red-500 rounded-t transition-all group-hover:bg-red-400"
                        style={{ height: `${(item.expense / maxVal) * 100}%` }}
                        title={`Gastos: ${item.expense.toFixed(2)}€`}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Transacciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {transactions.length > 0 ? (
                  transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos recientes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Wallet;
