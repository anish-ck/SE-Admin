'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { Alert } from '@/components/alert'
import { Loader2, Calendar, Clock, MapPin, Building, Users, FileText, IndianRupee } from 'lucide-react'
import type { CertificateTemplate } from '@/lib/types'

export default function NewEventPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [templates, setTemplates] = useState<CertificateTemplate[]>([])

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        event_date: '',
        event_time: '',
        venue: '',
        department: '',
        max_participants: '',
        template_id: '',
        is_paid_event: false,
        registration_fee: '',
        registration_deadline: '',
    })

    useEffect(() => {
        async function loadTemplates() {
            const { data } = await supabase
                .from('certificate_templates')
                .select('*')
                .eq('is_active', true)

            if (data) setTemplates(data)
        }
        loadTemplates()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError('You must be logged in')
            setLoading(false)
            return
        }

        const { data, error: insertError } = await supabase
            .from('events')
            .insert({
                name: formData.name,
                description: formData.description || null,
                event_date: formData.event_date,
                event_time: formData.event_time || null,
                venue: formData.venue || null,
                department: formData.department || null,
                max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
                template_id: formData.template_id || null,
                created_by: user.id,
                status: 'draft',
                is_paid_event: formData.is_paid_event,
                registration_fee: formData.is_paid_event && formData.registration_fee
                    ? parseFloat(formData.registration_fee)
                    : 0,
                registration_deadline: formData.registration_deadline || null,
            })
            .select()
            .single()

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        // Log audit
        await supabase.rpc('log_audit', {
            p_action: 'event_created',
            p_resource_type: 'event',
            p_resource_id: data.id,
            p_details: { name: formData.name }
        })

        router.push(`/events/${data.id}`)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }))
    }

    return (
        <>
            <PageHeader title="New Event" showBack />

            <main className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                    <div>
                        <label htmlFor="name" className="label">Event Name *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className="input pl-10"
                                placeholder="Tech Workshop 2025"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="label">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input min-h-[100px] resize-none"
                            placeholder="Brief description of the event..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="event_date" className="label">Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="event_date"
                                    name="event_date"
                                    type="date"
                                    value={formData.event_date}
                                    onChange={handleChange}
                                    className="input pl-10"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="event_time" className="label">Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="event_time"
                                    name="event_time"
                                    type="time"
                                    value={formData.event_time}
                                    onChange={handleChange}
                                    className="input pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="venue" className="label">Venue</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="venue"
                                name="venue"
                                type="text"
                                value={formData.venue}
                                onChange={handleChange}
                                className="input pl-10"
                                placeholder="Main Auditorium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="department" className="label">Department</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="department"
                                    name="department"
                                    type="text"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="input pl-10"
                                    placeholder="Computer Science"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="max_participants" className="label">Max Participants</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="max_participants"
                                    name="max_participants"
                                    type="number"
                                    value={formData.max_participants}
                                    onChange={handleChange}
                                    className="input pl-10"
                                    placeholder="100"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="template_id" className="label">Certificate Template</label>
                        <select
                            id="template_id"
                            name="template_id"
                            value={formData.template_id}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Select a template</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                type="checkbox"
                                id="is_paid_event"
                                name="is_paid_event"
                                checked={formData.is_paid_event}
                                onChange={handleChange}
                                className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <label htmlFor="is_paid_event" className="text-sm font-medium text-gray-700">
                                This is a paid event
                            </label>
                        </div>

                        {formData.is_paid_event && (
                            <div className="space-y-3 pl-7">
                                <div>
                                    <label htmlFor="registration_fee" className="label">Registration Fee (₹) *</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            id="registration_fee"
                                            name="registration_fee"
                                            type="number"
                                            value={formData.registration_fee}
                                            onChange={handleChange}
                                            className="input pl-10"
                                            placeholder="500"
                                            min="1"
                                            step="0.01"
                                            required={formData.is_paid_event}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="registration_deadline" className="label">Registration Deadline</label>
                                    <input
                                        id="registration_deadline"
                                        name="registration_deadline"
                                        type="datetime-local"
                                        value={formData.registration_deadline}
                                        onChange={handleChange}
                                        className="input"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full mt-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Creating...
                            </>
                        ) : (
                            'Create Event'
                        )}
                    </button>
                </form>
            </main>
        </>
    )
}
