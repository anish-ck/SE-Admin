import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export function formatDateTime(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${minutes} ${ampm}`
}

export function getStatusBadgeClass(status: string): string {
    const statusClasses: Record<string, string> = {
        draft: 'badge-draft',
        authorized: 'badge-authorized',
        attendance_open: 'badge-open',
        attendance_locked: 'badge-locked',
        certificates_issued: 'badge-issued',
    }
    return statusClasses[status] || 'badge-draft'
}

export function getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
        draft: 'Draft',
        authorized: 'Authorized',
        attendance_open: 'Attendance Open',
        attendance_locked: 'Locked',
        certificates_issued: 'Issued',
    }
    return statusLabels[status] || status
}
