import React from 'react';
import { MessageSquare, Trash2, Tv } from 'lucide-react';
import { ViewerComment } from '../types/broadcast';

interface LiveCommentsPanelProps {
  comments: ViewerComment[];
  onPushToAir: (comment: ViewerComment) => void;
  onDeleteComment: (id: string) => void;
}

export const LiveCommentsPanel: React.FC<LiveCommentsPanelProps> = ({
  comments,
  onPushToAir,
  onDeleteComment,
}) => {
  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h2 className="font-display text-sm font-semibold text-white">
            Comentarios de la Audiencia en Vivo ({comments.length})
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Leé los mensajes del público y sacalos al aire en el zócalo con 1 clic
        </span>
      </div>

      {comments.length === 0 ? (
        <div className="p-4 bg-[#0A0D12] border border-white/8 rounded-lg text-xs text-slate-400 text-center">
          Todavía no hay comentarios nuevos en la transmisión.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-[#0A0D12] border border-white/10 rounded-lg flex flex-col justify-between gap-2.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {c.author}
                  </span>
                  {c.location && (
                    <span className="text-[10px] font-mono text-emerald-400 truncate">
                      {c.location}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {c.message}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => onPushToAir(c)}
                  className="flex-1 min-h-[30px] px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/35 rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Tv className="w-3 h-3" />
                  <span>Sacar al Aire</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComment(c.id)}
                  title="Eliminar comentario"
                  className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded bg-white/5 hover:bg-red-950/60 text-slate-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
