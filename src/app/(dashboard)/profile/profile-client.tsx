'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/alert'
import {
    User,
    Mail,
    Building,
    Phone,
    Shield,
    LogOut,
    Loader2,
    History,
    ChevronRight,
    Save
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Profile, AuditLog } from '@/lib/types'

interface Props {
    profile: Profile
    auditLogs: AuditLog[]
}

export function ProfileClient({ profile: initialProfile, auditLogs }: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState(initialProfile)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showAuditLogs, setShowAuditLogs] = useState(false)

    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        department: profile?.department || '',
        phone: profile?.phone || '',
    })

    const handleSave = async () => {
        setLoading(true)
        setError('')
        setSuccess('')

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name,
                department: formData.department || null,
                phone: formData.phone || null,
            })
            .eq('id', profile.id)

        if (updateError) {
            setError(updateError.message)
        } else {
            setSuccess('Profile updated successfully!')
            setProfile({
                ...profile,
                full_name: formData.full_name,
                department: formData.department || undefined,
                phone: formData.phone || undefined,
            })
        }
        setLoading(false)
    }

    const handleLogout = async () => {
        setLoading(true)

        await supabase.rpc('log_audit', {
            p_action: 'user_logout',
        })

        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const roleColors: Record<string, string> = {
        admin: 'bg-red-100 text-red-700',
        faculty: 'bg-blue-100 text-blue-700',
        event_manager: 'bg-green-100 text-green-700',
    }

    const actionLabels: Record<string, string> = {
        event_created: 'Created event',
        event_authorized: 'Authorized event',
        event_updated: 'Updated event',
        attendance_marked: 'Marked attendance',
        attendance_locked: 'Locked attendance',
        certificate_issued: 'Issued certificates',
        certificate_verified: 'Verified certificate',
        user_login: 'Logged in',
        user_logout: 'Logged out',
    }

    return (
        <main className="p-4 space-y-4">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            {/* Profile Card */}
            <div className="card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">{profile.full_name}</h2>
                        <span className={`badge mt-1 capitalize ${roleColors[profile.role]}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {profile.role.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="input pl-10 bg-gray-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Department</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                className="input pl-10"
                                placeholder="Computer Science"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="input pl-10"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <Save className="h-5 w-5 mr-2" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Audit Logs (Admin Only) */}
            {profile.role === 'admin' && (
                <div className="card">
                    <button
                        onClick={() => setShowAuditLogs(!showAuditLogs)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <History className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900">Audit Logs</span>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showAuditLogs ? 'rotate-90' : ''}`} />
                    </button>

                    {showAuditLogs && (
                        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                            {auditLogs.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No audit logs</p>
                            ) : (
                                auditLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="p-3 bg-gray-50 rounded-lg text-sm"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-gray-900">
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {log.user_email || 'System'}
                                            {log.resource_type && ` • ${log.resource_type}`}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                disabled={loading}
                className="btn-danger w-full"
            >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
            </button>
        </main>
    )
}
