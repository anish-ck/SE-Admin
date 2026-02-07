export type UserRole = 'admin' | 'faculty' | 'event_manager'

export type EventStatus =
    | 'draft'
    | 'authorized'
    | 'attendance_open'
    | 'attendance_locked'
    | 'certificates_issued'

export type AuditAction =
    | 'event_created'
    | 'event_authorized'
    | 'event_updated'
    | 'attendance_marked'
    | 'attendance_locked'
    | 'certificate_issued'
    | 'certificate_verified'
    | 'user_login'
    | 'user_logout'

export interface Profile {
    id: string
    email: string
    full_name: string
    role: UserRole
    department?: string
    phone?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CertificateTemplate {
    id: string
    name: string
    description?: string
    template_html: string
    preview_image_url?: string
    is_active: boolean
    created_by?: string
    created_at: string
    updated_at: string
}

export interface Event {
    id: string
    name: string
    description?: string
    event_date: string
    event_time?: string
    venue?: string
    department?: string
    max_participants?: number
    status: EventStatus
    template_id?: string
    created_by: string
    authorized_by?: string
    authorized_at?: string
    attendance_locked_at?: string
    attendance_locked_by?: string
    certificates_issued_at?: string
    // Payment fields
    registration_fee?: number
    is_paid_event?: boolean
    registration_deadline?: string
    created_at: string
    updated_at: string
    // Joined fields
    template?: CertificateTemplate
    creator?: Profile
    attendance_count?: number
}

export interface Student {
    id: string
    student_id: string
    name: string
    email?: string
    department?: string
    year_of_study?: number
    qr_code_data: string
    created_at: string
    updated_at: string
}

export interface Attendance {
    id: string
    event_id: string
    student_id: string
    marked_at: string
    marked_by: string
    check_in_method: 'qr_scan' | 'manual'
    notes?: string
    // Joined fields
    student?: Student
}

export interface Certificate {
    id: string
    certificate_number: string
    event_id: string
    student_id: string
    attendance_id: string
    student_name: string
    student_roll: string
    event_name: string
    event_date: string
    institution_name: string
    payload_hash: string
    blockchain_tx_hash?: string
    blockchain_stored_at?: string
    template_id?: string
    issued_by: string
    issued_at: string
    // Joined fields
    event?: Event
    student?: Student
    template?: CertificateTemplate
}

export interface AuditLog {
    id: string
    action: AuditAction
    user_id?: string
    user_email?: string
    resource_type?: string
    resource_id?: string
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
    created_at: string
}

export interface BlockchainConfig {
    id: string
    network_name: string
    chain_id: number
    contract_address?: string
    rpc_url: string
    explorer_url: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface BlockchainQueueItem {
    id: string
    certificate_id: string
    payload_hash: string
    status: 'pending' | 'processing' | 'confirmed' | 'failed'
    attempts: number
    last_error?: string
    tx_hash?: string
    created_at: string
    processed_at?: string
}

// Payment types
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded'
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'

export interface EventRegistration {
    id: string
    event_id: string
    student_id: string
    status: RegistrationStatus
    payment_required: boolean
    registered_at: string
    confirmed_at?: string
    created_at: string
    updated_at: string
    // Joined fields
    event?: Event
    student?: Student
}

export interface Payment {
    id: string
    order_id: string
    cf_order_id?: string
    registration_id?: string
    student_id: string
    event_id: string
    amount: number
    currency: string
    status: PaymentStatus
    cf_payment_id?: string
    payment_method?: string
    payment_time?: string
    payment_link?: string
    payment_session_id?: string
    response_data?: Record<string, unknown>
    error_message?: string
    created_at: string
    updated_at: string
    // Joined fields
    event?: Event
    student?: Student
    registration?: EventRegistration
}
