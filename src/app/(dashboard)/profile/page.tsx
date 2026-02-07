import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { ProfileClient } from './profile-client'
import type { Profile, AuditLog } from '@/lib/types'

async function getProfileData() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // If no profile exists, create one
    if (!profile) {
        const { data: newProfile, error } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                role: 'event_manager',
            })
            .select()
            .single()

        if (error || !newProfile) {
            console.error('Failed to create profile:', error)
            redirect('/login')
        }

        return {
            profile: newProfile as Profile,
            auditLogs: [],
        }
    }

    // Get recent audit logs for this user (if admin)
    let auditLogs: AuditLog[] = []
    if (profile?.role === 'admin') {
        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
        auditLogs = data || []
    }

    return {
        profile: profile as Profile,
        auditLogs,
    }
}

export default async function ProfilePage() {
    const { profile, auditLogs } = await getProfileData()

    return (
        <>
            <PageHeader title="Profile" />
            <ProfileClient profile={profile} auditLogs={auditLogs} />
        </>
    )
}
