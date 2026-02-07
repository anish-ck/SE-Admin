'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Award, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/attendance', label: 'Attendance', icon: Users },
    { href: '/certificates', label: 'Certificates', icon: Award },
    { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname.startsWith(href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-lg transition-colors',
                                isActive
                                    ? 'text-primary-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Icon className={cn('h-6 w-6', isActive && 'stroke-[2.5]')} />
                            <span className="text-xs mt-1 font-medium">{label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
