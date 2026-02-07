'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
    title: string
    showBack?: boolean
    action?: React.ReactNode
}

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
    const router = useRouter()

    return (
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40 safe-top">
            <div className="flex items-center justify-between h-14 px-4">
                <div className="flex items-center gap-2">
                    {showBack && (
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}
                    <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                </div>
                {action && <div>{action}</div>}
            </div>
        </header>
    )
}
