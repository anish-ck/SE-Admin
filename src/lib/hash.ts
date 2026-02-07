import SHA256 from 'crypto-js/sha256'

export interface CertificatePayload {
    certificate_number: string
    student_name: string
    student_roll: string
    event_name: string
    event_date: string
    institution_name: string
    issued_at: string
}

/**
 * Creates a canonical payload string for hashing.
 * This ensures consistent hashing across verification attempts.
 */
export function createCanonicalPayload(payload: CertificatePayload): string {
    // Sort keys alphabetically for consistency
    const sortedPayload = {
        certificate_number: payload.certificate_number,
        event_date: payload.event_date,
        event_name: payload.event_name,
        institution_name: payload.institution_name,
        issued_at: payload.issued_at,
        student_name: payload.student_name,
        student_roll: payload.student_roll,
    }

    // Create a deterministic string representation
    return JSON.stringify(sortedPayload)
}

/**
 * Computes SHA-256 hash of the canonical payload.
 * Returns the hash as a hex string prefixed with '0x'.
 */
export function computePayloadHash(payload: CertificatePayload): string {
    const canonical = createCanonicalPayload(payload)
    const hash = SHA256(canonical).toString()
    return `0x${hash}`
}

/**
 * Verifies that a payload matches a given hash.
 */
export function verifyPayloadHash(payload: CertificatePayload, expectedHash: string): boolean {
    const computedHash = computePayloadHash(payload)
    return computedHash.toLowerCase() === expectedHash.toLowerCase()
}

/**
 * Generates a unique certificate number.
 */
export function generateCertificateNumber(sequenceNumber: number): string {
    const year = new Date().getFullYear()
    const paddedSeq = sequenceNumber.toString().padStart(6, '0')
    return `CERT-${year}-${paddedSeq}`
}
