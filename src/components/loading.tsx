import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center p-8 ${className}`}>
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
    )
}

export function LoadingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner />
        </div>
    )
}
