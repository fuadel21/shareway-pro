import React, { useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Package, Check, X, Hourglass, Bike, Home } from 'lucide-react';
import SubPageHeader from './SubPageHeader';

const PackageItem = ({ pkg }) => {

    const statusInfo = {
        pending: { icon: <Hourglass className="h-6 w-6 text-yellow-500"/>, text: 'Pendiente'},
        accepted: { icon: <Bike className="h-6 w-6 text-blue-500"/>, text: 'Aceptado'},
        picked_up: { icon: <Bike className="h-6 w-6 text-blue-700 animate-pulse"/>, text: 'En ruta'},
        completed: { icon: <Check className="h-6 w-6 text-green-500"/>, text: 'Entregado'},
        cancelled: { icon: <X className="h-6 w-6 text-red-500"/>, text: 'Cancelado'},
    }

    return (
        <Link to={`/package/${pkg.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {statusInfo[pkg.status]?.icon || <Package/>}
                        <div className="overflow-hidden">
                            <h3 className="font-bold truncate">{`De ${pkg.origin.address} a ${pkg.destination.address}`}</h3>
                            <p className="text-sm text-gray-500">{statusInfo[pkg.status]?.text}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{pkg.price?.toFixed(2)}€</p>
                        <p className="text-xs text-gray-500">Hasta: {pkg.deliveryBy.toDate ? format(pkg.deliveryBy.toDate(), "d MMM yyyy", { locale: es }) : format(new Date(pkg.deliveryBy), "d MMM yyyy", { locale: es })}</p>
                    </div>
                </div>
            </Card>
        </Link>
    );
}

const MyPackages = () => {
    const { profile, packages, loadingData } = useOutletContext();

    const { userSends, userDeliveries } = useMemo(() => {
        if (!profile || !packages) return { userSends: [], userDeliveries: [] };

        const sends = packages.filter(p => p.sender?.uid === profile.uid);
        const deliveries = packages.filter(p => p.driver?.uid === profile.uid);

        return { userSends: sends, userDeliveries: deliveries };

    }, [profile, packages]);

    if (loadingData) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
    }

    const renderPackageList = (list, listName) => {
        if (list.length === 0) {
            return <div className="text-center py-16"><p className="text-gray-500">No tienes envíos en "{listName}".</p></div>;
        }
        return (
            <div className="space-y-4">
                {list.map(pkg => <PackageItem key={pkg.id} pkg={pkg} />)}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <SubPageHeader title="Mis Envíos" />
            <Tabs defaultValue="userSends" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="userSends">Mis Envíos ({userSends.length})</TabsTrigger>
                    <TabsTrigger value="userDeliveries">Mis Entregas ({userDeliveries.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="userSends" className="pt-6">{renderPackageList(userSends, "Mis Envíos")}</TabsContent>
                <TabsContent value="userDeliveries" className="pt-6">{renderPackageList(userDeliveries, "Mis Entregas")}</TabsContent>
            </Tabs>
        </div>
    );
};

export default MyPackages;
