
import React, { useState, useMemo } from 'react';
import { Evaluation } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Users, AlertOctagon, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';
import { FORM_SECTIONS, COLORS } from '../../constants';

interface GeneralDashboardProps {
    evaluations: Evaluation[];
}

const MONTH_MAP: Record<string, number> = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ evaluations }) => {
    const [timeView, setTimeView] = useState<'monthly' | 'weekly'>('monthly');

    // --- Helper Functions ---

    const getWeekNumber = (date: Date) => {
        const firstDay = new Date(date.getFullYear(), 0, 1);
        const pastDays = (date.getTime() - firstDay.getTime()) / 86400000;
        return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
    };

    // --- Aggregations ---

    // 1. Evolution Data (Month vs Week)
    const evolutionData = useMemo(() => {
        const grouped: Record<string, { sum: number; count: number; date: Date }> = {};

        evaluations.forEach(ev => {
            let key = '';
            let sortDate = new Date(0); 

            if (timeView === 'monthly') {
                if (ev.month && ev.year) {
                    const cleanMonth = ev.month.trim().toLowerCase();
                    const monthIndex = MONTH_MAP[cleanMonth];
                    
                    if (monthIndex !== undefined) {
                        key = `${cleanMonth.substring(0, 3)}/${ev.year}`;
                        sortDate = new Date(ev.year, monthIndex, 1);
                    } else {
                        const mNum = parseInt(cleanMonth);
                        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
                            key = `${mNum}/${ev.year}`;
                            sortDate = new Date(ev.year, mNum - 1, 1);
                        }
                    }
                }
            } else {
                // Weekly View
                if (ev.week && ev.year) {
                    key = `Sem ${ev.week}/${ev.year}`;
                    sortDate = new Date(ev.year, 0, (ev.week - 1) * 7 + 1);
                }
            }

            if (!key && ev.date) {
                const date = new Date(ev.date);
                if (!isNaN(date.getTime())) {
                    if (timeView === 'monthly') {
                        key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                        sortDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    } else {
                        const week = getWeekNumber(date);
                        const year = date.getFullYear();
                        key = `Sem ${week}/${year}`;
                        sortDate = new Date(year, 0, week * 7);
                    }
                }
            }

            if (key) {
                if (!grouped[key]) grouped[key] = { sum: 0, count: 0, date: sortDate };
                grouped[key].sum += (ev.finalScore || 0);
                grouped[key].count += 1;
            }
        });

        return Object.entries(grouped)
            .map(([name, data]) => ({
                name,
                avg: data.count > 0 ? data.sum / data.count : 0,
                sortDate: data.date
            }))
            .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    }, [evaluations, timeView]);

    // 2. KPI Comparison (Current vs Previous)
    const kpiData = useMemo(() => {
        if (!evaluations || evaluations.length === 0) return { current: 0, previous: 0, growth: 0 };
        
        const totalScore = evaluations.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
        const currentAvg = totalScore / evaluations.length;
        
        // Safety check
        if (isNaN(currentAvg)) return { current: 0, previous: 0, growth: 0 };

        let previousAvg = currentAvg; 
        
        if (evolutionData.length >= 2) {
            previousAvg = evolutionData[evolutionData.length - 2].avg;
        }
        
        const growth = currentAvg - previousAvg;

        return { current: currentAvg, previous: previousAvg, growth };
    }, [evaluations, evolutionData]);

    // 3. Block Performance
    const blockData = useMemo(() => {
        const scores: Record<string, { sum: number; count: number; weight: number }> = {};
        
        evaluations.forEach(ev => {
            if (ev.hasCriticalFailure) return;

            FORM_SECTIONS.forEach(s => {
                if (ev.sectionScores && ev.sectionScores[s.id] !== undefined) {
                    if (!scores[s.title]) scores[s.title] = { sum: 0, count: 0, weight: s.weight };
                    const normalizedScore = (ev.sectionScores[s.id] / s.weight) * 100;
                    scores[s.title].sum += normalizedScore;
                    scores[s.title].count += 1;
                }
            });
        });

        return Object.entries(scores).map(([name, data]) => ({
            name,
            score: data.count > 0 ? data.sum / data.count : 0
        }));
    }, [evaluations]);

    // 4. No Sale Reasons
    const noSaleData = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalNoSale = 0;
        evaluations.forEach(ev => {
            if (!ev.saleEffective && ev.noSaleReason) {
                counts[ev.noSaleReason] = (counts[ev.noSaleReason] || 0) + 1;
                totalNoSale++;
            }
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, percent: totalNoSale > 0 ? (value/totalNoSale)*100 : 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); 
    }, [evaluations]);

    // 5. Heatmap Consultant x Block
    const heatmapData = useMemo(() => {
        const consultantMap: Record<string, Record<string, { sum: number; count: number }>> = {};
        
        evaluations.forEach(ev => {
            if (ev.hasCriticalFailure) return;
            const cName = ev.consultantName || 'Desconhecido';
            if (!consultantMap[cName]) consultantMap[cName] = {};

            FORM_SECTIONS.forEach(s => {
                if (!consultantMap[cName][s.id]) consultantMap[cName][s.id] = { sum: 0, count: 0 };
                if (ev.sectionScores && ev.sectionScores[s.id] !== undefined) {
                    consultantMap[cName][s.id].sum += (ev.sectionScores[s.id] / s.weight) * 100;
                    consultantMap[cName][s.id].count++;
                }
            });
        });

        return Object.entries(consultantMap).map(([name, blocks]) => {
            const row: any = { name };
            let totalAvg = 0;
            let totalBlocks = 0;
            
            FORM_SECTIONS.forEach(s => {
                const blockData = blocks[s.id];
                const avg = blockData && blockData.count > 0 ? blockData.sum / blockData.count : 0;
                row[s.id] = avg;
                totalAvg += avg;
                totalBlocks++;
            });
            row.overall = totalBlocks > 0 ? totalAvg / totalBlocks : 0;
            return row;
        }).sort((a, b) => b.overall - a.overall); 
    }, [evaluations]);

    // 6. N/A Analysis
    const naAnalysis = useMemo(() => {
        const naCounts: Record<string, number> = {};
        evaluations.forEach(ev => {
            if (ev.answers) {
                Object.values(ev.answers).forEach(ans => {
                    if (ans === 'N/A') {
                        naCounts[ev.consultantName] = (naCounts[ev.consultantName] || 0) + 1;
                    }
                });
            }
        });
        return Object.entries(naCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [evaluations]);

    // 7. Critical Failure Rate
    const criticalRate = evaluations.length > 0 
        ? (evaluations.filter(e => e.hasCriticalFailure).length / evaluations.length) * 100 
        : 0;

    const getHeatmapColor = (value: number) => {
        if (value >= 90) return 'bg-green-500 text-white';
        if (value >= 80) return 'bg-green-300 text-green-900';
        if (value >= 70) return 'bg-yellow-200 text-yellow-900';
        if (value >= 50) return 'bg-orange-200 text-orange-900';
        return 'bg-red-200 text-red-900';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* 1. KPI Cards (Visão Helicóptero) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Nota Média Geral</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-3xl font-bold text-slate-800">
                            {isNaN(kpiData.current) ? '0.0' : kpiData.current.toFixed(1)}%
                        </h3>
                        <div className={`flex items-center text-sm font-bold ${kpiData.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {kpiData.growth >= 0 ? <TrendingUp size={16} className="mr-1"/> : <TrendingDown size={16} className="mr-1"/>}
                            {Math.abs(kpiData.growth).toFixed(1)}%
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">vs. período anterior</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <AlertOctagon size={16} className="text-red-500"/> Taxa Falha Grave
                    </p>
                    <div className="mt-2">
                        <h3 className={`text-3xl font-bold ${criticalRate > 5 ? 'text-red-600' : 'text-slate-800'}`}>
                            {isNaN(criticalRate) ? '0.0' : criticalRate.toFixed(1)}%
                        </h3>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-red-500 h-full" style={{width: `${Math.min(criticalRate || 0, 100)}%`}}></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Users size={16} /> Total Monitorado
                    </p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{evaluations.length}</h3>
                    <p className="text-xs text-slate-400 mt-1">Avaliações no período</p>
                </div>

                 <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <MinusCircle size={16} className="text-orange-500"/> Índice de N/A
                    </p>
                    <div className="flex flex-col gap-1 mt-2">
                        {naAnalysis.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                                <span className="text-slate-600 truncate max-w-[120px]">{item[0]}</span>
                                <span className="font-bold text-orange-600">{item[1]}x</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Evolution Chart (Consolidated) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600" />
                            Evolução da Qualidade
                        </h3>
                        <p className="text-sm text-slate-500">Acompanhamento consolidado da nota média.</p>
                    </div>
                    
                    {/* Tab-like Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                         <button 
                            onClick={() => setTimeView('monthly')}
                            className={`px-6 py-2 text-sm font-bold rounded-md transition-all border ${
                                timeView === 'monthly' 
                                ? 'bg-white text-blue-600 border-slate-200 shadow-sm' 
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                        >
                            Mensal (Ano)
                        </button>
                        <button 
                            onClick={() => setTimeView('weekly')}
                            className={`px-6 py-2 text-sm font-bold rounded-md transition-all border ${
                                timeView === 'weekly' 
                                ? 'bg-white text-blue-600 border-slate-200 shadow-sm' 
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                        >
                            Semanal
                        </button>
                    </div>
                </div>
                
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                            <YAxis domain={[0, 100]} tick={{fontSize: 12}} stroke="#94a3b8" />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <Tooltip 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                itemStyle={{color: '#2563eb', fontWeight: 'bold'}}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="avg" 
                                name="Nota Média"
                                stroke="#2563eb" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorAvg)" 
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Block Performance & Root Causes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Block Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Performance por Bloco (Skill)</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={blockData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fontWeight: 600}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="score" name="Nota Média %" radius={[0, 4, 4, 0]}>
                                    {blockData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score < 60 ? '#ef4444' : entry.score < 80 ? '#eab308' : '#22c55e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Root Cause */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Causas Raiz (Top 5 Motivos de Não Venda)</h3>
                    <div className="flex flex-col md:flex-row items-center h-72">
                        <div className="h-full w-full md:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={noSaleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {noSaleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-3 overflow-y-auto max-h-60 pr-2">
                            {noSaleData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                        <span className="text-slate-600 font-medium truncate max-w-[140px]" title={item.name}>{item.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-slate-800">{item.value}</span>
                                        <span className="text-xs text-slate-400">{item.percent.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Heatmap (Consultant x Skill) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Heatmap de Competências (Consultor x Bloco)</h3>
                    <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-500 text-white rounded">Excellent (90+)</span>
                        <span className="px-2 py-1 bg-green-300 text-green-900 rounded">Good (80-89)</span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-900 rounded">Attention (50-79)</span>
                        <span className="px-2 py-1 bg-red-200 text-red-900 rounded">Critical (&lt;50)</span>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-3 font-semibold text-slate-600 bg-slate-50 border-b border-slate-200">Consultor</th>
                                {FORM_SECTIONS.map(s => (
                                    <th key={s.id} className="p-3 font-semibold text-slate-600 bg-slate-50 border-b border-slate-200 text-center">
                                        {s.title}
                                    </th>
                                ))}
                                <th className="p-3 font-semibold text-slate-600 bg-slate-50 border-b border-slate-200 text-center">Média</th>
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.map((row: any, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-medium text-slate-700">{row.name}</td>
                                    {FORM_SECTIONS.map(s => {
                                        const val = row[s.id] || 0;
                                        return (
                                            <td key={s.id} className="p-1 text-center">
                                                <div className={`w-full py-2 rounded text-xs font-bold ${getHeatmapColor(val)}`}>
                                                    {val.toFixed(0)}%
                                                </div>
                                            </td>
                                        )
                                    })}
                                    <td className="p-3 text-center font-bold text-blue-700">
                                        {row.overall.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GeneralDashboard;
