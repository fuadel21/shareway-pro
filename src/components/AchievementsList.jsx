import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Car, Medal, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ICONS = {
    'steering-wheel': Car,
    'star': Star,
    'medal': Medal,
    'trophy': Trophy,
    '🚗': Car // Fallback
};

export function AchievementsList({ userId }) {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchAchievements = async () => {
            try {
                const functions = getFunctions();
                const getUserAchievements = httpsCallable(functions, 'getUserAchievements');
                const result = await getUserAchievements({ userId });
                setAchievements(result.data);
            } catch (error) {
                console.error("Error fetching achievements:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [userId]);

    if (loading) {
        return <Skeleton className="h-32 w-full" />;
    }

    if (achievements.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Logros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-2">
                        Completa viajes para desbloquear insignias.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Logros Desbloqueados ({achievements.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {achievements.map((ach) => {
                        const Icon = ICONS[ach.icon] || Trophy;
                        return (
                            <div key={ach.id} className="flex flex-col items-center p-3 bg-secondary/20 rounded-lg text-center border border-border/50 hover:bg-secondary/40 transition-colors">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-2">
                                    <Icon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <h4 className="font-semibold text-xs mb-1">{ach.title}</h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-2">{ach.description}</p>
                                <Badge variant="outline" className="mt-2 text-[10px] h-5">
                                    +{ach.xp} XP
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
