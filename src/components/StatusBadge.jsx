import { cn } from "@/lib/utils";
import { Calendar, Navigation, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const statusConfig = {
    scheduled: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Calendar,
        label: 'Programado'
    },
    in_progress: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Navigation,
        label: 'En curso'
    },
    completed: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: CheckCircle,
        label: 'Completado'
    },
    cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Cancelado'
    },
    expired: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Expirado'
    },
    pending: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        label: 'Pendiente'
    }
};

export function StatusBadge({ status, showIcon = true, className }) {
    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
            config.color,
            className
        )}>
            {showIcon && <Icon className="w-3.5 h-3.5" />}
            {config.label}
        </span>
    );
}

export function StatusDot({ status, className }) {
    const config = statusConfig[status] || statusConfig.scheduled;

    return (
        <span className={cn(
            "inline-block w-2 h-2 rounded-full",
            config.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'),
            className
        )} />
    );
}
