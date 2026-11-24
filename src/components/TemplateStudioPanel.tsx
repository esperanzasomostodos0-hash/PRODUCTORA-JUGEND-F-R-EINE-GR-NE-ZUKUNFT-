import React from 'react';
import { Check, Plus, RotateCcw, Tv } from 'lucide-react';
import { OverlayState, ShowTemplate } from '../types/broadcast';

interface TemplateStudioPanelProps {
  templates: ShowTemplate[];
  activeTemplateId: string;
  showName: string;
  accentHex: string;
  overlays: OverlayState;
  onSelectTemplate: (templateId: string) => void;
  onUpdateShowMeta: (patch: { showName?: string; accentHex?: string }) => void;
  onUpdateOverlays: (patch: Partial<OverlayState>) => void;
  onSyncOverlaysToObs: () => void;
  obsConnected: boolean;
}

const COLOR_SWATCHES = [
  { label: 'Verde #SIN FILTRO', hex: '#16A34A' },
  { label: 'Esmeralda Vivo', hex: '#10B981' },
  { label: 'Rojo Prensa', hex: '#DC2626' },
  { label: 'Ámbar Magazine', hex: '#D97706' },
  { label: 'Azul TV', hex: '#2563EB' },
];

export const TemplateStudioPanel: React.FC<TemplateStudioPanelProps> = ({
  templates,
  activeTemplateId,
  showName,
  accentHex,
  overlays,
  onSelectTemplate,
  onUpdateShowMeta,
  onUpdateOverlays,
  onSyncOverlaysToObs,
  obsConnected,
}) => {
  return (
    <div className="space-y-5">
      {/* TV Show Template Selector Grid */}
      <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Plantillas de Programa de Televisión
            </h2>
            <p className="text-xs text-slate-400">
              Elegí una plantilla base o personalizá tu programa con color, zócalos y cámaras propias
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {templates.map((tpl) => {
            const isSelected = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.id)}
                className={`group text-left rounded-xl border overflow-hidden transition-all cursor-pointer flex flex-col ${
                  isSelected
                    ? 'bg-[#172030] border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-[#0A0D12] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={tpl.previewImageUrl}
                    alt={tpl.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-200">
                      {tpl.scenes.length} cámaras
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold rounded">
                        <Check className="w-3 h-3" />
                        Activa
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: tpl.accentHex }}
                    />
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      {tpl.formatLabel}
                    </p>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-white">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Identidad del Programa + Generador de Caracteres */}
      <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Identidad Visual y Gráficas en Vivo
            </h2>
            <p className="text-xs text-slate-400">
              Editá el nombre del programa, color principal, zócalos y cintillo en tiempo real
            </p>
          </div>
          {obsConnected && (
            <button
              type="button"
              onClick={onSyncOverlaysToObs}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Tv className="w-4 h-4" />
              <span>Enviar Textos a OBS</span>
            </button>
          )}
        </div>

        {/* Show Name & Accent Color Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nombre del Programa
            </label>
            <input
              type="text"
              value={showName}
              onChange={(e) => {
                onUpdateShowMeta({ showName: e.target.value });
                onUpdateOverlays({ channelName: e.target.value });
              }}
              className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-sm font-display font-semibold text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Color Identidad del Programa
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.label}
                  onClick={() => onUpdateShowMeta({ accentHex: sw.hex })}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    accentHex.toLowerCase() === sw.hex.toLowerCase()
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/10 text-slate-300 bg-[#121720]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span className="hidden sm:inline">{sw.label.split(' ')[0]}</span>
                </button>
              ))}
              <input
                type="color"
                aria-label="Elegir color personalizado"
                value={accentHex}
                onChange={(e) => onUpdateShowMeta({ accentHex: e.target.value })}
                className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/15"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lower Third & Channel Identity */}
          <div className="space-y-3.5 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Zócalo / Lower Third
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateOverlays({ showLowerThird: !overlays.showLowerThird })
                }
                className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  overlays.showLowerThird
                    ? 'bg-red-600 text-white'
                    : 'bg-white/8 text-slate-300 hover:bg-white/15'
                }`}
              >
                {overlays.showLowerThird ? 'Al Aire' : 'Oculto'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Título / Nombre
                </label>
                <input
                  type="text"
                  value={overlays.lowerThirdTitle}
                  onChange={(e) =>
                    onUpdateOverlays({ lowerThirdTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Bajada / Cargo
                </label>
                <input
                  type="text"
                  value={overlays.lowerThirdSubtitle}
                  onChange={(e) =>
                    onUpdateOverlays({ lowerThirdSubtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/8">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Etiqueta / Mosca Canal
                </label>
                <input
                  type="text"
                  value={overlays.channelName}
                  onChange={(e) =>
                    onUpdateOverlays({ channelName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => onUpdateOverlays({ showBug: !overlays.showBug })}
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    overlays.showBug
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                      : 'bg-[#121720] border-white/10 text-slate-400'
                  }`}
                >
                  Logo Canal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({ showLiveBadge: !overlays.showLiveBadge })
                  }
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    overlays.showLiveBadge
                      ? 'bg-red-600/20 border-red-500 text-red-200'
                      : 'bg-[#121720] border-white/10 text-slate-400'
                  }`}
                >
                  Sello Vivo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({ showClock: !overlays.showClock })
                  }
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    overlays.showClock
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                      : 'bg-[#121720] border-white/10 text-slate-400'
                  }`}
                >
                  Reloj
                </button>
              </div>
            </div>
          </div>

          {/* Ticker & Sports Scoreboard */}
          <div className="space-y-3.5 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Cintillo Inferior (Ticker)
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateOverlays({ showTicker: !overlays.showTicker })
                }
                className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  overlays.showTicker
                    ? 'bg-red-600 text-white'
                    : 'bg-white/8 text-slate-300 hover:bg-white/15'
                }`}
              >
                {overlays.showTicker ? 'Al Aire' : 'Oculto'}
              </button>
            </div>

            <textarea
              rows={2}
              value={overlays.tickerText}
              onChange={(e) => onUpdateOverlays({ tickerText: e.target.value })}
              className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white resize-none"
            />

            {/* Sports Scoreboard Controls */}
            <div className="pt-2 border-t border-white/8 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Marcador en Pantalla
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({
                      showScoreboard: !overlays.showScoreboard,
                    })
                  }
                  className={`min-h-[32px] px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                    overlays.showScoreboard
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/8 text-slate-300'
                  }`}
                >
                  {overlays.showScoreboard ? 'Visible' : 'Oculto'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={overlays.scoreHomeName}
                  onChange={(e) =>
                    onUpdateOverlays({
                      scoreHomeName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-16 px-2 py-1.5 bg-[#121720] border border-white/12 rounded text-xs font-mono text-center text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({ scoreHome: overlays.scoreHome + 1 })
                  }
                  className="min-h-[34px] px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono rounded flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <Plus className="w-3 h-3" />
                  <span>{overlays.scoreHome}</span>
                </button>

                <span className="text-slate-500 text-xs">vs</span>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({ scoreAway: overlays.scoreAway + 1 })
                  }
                  className="min-h-[34px] px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-mono rounded flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <Plus className="w-3 h-3" />
                  <span>{overlays.scoreAway}</span>
                </button>
                <input
                  type="text"
                  maxLength={4}
                  value={overlays.scoreAwayName}
                  onChange={(e) =>
                    onUpdateOverlays({
                      scoreAwayName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-16 px-2 py-1.5 bg-[#121720] border border-white/12 rounded text-xs font-mono text-center text-white"
                />

                <input
                  type="text"
                  value={overlays.matchClock}
                  onChange={(e) =>
                    onUpdateOverlays({ matchClock: e.target.value })
                  }
                  className="w-20 px-2 py-1.5 bg-[#121720] border border-white/12 rounded text-xs font-mono text-center text-amber-300 tabular-nums"
                />

                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlays({
                      scoreHome: 0,
                      scoreAway: 0,
                      matchClock: '00:00',
                    })
                  }
                  title="Reiniciar marcador"
                  className="min-h-[34px] px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
