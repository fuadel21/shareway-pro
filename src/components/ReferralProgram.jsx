import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Users, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';

export function ReferralProgram() {
    const { user, profile } = useOutletContext();
    const [referralCode, setReferralCode] = useState(null);
    const [stats, setStats] = useState({ invitedCount: 0, earnedAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchReferralData = async () => {
            try {
                const functions = getFunctions();
                const getReferralCode = httpsCallable(functions, 'getReferralCode');
                const result = await getReferralCode();
                setReferralCode(result.data.code);

                // If profile has stats, use them, otherwise default
                if (profile?.referralStats) {
                    setStats(profile.referralStats);
                }
            } catch (error) {
                console.error("Error fetching referral code:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReferralData();
    }, [user, profile]);

    const handleCopy = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success("Código copiado");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRedeem = async () => {
        if (!redeemCode.trim()) return;
        setIsRedeeming(true);
        try {
            const functions = getFunctions();
            const redeemReferralCode = httpsCallable(functions, 'redeemReferralCode');
            const result = await redeemReferralCode({ code: redeemCode });
            toast.success(result.data.message);
            setRedeemCode('');
        } catch (error) {
            toast.error("Error al canjear código", { description: error.message });
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Únete a Taxi Compartido',
                    text: `Usa mi código ${referralCode} y gana 5€ en tu primer viaje!`,
                    url: window.location.origin
                });
            } catch (err) {
                console.log('Error sharing', err);
            }
        } else {
            handleCopy();
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-primary">Invita y Gana</h2>
                <p className="text-muted-foreground">Comparte tu código y gana 5€ por cada amigo que complete su primer viaje.</p>
            </div>

            {/* Your Code Section */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg">Tu Código de Invitación</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 w-full max-w-xs">
                        <div className="flex-1 bg-background border-2 border-dashed border-primary/30 rounded-lg p-3 text-center font-mono text-2xl font-bold tracking-wider text-primary">
                            {referralCode}
                        </div>
                        <Button size="icon" variant="outline" onClick={handleCopy}>
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Button className="w-full max-w-xs" onClick={handleShare}>
                        <Gift className="mr-2 h-4 w-4" /> Compartir con Amigos
                    </Button>
                </CardContent>
            </Card>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <Users className="h-8 w-8 text-blue-500 mb-2" />
                        <div className="text-2xl font-bold">{stats.invitedCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Amigos Invitados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <Gift className="h-8 w-8 text-green-500 mb-2" />
                        <div className="text-2xl font-bold">{(stats.earnedAmount || 0).toFixed(2)} €</div>
                        <p className="text-xs text-muted-foreground">Ganancias Totales</p>
                    </CardContent>
                </Card>
            </div>

            {/* Redeem Section */}
            {!profile?.referredBy && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">¿Tienes un código de invitación?</CardTitle>
                        <CardDescription>Canjéalo aquí para obtener tu bono de bienvenida.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Introduce el código"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                            <Button onClick={handleRedeem} disabled={isRedeeming || !redeemCode}>
                                {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
