
import React, { useState, useMemo } from 'react';
import { FORM_SECTIONS, REASONS_NO_SALE, EVALUATION_CYCLES, CALL_CENTERS, BASES, SHIFTS, CHANNELS, CRITICAL_FAILURES } from '../constants';
import { AnswerValue, Evaluation, AuditLog } from '../types';
import { Save, Sparkles, Link as LinkIcon, Upload, FileAudio, FileText, X, AlertTriangle } from 'lucide-react';
import { generateFeedbackAnalysis } from '../services/geminiService';

interface EvaluationFormProps {
  onSubmit: (evaluation: Evaluation) => void;
  monitorName: string;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSubmit, monitorName }) => {
  const [consultantName, setConsultantName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [center, setCenter] = useState(CALL_CENTERS[0]);
  const [base, setBase] = useState(BASES[0]);
  const [shift, setShift] = useState(SHIFTS[0]);
  const [cycle, setCycle] = useState(EVALUATION_CYCLES[0]);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [contactDate, setContactDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Contact Evidence State
  const [evidenceType, setEvidenceType] = useState<'link' | 'file'>('link');
  const [contactLink, setContactLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [description, setDescription] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [saleEffective, setSaleEffective] = useState<boolean>(false);
  const [noSaleReason, setNoSaleReason] = useState('');
  
  // Critical Failure State
  const [hasCriticalFailure, setHasCriticalFailure] = useState(false);
  const [criticalFailureReason, setCriticalFailureReason] = useState('');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  // Derived state for date info
  const dateInfo = useMemo(() => {
    const d = new Date(contactDate);
    const month = d.toLocaleString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    const firstDay = new Date(d.getFullYear(), 0, 1);
    const pastDays = (d.getTime() - firstDay.getTime()) / 86400000;
    const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
    return { month, year, week };
  }, [contactDate]);

  // Smart Calculation Logic
  const calculatedScores = useMemo(() => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const scoresBySection: Record<string, number> = {};

    // If critical failure exists, everything is zero
    if (hasCriticalFailure) {
        FORM_SECTIONS.forEach(s => scoresBySection[s.id] = 0);
        return { total: 0, sections: scoresBySection };
    }

    FORM_SECTIONS.forEach(section => {
      const sectionQuestions = section.questions;
      let sectionPoints = 0;
      let validQuestionsCount = 0;

      sectionQuestions.forEach(q => {
        const ans = answers[q.id];
        if (ans && ans !== 'N/A') {
          validQuestionsCount++;
          if (ans === 'Sim') {
            sectionPoints++;
          }
        }
      });
      
      let sectionScoreRatio = 0;
      if (validQuestionsCount > 0) {
        sectionScoreRatio = sectionPoints / validQuestionsCount;
      } else {
         const hasAnyAnswer = sectionQuestions.some(q => answers[q.id]);
         if (hasAnyAnswer) {
             sectionScoreRatio = 1; 
         } else {
             sectionScoreRatio = 0; 
         }
      }

      const weightedScore = sectionScoreRatio * section.weight;
      scoresBySection[section.id] = weightedScore;
      
      totalWeightedScore += weightedScore;
      totalWeight += section.weight;
    });

    return { 
        total: totalWeightedScore, 
        sections: scoresBySection 
    };
  }, [answers, hasCriticalFailure]);

  const getCriticality = (score: number) => {
    if (hasCriticalFailure) return 'CRÍTICO';
    if (score >= 90) return 'ÓTIMO';
    if (score >= 80) return 'BOM';
    if (score >= 70) return 'REGULAR';
    return 'CRÍTICO';
  };

  const handleAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Arquivo muito grande. Por favor selecione um arquivo menor que 5MB.");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFileBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileBase64('');
    if (document.getElementById('file-upload')) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
    }
  };

  const handleAIAssist = async () => {
    if (!consultantName) {
      alert("Preencha o nome do consultor antes de pedir ajuda à IA.");
      return;
    }
    setIsGeneratingAI(true);
    
    const negativePoints: string[] = [];
    FORM_SECTIONS.forEach(s => {
        s.questions.forEach(q => {
            if (answers[q.id] === 'Não') {
                negativePoints.push(`${s.title}: ${q.text}`);
            }
        })
    });
    
    if(hasCriticalFailure) {
        negativePoints.push(`FALHA GRAVE: ${criticalFailureReason}`);
    }

    const feedback = await generateFeedbackAnalysis(consultantName, description, negativePoints, calculatedScores.total);
    setAiFeedback(feedback);
    setCons(prev => prev ? `${prev}\n\n--- Sugestão IA ---\n${feedback}` : feedback);
    setIsGeneratingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLink = evidenceType === 'link' ? contactLink : fileBase64;
    const attachmentName = evidenceType === 'file' && selectedFile ? selectedFile.name : undefined;

    if (!finalLink) {
        alert("Por favor, insira um link ou faça upload de um arquivo do contato.");
        return;
    }

    const auditLog: AuditLog = {
        action: 'created',
        by: monitorName,
        at: new Date().toISOString()
    };

    const evalData: Evaluation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: contactDate,
      month: dateInfo.month,
      week: dateInfo.week,
      year: dateInfo.year,
      consultantName,
      monitorName,
      supervisorName,
      center,
      base,
      shift,
      cycle,
      channel,
      contactLink: finalLink,
      attachmentName,
      finalScore: calculatedScores.total,
      sectionScores: calculatedScores.sections,
      hasCriticalFailure,
      criticalFailureReason: hasCriticalFailure ? criticalFailureReason : undefined,
      criticality: getCriticality(calculatedScores.total),
      answers,
      notes: description,
      pros,
      cons,
      saleEffective,
      noSaleReason: saleEffective ? undefined : noSaleReason,
      feedbackStatus: 'Pendente',
      status: 'Monitorado',
      aiFeedback,
      auditLogs: [auditLog]
    };
    onSubmit(evalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b pb-2">Dados da Monitoria</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data do Contato *</label>
                <input 
                    type="date" 
                    required
                    value={contactDate}
                    onChange={e => setContactDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
             </div>
             <div className="flex gap-4 col-span-2 bg-slate-50 p-2 rounded-lg items-center text-xs text-slate-500">
                <span>Mês: <strong>{dateInfo.month}</strong></span>
                <span>Semana: <strong>{dateInfo.week}</strong></span>
                <span>Ano: <strong>{dateInfo.year}</strong></span>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Consultor *</label>
            <input 
              required
              type="text" 
              value={consultantName}
              onChange={e => setConsultantName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ex: João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor (Opcional)</label>
            <input 
              type="text" 
              value={supervisorName}
              onChange={e => setSupervisorName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ex: Maria Souza"
            />
          </div>
          
          {/* Contact Evidence Section */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Evidência do Contato *</label>
            <div className="flex gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => setEvidenceType('link')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${evidenceType === 'link' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                >
                    <LinkIcon size={14} /> Link Externo
                </button>
                <button
                    type="button"
                    onClick={() => setEvidenceType('file')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${evidenceType === 'file' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                >
                    <Upload size={14} /> Upload Arquivo
                </button>
            </div>

            {evidenceType === 'link' ? (
                <input 
                  required={evidenceType === 'link'}
                  type="url" 
                  value={contactLink}
                  onChange={e => setContactLink(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="https://..."
                />
            ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                    {selectedFile ? (
                        <div className="flex items-center gap-3 w-full bg-white p-2 rounded border border-slate-200">
                             <div className="p-2 bg-blue-50 rounded text-blue-600">
                                {selectedFile.type.includes('pdf') ? <FileText size={20} /> : <FileAudio size={20} />}
                             </div>
                             <div className="flex-1 overflow-hidden">
                                 <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                                 <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                             </div>
                             <button 
                                type="button" 
                                onClick={handleRemoveFile}
                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                             >
                                <X size={18} />
                             </button>
                        </div>
                    ) : (
                        <>
                            <input 
                                id="file-upload"
                                type="file" 
                                accept="audio/*,application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                required={evidenceType === 'file'}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center text-slate-500">
                                <Upload size={24} className="mb-2 text-slate-400" />
                                <span className="text-sm font-medium">Clique para enviar áudio ou PDF</span>
                                <span className="text-xs opacity-70 mt-1">Máx: 5MB</span>
                            </label>
                        </>
                    )}
                </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Central de Atendimento *</label>
            <select 
              value={center}
              onChange={e => setCenter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
            >
              {CALL_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base *</label>
            <select 
              value={base}
              onChange={e => setBase(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
            >
              {BASES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Turno *</label>
            <select 
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
            >
              {SHIFTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ciclo de Monitoria *</label>
            <select 
              value={cycle}
              onChange={e => setCycle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
            >
              {EVALUATION_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Canal *</label>
            <select 
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Venda Efetivada? *</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sale" checked={saleEffective} onChange={() => setSaleEffective(true)} />
                Sim
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sale" checked={!saleEffective} onChange={() => setSaleEffective(false)} />
                Não
              </label>
            </div>
          </div>
          {!saleEffective && (
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da Não Venda</label>
               <select 
                  value={noSaleReason}
                  onChange={e => setNoSaleReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="">Selecione...</option>
                  {REASONS_NO_SALE.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Score Header */}
      <div className={`sticky top-0 z-10 text-white p-4 rounded-lg shadow-lg flex justify-between items-center transition-colors duration-300 ${hasCriticalFailure ? 'bg-red-600' : 'bg-slate-800'}`}>
         <div className="flex gap-6 items-center">
            <div className="flex flex-col">
                <span className="text-xs opacity-70">Nota Total</span>
                <span className={`text-3xl font-bold`}>
                    {calculatedScores.total.toFixed(1)}%
                </span>
            </div>
            <div className="flex flex-col">
                <span className="text-xs opacity-70">Criticidade</span>
                <span className="font-bold text-xl">{getCriticality(calculatedScores.total)}</span>
            </div>
            
            {hasCriticalFailure && (
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg animate-pulse">
                    <AlertTriangle size={20} />
                    <span className="font-bold uppercase">Falha Grave Detectada</span>
                </div>
            )}
         </div>
      </div>

      {/* Critical Failure Section */}
      <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200">
        <div className="flex items-center gap-3 mb-4">
            <input 
                type="checkbox" 
                id="critical-check"
                checked={hasCriticalFailure}
                onChange={e => {
                    setHasCriticalFailure(e.target.checked);
                    if(!e.target.checked) setCriticalFailureReason('');
                }}
                className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
            />
            <label htmlFor="critical-check" className="text-red-800 font-bold text-lg cursor-pointer">
                Houve Falha Grave? (Zera a nota)
            </label>
        </div>
        
        {hasCriticalFailure && (
            <div className="animate-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-red-700 mb-1">Motivo da Falha Grave *</label>
                <select 
                  value={criticalFailureReason}
                  onChange={e => setCriticalFailureReason(e.target.value)}
                  className="w-full p-2 border border-red-300 rounded-lg outline-none text-red-700"
                >
                  <option value="">Selecione o motivo...</option>
                  {CRITICAL_FAILURES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
        )}
      </div>

      {/* Questions Sections */}
      {!hasCriticalFailure && FORM_SECTIONS.map((section) => (
        <div key={section.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
            <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-xs text-slate-500">Nota do Bloco</p>
                    <p className="font-bold text-primary">
                        {calculatedScores.sections[section.id]?.toFixed(2) || '0.00'} / {section.weight.toFixed(2)}
                    </p>
                </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {section.questions.map((q) => (
              <div key={q.id} className="border-b border-slate-50 pb-4 last:border-0">
                <p className="text-slate-700 mb-3 text-sm md:text-base">{q.text}</p>
                <div className="flex gap-2 md:gap-4">
                  {['Sim', 'Não', 'N/A'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAnswer(q.id, opt as AnswerValue)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none
                        ${answers[q.id] === opt 
                          ? (opt === 'Sim' ? 'bg-green-100 text-green-700 border-green-300 border' : 
                             opt === 'Não' ? 'bg-red-100 text-red-700 border-red-300 border' : 
                             'bg-slate-200 text-slate-700 border-slate-300 border')
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'}
                      `}
                    >
                      {opt === 'N/A' ? 'Não se aplica' : opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Qualitative */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Qualitativo & Feedback</h3>
        
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Contato *</label>
            <textarea 
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                placeholder="Resumo breve do que aconteceu na ligação..."
            />
        </div>

        <div className="flex justify-end">
             <button 
                type="button"
                onClick={handleAIAssist}
                disabled={isGeneratingAI}
                className="flex items-center gap-2 text-sm text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
                <Sparkles size={16} />
                {isGeneratingAI ? 'Gerando Análise...' : 'Gerar Feedback com IA'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Pontos Positivos</label>
                <textarea 
                    rows={4}
                    value={pros}
                    onChange={e => setPros(e.target.value)}
                    className="w-full p-3 border border-green-200 bg-green-50 rounded-lg outline-none text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Pontos de Melhoria / Feedback</label>
                <textarea 
                    required
                    rows={4}
                    value={cons}
                    onChange={e => setCons(e.target.value)}
                    className="w-full p-3 border border-red-200 bg-red-50 rounded-lg outline-none text-sm"
                />
            </div>
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg md:pl-64 flex justify-end">
        <button 
            type="submit"
            className="bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
            <Save size={18} />
            Salvar Avaliação
        </button>
      </div>
    </form>
  );
};

export default EvaluationForm;
