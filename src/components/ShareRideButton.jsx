import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ShareRideButton({ rideId, variant = "outline", size = "default" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerateLink = async () => {
        if (shareUrl) return; // Already generated

        setLoading(true);
        try {
            const functions = getFunctions();
            const getRideShareLink = httpsCallable(functions, 'getRideShareLink');
            const result = await getRideShareLink({ rideId });
            setShareUrl(result.data.url);
        } catch (error) {
            console.error("Error generating link:", error);
            toast.error("No se pudo generar el enlace.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Enlace copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open && !shareUrl) handleGenerateLink();
        }}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Compartir
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Compartir Viaje</DialogTitle>
                    <DialogDescription>
                        Cualquier persona con este enlace podrá ver la ubicación del viaje en tiempo real.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 mt-4">
                    <div className="grid flex-1 gap-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando enlace seguro...
                            </div>
                        ) : (
                            <Input
                                id="link"
                                defaultValue={shareUrl}
                                readOnly
                                className="bg-muted"
                            />
                        )}
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard} disabled={loading || !shareUrl}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">Copiar</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
