import { useState, useEffect } from 'react';
import { Car, UserCheck, Users, Hourglass, DollarSign, BarChart, Banknote, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

import PendingVerificationsTab from './tabs/PendingVerificationsTab';
import UserManagementTab from './tabs/UserManagementTab';
import RideManagementTab from './tabs/RideManagementTab';
import FinanceTab from './tabs/FinanceTab';

const StatCard = ({ title, value, icon, description, currency = '' }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}{currency}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPayoutLoading, setIsPayoutLoading] = useState(false);

    const fetchPlatformStats = async () => {
        setLoading(true);
        try {
            const functions = getFunctions();
            const getStats = httpsCallable(functions, 'getPlatformStats');
            const result = await getStats();
            if (result.data.success) {
                setStats(result.data.stats);
            } else {
                throw new Error(result.data.message || "La respuesta del servidor no fue exitosa.");
            }
        } catch (error) {
            toast.error("Error al cargar las estadísticas.", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlatformStats();
    }, []);

    const handlePayout = async () => {
        setIsPayoutLoading(true);
        try {
            const functions = getFunctions();
            const requestPayout = httpsCallable(functions, 'requestPlatformPayout');
            const result = await requestPayout();
            toast.success("Retiro solicitado", { description: result.data.message });
            await fetchPlatformStats(); // Recargar las estadísticas
        } catch (error) {
            toast.error("Error al retirar", { description: error.message });
        } finally {
            setIsPayoutLoading(false);
        }
    };

    const totalFees = stats?.totalUncollectedFees || 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm"><div className="container mx-auto px-4 py-4"><h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1></div></header>
            <main className="container mx-auto p-4 mt-6">

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Comisiones Acumuladas</CardTitle><DollarSign/></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : totalFees.toFixed(2)}€</div>
                            <p className="text-xs text-muted-foreground">Total de comisiones pendientes de cobro.</p>
                        </CardContent>
                        <CardFooter>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" className="w-full" disabled={totalFees <= 0 || isPayoutLoading}>
                                        {isPayoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Banknote className="h-4 w-4 mr-2"/>} Retirar Comisiones
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Retiro</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogDescription>Se iniciará una transferencia de {totalFees.toFixed(2)}€ a tu cuenta bancaria asociada en Stripe. Esta acción puede tardar varios días en completarse.</AlertDialogDescription>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handlePayout}>Confirmar Retiro</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                    <StatCard title="Volumen Total (GTV)" value={loading ? '...' : (stats?.grossTotalVolume || 0).toFixed(2)} currency="€" icon={<BarChart/>} description="Dinero total movido en la plataforma."/>
                    <StatCard title="Usuarios Totales" value={loading ? '...' : stats?.totalUsers || 0} icon={<Users/>}/>
                    <StatCard title="Viajes Completados" value={loading ? '...' : stats?.totalCompletedRides || 0} icon={<Car/>}/>
                </div>
                
                 <Tabs defaultValue="finances" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="finances"><DollarSign className="mr-2"/>Finanzas</TabsTrigger>
                        <TabsTrigger value="verifications"><UserCheck className="mr-2"/>Verificaciones</TabsTrigger>
                        <TabsTrigger value="users"><Users className="mr-2"/>Usuarios</TabsTrigger>
                        <TabsTrigger value="rides"><Car className="mr-2"/>Viajes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="finances" className="mt-6"><FinanceTab stats={stats} loading={loading} /></TabsContent>
                    <TabsContent value="verifications" className="mt-6"><PendingVerificationsTab /></TabsContent>
                    <TabsContent value="users" className="mt-6"><UserManagementTab /></TabsContent>
                    <TabsContent value="rides" className="mt-6"><RideManagementTab /></TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default AdminDashboard;
