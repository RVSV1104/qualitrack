
import React, { useState, useMemo } from 'react';
import { User, UserRole, Evaluation, PDI, PDIStatus, WorkflowStatus } from './types';
import { MOCK_USERS, MOCK_PDIS, FORM_SECTIONS } from './constants';
import EvaluationForm from './components/EvaluationForm';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import TrainingHub from './components/TrainingHub';
import PDIManager from './components/PDIManager';
import FeedbackArea from './components/FeedbackArea';
import WorkflowBoard from './components/WorkflowBoard';
import ConsultantManager from './components/ConsultantManager'; 
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Book, 
  Video, 
  LogOut, 
  Menu, 
  X,
  TrendingUp,
  MessageSquare,
  Kanban,
  Users
} from 'lucide-react';

type View = 'dashboard' | 'evaluation' | 'knowledge' | 'training' | 'pdi' | 'my-feedback' | 'workflow' | 'consultants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [pdis, setPdis] = useState<PDI[]>(MOCK_PDIS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const consultantNames = useMemo(() => {
    const names = new Set(evaluations.map(e => e.consultantName));
    return Array.from(names).sort();
  }, [evaluations]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.role === UserRole.MANAGER ? 'dashboard' : 'my-feedback');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // INTELLIGENT PDI GENERATION ENGINE (Pure Logic)
  const generatePDIsList = (evalData: Evaluation, history: Evaluation[]): PDI[] => {
    const newPDIs: PDI[] = [];
    const baseDate = new Date();
    const deadline7Days = new Date(baseDate.setDate(baseDate.getDate() + 7)).toISOString().split('T')[0];
    const deadline1Day = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

    // 1. Low Score Trigger (< 80%)
    if (evalData.finalScore < 80) {
        newPDIs.push({
            id: `auto-score-${evalData.id}-${Date.now()}`,
            consultantName: evalData.consultantName,
            title: 'Performance: Nota Abaixo de 80%',
            actionPlan: 'Revisar técnicas de negociação e realizar treinamento de contorno de objeções.',
            deadline: deadline7Days,
            status: 'Pendente',
            createdAt: new Date().toISOString(),
            priority: 'Alta',
            responsible: 'Supervisor',
            originEvaluationId: evalData.id,
            type: 'PDI'
        });
    }

    // 2. Critical Block Trigger (< 60%)
    FORM_SECTIONS.forEach(section => {
        const rawScore = evalData.sectionScores[section.id] || 0;
        const percentage = (rawScore / section.weight) * 100;
        
        if (percentage < 60) {
            newPDIs.push({
                id: `auto-block-${section.id}-${evalData.id}-${Date.now()}`,
                consultantName: evalData.consultantName,
                title: `Melhoria em Competência: ${section.title}`,
                actionPlan: `Realizar plano de recuperação focado em ${section.title} (Nota atual: ${percentage.toFixed(0)}%). Revisar materiais e agendar monitoria de acompanhamento.`,
                deadline: deadline7Days,
                status: 'Pendente',
                createdAt: new Date().toISOString(),
                priority: 'Média',
                responsible: 'Consultor',
                originEvaluationId: evalData.id,
                type: 'PDI'
            });
        }
    });

    // 3. Critical Failure Trigger
    if (evalData.hasCriticalFailure) {
        newPDIs.push({
            id: `auto-crit-${evalData.id}-${Date.now()}`,
            consultantName: evalData.consultantName,
            title: 'FALHA GRAVE: Plano de Correção Imediata',
            actionPlan: `Feedback obrigatório sobre: ${evalData.criticalFailureReason}. Monitoria de acompanhamento em 24h.`,
            deadline: deadline1Day,
            status: 'Pendente',
            createdAt: new Date().toISOString(),
            priority: 'Alta',
            responsible: 'Supervisor',
            originEvaluationId: evalData.id,
            type: 'FollowUp'
        });
    }

    // 4. Error Repetition (3 times)
    // Check history for this consultant
    const consultantHistory = history
        .filter(e => e.consultantName === evalData.consultantName)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
    
    // Consider current eval + last 2 evals
    const last3 = [evalData, ...consultantHistory].slice(0, 3);
    
    if (last3.length >= 3) {
        FORM_SECTIONS.forEach(section => {
            section.questions.forEach(q => {
                // Check if current is Fail
                if (evalData.answers[q.id] === 'Não') {
                     // Check if prev 2 are Fail
                     const repeated = last3.every(histEval => histEval.answers[q.id] === 'Não');
                     if (repeated) {
                         newPDIs.push({
                            id: `auto-repeat-${q.id}-${evalData.id}-${Date.now()}`,
                            consultantName: evalData.consultantName,
                            title: `Reincidência de Erro: ${q.text.substring(0, 30)}...`,
                            actionPlan: `O consultor perdeu pontos neste item por 3 vezes seguidas. Treino específico de "${q.text}" + Role Play obrigatório.`,
                            deadline: deadline7Days,
                            status: 'Pendente',
                            createdAt: new Date().toISOString(),
                            priority: 'Alta',
                            responsible: 'Supervisor',
                            originEvaluationId: evalData.id,
                            type: 'PDI'
                        });
                     }
                }
            });
        });
    }

    // 5. Recurrent Reason Trigger (Generic Disinterest)
    if (!evalData.saleEffective && evalData.noSaleReason === 'Desinteresse genérico (resposta vaga)') {
         const recentDesinterest = consultantHistory.filter(e => e.noSaleReason === 'Desinteresse genérico (resposta vaga)').length;
         
         if (recentDesinterest >= 2) {
             newPDIs.push({
                id: `auto-reason-desinterest-${evalData.id}-${Date.now()}`,
                consultantName: evalData.consultantName,
                title: 'Recorrência: Desinteresse Genérico',
                actionPlan: 'Treinamento intensivo de Criação de Valor e Gatilhos de Urgência. Revisar abordagem inicial.',
                deadline: deadline7Days,
                status: 'Pendente',
                createdAt: new Date().toISOString(),
                priority: 'Média',
                responsible: 'Consultor',
                originEvaluationId: evalData.id,
                type: 'PDI'
            });
         }
    }

    return newPDIs;
  };

  const handleNewEvaluation = (evalData: Evaluation) => {
    setEvaluations(prev => [...prev, evalData]);
    
    // Run Intelligence Engine
    const generatedPDIs = generatePDIsList(evalData, evaluations);
    
    if (generatedPDIs.length > 0) {
        setPdis(prev => [...prev, ...generatedPDIs]);
        alert(`Atenção: ${generatedPDIs.length} Planos de Ação foram gerados automaticamente.`);
    }

    setCurrentView('dashboard');
  };

  const handleImportData = (importedEvaluations: Evaluation[]) => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    const newGeneratedPDIs: PDI[] = [];
    const allEvaluations = [...evaluations, ...importedEvaluations];

    importedEvaluations.forEach(ev => {
        // Try to parse date reliably (DD/MM/YYYY or YYYY-MM-DD)
        let evDate = new Date(ev.date);
        if (isNaN(evDate.getTime()) && ev.date.includes('/')) {
            const parts = ev.date.split(' ')[0].split('/');
            if (parts.length === 3) {
                evDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        
        // Generate PDIs for everything for history, but...
        const pdisForEval = generatePDIsList(ev, allEvaluations);
        
        // ... Modify status based on date: Only current month is "Pendente"
        const isCurrentMonth = !isNaN(evDate.getTime()) && 
                               evDate.getMonth() === currentMonth && 
                               evDate.getFullYear() === currentYear;
                               
        const processedPDIs = pdisForEval.map(p => ({
            ...p,
            status: isCurrentMonth ? 'Pendente' as PDIStatus : 'Concluído' as PDIStatus
        }));

        newGeneratedPDIs.push(...processedPDIs);
    });

    setEvaluations(prev => [...prev, ...importedEvaluations]);
    
    if (newGeneratedPDIs.length > 0) {
        setPdis(prev => [...prev, ...newGeneratedPDIs]);
        const activeCount = newGeneratedPDIs.filter(p => p.status === 'Pendente').length;
        alert(`${newGeneratedPDIs.length} Planos de Ação gerados (${activeCount} ativos para este mês, o restante concluído por ser retroativo).`);
    }
  };

  const handleAddPDI = (pdi: PDI) => {
    setPdis(prev => [...prev, pdi]);
  };

  const handleUpdatePDIStatus = (id: string, status: PDIStatus) => {
    setPdis(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const handleAcknowledgeFeedback = (id: string) => {
    setEvaluations(prev => prev.map(e => 
        e.id === id 
        ? { ...e, feedbackStatus: 'Ciente', acknowledgedAt: new Date().toISOString() } 
        : e
    ));
    alert("Feedback validado com sucesso!");
  };

  const handleUpdateWorkflowStatus = (id: string, newStatus: WorkflowStatus) => {
      setEvaluations(prev => prev.map(e => 
        e.id === id ? { ...e, status: newStatus } : e
      ));
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">QualiTrack</h1>
            <p className="text-slate-500">Sistema de Gestão de Qualidade</p>
          </div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4 text-center">Selecione seu perfil</h3>
          <div className="space-y-3">
            {MOCK_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-blue-50 transition-all group"
              >
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                <div className="text-left">
                  <p className="font-bold text-slate-800 group-hover:text-primary">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role === UserRole.MANAGER ? 'Gestão / QA' : 'Consultor'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-white rounded shadow-md"
        >
            {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static
      `}>
        <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-100">
                <h1 className="text-2xl font-bold text-primary">QualiTrack</h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {currentUser.role === UserRole.MANAGER && (
                    <>
                        <button
                            onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${currentView === 'dashboard' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <LayoutDashboard size={20} />
                            Dashboard
                        </button>

                         <button
                            onClick={() => { setCurrentView('workflow'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${currentView === 'workflow' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <Kanban size={20} />
                            Fluxo de Monitorias
                        </button>

                        <button
                            onClick={() => { setCurrentView('consultants'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${currentView === 'consultants' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <Users size={20} />
                            Consultores
                        </button>

                        <button
                            onClick={() => { setCurrentView('evaluation'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${currentView === 'evaluation' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <ClipboardCheck size={20} />
                            Nova Monitoria
                        </button>

                        <button
                            onClick={() => { setCurrentView('pdi'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${currentView === 'pdi' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <TrendingUp size={20} />
                            Plano de Ação
                        </button>
                    </>
                )}

                {currentUser.role === UserRole.CONSULTANT && (
                    <button
                        onClick={() => { setCurrentView('my-feedback'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                            ${currentView === 'my-feedback' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                        `}
                    >
                        <MessageSquare size={20} />
                        Meus Feedbacks
                    </button>
                )}

                <button
                    onClick={() => { setCurrentView('knowledge'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${currentView === 'knowledge' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                    `}
                >
                    <Book size={20} />
                    Base de Conhecimento
                </button>

                <button
                    onClick={() => { setCurrentView('training'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${currentView === 'training' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}
                    `}
                >
                    <Video size={20} />
                    Treinamentos
                </button>
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                        <p className="text-xs text-slate-500">{currentUser.role === UserRole.MANAGER ? 'Gestor' : 'Consultor'}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                    <LogOut size={16} /> Sair
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto">
            {currentView === 'dashboard' && currentUser.role === UserRole.MANAGER && (
                <Dashboard evaluations={evaluations} onImportData={handleImportData} />
            )}
            {currentView === 'workflow' && currentUser.role === UserRole.MANAGER && (
                <WorkflowBoard evaluations={evaluations} onUpdateStatus={handleUpdateWorkflowStatus} />
            )}
            {currentView === 'consultants' && currentUser.role === UserRole.MANAGER && (
                <ConsultantManager evaluations={evaluations} />
            )}
            {currentView === 'evaluation' && currentUser.role === UserRole.MANAGER && (
                <EvaluationForm onSubmit={handleNewEvaluation} monitorName={currentUser.name} />
            )}
            {currentView === 'pdi' && currentUser.role === UserRole.MANAGER && (
                <PDIManager pdis={pdis} onAddPDI={handleAddPDI} onUpdateStatus={handleUpdatePDIStatus} consultants={consultantNames} />
            )}
            {currentView === 'my-feedback' && currentUser.role === UserRole.CONSULTANT && (
                <FeedbackArea 
                    evaluations={evaluations} 
                    consultantName={currentUser.name} 
                    onAcknowledge={handleAcknowledgeFeedback} 
                />
            )}
            {currentView === 'knowledge' && <KnowledgeBase />}
            {currentView === 'training' && <TrainingHub />}
        </div>
      </main>
    </div>
  );
};

export default App;
