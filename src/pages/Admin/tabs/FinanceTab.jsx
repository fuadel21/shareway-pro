import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

const FinanceTab = ({ stats, loading }) => {

    const transactions = stats?.recentFeeTransactions || [];

    if (loading) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Comisiones Recientes</CardTitle>
                <CardDescription>Estas son las últimas 10 comisiones que ha generado la plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>ID del Viaje</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? (
                            transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{tx.date?.toDate ? format(tx.date.toDate(), 'dd/MM/yy HH:mm', { locale: es }) : 'N/A'}</TableCell>
                                    <TableCell>{tx.description || 'Comisión de viaje'}</TableCell>
                                    <TableCell className="font-mono text-xs">{tx.rideId}</TableCell>
                                    <TableCell className="text-right font-semibold">{tx.amount.toFixed(2)}€</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">No hay transacciones de comisión todavía.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default FinanceTab;
