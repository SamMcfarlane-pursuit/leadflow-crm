import { SignUp } from "@clerk/nextjs";
import { Zap, Users, TrendingUp, Mail } from "lucide-react";
import Link from "next/link";

export default function Page() {
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: '#fdf7f0' }}>
            {/* LEFT PANEL — Branding & Social Proof */}
            <div
                className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1108 0%, #2a1e14 50%, #1a1108 100%)' }}
            >
                {/* Ambient glow */}
                <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#80eba2' }} />
                <div className="absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full blur-[100px] opacity-15" style={{ backgroundColor: '#e09f36' }} />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #e09f36, #c8891e)', boxShadow: '0 4px 20px rgba(224,159,54,0.3)' }}>
                            <Zap size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">
                            LeadFlow<span style={{ color: '#e09f36' }}>CRM</span>
                        </span>
                    </div>
                    <p className="text-sm mt-3 max-w-sm" style={{ color: '#8a7a6a' }}>
                        Join thousands of sales teams using AI to close more deals faster.
                    </p>
                </div>

                {/* Stats / Social Proof */}
                <div className="relative z-10 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={<Users size={16} />} value="2,400+" label="Active Users" color="#e09f36" />
                        <StatCard icon={<TrendingUp size={16} />} value="32%" label="More Conversions" color="#80eba2" />
                        <StatCard icon={<Mail size={16} />} value="19K+" label="Leads Synced" color="#57e5d8" />
                        <StatCard icon={<Zap size={16} />} value="< 2min" label="Setup Time" color="#e09f36" />
                    </div>

                    {/* Testimonial */}
                    <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-sm text-white/80 italic leading-relaxed">
                            &quot;LeadFlow cut our response time in half. The AI scoring is incredibly accurate.&quot;
                        </p>
                        <p className="text-xs mt-2" style={{ color: '#8a7a6a' }}>— Sales Director, Tech Startup</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-xs" style={{ color: '#5a4631' }}>
                        © {new Date().getFullYear()} Iron Gate Technologies. All rights reserved.
                    </p>
                </div>
            </div>

            {/* RIGHT PANEL — Auth Form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2 mb-8">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #e09f36, #c8891e)' }}>
                        <Zap size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-bold tracking-tight" style={{ color: '#181004' }}>
                        LeadFlow<span style={{ color: '#e09f36' }}>CRM</span>
                    </span>
                </div>

                <div className="w-full max-w-md space-y-6">
                    {/* Header */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#181004' }}>
                            Create your account
                        </h1>
                        <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>
                            Free to start — no credit card required
                        </p>
                    </div>

                    {/* Clerk Sign Up */}
                    <div className="flex justify-center">
                        <SignUp
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "shadow-none border border-slate-200/60 rounded-2xl bg-white/80 backdrop-blur-sm",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50 rounded-xl transition-all",
                                    formButtonPrimary: "rounded-xl font-semibold shadow-none",
                                    formFieldInput: "rounded-xl border-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400",
                                    footerActionLink: "text-amber-600 hover:text-amber-700 font-semibold",
                                    identityPreviewEditButton: "text-amber-600",
                                },
                                variables: {
                                    colorPrimary: '#e09f36',
                                    colorTextOnPrimaryBackground: '#fff',
                                    borderRadius: '0.75rem',
                                },
                            }}
                        />
                    </div>

                    {/* Bottom Links */}
                    <div className="text-center space-y-3 pt-2">
                        <p className="text-sm" style={{ color: '#8a7a6a' }}>
                            Already have an account?{' '}
                            <Link href="/sign-in" className="font-semibold hover:underline" style={{ color: '#e09f36' }}>
                                Sign in
                            </Link>
                        </p>
                        <p className="text-[11px]" style={{ color: '#b8a898' }}>
                            By creating an account, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
    return (
        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-1" style={{ color }}>
                {icon}
                <span className="text-lg font-bold text-white">{value}</span>
            </div>
            <p className="text-[11px]" style={{ color: '#8a7a6a' }}>{label}</p>
        </div>
    );
}
