"use client";

import { LeadProvider } from "@/context/LeadContext";
import { ModalProvider } from "@/context/ModalContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LeadProvider>
            <ModalProvider>
                {children}
            </ModalProvider>
        </LeadProvider>
    );
}
