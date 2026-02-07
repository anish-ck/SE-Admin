'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield, Mail, Lock, User, Eye, EyeOff, Loader2, Building } from 'lucide-react'

export default function SignupPage() {
    const router = useRouter()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [department, setDepartment] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'event_manager', // Default role
                    department,
                },
            },
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="safe-top px-4 py-6">
                    <Link href="/" className="flex items-center gap-2 text-primary-600">
                        <Shield className="h-6 w-6" />
                        <span className="font-semibold">CertVerify</span>
                    </Link>
                </header>

                <main className="flex-1 flex flex-col justify-center items-center px-4 pb-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Mail className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
                    <p className="text-gray-600 mb-6">
                        We've sent a confirmation link to<br />
                        <span className="font-medium">{email}</span>
                    </p>
                    <Link href="/login" className="btn-primary">
                        Back to Login
                    </Link>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="safe-top px-4 py-6">
                <Link href="/" className="flex items-center gap-2 text-primary-600">
                    <Shield className="h-6 w-6" />
                    <span className="font-semibold">CertVerify</span>
                </Link>
            </header>

            {/* Form */}
            <main className="flex-1 flex flex-col justify-center px-4 pb-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
                    <p className="text-gray-600 mt-1">Join as an event manager</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="fullName" className="label">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input pl-10"
                                placeholder="Dr. John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="label">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input pl-10"
                                placeholder="you@college.edu"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="department" className="label">Department</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="department"
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="input pl-10"
                                placeholder="Computer Science"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="label">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input pl-10 pr-10"
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Creating account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <p className="text-center mt-6 text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary-600 font-medium">
                        Sign in
                    </Link>
                </p>
            </main>
        </div>
    )
}
