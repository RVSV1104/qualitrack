import React, { useState } from 'react';
import { SOP } from '../types';
import { MOCK_SOPS } from '../constants';
import { BookOpen, Search, ChevronRight, FileText } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [search, setSearch] = useState('');

  const filteredSOPs = MOCK_SOPS.filter(sop => 
    sop.title.toLowerCase().includes(search.toLowerCase()) || 
    sop.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar List */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <BookOpen size={20} className="text-primary" />
            Base de Conhecimento
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar procedimento..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredSOPs.map(sop => (
                <button
                    key={sop.id}
                    onClick={() => setSelectedSOP(sop)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group
                        ${selectedSOP?.id === sop.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-slate-50 border border-transparent'}
                    `}
                >
                    <div>
                        <p className={`font-medium text-sm ${selectedSOP?.id === sop.id ? 'text-blue-700' : 'text-slate-700'}`}>{sop.title}</p>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">{sop.category}</span>
                    </div>
                    <ChevronRight size={16} className={`text-slate-300 ${selectedSOP?.id === sop.id ? 'text-blue-500' : 'group-hover:text-slate-400'}`} />
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-y-auto">
        {selectedSOP ? (
            <article className="prose max-w-none">
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">{selectedSOP.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Categoria: {selectedSOP.category}</span>
                        <span>Atualizado em: {new Date(selectedSOP.lastUpdated).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedSOP.content}
                </div>
            </article>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Selecione um procedimento ao lado para ler.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;