import React, { useState } from 'react';
import {
  Edit3,
  Layers,
  Plus,
  Radio,
  RotateCcw,
  Sparkles,
  Trash2,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import {
  BroadcastScene,
  PadActionType,
  PadColor,
  TouchPadItem,
} from '../types/broadcast';

interface TouchDeckPanelProps {
  pads: TouchPadItem[];
  scenes: BroadcastScene[];
  activeSceneId: string;
  onTriggerPad: (pad: TouchPadItem) => void;
  onUpdatePads: (nextPads: TouchPadItem[]) => void;
  onResetPads: () => void;
  fullScreenDeck?: boolean;
}

const PAD_COLOR_MAP: Record<
  PadColor,
  { base: string; active: string; label: string }
> = {
  crimson: {
    base: 'bg-[#1D1216] hover:bg-[#2A151B] border-red-700/50 text-red-100',
    active: 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/50',
    label: 'Rojo Programa',
  },
  amber: {
    base: 'bg-[#1C170F] hover:bg-[#2A2112] border-amber-600/50 text-amber-100',
    active: 'bg-amber-600 border-amber-400 text-white',
    label: 'Ámbar Previo',
  },
  emerald: {
    base: 'bg-[#0F1B15] hover:bg-[#14271D] border-emerald-600/50 text-emerald-100',
    active: 'bg-emerald-600 border-emerald-400 text-white',
    label: 'Esmeralda Aire',
  },
  blue: {
    base: 'bg-[#101827] hover:bg-[#162238] border-blue-600/50 text-blue-100',
    active: 'bg-blue-600 border-blue-400 text-white',
    label: 'Azul Gráfica',
  },
  slate: {
    base: 'bg-[#151B26] hover:bg-[#1C2433] border-white/15 text-slate-100',
    active: 'bg-slate-600 border-slate-400 text-white',
    label: 'Gris Neutro',
  },
};

function getPadIcon(actionType: PadActionType) {
  switch (actionType) {
    case 'scene':
      return <Video className="w-4 h-4 shrink-0" />;
    case 'overlay':
      return <Layers className="w-4 h-4 shrink-0" />;
    case 'audio_stinger':
      return <Volume2 className="w-4 h-4 shrink-0" />;
    case 'stream':
      return <Radio className="w-4 h-4 shrink-0" />;
    default:
      return <Sparkles className="w-4 h-4 shrink-0" />;
  }
}

export const TouchDeckPanel: React.FC<TouchDeckPanelProps> = ({
  pads,
  scenes,
  activeSceneId,
  onTriggerPad,
  onUpdatePads,
  onResetPads,
  fullScreenDeck = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'escenas' | 'graficas' | 'macros'>(
    'all'
  );
  const [editMode, setEditMode] = useState(false);
  const [editingPad, setEditingPad] = useState<TouchPadItem | null>(null);
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);

  const visiblePads =
    filter === 'all' ? pads : pads.filter((p) => p.category === filter);

  const handlePadPress = (pad: TouchPadItem) => {
    if (editMode) {
      setEditingPad({ ...pad });
      return;
    }
    setLastTriggeredId(pad.id);
    onTriggerPad(pad);
    window.setTimeout(() => {
      setLastTriggeredId((prev) => (prev === pad.id ? null : prev));
    }, 280);
  };

  const handleCreateNewPad = () => {
    const newPad: TouchPadItem = {
      id: `pad-custom-${Date.now()}`,
      label: 'Nuevo Botón',
      sublabel: 'TÁCTIL',
      color: 'blue',
      actionType: 'scene',
      targetValue: scenes[0]?.id || '',
      category: 'escenas',
    };
    setEditingPad(newPad);
  };

  const handleSavePad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPad) return;
    const exists = pads.some((p) => p.id === editingPad.id);
    if (exists) {
      onUpdatePads(pads.map((p) => (p.id === editingPad.id ? editingPad : p)));
    } else {
      onUpdatePads([...pads, editingPad]);
    }
    setEditingPad(null);
  };

  const handleDeletePad = (padId: string) => {
    onUpdatePads(pads.filter((p) => p.id !== padId));
    setEditingPad(null);
  };

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 flex flex-col gap-4">
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            Deck Táctil Personalizado
          </h2>
          <p className="text-xs text-slate-400">
            Botones de disparo rápido para tablet, pantalla táctil o escritorio
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#0A0D12] border border-white/8 rounded-lg">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'escenas', label: 'Escenas' },
                { id: 'graficas', label: 'Gráficas' },
                { id: 'macros', label: 'Macros' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-[#1D2636] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              editMode
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editMode ? 'Listo' : 'Editar Deck'}</span>
          </button>

          {editMode && (
            <>
              <button
                type="button"
                onClick={handleCreateNewPad}
                className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Botón</span>
              </button>
              <button
                type="button"
                onClick={onResetPads}
                title="Restaurar botones de la plantilla"
                className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tactile Pad Matrix */}
      <div
        className={`grid gap-3 ${
          fullScreenDeck
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        }`}
      >
        {visiblePads.map((pad) => {
          const isSceneActive =
            pad.actionType === 'scene' && pad.targetValue === activeSceneId;
          const isFlashing = lastTriggeredId === pad.id;
          const styles = PAD_COLOR_MAP[pad.color];

          return (
            <button
              key={pad.id}
              type="button"
              onClick={() => handlePadPress(pad)}
              className={`relative min-h-[84px] p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-100 active:scale-[0.97] cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-blue-500 ${
                isSceneActive || isFlashing ? styles.active : styles.base
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="opacity-85">{getPadIcon(pad.actionType)}</span>
                <span className="text-[10px] font-mono tracking-wider opacity-80 truncate">
                  {editMode ? 'EDITAR' : pad.sublabel}
                </span>
              </div>
              <span className="font-display text-sm font-semibold leading-snug line-clamp-2 mt-2">
                {pad.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pad Editor Modal */}
      {editingPad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSavePad}
            className="w-full max-w-md bg-[#121720] border border-white/12 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="font-display text-base font-semibold text-white">
                Configurar Botón Táctil
              </h3>
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Etiqueta del Botón
                </label>
                <input
                  type="text"
                  required
                  value={editingPad.label}
                  onChange={(e) =>
                    setEditingPad({ ...editingPad, label: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subtítulo / Código
                  </label>
                  <input
                    type="text"
                    value={editingPad.sublabel}
                    onChange={(e) =>
                      setEditingPad({ ...editingPad, sublabel: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Color Táctil
                  </label>
                  <select
                    value={editingPad.color}
                    onChange={(e) =>
                      setEditingPad({
                        ...editingPad,
                        color: e.target.value as PadColor,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                  >
                    {Object.entries(PAD_COLOR_MAP).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de Acción
                  </label>
                  <select
                    value={editingPad.actionType}
                    onChange={(e) => {
                      const nextType = e.target.value as PadActionType;
                      const defaultTarget =
                        nextType === 'scene'
                          ? scenes[0]?.id || ''
                          : nextType === 'overlay'
                          ? 'toggleLowerThird'
                          : nextType === 'audio_stinger'
                          ? 'cortina_apertura'
                          : nextType === 'transition'
                          ? 'fade'
                          : 'breaking_news_alert';
                      setEditingPad({
                        ...editingPad,
                        actionType: nextType,
                        targetValue: defaultTarget,
                        category:
                          nextType === 'scene'
                            ? 'escenas'
                            : nextType === 'overlay'
                            ? 'graficas'
                            : 'macros',
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                  >
                    <option value="scene">Cambiar Escena</option>
                    <option value="overlay">Alternar Gráfica TV</option>
                    <option value="audio_stinger">Disparar Cortina Audio</option>
                    <option value="transition">Transición Auto</option>
                    <option value="macro">Macro Multipaso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Destino / Comando
                  </label>
                  {editingPad.actionType === 'scene' ? (
                    <select
                      value={editingPad.targetValue}
                      onChange={(e) =>
                        setEditingPad({
                          ...editingPad,
                          targetValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                    >
                      {scenes.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  ) : editingPad.actionType === 'overlay' ? (
                    <select
                      value={editingPad.targetValue}
                      onChange={(e) =>
                        setEditingPad({
                          ...editingPad,
                          targetValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                    >
                      <option value="toggleLowerThird">Zócalo / Lower Third</option>
                      <option value="toggleTicker">Cintillo de Noticias</option>
                      <option value="toggleLiveBadge">Sello En Vivo</option>
                      <option value="toggleScoreboard">Marcador Deportivo</option>
                    </select>
                  ) : editingPad.actionType === 'audio_stinger' ? (
                    <select
                      value={editingPad.targetValue}
                      onChange={(e) =>
                        setEditingPad({
                          ...editingPad,
                          targetValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                    >
                      <option value="cortina_apertura">Apertura #SinFiltro</option>
                      <option value="alerta_ultima_hora">Flash Última Hora</option>
                      <option value="trivia_correcto">Trivia Correcta (Premio)</option>
                      <option value="trivia_incorrecto">Trivia Incorrecta</option>
                      <option value="redoble_suspenso">Suspenso / Sorteo</option>
                      <option value="aplausos_estudio">Aplausos de Estudio</option>
                      <option value="risa_remate">Remate Batería (Ba-Dum-Tss)</option>
                      <option value="transicion_whoosh">Swoosh Transición TV</option>
                      <option value="pitazo_deportes">Silbato Deportivo</option>
                    </select>
                  ) : editingPad.actionType === 'transition' ? (
                    <select
                      value={editingPad.targetValue}
                      onChange={(e) =>
                        setEditingPad({
                          ...editingPad,
                          targetValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                    >
                      <option value="cut">Corte Directo (Cut)</option>
                      <option value="fade">Fundido Cruzado (Fade)</option>
                      <option value="wipe">Barrido Lateral (Wipe)</option>
                    </select>
                  ) : (
                    <select
                      value={editingPad.targetValue}
                      onChange={(e) =>
                        setEditingPad({
                          ...editingPad,
                          targetValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
                    >
                      <option value="breaking_news_alert">
                        Alerta Última Hora (Sonido + Zócalo)
                      </option>
                      <option value="welcome_segment">
                        Entrada de Bloque (Música + Zócalo)
                      </option>
                      <option value="goal_home">+1 Gol Equipo Local</option>
                      <option value="goal_away">+1 Gol Equipo Visitante</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-[#0D1118]">
              {pads.some((p) => p.id === editingPad.id) ? (
                <button
                  type="button"
                  onClick={() => handleDeletePad(editingPad.id)}
                  className="min-h-[40px] px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPad(null)}
                  className="min-h-[40px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Guardar Botón
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
