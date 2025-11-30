import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Package } from 'lucide-react';
import SubPageHeader from './SubPageHeader';

const Actions = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Crear" />
            <main className="container mx-auto p-4 max-w-4xl space-y-8">
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* --- Publicar Viaje --- */}
                        <Link to="/create-ride" className="block">
                            <Card className="hover:bg-gray-100 transition-colors h-full">
                                <CardContent className="flex flex-col items-center justify-center text-center p-6">
                                    <Plus className="h-10 w-10 text-primary mb-3" />
                                    <h3 className="text-xl font-semibold">Publicar Viaje</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Ofrece las plazas libres de tu coche.</p>
                                </CardContent>
                            </Card>
                        </Link>
                        {/* --- Solicitar Viaje --- */}
                        <Link to="/create-request" className="block">
                            <Card className="hover:bg-gray-100 transition-colors h-full">
                                <CardContent className="flex flex-col items-center justify-center text-center p-6">
                                    <Search className="h-10 w-10 text-primary mb-3" />
                                    <h3 className="text-xl font-semibold">Solicitar Viaje</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Solicita un viaje y espera a que un conductor lo acepte.</p>
                                </CardContent>
                            </Card>
                        </Link>
                        {/* --- Enviar Paquete --- */}
                        <Link to="/create-package" className="block">
                            <Card className="hover:bg-gray-100 transition-colors h-full">
                                <CardContent className="flex flex-col items-center justify-center text-center p-6">
                                    <Package className="h-10 w-10 text-primary mb-3" />
                                    <h3 className="text-xl font-semibold">Enviar Paquete</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Aprovecha un viaje para enviar algo.</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Actions;
