"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import PageTransition from '@/components/layout/PageTransition';
import { useModal } from '@/context/ModalContext';
import { useLeads } from '@/context/LeadContext';
import AddLeadModal from '@/components/AddLeadModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { isAddLeadOpen, closeAddLead } = useModal();
    const { addLead, addLog } = useLeads();

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
            <Sidebar />
            <MobileNav />
            <PageTransition>
                {children}
            </PageTransition>

            {/* Global Add Lead / Smart Import Modal */}
            {isAddLeadOpen && (
                <AddLeadModal
                    onLeadProcessed={addLead}
                    addLog={addLog}
                    onClose={closeAddLead}
                />
            )}
        </div>
    );
}
