import React from 'react';
import { MOCK_TRAININGS } from '../constants';
import { PlayCircle, Clock } from 'lucide-react';

const TrainingHub: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Hub de Treinamento</h2>
        <div className="text-sm text-slate-500">
            {MOCK_TRAININGS.length} vídeos disponíveis
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_TRAININGS.map((video) => (
            <div key={video.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
                <div className="relative aspect-video bg-slate-900">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle size={48} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock size={12} /> {video.duration}
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex gap-2 mb-2">
                        {video.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors mb-2">
                        {video.title}
                    </h3>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default TrainingHub;