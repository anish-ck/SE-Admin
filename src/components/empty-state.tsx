'use client'

interface EmptyStateProps {
    icon: React.ReactNode
    title: string
    description: string
    action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
            {action}
        </div>
    )
}
