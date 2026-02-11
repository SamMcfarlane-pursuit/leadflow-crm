import { SignIn } from "@clerk/nextjs";
import { Zap, Shield, BarChart3, Brain } from "lucide-react";
import Link from "next/link";

export default function Page() {
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: '#fdf7f0' }}>
            {/* LEFT PANEL — Branding & Features */}
            <div
                className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1108 0%, #2a1e14 50%, #1a1108 100%)' }}
            >
                {/* Ambient glow */}
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#e09f36' }} />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-15" style={{ backgroundColor: '#57e5d8' }} />

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
                        AI-powered pipeline management with intelligent lead scoring for modern sales teams.
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="relative z-10 space-y-4">
                    <FeatureCard
                        icon={<Brain size={18} />}
                        title="AI Lead Scoring"
                        desc="Automatically score and classify leads based on 5 data signals"
                        color="#e09f36"
                    />
                    <FeatureCard
                        icon={<BarChart3 size={18} />}
                        title="Revenue Analytics"
                        desc="Real-time pipeline tracking with revenue trajectory charts"
                        color="#80eba2"
                    />
                    <FeatureCard
                        icon={<Shield size={18} />}
                        title="Google Sheets Sync"
                        desc="Seamlessly import leads from your spreadsheets in one click"
                        color="#57e5d8"
                    />
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
                {/* Mobile logo (hidden on desktop) */}
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
                            Welcome back
                        </h1>
                        <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>
                            Sign in to access your pipeline and leads
                        </p>
                    </div>

                    {/* Clerk Sign In */}
                    <div className="flex justify-center">
                        <SignIn
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
                            Don&apos;t have an account?{' '}
                            <Link href="/sign-up" className="font-semibold hover:underline" style={{ color: '#e09f36' }}>
                                Create one free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>{desc}</p>
            </div>
        </div>
    );
}
