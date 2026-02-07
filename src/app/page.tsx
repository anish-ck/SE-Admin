import Link from 'next/link'
import { Shield, Award, CheckCircle } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex flex-col">
            {/* Header */}
            <header className="safe-top px-4 py-6">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-white" />
                    <span className="text-xl font-bold text-white">CertVerify</span>
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1 flex flex-col justify-center px-4 pb-8">
                <div className="text-center mb-8">
                    <Award className="h-20 w-20 text-white/90 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Certificate Verification
                    </h1>
                    <p className="text-primary-100 text-lg">
                        Blockchain-secured certificate management
                    </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                    {[
                        'Create & authorize events',
                        'QR-based attendance tracking',
                        'Bulk certificate issuance',
                        'Blockchain verification',
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/90">
                            <CheckCircle className="h-5 w-5 flex-shrink-0" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="btn bg-white text-primary-700 hover:bg-gray-100 w-full"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/signup"
                        className="btn bg-primary-500 text-white hover:bg-primary-400 border border-white/20 w-full"
                    >
                        Create Account
                    </Link>
                    <Link
                        href="/verify"
                        className="btn bg-transparent text-white border border-white/30 hover:bg-white/10 w-full"
                    >
                        Verify Certificate
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="safe-bottom px-4 py-4 text-center text-primary-200 text-sm">
                Secured by Polygon Blockchain
            </footer>
        </div>
    )
}
