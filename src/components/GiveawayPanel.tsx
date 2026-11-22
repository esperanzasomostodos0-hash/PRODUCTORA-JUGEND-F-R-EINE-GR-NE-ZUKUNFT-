import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Dices,
  EyeOff,
  Gift,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { playBroadcastStinger } from '../services/soundEffects';
import { GiveawayState, ViewerComment } from '../types/broadcast';

interface GiveawayPanelProps {
  giveaway: GiveawayState;
  comments: ViewerComment[];
  onChangeGiveaway: (next: GiveawayState) => void;
}

export const GiveawayPanel: React.FC<GiveawayPanelProps> = ({
  giveaway,
  comments,
  onChangeGiveaway,
}) => {
  const [newParticipant, setNewParticipant] = useState('');
  const [winnerNoteDraft, setWinnerNoteDraft] = useState(
    giveaway.winnerNote || 'Comunicate por WhatsApp para retirar tu premio'
  );
  const rollTimerRef = useRef<number | null>(null);
  const latestGiveawayRef = useRef(giveaway);
  latestGiveawayRef.current = giveaway;

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) {
        window.clearInterval(rollTimerRef.current);
      }
    };
  }, []);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newParticipant.trim();
    if (!clean) return;
    if (!giveaway.participants.includes(clean)) {
      onChangeGiveaway({
        ...giveaway,
        participants: [...giveaway.participants, clean],
      });
    }
    setNewParticipant('');
  };

  const handleImportComments = () => {
    const existing = new Set(giveaway.participants);
    const added: string[] = [];
    comments.forEach((c) => {
      const label = c.location ? `${c.author} (${c.location})` : c.author;
      if (!existing.has(label)) {
        existing.add(label);
        added.push(label);
      }
    });
    if (added.length > 0) {
      onChangeGiveaway({
        ...giveaway,
        participants: [...giveaway.participants, ...added],
      });
    }
  };

  const handleRemoveParticipant = (idx: number) => {
    const next = [...giveaway.participants];
    next.splice(idx, 1);
    onChangeGiveaway({ ...giveaway, participants: next });
  };

  const handleStartRaffle = () => {
    const pool = giveaway.participants;
    if (pool.length === 0) return;

    if (rollTimerRef.current) {
      window.clearInterval(rollTimerRef.current);
    }

    playBroadcastStinger('redoble_suspenso');
    let step = 0;
    const totalSteps = 22;

    onChangeGiveaway({
      ...latestGiveawayRef.current,
      stage: 'rolling',
      rollingName: pool[0],
    });

    rollTimerRef.current = window.setInterval(() => {
      step += 1;
      const g = latestGiveawayRef.current;
      if (step >= totalSteps) {
        if (rollTimerRef.current) {
          window.clearInterval(rollTimerRef.current);
          rollTimerRef.current = null;
        }
        const winner = pool[Math.floor(Math.random() * pool.length)];
        playBroadcastStinger('trivia_correcto');
        window.setTimeout(() => playBroadcastStinger('aplausos_estudio'), 240);
        onChangeGiveaway({
          ...g,
          stage: 'winner',
          winnerName: winner,
          winnerNote: winnerNoteDraft.trim(),
          rollingName: winner,
        });
      } else {
        const pick = pool[step % pool.length];
        onChangeGiveaway({
          ...g,
          stage: 'rolling',
          rollingName: pick,
        });
      }
    }, 115);
  };

  const handlePickDirectWinner = (name: string) => {
    if (rollTimerRef.current) {
      window.clearInterval(rollTimerRef.current);
      rollTimerRef.current = null;
    }
    playBroadcastStinger('trivia_correcto');
    window.setTimeout(() => playBroadcastStinger('aplausos_estudio'), 200);
    onChangeGiveaway({
      ...giveaway,
      stage: 'winner',
      winnerName: name,
      winnerNote: winnerNoteDraft.trim(),
    });
  };

  const isVisibleOnAir = giveaway.stage !== 'hidden';

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-sm sm:text-base font-semibold text-white">
              Premios, Trivias y Sorteos en Vivo
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Mostrá premios al aire, sumá participantes de comentarios o WhatsApp y sorteá ganador con ruleta y sonido en vivo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isVisibleOnAir && (
            <button
              type="button"
              onClick={() => {
                if (rollTimerRef.current) {
                  window.clearInterval(rollTimerRef.current);
                  rollTimerRef.current = null;
                }
                onChangeGiveaway({ ...giveaway, stage: 'hidden' });
              }}
              className="min-h-[36px] px-3 py-1.5 bg-red-600/20 hover:bg-red-600/35 border border-red-500/45 text-red-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Quitar del Aire</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onChangeGiveaway({
                ...giveaway,
                stage: 'promo',
              })
            }
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              giveaway.stage === 'promo'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600/25 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mostrar Premio / Consigna</span>
          </button>

          <button
            type="button"
            disabled={giveaway.participants.length === 0 || giveaway.stage === 'rolling'}
            onClick={handleStartRaffle}
            className="min-h-[36px] px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            <span>
              {giveaway.stage === 'rolling' ? 'Sorteando...' : 'Sortear en Vivo'}
            </span>
          </button>
        </div>
      </div>

      {/* Config Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0A0D12] border border-white/8 rounded-xl p-3.5">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Título de la Placa
          </label>
          <input
            type="text"
            value={giveaway.title}
            onChange={(e) =>
              onChangeGiveaway({ ...giveaway, title: e.target.value })
            }
            placeholder="SORTEO EN VIVO · #SINFILTRO"
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Premio en Juego
          </label>
          <input
            type="text"
            value={giveaway.prize}
            onChange={(e) =>
              onChangeGiveaway({ ...giveaway, prize: e.target.value })
            }
            placeholder="Ej: Kit Matero #SinFiltro"
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-emerald-300"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Consigna / Pregunta de Trivia
          </label>
          <input
            type="text"
            value={giveaway.promptText}
            onChange={(e) =>
              onChangeGiveaway({ ...giveaway, promptText: e.target.value })
            }
            placeholder="Respondé en comentarios o WhatsApp"
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-slate-200"
          />
        </div>
      </div>

      {/* Participants Management */}
      <div className="bg-[#0A0D12] border border-white/8 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Participantes Anotados ({giveaway.participants.length})</span>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleImportComments}
              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-[11px] font-medium rounded-md cursor-pointer"
            >
              + Importar Comentarios ({comments.length})
            </button>
            {giveaway.participants.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChangeGiveaway({ ...giveaway, participants: [] })
                }
                className="px-2.5 py-1 bg-white/5 hover:bg-red-950/60 border border-white/10 text-slate-300 hover:text-red-300 text-[11px] rounded-md flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Vaciar</span>
              </button>
            )}
          </div>
        </div>

        <form
          onSubmit={handleAddParticipant}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
        >
          <input
            type="text"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Agregar participante de WhatsApp / Radio (Ej: Juan P. - B° Centro)"
            className="sm:col-span-6 px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
          />
          <input
            type="text"
            value={winnerNoteDraft}
            onChange={(e) => setWinnerNoteDraft(e.target.value)}
            placeholder="Nota al ganador (Ej: Retirá en la radio)"
            className="sm:col-span-4 px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-slate-300"
          />
          <button
            type="submit"
            className="sm:col-span-2 min-h-[34px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sumar</span>
          </button>
        </form>

        {giveaway.participants.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {giveaway.participants.map((p, idx) => {
              const isWinner =
                giveaway.stage === 'winner' && giveaway.winnerName === p;
              return (
                <div
                  key={`${p}-${idx}`}
                  className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs ${
                    isWinner
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                      : 'bg-[#121720] border-white/10 text-slate-200'
                  }`}
                >
                  <span>{p}</span>
                  <button
                    type="button"
                    onClick={() => handlePickDirectWinner(p)}
                    title="Declarar ganador directo (ej: respondió bien la trivia)"
                    className="p-0.5 text-emerald-400 hover:text-amber-300 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(idx)}
                    title="Quitar participante"
                    className="p-0.5 text-slate-500 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Sumá participantes manualmente o importalos desde los comentarios en vivo.
          </p>
        )}
      </div>
    </section>
  );
};
