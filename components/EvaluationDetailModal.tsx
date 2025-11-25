
import React from 'react';
import { Evaluation } from '../types';
import { FORM_SECTIONS } from '../constants';
import { X, AlertTriangle, Calendar, User, Shield, CheckCircle, XCircle, MinusCircle, MessageSquare, FileText } from 'lucide-react';

interface EvaluationDetailModalProps {
  evaluation: Evaluation;
  onClose: () => void;
}

const EvaluationDetailModal: React.FC<EvaluationDetailModalProps> = ({ evaluation, onClose }) => {
  
  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Detalhes da Monitoria
              <span className="text-sm font-normal text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                ID: {evaluation.id.slice(-6)}
              </span>
            </h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(evaluation.date).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><User size={14}/> Consultor: <strong>{evaluation.consultantName}</strong></span>
              <span className="flex items-center gap-1"><Shield size={14}/> Monitor: {evaluation.monitorName}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Top Score & Critical Failure */}
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            {/* Score Card */}
            <div className={`flex-1 p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2
              ${evaluation.hasCriticalFailure ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}
            `}>
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Nota Final</span>
              <span className={`text-6xl font-black ${evaluation.hasCriticalFailure ? 'text-red-600' : 'text-primary'}`}>
                {evaluation.finalScore.toFixed(1)}%
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                ${evaluation.criticality === 'ÓTIMO' ? 'bg-green-200 text-green-800' : 
                  evaluation.criticality === 'BOM' ? 'bg-blue-200 text-blue-800' :
                  evaluation.criticality === 'REGULAR' ? 'bg-yellow-200 text-yellow-800' : 
                  'bg-red-200 text-red-800'}
              `}>
                {evaluation.criticality}
              </span>
            </div>

            {/* Critical Failure Alert */}
            {evaluation.hasCriticalFailure && (
              <div className="flex-1 bg-red-100 border-2 border-red-200 rounded-xl p-6 flex flex-col justify-center items-start gap-3">
                 <div className="flex items-center gap-2 text-red-800 font-bold text-lg">
                    <AlertTriangle className="animate-pulse" />
                    FALHA GRAVE DETECTADA
                 </div>
                 <div className="text-red-700">
                    <span className="font-semibold">Motivo:</span> {evaluation.criticalFailureReason}
                 </div>
                 <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    A nota foi automaticamente zerada conforme regra de compliance.
                 </div>
              </div>
            )}
            
            {/* Outcome Info if no critical failure (or besides it) */}
            {!evaluation.hasCriticalFailure && (
                 <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-center gap-2">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-slate-500 text-sm">Venda Efetivada?</span>
                        <span className={`font-bold ${evaluation.saleEffective ? 'text-green-600' : 'text-orange-600'}`}>
                            {evaluation.saleEffective ? 'SIM' : 'NÃO'}
                        </span>
                    </div>
                    {!evaluation.saleEffective && (
                        <div>
                            <span className="text-slate-500 text-sm block mb-1">Motivo da Não Venda</span>
                            <span className="font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-100 inline-block">
                                {evaluation.noSaleReason}
                            </span>
                        </div>
                    )}
                 </div>
            )}
          </div>

          {/* Block Scores Semaphore */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Performance por Bloco</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FORM_SECTIONS.map(section => {
                    const score = evaluation.sectionScores[section.id] || 0;
                    const colorClass = getScoreColor(score, section.weight);
                    const textClass = getScoreTextColor(score, section.weight);
                    const percentage = (score / section.weight) * 100;

                    return (
                        <div key={section.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-slate-600">{section.title}</span>
                                <span className={`text-xl font-bold ${textClass}`}>
                                    {score.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ {section.weight}</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${colorClass}`} 
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="text-right mt-1 text-[10px] text-slate-400 font-medium">
                                {percentage.toFixed(0)}% de aproveitamento
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* Qualitative Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3">
                    <CheckCircle size={18} /> Pontos Positivos
                </h3>
                <p className="text-sm text-green-900 whitespace-pre-line leading-relaxed">
                    {evaluation.pros || "Não informado."}
                </p>
            </div>
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} /> Pontos de Melhoria
                </h3>
                <p className="text-sm text-orange-900 whitespace-pre-line leading-relaxed">
                    {evaluation.cons || "Não informado."}
                </p>
            </div>
          </div>

          {/* Description / Notes */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <MessageSquare size={18} /> Resumo do Atendimento
            </h3>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {evaluation.notes}
            </p>
          </div>

          {/* Full Checklist (Audit) */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={20} /> Checklist Completo
            </h3>
            <div className="space-y-6">
                {FORM_SECTIONS.map(section => (
                    <div key={section.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-semibold text-sm text-slate-700">
                            {section.title}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {section.questions.map(q => {
                                const answer = evaluation.answers[q.id];
                                return (
                                    <div key={q.id} className="p-3 flex justify-between items-center gap-4 hover:bg-slate-50">
                                        <span className="text-sm text-slate-600">{q.text}</span>
                                        <div className="flex-shrink-0">
                                            {answer === 'Sim' && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                                                    <CheckCircle size={12} /> SIM
                                                </span>
                                            )}
                                            {answer === 'Não' && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                    <XCircle size={12} /> NÃO
                                                </span>
                                            )}
                                            {answer === 'N/A' && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                    <MinusCircle size={12} /> N/A
                                                </span>
                                            )}
                                            {!answer && <span className="text-xs text-slate-400">-</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors"
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetailModal;
