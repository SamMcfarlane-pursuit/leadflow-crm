"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import PageTransition from '@/components/layout/PageTransition';

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
            <Sidebar />
            <MobileNav />
            <PageTransition>
                {children}
            </PageTransition>
        </div>
    );
}
