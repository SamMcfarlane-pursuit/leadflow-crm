import React from 'react';
import { ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Lead } from '../types';
import { BarChart3, TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface MetricsProps {
    leads: Lead[];
}

// ─── Compact number formatting helper ─────────────────────────
function formatCompact(value: number): string {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
}

function formatAxisValue(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
}

const AnalyticsDashboard: React.FC<MetricsProps> = ({ leads }) => {
    // Revenue chart data
    const revenueData = leads
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((lead, index) => ({
            name: lead.businessName.length > 10 ? lead.businessName.substring(0, 10) + '…' : lead.businessName,
            revenue: lead.revenue,
            cumulative: leads.slice(0, index + 1).reduce((sum, l) => sum + l.revenue, 0),
            score: lead.score,
        }));

    // Lead segmentation
    const tierCounts = [
        { name: 'Cold (<100k)', value: leads.filter(l => l.tier === '100k_Under').length, color: '#94a3b8' },
        { name: 'Warm (100-500k)', value: leads.filter(l => l.tier === '101k_500k').length, color: '#f59e0b' },
        { name: 'Hot (500k+)', value: leads.filter(l => l.tier === '500k_Plus').length, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    const totalRevenue = leads.reduce((sum, l) => sum + l.revenue, 0);
    const avgRevenue = leads.length > 0 ? totalRevenue / leads.length : 0;
    const whales = leads.filter(l => l.tier === '500k_Plus').length;
    const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;

    const metrics = [
        {
            label: 'Pipeline Value',
            value: formatCompact(totalRevenue),
            icon: <DollarSign size={20} />,
            accent: 'accent-blue',
            iconBg: 'bg-blue-50 text-blue-600',
        },
        {
            label: 'Average Deal',
            value: formatCompact(avgRevenue),
            icon: <TrendingUp size={20} />,
            accent: 'accent-emerald',
            iconBg: 'bg-emerald-50 text-emerald-600',
        },
        {
            label: 'High Value',
            value: String(whales),
            icon: <Target size={20} />,
            accent: 'accent-rose',
            iconBg: 'bg-rose-50 text-rose-600',
        },
        {
            label: 'Total Leads',
            value: String(leads.length),
            icon: <Users size={20} />,
            accent: 'accent-violet',
            iconBg: 'bg-violet-50 text-violet-600',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m) => (
                    <div
                        key={m.label}
                        className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm card-glow ${m.accent} relative overflow-hidden`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="min-w-0">
                                <p className="text-slate-500 text-xs font-medium mb-1.5 uppercase tracking-wider">{m.label}</p>
                                <h3 className="text-2xl font-bold text-slate-800 stat-number truncate">{m.value}</h3>
                            </div>
                            <div className={`p-2.5 rounded-xl ${m.iconBg} flex-shrink-0`}>
                                {m.icon}
                            </div>
                        </div>
                        {/* Decorative glow */}
                        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
                            style={{ background: m.iconBg.includes('blue') ? '#3b82f6' : m.iconBg.includes('emerald') ? '#10b981' : m.iconBg.includes('rose') ? '#f43f5e' : '#8b5cf6' }}
                        />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                            <BarChart3 size={14} className="text-amber-500" />
                            Revenue Trajectory
                        </h3>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Per Lead
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-0.5 bg-amber-500 rounded" /> Total Pipeline
                            </span>
                        </div>
                    </div>
                    {/* Quick stats */}
                    <div className="flex gap-6 mb-4">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Pipeline</p>
                            <p className="text-lg font-bold text-slate-800">{formatCompact(totalRevenue)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Deal</p>
                            <p className="text-lg font-bold text-slate-800">{formatCompact(avgRevenue)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Leads</p>
                            <p className="text-lg font-bold text-slate-800">{leads.length}</p>
                        </div>
                    </div>
                    <div className="h-[240px] w-full">
                        {leads.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={revenueData} barCategoryGap="20%">
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        angle={-35}
                                        textAnchor="end"
                                        height={50}
                                        interval={0}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        tickFormatter={formatAxisValue}
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={50}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tickFormatter={formatAxisValue}
                                        stroke="#a5b4fc"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={50}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                                            fontSize: '11px',
                                            padding: '8px 12px',
                                        }}
                                        formatter={(value: any, name?: string) => [
                                            formatCompact(Number(value)),
                                            name === 'revenue' ? 'Deal Value' : 'Pipeline Total'
                                        ]}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="revenue"
                                        fill="url(#barGrad)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={32}
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRev)"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                <div className="text-center">
                                    <BarChart3 size={28} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-xs">Add leads to see revenue data</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Lead Segmentation</h3>
                    <div className="h-[280px] w-full relative">
                        {tierCounts.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tierCounts}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {tierCounts.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Label */}
                                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-2xl font-bold text-slate-800">{leads.length}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
                                </div>
                                {/* Legend */}
                                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-5 text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Cold
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Warm
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Hot
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-sm">No lead data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
