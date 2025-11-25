
import React, { useState, useMemo, useRef } from 'react';
import { Evaluation } from '../types';
import { 
    LayoutGrid, User, Shield, BrainCircuit, AlertOctagon, 
    Upload, Download, Filter, Calendar, X, Search, Printer,
    MinusCircle, TrendingUp, TrendingDown, Users
} from 'lucide-react';
import { CALL_CENTERS, EVALUATION_CYCLES } from '../constants';
import { exportEvaluationsToCSV, parseCSVToEvaluations } from '../services/dataService';
import EvaluationDetailModal from './EvaluationDetailModal';
import GeneralDashboard from './dashboards/GeneralDashboard';
import RootCauseDashboard from './dashboards/RootCauseDashboard';
import ConsultantManager from './ConsultantManager'; 

interface DashboardProps {
  evaluations: Evaluation[];
  onImportData?: (data: Evaluation[]) => void;
}

// Map for Portuguese months to numbers (1-12)
const MONTH_MAP_PT: Record<string, number> = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
};

const Dashboard: React.FC<DashboardProps> = ({ evaluations, onImportData }) => {
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  
  const [activeTab, setActiveTab] = useState<'general' | 'consultant' | 'supervisor' | 'root-cause' | 'critical'>('general');
  const [detailEval, setDetailEval] = useState<Evaluation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique values for dropdowns
  const consultants = useMemo(() => 
    Array.from(new Set(evaluations.map(e => e.consultantName || 'Desconhecido'))).sort(), 
  [evaluations]);

  const supervisors = useMemo(() => 
    Array.from(new Set(evaluations.map(e => e.supervisorName).filter(Boolean) as string[])).sort(),
  [evaluations]);

  // Helper: Robust Date Parsing to handle various CSV formats
  const parseDateHelper = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      
      const cleanStr = dateStr.trim();

      // Try ISO Format (YYYY-MM-DD)
      if (cleanStr.includes('-') && cleanStr.length >= 10) {
          const d = new Date(cleanStr);
          if (!isNaN(d.getTime())) return d;
      }

      // Try BR Format (DD/MM/YYYY)
      if (cleanStr.includes('/')) {
          const datePart = cleanStr.split(' ')[0]; // Ignore time if present
          const parts = datePart.split('/');
          
          if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // JS Month 0-11
              const year = parseInt(parts[2], 10);
              
              if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                  const d = new Date(year, month, day);
                  if (!isNaN(d.getTime())) return d;
              }
          }
      }

      return null;
  };

  // Filter Logic
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const cName = e.consultantName || 'Desconhecido';
      const matchesConsultant = selectedConsultant ? cName === selectedConsultant : true;
      const matchesCenter = selectedCenter ? e.center === selectedCenter : true;
      const matchesCycle = selectedCycle ? e.cycle === selectedCycle : true;
      
      let matchesDate = true;
      const evalDateObj = parseDateHelper(e.date);

      // Month Filter (YYYY-MM) from Input
      if (selectedMonth) {
          const [selYearStr, selMonthStr] = selectedMonth.split('-');
          const selYear = parseInt(selYearStr);
          const selMonth = parseInt(selMonthStr);

          let monthMatch = false;

          // 1. Check explicit columns from CSV (if available)
          if (e.month && e.year) {
             const monthStr = String(e.month).toLowerCase().trim();
             const monthNum = MONTH_MAP_PT[monthStr] || parseInt(monthStr);
             
             // Loose comparison for year in case CSV has 2-digit year or string
             const yearNum = parseInt(String(e.year));
             
             if (monthNum === selMonth && yearNum === selYear) {
                 monthMatch = true;
             }
          }
          
          // 2. Check parsed date object if explicit columns didn't match
          if (!monthMatch && evalDateObj) {
              if (evalDateObj.getFullYear() === selYear && (evalDateObj.getMonth() + 1) === selMonth) {
                  monthMatch = true;
              }
          }
          matchesDate = monthMatch;

      } else if (startDate || endDate) {
          // Date Range Filter
          if (evalDateObj) {
               // Set hours to compare dates correctly
               const filterStart = startDate ? new Date(startDate) : null;
               if(filterStart) filterStart.setHours(0,0,0,0);
               
               const filterEnd = endDate ? new Date(endDate) : null;
               if(filterEnd) filterEnd.setHours(23,59,59,999);

               if (filterStart && evalDateObj < filterStart) matchesDate = false;
               if (filterEnd && evalDateObj > filterEnd) matchesDate = false;
          } else {
              // If we have a date filter but cannot parse the eval date, safe to exclude it
              matchesDate = false;
          }
      }

      return matchesConsultant && matchesCenter && matchesCycle && matchesDate;
    });
  }, [evaluations, startDate, endDate, selectedMonth, selectedConsultant, selectedCenter, selectedCycle]);

  const clearFilters = () => {
      setStartDate('');
      setEndDate('');
      setSelectedMonth('');
      setSelectedConsultant('');
      setSelectedCenter('');
      setSelectedCycle('');
  };

  // Supervisors View Logic
  const renderSupervisorView = () => {
    const supervisorStats = supervisors.map(sup => {
        const teamEvals = filteredEvaluations.filter(e => e.supervisorName === sup);
        const avg = teamEvals.length > 0 
          ? teamEvals.reduce((acc, curr) => acc + curr.finalScore, 0) / teamEvals.length
          : 0;
        return { name: sup || 'Sem Supervisor', count: teamEvals.length, avg };
    }).sort((a, b) => b.avg - a.avg);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Ranking de Supervisão</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b">
                            <th className="p-3 font-bold text-slate-700">Supervisor</th>
                            <th className="p-3 text-center font-bold text-slate-700">Monitorias</th>
                            <th className="p-3 text-center font-bold text-slate-700">Média Equipe</th>
                            <th className="p-3 text-center font-bold text-slate-700">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {supervisorStats.map((sup, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50 text-slate-600">
                                <td className="p-3 font-medium">{sup.name}</td>
                                <td className="p-3 text-center">{sup.count}</td>
                                <td className="p-3 text-center font-bold">{sup.avg.toFixed(1)}%</td>
                                <td className="p-3 text-center">
                                    {sup.avg >= 80 ? <span className="text-green-600 font-bold">Meta Batida</span> : <span className="text-red-500 font-bold">Abaixo</span>}
                                </td>
                            </tr>
                        ))}
                        {supervisorStats.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">Nenhum dado encontrado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const renderCriticalView = () => {
    const criticalEvals = filteredEvaluations.filter(e => e.hasCriticalFailure);
    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="p-6 bg-red-50 rounded-xl border border-red-100">
                     <div className="flex items-center gap-3 mb-2">
                         <AlertOctagon className="text-red-600" />
                         <h3 className="font-bold text-red-900">Total de Falhas</h3>
                     </div>
                     <p className="text-3xl font-bold text-red-700">{criticalEvals.length}</p>
                 </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-red-50 text-red-900">
                         <tr>
                             <th className="p-4 font-bold">Data</th>
                             <th className="p-4 font-bold">Consultor</th>
                             <th className="p-4 font-bold">Motivo da Falha</th>
                             <th className="p-4 font-bold">Monitor</th>
                             <th className="p-4 font-bold">Ação</th>
                         </tr>
                     </thead>
                     <tbody>
                         {criticalEvals.map(ev => (
                             <tr key={ev.id} onClick={() => setDetailEval(ev)} className="border-b hover:bg-red-50 cursor-pointer text-slate-700">
                                 <td className="p-4">{new Date(ev.date).toLocaleDateString()}</td>
                                 <td className="p-4 font-bold">{ev.consultantName}</td>
                                 <td className="p-4 text-red-600 font-medium">{ev.criticalFailureReason}</td>
                                 <td className="p-4 text-slate-500">{ev.monitorName}</td>
                                 <td className="p-4">
                                     <Search size={16} className="text-slate-400 hover:text-red-600" />
                                 </td>
                             </tr>
                         ))}
                         {criticalEvals.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    Nenhuma falha grave encontrada nos filtros atuais.
                                </td>
                            </tr>
                        )}
                     </tbody>
                 </table>
             </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 relative pb-20" id="dashboard-container">
        {detailEval && (
            <EvaluationDetailModal evaluation={detailEval} onClose={() => setDetailEval(null)} />
        )}

        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-4 no-print bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboards de Gestão</h2>
                <p className="text-slate-500 text-sm mt-1">Acompanhe a performance e qualidade da operação.</p>
            </div>
            <div className="flex gap-3">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={async (e) => {
                        if (e.target.files?.[0]) {
                            const data = await parseCSVToEvaluations(e.target.files[0]);
                            if (onImportData) onImportData(data);
                        }
                    }} 
                    accept=".csv" 
                    className="hidden" 
                />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-sm">
                    <Upload size={18} /> Importar Dados
                </button>
                <button onClick={() => exportEvaluationsToCSV(filteredEvaluations)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm">
                    <Download size={18} /> Exportar Relatório
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900 shadow-md transition-all">
                    <Printer size={18} /> Imprimir Tela
                </button>
            </div>
        </div>

        {/* Filters - Compact & Responsive - BLACK TEXT FIX */}
        {activeTab !== 'consultant' && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 no-print">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Filter size={18} className="text-blue-600" /> Filtros Avançados
                  </div>
                  <button onClick={clearFilters} className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1 bg-red-50 px-3 py-1 rounded-lg border border-red-100 transition-colors hover:bg-red-100">
                      <X size={12} /> Limpar Filtros
                  </button>
              </div>
              
              {/* Grid Layout Updated for Responsiveness */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                 {/* Month Picker */}
                 <div className="flex flex-col">
                    <label className="text-[10px] font-extrabold text-slate-600 mb-1 uppercase tracking-wide">Mês de Referência</label>
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={e => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate(''); }} 
                        className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    />
                 </div>

                 {/* Date Range */}
                 <div className="flex flex-col col-span-2 lg:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-600 mb-1 uppercase tracking-wide">Período (Início - Fim)</label>
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            disabled={!!selectedMonth}
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
                        />
                        <input 
                            type="date" 
                            disabled={!!selectedMonth}
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
                        />
                    </div>
                 </div>

                 <div className="flex flex-col">
                    <label className="text-[10px] font-extrabold text-slate-600 mb-1 uppercase tracking-wide">Central</label>
                    <select value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)} className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer">
                        <option value="">Todas</option>
                        {CALL_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>

                 <div className="flex flex-col">
                    <label className="text-[10px] font-extrabold text-slate-600 mb-1 uppercase tracking-wide">Ciclo</label>
                    <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer">
                        <option value="">Todos</option>
                        {EVALUATION_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>

                 <div className="flex flex-col">
                    <label className="text-[10px] font-extrabold text-slate-600 mb-1 uppercase tracking-wide">Consultor</label>
                    <select value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)} className="h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer">
                        <option value="">Todos</option>
                        {consultants.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>
            </div>
        )}

        {/* Navigation Tabs - High Contrast Fixed */}
        <div className="flex flex-wrap gap-3 no-print p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
            {[
                { id: 'general', label: 'Visão Geral', icon: LayoutGrid },
                { id: 'consultant', label: 'Consultores', icon: User },
                { id: 'supervisor', label: 'Supervisão', icon: Shield },
                { id: 'root-cause', label: 'Causa Raiz', icon: BrainCircuit },
                { id: 'critical', label: 'Falhas Graves', icon: AlertOctagon },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                        flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all
                        ${activeTab === tab.id 
                            ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'}
                    `}
                >
                    <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-400' : 'text-slate-400'} /> 
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Dashboard Content */}
        <div id="printable-area" className="min-h-[500px] animate-in slide-in-from-bottom-2 fade-in duration-300">
            {activeTab === 'general' && (
                <GeneralDashboard evaluations={filteredEvaluations} />
            )}
            {activeTab === 'consultant' && (
                <div className="bg-white rounded-xl border border-slate-200 min-h-[600px]">
                   <ConsultantManager evaluations={evaluations} />
                </div>
            )}
            {activeTab === 'supervisor' && renderSupervisorView()}
            {activeTab === 'root-cause' && (
                <RootCauseDashboard evaluations={filteredEvaluations} />
            )}
            {activeTab === 'critical' && renderCriticalView()}
        </div>
    </div>
  );
};

const style = document.createElement('style');
style.innerHTML = `
  @media print {
    @page { margin: 0.5cm; size: landscape; }
    body { background-color: white !important; color: black !important; visibility: hidden; }
    aside, nav, .no-print, .fixed { display: none !important; }
    #printable-area, #printable-area * { visibility: visible; }
    #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
    .bg-white, .bg-slate-50 { background: white !important; border: 1px solid #ddd !important; box-shadow: none !important; }
    h1, h2, h3, p, span, td, th, div { color: black !important; }
  }
`;
document.head.appendChild(style);

export default Dashboard;
