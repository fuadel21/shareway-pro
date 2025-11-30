import { GraduationCap, Building, Home, School, Trophy } from 'lucide-react';

export const COMMUNITY_TYPES = {
    university: {
        id: 'university',
        label: 'Universidad',
        icon: GraduationCap,
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300',
        iconColor: 'text-blue-600',
        verificationMethod: 'email',
        description: 'Para estudiantes y personal universitario',
        placeholder: 'ej: ucm.es, upm.es'
    },
    company: {
        id: 'company',
        label: 'Empresa',
        icon: Building,
        color: 'purple',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-300',
        iconColor: 'text-purple-600',
        verificationMethod: 'email',
        description: 'Para empleados de la misma empresa',
        placeholder: 'ej: empresa.com'
    },
    neighborhood: {
        id: 'neighborhood',
        label: 'Vecindario',
        icon: Home,
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        iconColor: 'text-green-600',
        verificationMethod: 'postalCode',
        description: 'Para vecinos de la misma zona',
        placeholder: 'ej: 28001, 28002'
    },
    school: {
        id: 'school',
        label: 'Colegio (Padres)',
        icon: School,
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-300',
        iconColor: 'text-orange-600',
        verificationMethod: 'invite',
        description: 'Para padres del mismo colegio',
        placeholder: 'Solo por invitación'
    },
    sports: {
        id: 'sports',
        label: 'Club Deportivo',
        icon: Trophy,
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        iconColor: 'text-red-600',
        verificationMethod: 'invite',
        description: 'Para miembros del mismo club',
        placeholder: 'Solo por invitación'
    }
};

// Helper para obtener tipo de comunidad con fallback
export const getCommunityType = (typeId) => {
    return COMMUNITY_TYPES[typeId] || COMMUNITY_TYPES.university;
};
