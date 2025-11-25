
import React, { useState } from 'react';
import { Evaluation } from '../types';
import { FORM_SECTIONS } from '../constants';
import { CheckCircle, ExternalLink, FileText, MessageSquare, Calendar, Clock, Download, AlertTriangle, XCircle } from 'lucide-react';

interface FeedbackAreaProps {
  evaluations: Evaluation[];
  consultantName: string;
  onAcknowledge: (id: string) => void;
}

const FeedbackArea: React.FC<FeedbackAreaProps> = ({ evaluations, consultantName, onAcknowledge }) => {
  const myEvaluations = evaluations.filter(e => e.consultantName === consultantName);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);

  const getScoreColor = (score: number, max: number) => {
      const percentage = (score / max) * 100;
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Minhas Monitorias</h2>
          <p className="text-xs text-slate-500">{myEvaluations.length} avaliações encontradas</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
           {myEvaluations.length === 0 ? (
               <p className="text-center text-slate-400 text-sm mt-10">Nenhuma monitoria encontrada.</p>
           ) : (
               myEvaluations.map(ev => (
                   <button
                        key={ev.id}
                        onClick={() => setSelectedEval(ev)}
                        className={`w-full text-left p-4 rounded-lg border transition-all relative overflow-hidden
                            ${selectedEval?.id === ev.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}
                        `}
                   >
                       {ev.hasCriticalFailure && (
                           <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-bl">FALHA GRAVE</div>
                       )}
                       <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-700">{new Date(ev.date).toLocaleDateString()}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                                ${ev.finalScore >= 90 ? 'bg-green-100 text-green-700' : ev.finalScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                            `}>
                                {ev.finalScore.toFixed(1)}%
                            </span>
                       </div>
                       <p className="text-xs text-slate-500 mb-2">{ev.channel} • {ev.cycle}</p>
                       <div className="flex items-center gap-2">
                            {ev.feedbackStatus === 'Ciente' ? (
                                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle size={10} /> Ciente
                                </span>
                            ) : (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Clock size={10} /> Pendente
                                </span>
                            )}
                       </div>
                   </button>
               ))
           )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
         {selectedEval ? (
             <div className="flex-1 overflow-y-auto p-8">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Detalhes da Monitoria</h1>
                        <div className="flex gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(selectedEval.date).toLocaleDateString()}</span>
                            <span>Monitor: {selectedEval.monitorName}</span>
                            <span>Ciclo: {selectedEval.cycle}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${selectedEval.hasCriticalFailure ? 'text-red-600' : 'text-primary'}`}>
                            {selectedEval.finalScore.toFixed(2)}%
                        </div>
                        <div className="text-sm text-slate-400 font-medium">{selectedEval.criticality}</div>
                    </div>
                </div>

                {/* Critical Failure Alert */}
                {selectedEval.hasCriticalFailure && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
                        <div>
                            <h3 className="font-bold text-red-800">FALHA GRAVE DETECTADA</h3>
                            <p className="text-red-700 text-sm mt-1">A nota foi zerada devido ao seguinte motivo:</p>
                            <p className="font-semibold text-red-900 mt-1">{selectedEval.criticalFailureReason}</p>
                        </div>
                    </div>
                )}

                {/* Block Scores (Semaphore) */}
                {!selectedEval.hasCriticalFailure && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {FORM_SECTIONS.map(section => {
                            const score = selectedEval.sectionScores[section.id] || 0;
                            const color = getScoreColor(score, section.weight);
                            return (
                                <div key={section.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-slate-600 uppercase">{section.title}</span>
                                        <span className="text-sm font-bold text-slate-800">{score.toFixed(1)} / {section.weight}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${color} transition-all duration-500`} 
                                            style={{ width: `${(score / section.weight) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Link to Call / Attachment */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-slate-400 border border-slate-200">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Arquivo do Contato</p>
                            <p className="text-xs text-slate-500">
                                {selectedEval.attachmentName ? selectedEval.attachmentName : 'Link externo para acesso'}
                            </p>
                        </div>
                    </div>
                    <a 
                        href={selectedEval.contactLink} 
                        target="_blank" 
                        rel="noreferrer"
                        download={selectedEval.attachmentName}
                        className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        {selectedEval.attachmentName ? (
                            <>
                                <Download size={14} /> Baixar Arquivo
                            </>
                        ) : (
                            <>
                                <ExternalLink size={14} /> Acessar Link
                            </>
                        )}
                    </a>
                </div>

                {/* Feedback Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-green-700 flex items-center gap-2">
                            <FileText size={18}/> Pontos Positivos
                        </h3>
                        <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-slate-700 whitespace-pre-line">
                            {selectedEval.pros || "Nenhum ponto destacado."}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-red-700 flex items-center gap-2">
                            <FileText size={18}/> Pontos de Melhoria
                        </h3>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-slate-700 whitespace-pre-line">
                            {selectedEval.cons || "Nenhum ponto destacado."}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <h3 className="font-semibold text-slate-700">Resumo do Atendimento</h3>
                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {selectedEval.notes}
                    </p>
                </div>

                {/* Action */}
                <div className="border-t border-slate-100 pt-6 flex justify-end">
                    {selectedEval.feedbackStatus === 'Ciente' ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                            <CheckCircle size={20} />
                            <span className="font-medium text-sm">Feedback validado em {new Date(selectedEval.acknowledgedAt!).toLocaleDateString()}</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onAcknowledge(selectedEval.id)}
                            className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all flex items-center gap-2"
                        >
                            <CheckCircle size={18} />
                            Dar Ciência e Validar Feedback
                        </button>
                    )}
                </div>
             </div>
         ) : (
             <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                 <FileText size={48} className="opacity-20" />
                 <p>Selecione uma monitoria ao lado para ver os detalhes.</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default FeedbackArea;
