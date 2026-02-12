"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalContextType {
    isAddLeadOpen: boolean;
    openAddLead: () => void;
    closeAddLead: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

    const openAddLead = useCallback(() => setIsAddLeadOpen(true), []);
    const closeAddLead = useCallback(() => setIsAddLeadOpen(false), []);

    return (
        <ModalContext.Provider value={{ isAddLeadOpen, openAddLead, closeAddLead }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
