import { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Loader2, ShieldCheck, AlertCircle, Clock, UploadCloud, CheckCircle2, FileX2 } from 'lucide-react';
import SubPageHeader from './SubPageHeader';
import { toast } from 'sonner';
import { db, auth, storage } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';


// --- Componente para el Estado General ---
const VerificationStatus = ({ profile }) => {
    const verification = profile?.verification || {};
    const status = verification.status || 'not_verified';

    const STATUS_MAP = {
        not_verified: { text: 'No Verificado', icon: AlertCircle, color: 'text-orange-500 bg-orange-50 border-orange-200', description: 'Completa los pasos para verificar tu cuenta.' },
        pending: { text: 'En Revisión', icon: Clock, color: 'text-yellow-500 bg-yellow-50 border-yellow-200', description: 'Estamos revisando tus documentos. Esto puede tardar hasta 24 horas.' },
        verified: { text: 'Verificado', icon: CheckCircle2, color: 'text-green-500 bg-green-50 border-green-200', description: '¡Tu cuenta ha sido verificada! Ya puedes ofrecer viajes.' },
        rejected: { text: 'Rechazado', icon: FileX2, color: 'text-red-500 bg-red-50 border-red-200', description: verification.rejectionReason || 'Alguno de tus documentos fue rechazado. Por favor, vuelve a subirlo.' }
    };

    const currentStatus = STATUS_MAP[status];

    return (
        <Card className={currentStatus.color}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><currentStatus.icon className="h-6 w-6"/> Estado: {currentStatus.text}</CardTitle>
                <CardDescription className="pt-2">{currentStatus.description}</CardDescription>
            </CardHeader>
        </Card>
    );
};

// --- Componente para Subir un Documento ---
const DocumentUploader = ({ type, title, description, status, onFileSelect, isUploading, isDisabled }) => {
    const STATUS_MAP = {
        pending: { text: 'Pendiente', icon: Clock, color: 'text-yellow-500' },
        verified: { text: 'Verificado', icon: CheckCircle2, color: 'text-green-500' },
        rejected: { text: 'Rechazado', icon: AlertCircle, color: 'text-red-500' },
    };
    const currentStatus = STATUS_MAP[status];

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
                {currentStatus && <div className={`flex items-center gap-2 text-sm ${currentStatus.color}`}><currentStatus.icon className="h-4 w-4" /> {currentStatus.text}</div>}
                <Button size="sm" onClick={() => onFileSelect(type)} disabled={isUploading || isDisabled || status === 'verified' || status === 'pending'}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                    {status ? 'Subir de nuevo' : 'Subir'}
                </Button>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL CORREGIDO ---
function VerificationCenter() {
    const { profile, loading: profileLoading } = useOutletContext();
    const [uploading, setUploading] = useState({});
    const fileInputRef = useRef(null);
    const currentUploadType = useRef(null);
    const user = auth.currentUser;

    const handleFileSelect = (uploadType) => {
        currentUploadType.current = uploadType;
        fileInputRef.current.click();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        const uploadType = currentUploadType.current;
        if (!file || !user) return;

        setUploading(prev => ({ ...prev, [uploadType]: true }));
        const toastId = toast.loading(`Subiendo ${uploadType}...`);

        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920 });
            const filePath = `verifications/${user.uid}/${uploadType}_${Date.now()}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, compressedFile);

            await updateDoc(doc(db, 'users', user.uid), {
                [`documents.${uploadType}.status`]: 'pending',
                [`documents.${uploadType}.path`]: filePath,
                [`documents.${uploadType}.lastUpdated`]: serverTimestamp(),
                'verification.status': 'pending',
            });
            toast.success("Documento subido para revisión.", { id: toastId });
        } catch (error) {
            toast.error("No se pudo subir el documento.", { id: toastId });
        } finally {
            setUploading(prev => ({ ...prev, [uploadType]: false }));
            currentUploadType.current = null;
        }
    };

    if (profileLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    if (!profile) return <div className="h-screen flex items-center justify-center"><p>No se pudo cargar el perfil.</p></div>;

    const documents = profile.documents || {};
    const isIdentityVerified = profile.verification?.status === 'verified';

    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Centro de Verificación" />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/png, image/jpeg" hidden />

            <main className="container mx-auto p-4 max-w-2xl mt-6 space-y-8">
                <VerificationStatus profile={profile} />

                <Card>
                    <CardHeader><CardTitle>1. Información Básica</CardTitle><CardDescription>Requerido para todos los usuarios.</CardDescription></CardHeader>
                    <CardContent className="divide-y p-0">
                        <DocumentUploader type="idCard" title="Documento de Identidad" description="Sube la parte frontal de tu DNI o pasaporte."
                            status={documents.idCard?.status} onFileSelect={handleFileSelect} isUploading={uploading.idCard} />
                    </CardContent>
                </Card>

                <Card className={!isIdentityVerified ? 'bg-gray-100 opacity-70' : ''}>
                    <CardHeader>
                        <CardTitle>2. Documentos de Conductor</CardTitle>
                        <CardDescription>Opcional. Sube estos documentos si quieres ofrecer viajes.</CardDescription>
                         {!isIdentityVerified && <p className="text-xs text-yellow-600 font-semibold mt-2">Debes verificar tu identidad (paso 1) antes de poder subir estos documentos.</p>}
                    </CardHeader>
                    <CardContent className="divide-y p-0">
                        <DocumentUploader type="driverLicense" title="Permiso de Conducir" description="Sube la parte frontal de tu permiso."
                            status={documents.driverLicense?.status} onFileSelect={handleFileSelect} isUploading={uploading.driverLicense} isDisabled={!isIdentityVerified} />
                         <DocumentUploader type="vehicleRegistration" title="Permiso de Circulación" description="El documento oficial del vehículo."
                            status={documents.vehicleRegistration?.status} onFileSelect={handleFileSelect} isUploading={uploading.vehicleRegistration} isDisabled={!isIdentityVerified} />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default VerificationCenter;
