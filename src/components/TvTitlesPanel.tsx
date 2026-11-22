import React, { useState } from 'react';
import {
  EyeOff,
  Plus,
  Sparkles,
  Trash2,
  Tv,
  Type,
} from 'lucide-react';
import {
  ActiveTvTitle,
  OverlayState,
  TvTitlePreset,
  TvTitleStyle,
} from '../types/broadcast';

interface TvTitlesPanelProps {
  titles: TvTitlePreset[];
  overlays: OverlayState;
  onUpdateTitles: (next: TvTitlePreset[]) => void;
  onTriggerTitle: (preset: TvTitlePreset) => void;
  onClearActiveTitle: () => void;
}

const STYLE_LABELS: Record<TvTitleStyle, string> = {
  lower_third: 'Zócalo Inferior',
  headline_banner: 'Titular Pantalla',
  full_title: 'Placa Central TV',
};

const TAG_OPTIONS = [
  'EN VIVO',
  'TEMA DEL DÍA',
  'INVITADO',
  'CONDUCCIÓN',
  'TRIVIA EN VIVO',
  'ÚLTIMO MOMENTO',
  'AGENDA',
];

export const TvTitlesPanel: React.FC<TvTitlesPanelProps> = ({
  titles,
  overlays,
  onUpdateTitles,
  onTriggerTitle,
  onClearActiveTitle,
}) => {
  const [newTag, setNewTag] = useState('EN VIVO');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newStyle, setNewStyle] = useState<TvTitleStyle>('headline_banner');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: TvTitlePreset = {
      id: `title-${Date.now()}`,
      tag: newTag.trim() || 'EN VIVO',
      title: newTitle.trim(),
      subtitle: newSubtitle.trim(),
      style: newStyle,
    };
    onUpdateTitles([created, ...titles]);
    onTriggerTitle(created);
    setNewTitle('');
    setNewSubtitle('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    onUpdateTitles(titles.filter((t) => t.id !== id));
  };

  const isPresetLive = (preset: TvTitlePreset): boolean => {
    if (preset.style === 'lower_third') {
      return (
        overlays.showLowerThird &&
        overlays.lowerThirdTitle === preset.title
      );
    }
    const active: ActiveTvTitle | null | undefined = overlays.activeBannerTitle;
    return Boolean(
      active &&
        active.title === preset.title &&
        active.style === preset.style
    );
  };

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-sm sm:text-base font-semibold text-white">
              Generador de Títulos y Zócalos de Televisión
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Agregá titulares, zócalos o placas de TV y sacalos al aire en 1 clic durante la transmisión
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overlays.activeBannerTitle && (
            <button
              type="button"
              onClick={onClearActiveTitle}
              className="min-h-[36px] px-3 py-1.5 bg-red-600/20 hover:bg-red-600/35 border border-red-500/45 text-red-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Quitar Titular del Aire</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Cerrar' : 'Agregar Título TV'}</span>
          </button>
        </div>
      </div>

      {/* Create New TV Title Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddTitle}
          className="p-3.5 bg-[#0A0D12] border border-emerald-500/35 rounded-xl space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Formato en Pantalla
              </label>
              <select
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value as TvTitleStyle)}
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              >
                <option value="headline_banner">Titular Superior TV</option>
                <option value="lower_third">Zócalo Inferior (Lower Third)</option>
                <option value="full_title">Placa Central TV</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Etiqueta / Categoría
              </label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              >
                {TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Título Principal
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: AGENDA DE LA SEMANA"
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">
                Bajada / Subtítulo (opcional)
              </label>
              <input
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Ej: Puerto Esperanza · Edición en Vivo"
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="min-h-[38px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Guardar y Sacar al Aire</span>
            </button>
          </div>
        </form>
      )}

      {/* Saved TV Titles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {titles.map((preset) => {
          const isLive = isPresetLive(preset);
          return (
            <div
              key={preset.id}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                isLive
                  ? 'bg-[#0E1E16] border-emerald-500 text-white'
                  : 'bg-[#0A0D12] border-white/10 text-slate-200'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono font-bold rounded">
                    {preset.tag}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 truncate">
                    {STYLE_LABELS[preset.style]}
                  </span>
                </div>
                <p className="font-display text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                  {preset.title}
                </p>
                {preset.subtitle && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8">
                <button
                  type="button"
                  onClick={() =>
                    isLive && preset.style !== 'lower_third'
                      ? onClearActiveTitle()
                      : onTriggerTitle(preset)
                  }
                  className={`flex-1 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600/25 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>
                    {isLive
                      ? preset.style === 'lower_third'
                        ? 'En Zócalo'
                        : 'Quitar del Aire'
                      : 'Sacar al Aire'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(preset.id)}
                  title="Eliminar título"
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-950/60 text-slate-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
