import React, { useState, useMemo, useEffect } from 'react';
import { Consultant, Evaluation } from '../types';
import { MOCK_CONSULTANTS, CALL_CENTERS, FORM_SECTIONS } from '../constants';
import { 
    User, Plus, Edit2, Trash2, X, Search, Mail, Calendar, Shield, 
    AlertTriangle, TrendingUp, BrainCircuit, Trophy, Eye, ArrowLeft,
    CheckCircle, MapPin, ChevronDown, ChevronUp, XCircle, Minus
} from 'lucide-react';
import { 
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    Radar, Legend, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Line 
} from 'recharts';
import EvaluationDetailModal from './EvaluationDetailModal';

interface ConsultantManagerProps {
  evaluations: Evaluation[];
}

interface ConsultantStats {
    consEvals: Evaluation[];
    opAvg: number;
    avg30: number;
    avg60: number;
    avg90: number;
    rank: number;
    topReason: [string, number] | undefined;
    criticalLast15: number;
    alerts: string[];
    comparisonData: any[];
    evolutionData: any[];
    recurrenceData: RecurrenceItem[];
}

interface RecurrenceItem {
    questionId: string;
    questionText: string;
    sectionTitle: string;
    totalAttempts: number;
    failures: number;
    failureRate: number;
    recentTrend: ('Sim' | 'Não' | 'N/A' | undefined)[]; // Last 5
}

const ConsultantManager: React.FC<ConsultantManagerProps> = ({ evaluations }) => {
  const [consultants, setConsultants] = useState<Consultant[]>(MOCK_CONSULTANTS);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailEval, setDetailEval] = useState<Evaluation | null>(null);
  
  // State for accordion view
  const [expandedCenter, setExpandedCenter] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Consultant>({
      id: '',
      name: '',
      email: '',
      team: '',
      center: CALL_CENTERS[0],
      hireDate: '',
      status: 'Ativo'
  });

  // Sync consultants from evaluations automatically
  useEffect(() => {
      if (!evaluations || evaluations.length === 0) return;

      setConsultants(prev => {
          const existingNames = new Set(prev.map(c => c.name.trim().toLowerCase()));
          const newConsultants: Consultant[] = [];

          evaluations.forEach(ev => {
              const cName = ev.consultantName?.trim();
              // Skip invalid or unknown names
              if (cName && cName !== 'Consultor Desconhecido' && !existingNames.has(cName.toLowerCase())) {
                  existingNames.add(cName.toLowerCase());
                  
                  // Generate a mock email based on name
                  const nameParts = cName.split(' ');
                  const firstName = nameParts[0].toLowerCase();
                  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
                  const email = `${firstName}${lastName ? '.' + lastName : ''}@empresa.com`;

                  newConsultants.push({
                      id: Math.random().toString(36).substring(2, 10),
                      name: cName,
                      email: email,
                      team: ev.supervisorName || 'Sem Supervisor',
                      center: ev.center || 'Geral',
                      hireDate: new Date().toISOString().split('T')[0], // Default to current date
                      status: 'Ativo'
                  });
              }
          });

          if (newConsultants.length > 0) {
              // Merge and return new list
              return [...prev, ...newConsultants];
          }
          return prev;
      });
  }, [evaluations]);

  const filteredConsultants = consultants.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by Center
  const consultantsByCenter = useMemo(() => {
    const groups: Record<string, Consultant[]> = {};
    filteredConsultants.forEach(c => {
        const centerName = c.center || 'Outros';
        if (!groups[centerName]) {
            groups[centerName] = [];
        }
        groups[centerName].push(c);
    });
    // Sort groups alphabetically
    return Object.keys(groups).sort().reduce(
        (obj, key) => { 
            obj[key] = groups[key]; 
            return obj;
        }, 
        {} as Record<string, Consultant[]>
    );
  }, [filteredConsultants]);

  // --- CRUD Handlers ---
  const handleAddNew = () => {
      setFormData({
          id: '',
          name: '',
          email: '',
          team: '',
          center: CALL_CENTERS[0],
          hireDate: new Date().toISOString().split('T')[0],
          status: 'Ativo'
      });
      setViewMode('form');
  };

  const handleEdit = (c: Consultant) => {
      setFormData(c);
      setViewMode('form');
  };

  const handleDelete = (id: string) => {
      if(confirm('Tem certeza que deseja remover este consultor?')) {
          setConsultants(prev => prev.filter(c => c.id !== id));
          if(selectedConsultant?.id === id) setViewMode('list');
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.id) {
          // Edit
          setConsultants(prev => prev.map(c => c.id === formData.id ? formData : c));
      } else {
          // Add
          setConsultants(prev => [...prev, { ...formData, id: Date.now().toString() }]);
      }
      setViewMode('list');
  };

  const toggleCenter = (centerName: string) => {
      if (expandedCenter === centerName) {
          setExpandedCenter(null);
      } else {
          setExpandedCenter(centerName);
      }
  };

  // --- Detailed Stats Logic (The "Digital Folder") ---
  const getConsultantStats = (consultant: Consultant): ConsultantStats => {
      // Sort by date descending for recent calcs
      const consEvals = evaluations
        .filter(e => e.consultantName === consultant.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const opAvg = evaluations.length > 0 
        ? evaluations.reduce((acc, curr) => acc + curr.finalScore, 0) / evaluations.length 
        : 0;

      const now = new Date();
      const getAvgByDays = (days: number) => {
        const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        const recent = consEvals.filter(e => new Date(e.date) >= cutoff);
        return recent.length > 0 
            ? recent.reduce((acc, curr) => acc + curr.finalScore, 0) / recent.length 
            : 0;
      };

      const avg30 = getAvgByDays(30);
      const avg60 = getAvgByDays(60);
      const avg90 = getAvgByDays(90);

      // Ranking
      const allConsultantAvgs = Array.from(new Set(evaluations.map(e => e.consultantName))).map(cName => ({
          name: cName,
          avg: evaluations.filter(e => e.consultantName === cName).reduce((a, b) => a + b.finalScore, 0) / evaluations.filter(e => e.consultantName === cName).length
      })).sort((a, b) => b.avg - a.avg);
      const rank = allConsultantAvgs.findIndex(c => c.name === consultant.name) + 1;

      // Root Cause
      const reasons: Record<string, number> = {};
      consEvals.filter(e => !e.saleEffective && e.noSaleReason).forEach(e => {
          reasons[e.noSaleReason!] = (reasons[e.noSaleReason!] || 0) + 1;
      });
      const topReason = Object.entries(reasons).sort((a,b) => b[1] - a[1])[0] as [string, number] | undefined;

      // Critical Failures (Last 15 Days)
      const criticalLast15 = consEvals.filter(e => 
          e.hasCriticalFailure && 
          new Date(e.date) >= new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000))
      ).length;

      // Section Scores
      const calculateSectionAverages = (evals: Evaluation[]) => {
        const totals: Record<string, {sum: number, count: number}> = {};
        FORM_SECTIONS.forEach(s => totals[s.id] = {sum: 0, count: 0});
        evals.forEach(ev => {
            if(ev.hasCriticalFailure) return;
            FORM_SECTIONS.forEach(s => {
                if(ev.sectionScores && ev.sectionScores[s.id] !== undefined){
                    totals[s.id].sum += ev.sectionScores[s.id];
                    totals[s.id].count++;
                }
            });
        });
        return FORM_SECTIONS.map(s => ({
            id: s.id,
            title: s.title,
            avg: totals[s.id].count > 0 ? (totals[s.id].sum / totals[s.id].count) : 0,
            max: s.weight
        }));
      };
      
      const consSectionAvgs = calculateSectionAverages(consEvals);
      const opSectionAvgs = calculateSectionAverages(evaluations);

      // Comparison Data for Radar
      const comparisonData = FORM_SECTIONS.map(s => {
        const cVal = consSectionAvgs.find(cs => cs.id === s.id);
        const oVal = opSectionAvgs.find(os => os.id === s.id);
        return {
            subject: s.title,
            Consultor: cVal ? (cVal.avg / s.weight) * 100 : 0,
            Operacao: oVal ? (oVal.avg / s.weight) * 100 : 0,
            fullMark: 100
        };
      });

      // Evolution Data
      const evolutionData = [...consEvals]
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10) // Last 10 evals for cleaner chart
        .map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            score: e.finalScore,
            avg: opAvg
        }));

      // --- Recurrence Analysis (Question Level) ---
      const recurrenceData: RecurrenceItem[] = [];
      
      FORM_SECTIONS.forEach(section => {
          section.questions.forEach(q => {
              let totalAttempts = 0;
              let failures = 0;
              const recentTrend: ('Sim' | 'Não' | 'N/A' | undefined)[] = [];

              // Iterate recent evaluations (consEvals is already sorted DESC)
              consEvals.forEach((ev, idx) => {
                  const ans = ev.answers[q.id];
                  // Only consider if answer exists and is not N/A (unless you want to track N/A)
                  if (ans && ans !== 'N/A') {
                      totalAttempts++;
                      if (ans === 'Não') {
                          failures++;
                      }
                      // Keep track of last 5 *valid* answers
                      if (recentTrend.length < 5) {
                          recentTrend.push(ans);
                      }
                  }
              });

              // Push to data if there's at least one attempt
              if (totalAttempts > 0) {
                  recurrenceData.push({
                      questionId: q.id,
                      questionText: q.text,
                      sectionTitle: section.title,
                      totalAttempts,
                      failures,
                      failureRate: (failures / totalAttempts) * 100,
                      recentTrend: recentTrend.reverse() // Show oldest to newest
                  });
              }
          });
      });

      // Sort by Failure Rate DESC, then by Total Attempts
      recurrenceData.sort((a, b) => {
          if (b.failureRate !== a.failureRate) return b.failureRate - a.failureRate;
          return b.totalAttempts - a.totalAttempts;
      });

      // Alerts
      const alerts: string[] = [];
      if (criticalLast15 >= 3) alerts.push("🚨 3 Falhas Graves nos últimos 15 dias - Revisão Necessária!");
      consSectionAvgs.forEach(s => {
          const pct = (s.avg / s.max) * 100;
          const opPct = ((opSectionAvgs.find(o => o.id === s.id)?.avg || 0) / s.max) * 100;
          if(pct < opPct - 10) alerts.push(`⚠️ ${s.title}: Queda acentuada em relação à média da operação.`);
      });
      if (avg30 < avg60 - 5) alerts.push("📉 Tendência de queda: Média 30d inferior à 60d.");

      return { consEvals, opAvg, avg30, avg60, avg90, rank, topReason, criticalLast15, alerts, comparisonData, evolutionData, recurrenceData };
  };

  // --- Render Methods ---

  const renderList = () => (
      <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
              <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar consultor por nome ou equipe..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-primary"
                  />
              </div>
              <button onClick={handleAddNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors">
                  <Plus size={16} /> Novo Consultor
              </button>
          </div>

          {/* Grouped List - Accordion Style */}
          <div className="space-y-4">
              {Object.entries(consultantsByCenter).map(([centerName, centerConsultants]: [string, Consultant[]]) => {
                  const isExpanded = expandedCenter === centerName;
                  
                  return (
                    <div key={centerName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                        <button 
                            onClick={() => toggleCenter(centerName)}
                            className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : 'bg-white hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className={`text-lg font-bold ${isExpanded ? 'text-blue-800' : 'text-slate-800'}`}>
                                        {centerName}
                                    </h3>
                                    <p className="text-xs text-slate-500">Central de Atendimento</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isExpanded ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {centerConsultants.length} consultores
                                </span>
                                {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                            </div>
                        </button>
                        
                        {isExpanded && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="px-6 py-3">Consultor</th>
                                                <th className="px-6 py-3">Equipe / Supervisor</th>
                                                <th className="px-6 py-3">Data Admissão</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {centerConsultants.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50 group transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm border border-slate-200">
                                                                {c.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-700">{c.name}</p>
                                                                <p className="text-xs text-slate-400">{c.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            <Shield size={14} className="text-slate-400" />
                                                            {c.team}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                                        {new Date(c.hireDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                            c.status === 'Ativo' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                                            c.status === 'Férias' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 
                                                            'bg-red-50 text-red-700 border border-red-100'
                                                        }`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => { setSelectedConsultant(c); setViewMode('detail'); }}
                                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                                title="Abrir Pasta Digital"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEdit(c)}
                                                                className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(c.id)}
                                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              })}
          </div>
      </div>
  );

  const renderForm = () => (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Consultor' : 'Novo Consultor'}</h2>
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
              </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                  <input 
                      required
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                      <input 
                          type="email" 
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                      <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Equipe / Supervisor *</label>
                      <input 
                          required
                          type="text" 
                          value={formData.team} 
                          onChange={e => setFormData({...formData, team: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Central *</label>
                      <select
                          value={formData.center} 
                          onChange={e => setFormData({...formData, center: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      >
                          {CALL_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Data de Admissão</label>
                      <input 
                          type="date" 
                          value={formData.hireDate} 
                          onChange={e => setFormData({...formData, hireDate: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                          value={formData.status} 
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                      >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                          <option value="Férias">Férias</option>
                      </select>
                  </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium">Salvar</button>
              </div>
          </form>
      </div>
  );

  const renderDetails = () => {
      if (!selectedConsultant) return null;
      const stats = getConsultantStats(selectedConsultant);

      return (
        <div className="space-y-6 animate-in fade-in">
            {detailEval && (
                <EvaluationDetailModal 
                    evaluation={detailEval} 
                    onClose={() => setDetailEval(null)} 
                />
            )}

            {/* Top Bar: Profile & Key Metrics */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Pasta Digital: {selectedConsultant.name}</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-400 border-4 border-white shadow">
                            {selectedConsultant.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{selectedConsultant.name}</h2>
                            <div className="flex flex-col text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Mail size={12}/> {selectedConsultant.email}</span>
                                <span className="flex items-center gap-1"><Shield size={12}/> Equipe: {selectedConsultant.team}</span>
                                <span className="flex items-center gap-1"><Calendar size={12}/> Desde: {new Date(selectedConsultant.hireDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-6">
                         <div className="text-center">
                             <p className="text-xs text-slate-400 uppercase font-bold">Ranking</p>
                             <div className="flex items-center gap-1 justify-center text-primary">
                                 <Trophy size={20} />
                                 <span className="text-2xl font-bold">#{stats.rank}</span>
                             </div>
                         </div>
                         <div className="w-px bg-slate-200 h-10"></div>
                         <div className="text-center">
                             <p className="text-xs text-slate-400 uppercase font-bold">Média 30d</p>
                             <span className={`text-2xl font-bold ${stats.avg30 >= 80 ? 'text-green-600' : stats.avg30 >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                 {stats.avg30.toFixed(1)}%
                             </span>
                         </div>
                         <div className="w-px bg-slate-200 h-10"></div>
                         <div className="text-center">
                             <p className="text-xs text-slate-400 uppercase font-bold">Média 90d</p>
                             <span className="text-2xl font-bold text-slate-600">{stats.avg90.toFixed(1)}%</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Alerts & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-orange-50 border border-orange-100 p-5 rounded-xl">
                    <h3 className="font-bold text-orange-900 flex items-center gap-2 mb-3">
                        <AlertTriangle size={18} /> Alertas & Insights
                    </h3>
                    <div className="space-y-2">
                        {stats.alerts.length > 0 ? stats.alerts.map((a, i) => (
                            <div key={i} className="bg-white/60 p-2 rounded text-sm text-orange-800 flex items-center gap-2 border border-orange-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> {a}
                            </div>
                        )) : (
                            <p className="text-sm text-orange-700 opacity-70 flex items-center gap-2">
                                <CheckCircle size={16} /> Nenhum alerta crítico no momento. Performance estável.
                            </p>
                        )}
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                        <BrainCircuit size={18} /> Causa Raiz (Top 1)
                    </h3>
                    {stats.topReason ? (
                        <div className="text-center py-6">
                            <p className="text-xl font-bold text-slate-800 mb-1">{stats.topReason[0]}</p>
                            <p className="text-sm text-slate-500">{stats.topReason[1]} ocorrências</p>
                            <p className="text-xs text-slate-400 mt-2">Motivo mais frequente de não venda</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">Sem dados suficientes</p>
                    )}
                </div>
            </div>

            {/* Recurrence Analysis - MICRO-SKILLS (New Section) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Minus size={18} className="text-red-500" />
                    Análise de Reincidência (Micro-skills)
                    <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded">Top 5 Ofensores</span>
                </h3>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-xs">
                            <tr>
                                <th className="p-3 rounded-l-lg">Item do Checklist (Pergunta)</th>
                                <th className="p-3">Bloco</th>
                                <th className="p-3 text-center">Taxa de Erro</th>
                                <th className="p-3 text-center">Vol. Erros</th>
                                <th className="p-3 text-center rounded-r-lg">Tendência (Últimas 5)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recurrenceData.slice(0, 5).map((item, idx) => (
                                <tr key={idx} className="border-b last:border-0 border-slate-100 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800 max-w-xs truncate" title={item.questionText}>
                                        {item.questionText}
                                    </td>
                                    <td className="p-3 text-slate-500 text-xs">{item.sectionTitle}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full font-bold text-xs
                                            ${item.failureRate > 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                                        `}>
                                            {item.failureRate.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-700">
                                        {item.failures}/{item.totalAttempts}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {item.recentTrend.map((ans, i) => (
                                                <div 
                                                    key={i}
                                                    className={`w-2.5 h-2.5 rounded-full border border-white shadow-sm
                                                        ${ans === 'Sim' ? 'bg-green-400' : 
                                                          ans === 'Não' ? 'bg-red-500' : 
                                                          'bg-slate-300'}
                                                    `}
                                                    title={ans || 'N/A'}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {stats.recurrenceData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                        Dados insuficientes para análise de reincidência.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visuals (Radar & Line) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Radar de Competências</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.comparisonData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 11}} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar name={selectedConsultant.name} dataKey="Consultor" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                                <Radar name="Média Operação" dataKey="Operacao" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                                <Legend />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Evolução da Qualidade</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{fontSize: 11}} />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip />
                                <ReferenceLine y={85} label="Meta" stroke="green" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="score" name="Nota" stroke="#2563eb" strokeWidth={2} dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Histórico de Monitorias</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3 font-medium text-slate-600">Data</th>
                                <th className="p-3 font-medium text-slate-600">Canal</th>
                                <th className="p-3 font-medium text-slate-600">Nota</th>
                                <th className="p-3 font-medium text-slate-600">Criticidade</th>
                                <th className="p-3 font-medium text-slate-600 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.consEvals.map(ev => (
                                <tr 
                                    key={ev.id} 
                                    onClick={() => setDetailEval(ev)}
                                    className="border-b hover:bg-slate-50 cursor-pointer group"
                                >
                                    <td className="p-3">{new Date(ev.date).toLocaleDateString()}</td>
                                    <td className="p-3 text-slate-500">{ev.channel}</td>
                                    <td className="p-3 font-bold">{ev.finalScore.toFixed(1)}%</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                                            ${ev.criticality === 'CRÍTICO' ? 'bg-red-100 text-red-700' : 
                                              ev.criticality === 'REGULAR' ? 'bg-yellow-100 text-yellow-700' : 
                                              'bg-green-100 text-green-700'}`}>
                                            {ev.criticality}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Eye size={16} className="text-slate-300 group-hover:text-primary inline-block" />
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

  return (
    <div className="h-full">
        {viewMode === 'list' && renderList()}
        {viewMode === 'form' && renderForm()}
        {viewMode === 'detail' && renderDetails()}
    </div>
  );
};

export default ConsultantManager;