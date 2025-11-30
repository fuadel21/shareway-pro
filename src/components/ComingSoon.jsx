
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function ComingSoon() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <div className="flex items-center gap-4 my-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        {/* <ArrowLeft /> */}
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-800">Próximamente</h1>
                </div>
                <p className="text-muted-foreground mb-8">
                    Esta función está en desarrollo y estará disponible pronto.
                </p>
                <div className="bg-card rounded-lg border p-8 text-center">
                    <p className="text-muted-foreground">¡Estamos trabajando en ello!</p>
                </div>
            </main>
        </div>
    );
}

export default ComingSoon;
