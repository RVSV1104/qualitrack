
export enum UserRole {
    MANAGER = 'MANAGER', // Gestor/QA
    CONSULTANT = 'CONSULTANT' // Consultor
}

export interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar: string;
}

export interface Question {
    id: string;
    text: string;
}

export interface Section {
    id: string;
    title: string;
    weight: number; // Percentage 0-100
    questions: Question[];
}

export type AnswerValue = 'Sim' | 'Não' | 'N/A';

export type FeedbackStatus = 'Pendente' | 'Aplicado' | 'Ciente';

export type WorkflowStatus = 
    | 'Monitorado' 
    | 'Revisado' 
    | 'Aguardando evidência' 
    | 'Aguardando consultor' 
    | 'Aguardando supervisão';

export interface AuditLog {
    action: 'created' | 'updated' | 'status_change';
    by: string;
    at: string;
}

export interface Evaluation {
    id: string;
    // Metadata
    date: string; // Data do Contato
    timestamp: string; // Carimbo de data/hora
    month: string;
    week: number;
    year: number;
    
    // People
    consultantName: string;
    monitorName: string;
    supervisorName?: string;

    // Context
    center: string; // Central de Atendimento
    base: string; // Base de Atendimento
    shift: string; // Turno do Agente
    cycle: string; // Ciclo de Monitoria
    channel: string; // Canal
    contactLink: string; // Link do Contato (URL or Base64)
    attachmentName?: string;

    // Outcome
    saleEffective: boolean;
    noSaleReason?: string;

    // Scoring & Blocks
    finalScore: number;
    sectionScores: Record<string, number>; // Score per section
    answers: Record<string, AnswerValue>; // QuestionID -> Answer
    
    // Critical Failure
    hasCriticalFailure: boolean;
    criticalFailureReason?: string;

    // Qualitative
    notes: string; // Descrição do contato
    pros: string; // Pontos positivos
    cons: string; // Pontos de melhoria

    // Management
    criticality: string; // Nível de criticidade
    feedbackStatus: FeedbackStatus;
    status: WorkflowStatus; // Workflow status
    feedbackAppliedDate?: string;
    deadlineFeedback?: string;
    acknowledgedAt?: string;
    aiFeedback?: string;
    
    // Audit
    auditLogs?: AuditLog[];
}

export type PDIStatus = 'Pendente' | 'Em Andamento' | 'Concluído';
export type PDIPriority = 'Alta' | 'Média' | 'Baixa';

export interface PDI {
    id: string;
    consultantName: string;
    title: string; // Ponto crítico / Objetivo
    actionPlan: string; // Ações recomendadas
    deadline: string;
    status: PDIStatus;
    createdAt: string;
    priority: PDIPriority;
    responsible: 'Consultor' | 'Supervisor';
    originEvaluationId?: string; // Link to origin evaluation
    attachments?: string[]; // Links to audio/docs
    type?: 'PDI' | 'FollowUp';
}

export interface SOP {
    id: string;
    title: string;
    category: string;
    content: string;
    lastUpdated: string;
}

export interface TrainingVideo {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    tags: string[];
}

export interface Consultant {
    id: string;
    name: string;
    email: string;
    team: string; // Equipe/Supervisor
    center: string; // Central
    hireDate: string;
    avatar?: string;
    status: 'Ativo' | 'Inativo' | 'Férias';
}