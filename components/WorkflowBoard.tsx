
import React, { useState } from 'react';
import { Evaluation, WorkflowStatus } from '../types';
import { WORKFLOW_STATUSES } from '../constants';
import { MoreVertical, Calendar, User, MoveRight } from 'lucide-react';

interface WorkflowBoardProps {
  evaluations: Evaluation[];
  onUpdateStatus: (id: string, newStatus: WorkflowStatus) => void;
}

const WorkflowBoard: React.FC<WorkflowBoardProps> = ({ evaluations, onUpdateStatus }) => {
    const [draggedId, setDraggedId] = useState<string | null>(null);

    // Group evaluations by status
    const columns = WORKFLOW_STATUSES.map(statusDef => ({
        ...statusDef,
        items: evaluations.filter(e => (e.status || 'Monitorado') === statusDef.status)
    }));

    return (
        <div className="h-[calc(100vh-8rem)] overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-4 min-w-[1200px] pb-4">
                {columns.map((column) => (
                    <div key={column.status} className="flex flex-col w-80 min-w-[320px] bg-slate-100 rounded-xl border border-slate-200 h-full">
                        {/* Column Header */}
                        <div className={`p-4 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${column.color.replace('text', 'bg').replace('border', 'border-b-4').split(' ')[0]} bg-opacity-20`}>
                            <h3 className={`font-bold ${column.color.split(' ')[2]}`}>{column.label}</h3>
                            <span className="bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                                {column.items.length}
                            </span>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {column.items.map((evaluation) => (
                                <div 
                                    key={evaluation.id} 
                                    className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 leading-tight truncate w-40" title={evaluation.consultantName}>
                                                    {evaluation.consultantName}
                                                </p>
                                                <p className="text-[10px] text-slate-500">{evaluation.center}</p>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${evaluation.finalScore >= 90 ? 'bg-green-100 text-green-700' : evaluation.finalScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {evaluation.finalScore.toFixed(0)}%
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                        <Calendar size={12} />
                                        <span>{new Date(evaluation.date).toLocaleDateString()}</span>
                                        <span className="mx-1">•</span>
                                        <span>{evaluation.channel}</span>
                                    </div>

                                    {/* Move Actions - Simple Dropdown-like buttons for reliability */}
                                    <div className="pt-3 border-t border-slate-100">
                                        <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Mover para:</label>
                                        <select 
                                            value={evaluation.status || 'Monitorado'}
                                            onChange={(e) => onUpdateStatus(evaluation.id, e.target.value as WorkflowStatus)}
                                            className="w-full text-xs p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-blue-400"
                                        >
                                            {WORKFLOW_STATUSES.map(s => (
                                                <option key={s.status} value={s.status}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {column.items.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                    Nenhuma monitoria
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowBoard;
