'use client'

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
    onClose?: () => void
}

export function Alert({ type, message, onClose }: AlertProps) {
    const styles = {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200',
        warning: 'bg-orange-50 text-orange-800 border-orange-200',
    }

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertCircle,
    }

    const Icon = icons[type]

    return (
        <div className={cn('p-3 rounded-lg border flex items-start gap-3', styles[type])}>
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm">{message}</p>
            {onClose && (
                <button onClick={onClose} className="p-1 hover:opacity-70">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
