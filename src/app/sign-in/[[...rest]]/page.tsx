import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Welcome Back to LeadFlow</h1>
                <SignIn />
            </div>
        </div>
    );
}
