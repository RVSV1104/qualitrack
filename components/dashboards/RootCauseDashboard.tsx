
import React, { useState, useMemo } from 'react';
import { Evaluation } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart, ComposedChart
} from 'recharts';
import { 
    BrainCircuit, AlertTriangle, TrendingUp, Filter, Zap, 
    MessageCircle, Phone, Mail, Monitor, ArrowRight
} from 'lucide-react';
import { COLORS } from '../../constants';

interface RootCauseDashboardProps {
    evaluations: Evaluation[];
}

const RootCauseDashboard: React.FC<RootCauseDashboardProps> = ({ evaluations }) => {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    // --- Data Processing ---

    const noSaleEvals = useMemo(() => 
        evaluations.filter(e => !e.saleEffective && e.noSaleReason),
    [evaluations]);

    // 1. General Aggregation (Pareto)
    const reasonCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        noSaleEvals.forEach(e => {
            const r = e.noSaleReason!;
            counts[r] = (counts[r] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, percentage: (value / noSaleEvals.length) * 100 }))
            .sort((a, b) => b.value - a.value);
    }, [noSaleEvals]);

    const topReason = reasonCounts[0]?.name || '';
    // Default selected reason to top reason if null
    const activeReason = selectedReason || topReason;

    // 2. Evolution Data (Last 90 Days / Monthly)
    const evolutionData = useMemo(() => {
        const grouped: Record<string, { count: number; date: Date }> = {};
        const reasonToTrack = activeReason;

        noSaleEvals.forEach(e => {
            if (e.noSaleReason === reasonToTrack) {
                // Use Date to group by Month/Year for sorting
                const date = new Date(e.date);
                const key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); // "jan 2025"
                
                if (!grouped[key]) {
                    grouped[key] = { count: 0, date: new Date(date.getFullYear(), date.getMonth(), 1) };
                }
                grouped[key].count += 1;
            }
        });

        // Sort chronologically
        return Object.entries(grouped)
            .map(([name, data]) => ({ name, count: data.count, sortDate: data.date }))
            .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    }, [noSaleEvals, activeReason]);

    // 3. Consultant x Reason Heatmap Data
    const heatmapData = useMemo(() => {
        // Get Top 5 Reasons
        const top5Reasons = reasonCounts.slice(0, 5).map(r => r.name);
        
        // Get Top 10 Consultants by volume of No Sale
        const consultantVolume: Record<string, number> = {};
        noSaleEvals.forEach(e => {
            const c = e.consultantName || 'Desconhecido';
            consultantVolume[c] = (consultantVolume[c] || 0) + 1;
        });
        const topConsultants = Object.entries(consultantVolume)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(c => c[0]);

        // Build Matrix
        const matrix: any[] = topConsultants.map(consultant => {
            const row: any = { consultant };
            top5Reasons.forEach(reason => {
                const count = noSaleEvals.filter(e => 
                    (e.consultantName || 'Desconhecido') === consultant && 
                    e.noSaleReason === reason
                ).length;
                row[reason] = count;
            });
            return row;
        });

        return { matrix, columns: top5Reasons };
    }, [noSaleEvals, reasonCounts]);

    // 4. Channel Breakdown for Active Reason
    const channelData = useMemo(() => {
        const data: Record<string, number> = {};
        noSaleEvals
            .filter(e => e.noSaleReason === activeReason)
            .forEach(e => {
                data[e.channel] = (data[e.channel] || 0) + 1;
            });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [noSaleEvals, activeReason]);

    // --- Automated Insights Engine ---
    const insights = useMemo(() => {
        const msgs: { type: 'warning' | 'trend' | 'info', text: string }[] = [];

        // Trend Insight
        if (evolutionData.length >= 2) {
            const last = evolutionData[evolutionData.length - 1].count;
            const prev = evolutionData[evolutionData.length - 2].count;
            const diff = last - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            
            if (pct > 15) {
                msgs.push({ 
                    type: 'trend', 
                    text: `O motivo "${activeReason}" aumentou ${pct.toFixed(0)}% no último período.` 
                });
            } else if (pct < -15) {
                 msgs.push({ 
                    type: 'info', 
                    text: `O motivo "${activeReason}" teve uma queda de ${Math.abs(pct).toFixed(0)}% no último período. Bom trabalho!` 
                });
            }
        }

        // Concentration Insight (Consultant specific)
        reasonCounts.slice(0, 3).forEach(reason => {
            const totalForReason = reason.value;
            const consultantsForReason: Record<string, number> = {};
            noSaleEvals.filter(e => e.noSaleReason === reason.name).forEach(e => {
                const c = e.consultantName;
                consultantsForReason[c] = (consultantsForReason[c] || 0) + 1;
            });
            
            // Check if any consultant has > 35% of this reason
            Object.entries(consultantsForReason).forEach(([consultant, count]) => {
                if (count / totalForReason > 0.35 && totalForReason > 3) {
                    msgs.push({ 
                        type: 'warning', 
                        text: `Consultor ${consultant} gera ${(count/totalForReason*100).toFixed(0)}% das ocorrências de "${reason.name}".` 
                    });
                }
            });
        });

        // Correlation Insight (Simplified Heuristic)
        // Example: "Negotiation" score low + "Financial" reason high
        const financialReason = noSaleEvals.filter(e => e.noSaleReason === 'Financeiro' || e.noSaleReason === 'Preço');
        if (financialReason.length > 5) {
            // Calculate avg negotiation score for these specific evals
            let negScoreSum = 0;
            let count = 0;
            financialReason.forEach(e => {
                if (e.sectionScores && e.sectionScores['negociacao']) {
                    negScoreSum += (e.sectionScores['negociacao'] / 40) * 100; // Normalize based on weight
                    count++;
                }
            });
            
            const avgNeg = count > 0 ? negScoreSum / count : 0;
            if (avgNeg < 60) { 
                msgs.push({
                    type: 'warning',
                    text: `Perdas por "Financeiro" estão correlacionadas com baixa performance em Negociação (Média: ${avgNeg.toFixed(0)}%).`
                });
            }
        }

        return msgs;
    }, [evolutionData, activeReason, reasonCounts, noSaleEvals]);


    // --- Helper for Heatmap Colors ---
    const getIntensityColor = (value: number, max: number) => {
        if (value === 0) return 'bg-slate-50 text-slate-300';
        const intensity = value / (max || 1);
        if (intensity < 0.3) return 'bg-orange-100 text-orange-800';
        if (intensity < 0.6) return 'bg-orange-300 text-orange-900';
        return 'bg-orange-500 text-white font-bold shadow-sm';
    };
    
    // Calculate max value in heatmap for scaling
    const maxHeatmapVal = useMemo(() => {
        if (heatmapData.matrix.length === 0) return 1;
        return Math.max(...heatmapData.matrix.map(row => 
            Math.max(...heatmapData.columns.map(col => (row[col] as number) || 0))
        ));
    }, [heatmapData]);

    return (
        <div className="space-y-6 animate-in fade-in">
            
            {/* 1. Top Stats & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Card - Interactive List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-orange-500" />
                        Ranking de Motivos
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                        {reasonCounts.map((r, i) => (
                            <div 
                                key={r.name} 
                                className={`p-3 rounded-lg cursor-pointer transition-all border relative group ${activeReason === r.name ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                                onClick={() => setSelectedReason(r.name)}
                            >
                                <div className="flex justify-between items-center mb-1 relative z-10">
                                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-xs border border-slate-200 text-slate-500">{i + 1}</span>
                                        {r.name}
                                    </span>
                                    <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">
                                        {r.value}
                                    </span>
                                </div>
                                {/* Progress Bar Background */}
                                <div className="absolute bottom-0 left-0 h-1 bg-orange-200 rounded-bl-lg rounded-br-lg w-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div 
                                        className="h-full bg-orange-500 rounded-bl-lg rounded-br-lg" 
                                        style={{ width: `${r.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Automated Insights Panel */}
                <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg p-6 text-white flex flex-col relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <BrainCircuit size={24} className="text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Inteligência de Causa Raiz</h3>
                            <p className="text-xs text-slate-400">Análise automática de padrões, tendências e correlações</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 relative z-10 overflow-y-auto max-h-[250px] pr-2">
                        {insights.length > 0 ? insights.map((insight, idx) => (
                            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-4 transition-all hover:translate-x-1
                                ${insight.type === 'warning' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' : 
                                  insight.type === 'trend' ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' :
                                  'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'}
                            `}>
                                <div className={`mt-0.5 p-1.5 rounded-full 
                                    ${insight.type === 'warning' ? 'bg-red-500/20 text-red-400' : 
                                      insight.type === 'trend' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-blue-500/20 text-blue-400'}
                                `}>
                                    {insight.type === 'warning' ? <AlertTriangle size={16} /> : 
                                     insight.type === 'trend' ? <TrendingUp size={16} /> : 
                                     <Zap size={16} />}
                                </div>
                                <p className="text-sm font-medium leading-relaxed text-slate-100">{insight.text}</p>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic p-8 border-2 border-dashed border-white/10 rounded-lg">
                                <BrainCircuit size={48} className="opacity-20 mb-2" />
                                <p>Sem insights críticos detectados para o período selecionado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Deep Dive: Evolution & Channel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evolution Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600" />
                                Evolução Temporal
                            </h3>
                            <p className="text-sm text-slate-500">
                                Tendência para o motivo: <strong className="text-orange-600 px-2 py-0.5 bg-orange-50 rounded border border-orange-100">{activeReason}</strong>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                            <Filter size={14} /> Agrupado por Mês
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                    itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    name="Ocorrências" 
                                    stroke="#f97316" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorCount)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Channel Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Impacto por Canal</h3>
                        <p className="text-xs text-slate-500 mb-6">Onde ocorre: <strong>{activeReason}</strong></p>
                    </div>
                    
                    <div className="flex-1 relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {channelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Content */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-2xl font-bold text-slate-700">
                                    {channelData.reduce((a,b) => a + b.value, 0)}
                                </span>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Heatmap (Consultant x Reason) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Matriz de Causa Raiz (Consultor x Motivo)</h3>
                        <p className="text-sm text-slate-500">Identifique quem mais gera cada tipo de objeção.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                        <ArrowRight size={14} /> Mostrando Top 10 Consultores por volume
                    </div>
                </div>
                
                <div className="overflow-x-auto pb-2">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 font-bold text-slate-700 bg-slate-50 border-b-2 border-slate-200 min-w-[200px] sticky left-0 z-10">
                                    Consultor
                                </th>
                                {heatmapData.columns.map(col => (
                                    <th key={col} className="p-4 font-bold text-slate-700 bg-slate-50 border-b-2 border-slate-200 text-center min-w-[120px]">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.matrix.map((row, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 font-medium text-slate-700 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors">
                                        {row.consultant}
                                    </td>
                                    {heatmapData.columns.map(col => (
                                        <td key={col} className="p-2 text-center">
                                            <div 
                                                className={`w-full py-2.5 rounded-md text-xs ${getIntensityColor(row[col], maxHeatmapVal)} transition-all`}
                                                title={`${row.consultant}: ${row[col]} ocorrências de ${col}`}
                                            >
                                                {row[col] > 0 ? row[col] : '-'}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default RootCauseDashboard;
