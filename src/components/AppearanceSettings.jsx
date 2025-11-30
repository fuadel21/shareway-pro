import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Moon, Sun } from 'lucide-react';

function AppearanceSettings() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 my-6">Apariencia</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Tema de la Aplicación</CardTitle>
                        <CardDescription>Selecciona cómo quieres que se vea la aplicación.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleThemeChange('light')} 
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}>
                            <Sun className="h-8 w-8 text-yellow-500" />
                            <span className="font-semibold">Claro</span>
                        </button>
                        <button 
                            onClick={() => handleThemeChange('dark')} 
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}>
                            <Moon className="h-8 w-8 text-blue-400" />
                            <span className="font-semibold">Oscuro</span>
                        </button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default AppearanceSettings;
