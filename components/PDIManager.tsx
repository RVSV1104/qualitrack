
import React, { useState, useMemo } from 'react';
import { PDI, PDIStatus, PDIPriority } from '../types';
import { Plus, Clock, CheckCircle, AlertCircle, ChevronDown, User, Link, Calendar, Paperclip, ArrowRight } from 'lucide-react';

interface PDIManagerProps {
  pdis: PDI[];
  onAddPDI: (pdi: PDI) => void;
  onUpdateStatus: (id: string, status: PDIStatus) => void;
  consultants: string[];
}

const PDIManager: React.FC<PDIManagerProps> = ({ pdis, onAddPDI, onUpdateStatus, consultants }) => {
  const [showForm, setShowForm] = useState(false);
  const [filterConsultant, setFilterConsultant] = useState('');
  
  // Form State
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [title, setTitle] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<PDIPriority>('Média');
  const [responsible, setResponsible] = useState<'Consultor' | 'Supervisor'>('Consultor');
  const [originId, setOriginId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPDI: PDI = {
        id: Date.now().toString(),
        consultantName: selectedConsultant,
        title,
        actionPlan,
        deadline,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
        priority,
        responsible,
        originEvaluationId: originId || undefined
    };
    onAddPDI(newPDI);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedConsultant('');
    setTitle('');
    setActionPlan('');
    setDeadline('');
    setPriority('Média');
    setResponsible('Consultor');
    setOriginId('');
  };

  const filteredPDIs = useMemo(() => {
      if (!filterConsultant) return pdis;
      return pdis.filter(p => p.consultantName === filterConsultant);
  }, [pdis, filterConsultant]);

  const getPriorityBadge = (p: PDIPriority) => {
      switch(p) {
          case 'Alta': return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded border border-red-200 font-bold">Alta Prioridade</span>;
          case 'Média': return <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded border border-yellow-200 font-bold">Média</span>;
          case 'Baixa': return <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded border border-green-200 font-bold">Baixa</span>;
      }
  };

  const renderColumn = (status: PDIStatus, label: string, borderColor: string, headerBg: string) => {
      const items = filteredPDIs.filter(p => p.status === status);
      
      return (
          <div className={`flex-1 min-w-[320px] bg-slate-50 rounded-xl flex flex-col h-full border ${borderColor}`}>
              <div className={`p-4 border-b rounded-t-xl flex justify-between items-center ${headerBg}`}>
                  <h3 className="font-bold text-slate-800">{label}</h3>
                  <span className="bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm border">
                      {items.length}
                  </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {items.map(pdi => {
                      const isOverdue = new Date(pdi.deadline) < new Date() && status !== 'Concluído';
                      
                      return (
                        <div key={pdi.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group relative">
                            {isOverdue && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-bl font-bold">ATRASADO</div>
                            )}
                            
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                        {pdi.consultantName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 truncate max-w-[140px]" title={pdi.consultantName}>
                                            {pdi.consultantName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <User size={10} /> {pdi.responsible}
                                        </p>
                                    </div>
                                </div>
                                {getPriorityBadge(pdi.priority)}
                            </div>
                            
                            <h4 className="font-bold text-sm text-slate-800 mb-1 leading-tight">{pdi.title}</h4>
                            <div className="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                                {pdi.actionPlan}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                                {pdi.originEvaluationId && (
                                    <span className="text-[10px] flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                        <Link size={10} /> Monitoria Origem
                                    </span>
                                )}
                                {pdi.attachments && pdi.attachments.length > 0 && (
                                    <span className="text-[10px] flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                        <Paperclip size={10} /> {pdi.attachments.length} Anexo(s)
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                                <div className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
                                    <Clock size={12}/> 
                                    Prazo: {new Date(pdi.deadline).toLocaleDateString()}
                                </div>
                                
                                {/* Movement Actions */}
                                <div className="flex gap-1">
                                    {status === 'Pendente' && (
                                        <button 
                                            onClick={() => onUpdateStatus(pdi.id, 'Em Andamento')} 
                                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Iniciar <ArrowRight size={10} />
                                        </button>
                                    )}
                                    {status === 'Em Andamento' && (
                                        <button 
                                            onClick={() => onUpdateStatus(pdi.id, 'Concluído')} 
                                            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[10px] rounded hover:bg-green-700 transition-colors"
                                        >
                                            Concluir <CheckCircle size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                      );
                  })}
                  {items.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm italic opacity-60">
                          <CheckCircle size={32} className="mb-2" />
                          Nenhum plano nesta etapa.
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200 gap-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="text-blue-600" />
                    Painel de Planos de Ação
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gestão visual de desenvolvimento e correções (Kanban).</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:min-w-[250px]">
                    <select 
                        value={filterConsultant}
                        onChange={e => setFilterConsultant(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-primary appearance-none bg-white"
                    >
                        <option value="">Todos os Consultores</option>
                        {consultants.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-all whitespace-nowrap"
                >
                    <Plus size={18} /> Novo PDI
                </button>
            </div>
        </div>

        {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-in slide-in-from-top-4 mb-2 relative z-10">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Cadastrar Novo Plano de Ação</h3>
                        <p className="text-xs text-slate-500">Defina as metas e prazos para o desenvolvimento do consultor.</p>
                    </div>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronDown size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Consultor *</label>
                        <select 
                            required
                            value={selectedConsultant}
                            onChange={e => setSelectedConsultant(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="">Selecione o consultor...</option>
                            {consultants.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Prioridade *</label>
                        <select 
                            value={priority}
                            onChange={e => setPriority(e.target.value as PDIPriority)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Responsável *</label>
                        <select 
                            value={responsible}
                            onChange={e => setResponsible(e.target.value as any)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="Consultor">Consultor</option>
                            <option value="Supervisor">Supervisor</option>
                        </select>
                    </div>
                    <div className="lg:col-span-4">
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Ponto Crítico / Objetivo *</label>
                        <input 
                            required
                            type="text" 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Melhorar técnica de sondagem em ligações de vendas"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <div className="lg:col-span-4">
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Ações Recomendadas *</label>
                        <textarea 
                            required
                            value={actionPlan}
                            onChange={e => setActionPlan(e.target.value)}
                            rows={3}
                            placeholder="Detalhe o passo a passo (ex: assistir treinamento X, realizar roleplay com supervisor...)"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Prazo para Conclusão *</label>
                        <input 
                            required
                            type="date" 
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <div className="lg:col-span-2">
                         <label className="block text-xs font-bold text-slate-600 mb-1.5">ID da Monitoria (Opcional)</label>
                         <input 
                            type="text" 
                            value={originId}
                            onChange={e => setOriginId(e.target.value)}
                            placeholder="Cole o ID se houver..."
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div className="lg:col-span-4 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="text-slate-600 px-6 py-2 text-sm font-medium hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-primary text-white px-8 py-2 text-sm rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all transform hover:scale-105">
                            Salvar Plano
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="flex-1 overflow-x-auto pb-2">
            <div className="flex gap-6 h-full min-w-[1000px]">
                {renderColumn('Pendente', 'A Fazer', 'border-orange-200', 'bg-orange-50')}
                {renderColumn('Em Andamento', 'Em Andamento', 'border-blue-200', 'bg-blue-50')}
                {renderColumn('Concluído', 'Concluído', 'border-green-200', 'bg-green-50')}
            </div>
        </div>
    </div>
  );
};

export default PDIManager;
