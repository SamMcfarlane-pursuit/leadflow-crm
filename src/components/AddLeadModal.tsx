import React, { useState, useEffect, useRef } from 'react';
import { Building, Mail, Phone, BadgeDollarSign, Info, X, FileJson, Copy, Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Trash2, Loader2, FileText, Sparkles, FileSpreadsheet } from 'lucide-react';
import { processLeadSimulation, processBatch, calculateTier, COMPLIANCE_CONFIG } from '../utils/ironGateLogic';
import { Lead, LogEntry } from '../types';
import { generateLeadScore, extractLeadsFromText } from '@/actions/aiActions';
import { useLeads } from '@/context/LeadContext';
import * as XLSX from 'xlsx';

interface AddLeadModalProps {
    onLeadProcessed: (lead: Lead | Lead[]) => void;
    addLog: (log: LogEntry) => void;
    onClose: () => void;
}

type WizardStep = 'input' | 'map' | 'review';

/* ─── Synonym Dictionary for Auto-Mapping ────────────────────────────── */
type CrmField = 'businessName' | 'email' | 'revenue' | 'phone' | 'state' | 'industry' | 'contactName' | 'ignore';

const FIELD_SYNONYMS: Record<Exclude<CrmField, 'ignore'>, string[]> = {
    businessName: ['company', 'business', 'name', 'dba', 'merchant', 'legal name', 'legal', 'corp', 'llc', 'entity', 'firm', 'account', 'organization', 'org'],
    email: ['email', 'e-mail', 'mail', 'contact email', 'email address', 'owner email'],
    revenue: ['revenue', 'rev', 'sales', 'volume', 'vol', 'gross', 'monthly', 'annual', 'income', 'funded', 'amount', 'avg', 'average', 'mrr', 'arr', 'deposit'],
    phone: ['phone', 'tel', 'cell', 'mobile', 'fax', 'number', 'work phone', 'contact phone', 'ph'],
    state: ['state', 'st', 'location', 'region', 'territory', 'province', 'area'],
    industry: ['industry', 'sic', 'type', 'sector', 'vertical', 'category', 'business type', 'niche'],
    contactName: ['owner', 'contact', 'principal', 'agent', 'rep', 'first name', 'last name', 'full name', 'contact name', 'manager', 'person'],
};

const FIELD_LABELS: Record<Exclude<CrmField, 'ignore'>, string> = {
    businessName: 'Business Name',
    email: 'Email',
    revenue: 'Revenue',
    phone: 'Phone',
    state: 'State',
    industry: 'Industry',
    contactName: 'Contact Name',
};

function scoreColumnMatch(header: string): { field: CrmField; confidence: number } {
    const lower = header.toLowerCase().trim();
    let bestField: CrmField = 'ignore';
    let bestScore = 0;

    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
        for (const syn of synonyms) {
            let score = 0;
            if (lower === syn) score = 100;                    // exact match
            else if (lower.includes(syn)) score = 80;          // contains the synonym
            else if (syn.includes(lower)) score = 60;          // synonym contains the header
            else {
                // Fuzzy: check individual words
                const headerWords = lower.split(/[\s_\-\.]+/);
                const synWords = syn.split(/[\s_\-\.]+/);
                const overlap = headerWords.filter(w => synWords.some(s => s.startsWith(w) || w.startsWith(s))).length;
                if (overlap > 0) score = 30 + (overlap / Math.max(headerWords.length, synWords.length)) * 40;
            }
            if (score > bestScore) {
                bestScore = score;
                bestField = field as CrmField;
            }
        }
    }
    return { field: bestField, confidence: bestScore };
}

function autoMapColumns(headers: string[]): { mapping: Record<number, string>; confidences: Record<number, number> } {
    const mapping: Record<number, string> = {};
    const confidences: Record<number, number> = {};
    const usedFields = new Set<string>();

    // Score all columns, sort by confidence descending, then assign greedily
    const scored = headers.map((h, i) => ({ index: i, ...scoreColumnMatch(h) }));
    scored.sort((a, b) => b.confidence - a.confidence);

    for (const s of scored) {
        if (s.confidence >= 30 && s.field !== 'ignore' && !usedFields.has(s.field)) {
            mapping[s.index] = s.field;
            confidences[s.index] = s.confidence;
            usedFields.add(s.field);
        }
    }
    return { mapping, confidences };
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ onLeadProcessed, addLog, onClose }) => {
    const { bulkAdd } = useLeads();
    const [mode, setMode] = useState<'single' | 'smart'>('single');
    const [step, setStep] = useState<WizardStep>('input');
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // SMART IMPORT STATE
    const [rawInput, setRawInput] = useState('');
    const [parsedRows, setParsedRows] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
    const [columnConfidences, setColumnConfidences] = useState<Record<number, number>>({});
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    // Single Form State
    const [form, setForm] = useState({
        email: '',
        phone: '',
        revenue: '',
        businessName: ''
    });

    const generateRandom = () => {
        const companies = ["Acme Corp", "Iron Industries", "Stark Tech", "Wayne Ent", "Cyberdyne", "Green Valley Landscaping", "Metro Auto Repair"];
        const names = ["john", "sarah", "mike", "emma", "david", "thomas", "amanda"];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomComp = companies[Math.floor(Math.random() * companies.length)];
        let rev = 0;
        const tierRoll = Math.random();
        if (tierRoll < 0.6) rev = Math.floor(Math.random() * 95000) + 5000;
        else if (tierRoll < 0.9) rev = Math.floor(Math.random() * 300000) + 101000;
        else rev = Math.floor(Math.random() * 1000000) + 500000;
        const isDnc = Math.random() > 0.85;
        const phone = isDnc
            ? COMPLIANCE_CONFIG.blocklist[Math.floor(Math.random() * COMPLIANCE_CONFIG.blocklist.length)]
            : `555-${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`;

        setForm({
            email: `${randomName}@${randomComp.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: phone,
            revenue: rev.toString(),
            businessName: randomComp
        });
    };

    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            let revenueStr = form.revenue.toLowerCase().replace(/[^0-9km.]/g, '');
            let multiplier = 1;
            if (revenueStr.includes('k')) { multiplier = 1000; revenueStr = revenueStr.replace('k', ''); }
            else if (revenueStr.includes('m')) { multiplier = 1000000; revenueStr = revenueStr.replace('m', ''); }
            const revenue = (parseFloat(revenueStr) * multiplier) || 0;

            // Try AI analysis first
            console.log("Requesting AI Analysis for:", form.businessName);
            const aiResult = await generateLeadScore(form.businessName, revenue);

            let lead: Lead;

            if (aiResult) {
                // AI Success Path
                console.log("AI Analysis Successful:", aiResult);

                // Add AI log
                addLog({
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date(),
                    level: 'SUCCESS',
                    message: `AI Analysis complete for ${form.businessName}`,
                    module: 'API'
                });

                lead = {
                    id: Math.random().toString(36).substr(2, 9),
                    email: form.email,
                    phone: form.phone,
                    revenue,
                    businessName: form.businessName,
                    timestamp: new Date(),
                    tier: aiResult.tier,
                    temperature: aiResult.temperature,
                    score: aiResult.score,
                    dncStatus: 'SAFE', // Default safe for AI path
                    pipelineStage: 'New',
                    actions: [],
                    session: undefined // Session data would be captured separately
                };
            } else {
                // Fallback Simulation Path
                console.log("AI Analysis unavailable, falling back to simulation.");
                lead = await processLeadSimulation({ ...form, revenue }, addLog);
            }

            onLeadProcessed(lead);
            onClose();
        } catch (error) { console.error("Process failed", error); }
        finally { setIsProcessing(false); }
    };

    // --- SMART IMPORT LOGIC ---

    const detectDelimiter = (text: string) => {
        const firstLine = text.split('\n')[0];
        if (firstLine.includes('\t')) return '\t';
        return ',';
    };

    /** Parse a single CSV line respecting quoted fields */
    const parseCSVLine = (line: string, delim: string): string[] => {
        if (delim === '\t') return line.split('\t').map(c => c.trim());

        // For comma-delimited: respect quoted fields
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        cells.push(current.trim());

        // Post-process: reunite split dollar amounts like "$45" + "000" → "$45,000"
        const fixed: string[] = [];
        for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            // If previous cell looks like a partial dollar and this cell is just digits
            if (fixed.length > 0 && /^\$[\d.]+$/.test(fixed[fixed.length - 1]) && /^\d{3}$/.test(c)) {
                fixed[fixed.length - 1] += ',' + c;
            } else {
                fixed.push(c);
            }
        }
        return fixed;
    };

    const handleParse = () => {
        if (!rawInput.trim()) return;
        const delim = detectDelimiter(rawInput);
        const allRows = rawInput.trim().split('\n').map(line => parseCSVLine(line, delim));

        if (allRows.length < 1) return;

        // First row = headers (use as column labels)
        setHeaders(allRows[0]);
        setParsedRows(allRows.slice(1).filter(r => r.some(c => c.length > 0))); // skip empty rows

        // Synonym-based auto-mapping with confidence scores
        const { mapping, confidences } = autoMapColumns(allRows[0]);
        setColumnMapping(mapping);
        setColumnConfidences(confidences);
        setStep('map');
    };

    const handleAIExtraction = async () => {
        if (!rawInput.trim()) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            console.log("Starting AI Extraction...");
            const extracted = await extractLeadsFromText(rawInput);

            if (extracted && extracted.length > 0) {
                console.log("AI Extraction Success:", extracted);

                // Convert extracted objects to rows for the wizard
                const newHeaders = ["Business Name", "Email", "Phone", "Revenue", "State", "Industry", "Contact"];
                const newRows = extracted.map(lead => [
                    lead.businessName,
                    lead.email,
                    lead.phone,
                    lead.revenue.toString(),
                    lead.state,
                    lead.industry || '',
                    lead.contactName || ''
                ]);

                setHeaders(newHeaders);
                setParsedRows(newRows);

                const newMapping: Record<number, string> = {
                    0: 'businessName', 1: 'email', 2: 'phone',
                    3: 'revenue', 4: 'state', 5: 'industry', 6: 'contactName'
                };
                setColumnMapping(newMapping);
                setColumnConfidences({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 });
                setStep('map');

                addLog({
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date(),
                    level: 'SUCCESS',
                    message: `AI extracted ${extracted.length} leads from text.`,
                    module: 'API'
                });
            } else {
                setErrorMsg("AI couldn't find lead data. Try pasting more contact info (names, emails, phones).");
            }
        } catch (error) {
            console.error("Extraction error", error);
            setErrorMsg("AI extraction failed. Please try again or use manual CSV paste.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMappingSubmit = () => {
        // Select all valid rows by default
        const allIndices = new Set<number>();
        parsedRows.forEach((_, idx) => allIndices.add(idx));
        setSelectedRows(allIndices);
        setStep('review');
    };

    const handleFinalImport = async () => {
        setIsProcessing(true);
        setImportProgress(null);
        try {
            const leadsToImport = parsedRows
                .filter((_, idx) => selectedRows.has(idx))
                .map(row => {
                    const leadObj: any = {};
                    Object.entries(columnMapping).forEach(([colIdx, field]) => {
                        if (field !== 'ignore') {
                            leadObj[field] = row[parseInt(colIdx)];
                        }
                    });

                    // Basic cleanup
                    let revStr = (leadObj.revenue || '0').toString().toLowerCase().replace(/[^0-9km.]/g, '');
                    let mult = 1;
                    if (revStr.includes('k')) { mult = 1000; revStr = revStr.replace('k', ''); }
                    else if (revStr.includes('m')) { mult = 1000000; revStr = revStr.replace('m', ''); }
                    leadObj.revenue = (parseFloat(revStr) * mult) || 0;

                    leadObj.businessName = leadObj.businessName || "Unknown Business";
                    leadObj.email = leadObj.email || "no-email@provided.com";
                    leadObj.phone = leadObj.phone || "555-000-0000";
                    leadObj.state = leadObj.state || undefined;
                    leadObj.industry = leadObj.industry || undefined;
                    leadObj.contactName = leadObj.contactName || undefined;

                    return leadObj;
                });

            // Use bulk import for large datasets (server-side, chunked)
            if (leadsToImport.length > 10) {
                setImportProgress({ done: 0, total: leadsToImport.length });

                // Map to BulkLeadData format — use unified scoring
                const bulkData = leadsToImport.map((l: any) => {
                    const { tier, temperature, score } = calculateTier(l.revenue);
                    return {
                        email: l.email,
                        phone: l.phone,
                        revenue: l.revenue,
                        businessName: l.businessName,
                        tier,
                        temperature,
                        score,
                        dncStatus: 'SAFE',
                        pipelineStage: 'New',
                        state: l.state,
                        industry: l.industry,
                        contactName: l.contactName,
                    };
                });

                const result = await bulkAdd(bulkData, (done, total) => {
                    setImportProgress({ done, total });
                });

                addLog({
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date(),
                    level: 'SUCCESS',
                    message: `Bulk import: ${result.count} leads inserted`,
                    module: 'CORE'
                });
            } else {
                // Small batch — use simulation path
                const leads = processBatch(leadsToImport);
                onLeadProcessed(leads);
            }

            onClose();
        } catch (e) {
            console.error(e);
            alert("Import failed");
        } finally {
            setIsProcessing(false);
            setImportProgress(null);
        }
    };

    const toggleRow = (idx: number) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(idx)) newSet.delete(idx);
        else newSet.add(idx);
        setSelectedRows(newSet);
    };

    const loadExampleSheet = () => {
        setRawInput(`Company Name\tContact Email\tProjected Revenue\tPhone Number
Tech Nova\tadmin@technova.io\t$1.5M\t555-0101
Mom's Bakery\thello@moms.local\t85,000\t555-0202
Global Logistics\tsupport@globall.net\t450k\t555-0303
Corner Bodega\tcontact@bodega.nyc\t$25,000\t555-0404`);
        setUploadedFileName(null);
    };

    const handleFileUpload = (file: File) => {
        setUploadedFileName(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        if (['xlsx', 'xls'].includes(ext)) {
            // Excel binary → parse with SheetJS, convert to TSV
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target?.result;
                if (!data) return;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const tsv = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
                setRawInput(tsv);
            };
            reader.readAsArrayBuffer(file);
        } else {
            // CSV, TSV, TXT, JSON — read as text
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result;
                if (typeof text === 'string') setRawInput(text);
            };
            reader.readAsText(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileUpload(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 md:p-4">
            <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">

                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Add Leads</h2>
                        <div className="flex bg-slate-200 rounded-lg p-1">
                            <button onClick={() => setMode('single')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${mode === 'single' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Single Entry</button>
                            <button onClick={() => setMode('smart')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${mode === 'smart' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Smart Import</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
                </div>

                <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
                    {mode === 'single' ? (
                        <div className="p-6 md:p-8 max-w-xl mx-auto bg-white m-0 md:m-8 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-slate-200 min-h-full md:min-h-0">
                            <form onSubmit={handleSingleSubmit} className="space-y-5">
                                <div className="flex justify-end">
                                    <button type="button" onClick={generateRandom} className="text-xs font-medium text-amber-600 hover:underline flex items-center gap-1"><Copy size={12} /> Auto-Fill</button>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label><input type="text" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="e.g. Acme Corp" /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="lead@company.com" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Revenue</label><input type="text" required value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="e.g. 500k" /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="(555) 123-4567" /></div>
                                    </div>
                                </div>
                                <div className="pt-2"><button type="submit" disabled={isProcessing} className="w-full py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all">{isProcessing ? 'Processing...' : 'Add Lead'}</button></div>
                            </form>
                        </div>
                    ) : (
                        // SMART IMPORT WIZARD
                        <div className="flex flex-col h-full">
                            {/* STEPS */}
                            <div className="flex items-center justify-center p-3 md:p-4 border-b border-slate-200 bg-white shadow-sm overflow-x-auto">
                                <div className={`flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap ${step === 'input' ? 'text-amber-600' : (step === 'map' || step === 'review') ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-current text-white flex items-center justify-center text-[10px] md:text-xs">
                                        {(step === 'map' || step === 'review') ? <CheckCircle2 size={14} /> : '1'}
                                    </span> Import
                                </div>
                                <div className={`w-4 md:w-8 h-px mx-2 ${(step === 'map' || step === 'review') ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>
                                <div className={`flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap ${step === 'map' ? 'text-amber-600' : step === 'review' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-current text-white flex items-center justify-center text-[10px] md:text-xs">
                                        {step === 'review' ? <CheckCircle2 size={14} /> : '2'}
                                    </span> Map
                                </div>
                                <div className={`w-4 md:w-8 h-px mx-2 ${step === 'review' ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>
                                <div className={`flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap ${step === 'review' ? 'text-amber-600' : 'text-slate-400'}`}>
                                    <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-current text-white flex items-center justify-center text-[10px] md:text-xs">3</span> Review
                                </div>
                            </div>

                            <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
                                {step === 'input' && (
                                    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
                                        {/* Source badges */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {[
                                                { icon: <FileSpreadsheet size={12} />, label: 'Google Sheets' },
                                                { icon: <FileText size={12} />, label: 'Google Docs' },
                                                { icon: <Mail size={12} />, label: 'Emails' },
                                                { icon: <FileJson size={12} />, label: 'CSV / Excel' },
                                                { icon: <FileText size={12} />, label: 'PDF / TXT' },
                                            ].map((s) => (
                                                <span key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                                                    {s.icon} {s.label}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Info banner */}
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-200 mb-3 flex justify-between items-center">
                                            <p className="text-sm text-amber-800 flex items-center gap-2">
                                                <Sparkles size={14} className="text-amber-500" />
                                                Paste or drop any data — AI extracts leads automatically
                                            </p>
                                            <button onClick={loadExampleSheet} className="text-xs font-bold text-amber-600 hover:underline whitespace-nowrap ml-3">Try Example</button>
                                        </div>

                                        {/* Uploaded file indicator */}
                                        {uploadedFileName && (
                                            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <FileText size={14} className="text-emerald-600" />
                                                <span className="text-sm text-emerald-700 font-medium flex-1 truncate">{uploadedFileName}</span>
                                                <button onClick={() => { setUploadedFileName(null); setRawInput(''); }} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
                                            </div>
                                        )}

                                        {/* Drag & Drop + Paste Zone */}
                                        <div
                                            className={`flex-1 relative rounded-xl border-2 border-dashed transition-all duration-200 ${isDragging
                                                ? 'border-amber-400 bg-amber-50/50 scale-[1.01]'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDrop}
                                        >
                                            {isDragging && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-amber-50/80 rounded-xl z-10 pointer-events-none">
                                                    <div className="text-center">
                                                        <Upload size={32} className="text-amber-500 mx-auto mb-2" />
                                                        <p className="text-amber-700 font-bold text-sm">Drop your file here</p>
                                                    </div>
                                                </div>
                                            )}
                                            <textarea
                                                value={rawInput}
                                                onChange={(e) => { setRawInput(e.target.value); setUploadedFileName(null); }}
                                                className="w-full h-full min-h-[180px] p-4 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none bg-transparent"
                                                placeholder={"Paste anything here:\n• Copy from Google Sheets or Excel\n• Paste email lists or contact info\n• Drop a CSV, TXT, or any text file\n• Paste raw lead data in any format\n\nAI will extract: Business Name, Email, Phone, Revenue, State, Industry, Contact Name"}
                                            />
                                        </div>

                                        {/* Inline error */}
                                        {errorMsg && (
                                            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                <span>{errorMsg}</span>
                                                <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-300 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="mt-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                                            {/* File Upload */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv,.txt,.json,.tsv,.xlsx,.xls,.pdf,.doc,.docx"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(file);
                                                }}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                                            >
                                                <Upload size={16} /> Upload File
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAIExtraction}
                                                    disabled={!rawInput.trim() || isProcessing}
                                                    className="flex-1 sm:flex-none bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-amber-600/20 text-sm"
                                                >
                                                    {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : <><Sparkles size={16} /> AI Extract</>}
                                                </button>
                                                <button
                                                    onClick={handleParse}
                                                    disabled={!rawInput.trim()}
                                                    className="bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50 text-sm"
                                                >
                                                    Next <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 'map' && (
                                    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full overflow-hidden">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-4">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-600 font-medium">
                                                    <tr>
                                                        {headers.map((h, i) => {
                                                            const conf = columnConfidences[i] || 0;
                                                            const mapped = columnMapping[i] && columnMapping[i] !== 'ignore';
                                                            const confColor = conf >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : conf >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                    : 'bg-slate-100 text-slate-500 border-slate-200';
                                                            return (
                                                                <th key={i} className="px-4 py-3 min-w-[150px]">
                                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                                        <span className="text-xs text-slate-400 truncate">{h}</span>
                                                                        {mapped && (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${confColor}`}>
                                                                                {conf >= 80 ? '✓' : conf >= 50 ? '~' : '?'} {conf}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <select
                                                                        value={columnMapping[i] || 'ignore'}
                                                                        onChange={(e) => setColumnMapping({ ...columnMapping, [i]: e.target.value })}
                                                                        className={`w-full p-1.5 rounded border text-xs font-bold focus:ring-2 focus:ring-amber-500 ${mapped ? 'border-amber-300 bg-amber-50/50 text-amber-800' : 'border-slate-300 text-slate-800'
                                                                            }`}
                                                                    >
                                                                        <option value="ignore">— Ignore —</option>
                                                                        {Object.entries(FIELD_LABELS).map(([val, label]) => (
                                                                            <option key={val} value={val}>{label}</option>
                                                                        ))}
                                                                    </select>
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {parsedRows.slice(0, 5).map((row, rIdx) => (
                                                        <tr key={rIdx}>
                                                            {row.map((cell, cIdx) => (
                                                                <td key={cIdx} className="px-4 py-2 text-slate-600 font-mono text-xs truncate max-w-[150px]">{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {parsedRows.length > 5 && <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 italic text-center">... and {parsedRows.length - 5} more rows</div>}
                                        </div>
                                        <div className="mt-auto flex justify-between items-center pt-3">
                                            <button onClick={() => setStep('input')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <button onClick={handleMappingSubmit} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-700 shadow-sm text-sm">
                                                Review Selection <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 'review' && (
                                    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full overflow-hidden">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800">Select Rows to Import ({selectedRows.size})</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    const all = new Set<number>();
                                                    parsedRows.forEach((_, i) => all.add(i));
                                                    setSelectedRows(all);
                                                }} className="text-xs font-bold text-amber-600 hover:underline">Select All</button>
                                                <button onClick={() => setSelectedRows(new Set())} className="text-xs font-bold text-slate-500 hover:underline">Deselect All</button>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-medium shadow-sm">
                                                    <tr>
                                                        <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedRows.size === parsedRows.length} readOnly /></th>
                                                        <th className="px-4 py-3">Business</th>
                                                        <th className="px-4 py-3">Contact</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3">Revenue</th>
                                                        <th className="px-4 py-3">Phone</th>
                                                        <th className="px-4 py-3">Industry</th>
                                                        <th className="px-4 py-3">State</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {parsedRows.map((row, idx) => {
                                                        const isSelected = selectedRows.has(idx);
                                                        let name = "", email = "", rev = "", phone = "", st = "", ind = "", contact = "";
                                                        Object.entries(columnMapping).forEach(([c, f]) => {
                                                            const val = row[parseInt(c)] || '';
                                                            if (f === 'businessName') name = val;
                                                            if (f === 'email') email = val;
                                                            if (f === 'revenue') rev = val;
                                                            if (f === 'phone') phone = val;
                                                            if (f === 'state') st = val;
                                                            if (f === 'industry') ind = val;
                                                            if (f === 'contactName') contact = val;
                                                        });

                                                        return (
                                                            <tr key={idx}
                                                                className={`transition-colors cursor-pointer ${isSelected ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'opacity-50 hover:opacity-80'}`}
                                                                onClick={() => toggleRow(idx)}
                                                            >
                                                                <td className="px-4 py-2"><input type="checkbox" checked={isSelected} readOnly className="pointer-events-none" /></td>
                                                                <td className="px-4 py-2 font-medium text-slate-900">{name || <span className="text-red-400 italic">Missing</span>}</td>
                                                                <td className="px-4 py-2 text-slate-600 text-xs">{contact || <span className="text-slate-300">—</span>}</td>
                                                                <td className="px-4 py-2 text-slate-600 text-xs">{email}</td>
                                                                <td className="px-4 py-2 text-slate-600 font-mono text-xs">{rev}</td>
                                                                <td className="px-4 py-2 text-slate-600 text-xs">{phone}</td>
                                                                <td className="px-4 py-2 text-slate-600 text-xs">{ind || <span className="text-slate-300">—</span>}</td>
                                                                <td className="px-4 py-2 text-slate-600 text-xs">{st}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            {/* Bulk Import Progress Bar */}
                                            {importProgress && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-2 text-amber-700 font-medium">
                                                            <Loader2 size={14} className="animate-spin" />
                                                            Importing leads...
                                                        </span>
                                                        <span className="text-amber-600 font-bold">
                                                            {importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-amber-500">
                                                        {Math.round((importProgress.done / importProgress.total) * 100)}% complete — processing in batches of 500
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <button onClick={() => setStep('map')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">
                                                    <ArrowLeft size={16} /> Back
                                                </button>
                                                <button
                                                    onClick={handleFinalImport}
                                                    disabled={selectedRows.size === 0 || isProcessing}
                                                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                                                >
                                                    {isProcessing ? (
                                                        <><Loader2 size={18} className="animate-spin" /> Importing...</>
                                                    ) : (
                                                        <>{`Import ${selectedRows.size.toLocaleString()} Leads`} <Upload size={18} /></>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddLeadModal;
