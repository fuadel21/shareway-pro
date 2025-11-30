import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { toast } from 'sonner';

// --- UI & Icons ---
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Label } from '@/components/ui/label.jsx';
import { Loader2, Camera, User, Car, Heart, CheckCircle, AlertTriangle } from 'lucide-react';
import SubPageHeader from './SubPageHeader';

const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : words[0].substring(0, 2).toUpperCase();
};

function EditProfile() {
    const { profile: currentUser, refreshProfile } = useOutletContext();
    const navigate = useNavigate();

    const [formData, setFormData] = useState(null);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [vehicleImageFile, setVehicleImageFile] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [vehicleImageUrl, setVehicleImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                displayName: currentUser.displayName || '',
                phoneNumber: currentUser.phoneNumber || '',
                bio: currentUser.bio || '',
                gender: currentUser.gender || 'unspecified',
                vehicle: currentUser.vehicle || { make: '', model: '', year: '', color: '' },
                preferences: currentUser.preferences || { smoking: 'any', pets: 'any', music: 'any', talkativeness: 'any' }
            });
            setProfileImageUrl(currentUser.photoURL || '');
            setVehicleImageUrl(currentUser.vehicle?.photoURL || '');
        }
    }, [currentUser]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVehicleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, [name]: value } }));
    };

    const handlePreferenceChange = (name, value) => {
        setFormData(prev => ({ ...prev, preferences: { ...prev.preferences, [name]: value } }));
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        if (type === 'profile') {
            setProfileImageFile(file);
            setProfileImageUrl(objectUrl);
        } else if (type === 'vehicle') {
            setVehicleImageFile(file);
            setVehicleImageUrl(objectUrl);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentUser || !formData) return;
        if (!formData.displayName) { toast.error("El nombre para mostrar es obligatorio."); return; }

        setIsSaving(true);
        try {
            const dataToUpdate = {
                displayName: formData.displayName,
                phoneNumber: formData.phoneNumber,
                bio: formData.bio,
                gender: formData.gender,
                preferences: formData.preferences,
                vehicle: formData.vehicle,
            };

            const uploadTasks = [];
            if (profileImageFile) {
                const imageRef = ref(storage, `profile-images/${currentUser.uid}/profile_image.jpg`);
                uploadTasks.push(
                    uploadBytes(imageRef, profileImageFile)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => ({ type: 'profile', url }))
                );
            }
            if (vehicleImageFile) {
                const imageRef = ref(storage, `vehicle-images/${currentUser.uid}/vehicle_image.jpg`);
                uploadTasks.push(
                    uploadBytes(imageRef, vehicleImageFile)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => ({ type: 'vehicle', url }))
                );
            }

            const uploadResults = await Promise.allSettled(uploadTasks);
            let uploadFailed = false;

            uploadResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    if (result.value.type === 'profile') dataToUpdate.photoURL = result.value.url;
                    else if (result.value.type === 'vehicle') dataToUpdate.vehicle.photoURL = result.value.url;
                } else {
                    console.error("Error en la subida de una imagen:", result.reason);
                    uploadFailed = true;
                }
            });

            if (uploadFailed) {
                toast.error("Error al subir una de las imágenes.", { description: "Por favor, comprueba tu conexión. Se guardarán los demás datos." });
            }

            // Guardar directamente en Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, dataToUpdate);

            toast.success("¡Perfil actualizado!");

            // Navegar primero para evitar race condition
            navigate(`/account`);

            // Refrescar perfil en segundo plano
            if (refreshProfile) {
                refreshProfile();
            }

        } catch (error) {
            console.error("Error al actualizar el perfil: ", error);
            toast.error("No se pudo actualizar el perfil.", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (!formData) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <SubPageHeader title="Editar Perfil" />
            <main className="container mx-auto p-4 max-w-2xl pb-24">
                <form onSubmit={handleSave} className="space-y-6">

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><User /> Perfil Público</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="relative">
                                    <Avatar className="h-28 w-28 border-2 border-white shadow">
                                        <AvatarImage src={profileImageUrl} alt={formData.displayName} />
                                        <AvatarFallback className="text-3xl">{getInitials(formData.displayName)}</AvatarFallback>
                                    </Avatar>
                                    <Label htmlFor="profile-image-upload" className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                                        <Camera className="h-5 w-5" />
                                    </Label>
                                    <Input id="profile-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profile')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Label htmlFor="displayName">Nombre Completo</Label>
                                    <Input id="displayName" name="displayName" value={formData.displayName} onChange={handleInputChange} placeholder="Tu nombre y apellido" />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <Label htmlFor="phoneNumber">Número de Teléfono</Label>
                                        {currentUser.phoneVerified ? (
                                            <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                                <CheckCircle className="h-3 w-3" /> Verificado
                                            </span>
                                        ) : (
                                            <Link to="/settings/verification" className="text-xs text-orange-600 flex items-center gap-1 font-medium hover:underline">
                                                <AlertTriangle className="h-3 w-3" /> Verificar ahora
                                            </Link>
                                        )}
                                    </div>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        placeholder="Ej: +34 600123456"
                                        className={currentUser.phoneVerified ? "border-green-200 bg-green-50" : ""}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="bio">Sobre ti (Biografía)</Label>
                                    <Textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Una breve descripción sobre ti que otros verán." rows={3} />
                                </div>
                                <div>
                                    <Label>Género</Label>
                                    <Select name="gender" value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar género..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Hombre</SelectItem>
                                            <SelectItem value="female">Mujer</SelectItem>
                                            <SelectItem value="unspecified">Prefiero no decirlo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Car /> Información del Vehículo</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <Avatar className="h-28 w-28 rounded-lg border-2 border-white shadow">
                                        <AvatarImage src={vehicleImageUrl} alt="Foto del vehículo" className="rounded-lg" />
                                        <AvatarFallback className="rounded-lg">?</AvatarFallback>
                                    </Avatar>
                                    <Label htmlFor="vehicle-image-upload" className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                                        <Camera className="h-5 w-5" />
                                    </Label>
                                    <Input id="vehicle-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'vehicle')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label>Marca</Label><Input name="make" value={formData.vehicle.make} onChange={handleVehicleChange} placeholder="Ej: Toyota" /></div>
                                <div><Label>Modelo</Label><Input name="model" value={formData.vehicle.model} onChange={handleVehicleChange} placeholder="Ej: Corolla" /></div>
                                <div><Label>Año</Label><Input name="year" type="number" value={formData.vehicle.year} onChange={handleVehicleChange} placeholder="Ej: 2022" /></div>
                                <div><Label>Color</Label><Input name="color" value={formData.vehicle.color} onChange={handleVehicleChange} placeholder="Ej: Azul" /></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Heart /> Preferencias de Viaje</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <Label>Fumar</Label>
                                <Select value={formData.preferences.smoking} onValueChange={(v) => handlePreferenceChange('smoking', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="yes">Sí, permitido</SelectItem><SelectItem value="no">No, prohibido</SelectItem><SelectItem value="any">Indiferente</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Mascotas</Label>
                                <Select value={formData.preferences.pets} onValueChange={(v) => handlePreferenceChange('pets', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="yes">Sí, permitidas</SelectItem><SelectItem value="no">No, prohibidas</SelectItem><SelectItem value="any">Indiferente</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Música</Label>
                                <Select value={formData.preferences.music} onValueChange={(v) => handlePreferenceChange('music', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="yes">Sí, por favor</SelectItem><SelectItem value="no">Prefiero silencio</SelectItem><SelectItem value="any">Indiferente</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nivel de Conversación</Label>
                                <Select value={formData.preferences.talkativeness} onValueChange={(v) => handlePreferenceChange('talkativeness', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="yes">Me gusta charlar</SelectItem><SelectItem value="no">Prefiero ir tranquilo</SelectItem><SelectItem value="any">Depende del día</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t dark:border-slate-800 z-50">
                        <Button size="lg" type="submit" className="w-full font-bold text-base" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando Cambios...</> : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default EditProfile;
