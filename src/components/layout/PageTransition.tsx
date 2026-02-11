"use client";

import React from 'react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex-1 flex flex-col min-w-0 animate-fadeIn"
        >
            {children}
        </div>
    );
}
