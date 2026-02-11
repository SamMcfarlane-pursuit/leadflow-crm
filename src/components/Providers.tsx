"use client";

import { LeadProvider } from "@/context/LeadContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LeadProvider>
            {children}
        </LeadProvider>
    );
}
