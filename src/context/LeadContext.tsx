"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Lead, LogEntry, PipelineStage } from '@/types';
import {
    getLeadsPaginated,
    createLead,
    bulkCreateLeads,
    updateLeadStage as updateStageAction,
    CreateLeadData,
    BulkLeadData,
    LeadFilters,
    getLeadStats,
} from '@/actions/leadActions';
import { syncFromGoogleSheets, SyncResult } from '@/actions/sheetsSync';

interface LeadStats {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    lukewarm: number;
    avgScore: number;
    totalRevenue: number;
}

interface LeadContextType {
    // Data
    leads: Lead[];
    logs: LogEntry[];
    stats: LeadStats | null;

    // Pagination
    page: number;
    totalPages: number;
    totalLeads: number;
    pageSize: number;

    // Filters
    filters: LeadFilters;
    setFilters: (filters: LeadFilters) => void;

    // Actions
    addLead: (lead: Lead | Lead[]) => Promise<void>;
    bulkAdd: (leads: BulkLeadData[], onProgress?: (done: number, total: number) => void) => Promise<{ count: number }>;
    updateLeadStage: (leadId: string, stage: PipelineStage) => Promise<void>;
    addLog: (log: LogEntry) => void;
    goToPage: (page: number) => void;
    refreshLeads: () => Promise<void>;
    refreshStats: () => Promise<void>;

    // Sheets Sync
    syncSheets: (maxRows?: number) => Promise<SyncResult | null>;
    isSyncing: boolean;
    lastSyncTime: string | null;
    lastSyncResult: SyncResult | null;

    // State
    isLoading: boolean;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

const PAGE_SIZE = 50;
const BULK_CHUNK_SIZE = 500;

export const LeadProvider = ({ children }: { children: ReactNode }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<LeadStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sheets sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const [filters, setFiltersState] = useState<LeadFilters>({});

    // Fetch a page of leads
    const fetchPage = useCallback(async (pageNum: number, currentFilters?: LeadFilters) => {
        setIsLoading(true);
        try {
            const result = await getLeadsPaginated(pageNum, PAGE_SIZE, currentFilters || filters);
            if (result.success) {
                setLeads(result.leads || []);
                setTotalPages(result.totalPages || 1);
                setTotalLeads(result.total || 0);
                setPage(pageNum);
            }
        } catch (error) {
            console.error("Failed to fetch leads page", error);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Fetch aggregated stats
    const refreshStats = useCallback(async () => {
        try {
            const result = await getLeadStats();
            if (result.success && result.stats) {
                setStats(result.stats);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchPage(1);
        refreshStats();
    }, []);

    // Refresh current page
    const refreshLeads = useCallback(async () => {
        await fetchPage(page);
        await refreshStats();
    }, [page, fetchPage, refreshStats]);

    // Navigate to page
    const goToPage = useCallback(async (newPage: number) => {
        await fetchPage(newPage);
    }, [fetchPage]);

    // Update filters and reset to page 1
    const setFilters = useCallback(async (newFilters: LeadFilters) => {
        setFiltersState(newFilters);
        await fetchPage(1, newFilters);
    }, [fetchPage]);

    // Add single or small batch of leads (original flow)
    const addLead = async (leadOrLeads: Lead | Lead[]) => {
        const newLeads = Array.isArray(leadOrLeads) ? leadOrLeads : [leadOrLeads];

        for (const lead of newLeads) {
            const leadData: CreateLeadData = {
                ...lead,
                session: lead.session
            };
            await createLead(leadData);
        }

        // Refresh to show new leads
        await refreshLeads();
    };

    // Bulk add for large imports (chunked with progress)
    const bulkAdd = async (
        allLeads: BulkLeadData[],
        onProgress?: (done: number, total: number) => void
    ): Promise<{ count: number }> => {
        let totalInserted = 0;
        const totalToInsert = allLeads.length;

        // Process in chunks
        for (let i = 0; i < totalToInsert; i += BULK_CHUNK_SIZE) {
            const chunk = allLeads.slice(i, i + BULK_CHUNK_SIZE);
            const result = await bulkCreateLeads(chunk);
            if (result.success) {
                totalInserted += result.count;
            }
            onProgress?.(Math.min(i + BULK_CHUNK_SIZE, totalToInsert), totalToInsert);
        }

        // Refresh everything after bulk insert
        await refreshLeads();

        return { count: totalInserted };
    };

    // Update pipeline stage
    const updateLeadStage = async (leadId: string, stage: PipelineStage) => {
        // Optimistic UI
        setLeads(prev => prev.map(lead =>
            lead.id === leadId ? { ...lead, pipelineStage: stage } : lead
        ));
        await updateStageAction(leadId, stage);
    };

    // Add local log
    const addLog = (newLog: LogEntry) => {
        setLogs((prev) => [newLog, ...prev]);
    };

    // Sync from Google Sheets
    const syncSheets = useCallback(async (maxRows: number = 500): Promise<SyncResult | null> => {
        if (isSyncing) return null;
        setIsSyncing(true);
        try {
            const result = await syncFromGoogleSheets(maxRows);
            setLastSyncResult(result);
            if (result.success) {
                setLastSyncTime(result.syncedAt);
                await refreshLeads();
            }
            return result;
        } catch (error) {
            console.error('Sync failed:', error);
            return null;
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, refreshLeads]);

    return (
        <LeadContext.Provider value={{
            leads, logs, stats,
            page, totalPages, totalLeads, pageSize: PAGE_SIZE,
            filters, setFilters,
            addLead, bulkAdd, updateLeadStage, addLog,
            goToPage, refreshLeads, refreshStats,
            syncSheets, isSyncing, lastSyncTime, lastSyncResult,
            isLoading,
        }}>
            {children}
        </LeadContext.Provider>
    );
};

export const useLeads = () => {
    const context = useContext(LeadContext);
    if (context === undefined) {
        throw new Error('useLeads must be used within a LeadProvider');
    }
    return context;
};
