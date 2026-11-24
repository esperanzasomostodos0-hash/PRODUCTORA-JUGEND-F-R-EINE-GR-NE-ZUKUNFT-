import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Clapperboard,
  Eye,
  Plus,
  Radio,
  RotateCcw,
  Trash2,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { ClosingCreditEntry, ClosingSlateConfig } from '../types/broadcast';
import { OFFICIAL_PRODUCER_LOGO } from '../data/tvTemplates';

interface AudienceAndClosingPanelProps {
  programId: string;
  programTitle: string;
  programLogoUrl?: string;
  realViewerCount: number;
  displayedAudienceCount: number;
  audienceMode: 'real' | 'inflated';
  inflatedCount: number;
  onApplyAudience: (
    mode: 'real' | 'inflated',
    inflatedCount: number
  ) => Promise<void>;
  closingSlate: ClosingSlateConfig;
  onChangeClosingSlate: (next: ClosingSlateConfig) => void;
  onResetClosingSlate: () => void;
}

const AUDIENCE_PRESETS = [0, 50, 150, 500, 1200];

export const AudienceAndClosingPanel: React.FC<AudienceAndClosingPanelProps> = ({
  programId,
  programTitle,
  programLogoUrl,
  realViewerCount,
  displayedAudienceCount,
  audienceMode,
  inflatedCount,
  onApplyAudience,
  closingSlate,
  onChangeClosingSlate,
  onResetClosingSlate,
}) => {
  const [draftMode, setDraftMode] = useState<'real' | 'inflated'>(audienceMode);
  const [draftInflated, setDraftInflated] = useState<number>(inflatedCount);
  const [savingAudience, setSavingAudience] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDraftMode(audienceMode);
    setDraftInflated(inflatedCount);
  }, [programId, audienceMode, inflatedCount]);

  const handleApplyAudience = async (
    nextMode: 'real' | 'inflated' = draftMode,
    nextCount: number = draftInflated
  ) => {
    setSavingAudience(true);
    try {
      await onApplyAudience(nextMode, Math.max(0, Math.round(nextCount || 0)));
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 1800);
    } finally {
      setSavingAudience(false);
    }
  };

  const handleImageUpload = (
    field: 'programLogoUrl' | 'radioLogoUrl' | 'producerLogoUrl',
    file?: File
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeClosingSlate({
          ...closingSlate,
          [field]: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateCredit = (
    idx: number,
    patch: Partial<ClosingCreditEntry>
  ) => {
    const nextCredits = closingSlate.credits.map((entry, i) =>
      i === idx ? { ...entry, ...patch } : entry
    );
    onChangeClosingSlate({
      ...closingSlate,
      credits: nextCredits,
    });
  };

  const handleAddCredit = () => {
    onChangeClosingSlate({
      ...closingSlate,
      credits: [
        ...closingSlate.credits,
        { area: 'Nueva Área', names: 'Nombre y Apellido' },
      ],
    });
  };

  const handleRemoveCredit = (idx: number) => {
    onChangeClosingSlate({
      ...closingSlate,
      credits: closingSlate.credits.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-5">
      {/* Card 1: Control de Vistas 100% Reales / Inflar Vistas */}
      <section className="bg-[#121720] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Control de Vistas en Vivo · {programTitle}
              </h2>
              <p className="text-xs text-slate-400">
                Medición 100% real de espectadores conectados con opción manual de inflar vistas en pantalla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border ${
                audienceMode === 'real'
                  ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-600/50 text-amber-300'
              }`}
            >
              {audienceMode === 'real' ? 'MODO 100% REAL' : 'MODO INFLADO ACTIVO'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-[#0A0D12] border border-white/8 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Vistas 100% Reales
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Espectadores conectados ahora mismo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-2xl font-bold text-white tabular-nums">
                {realViewerCount}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#0A0D12] border border-white/8 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Mostrado al Público
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Valor visible en la emisión en vivo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`w-4 h-4 ${
                  audienceMode === 'inflated' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              />
              <span className="font-mono text-2xl font-bold text-white tabular-nums">
                {displayedAudienceCount}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end p-3.5 bg-[#0A0D12] border border-white/8 rounded-lg">
          <div className="lg:col-span-4 space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Modo de Conteo Público
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftMode('real');
                  void handleApplyAudience('real', draftInflated);
                }}
                className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  draftMode === 'real'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#121720] text-slate-300 border-white/10 hover:bg-white/5'
                }`}
              >
                100% Reales
              </button>
              <button
                type="button"
                onClick={() => setDraftMode('inflated')}
                className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  draftMode === 'inflated'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-[#121720] text-slate-300 border-white/10 hover:bg-white/5'
                }`}
              >
                Inflar Vistas
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Valor Manual (cuando está en Inflar Vistas)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                value={draftInflated}
                onChange={(e) =>
                  setDraftInflated(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 px-3 py-2 bg-[#121720] border border-white/15 rounded-lg text-sm font-mono font-bold text-white"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {AUDIENCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDraftInflated(preset);
                      if (draftMode === 'inflated') {
                        void handleApplyAudience('inflated', preset);
                      }
                    }}
                    className={`min-h-[34px] px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                      draftInflated === preset
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-[#121720] border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex justify-end">
            <button
              type="button"
              disabled={savingAudience}
              onClick={() => void handleApplyAudience(draftMode, draftInflated)}
              className="w-full min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {savedNotice ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Aplicado al Aire</span>
                </>
              ) : (
                <span>
                  {savingAudience ? 'Aplicando...' : 'Aplicar al Aire'}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Card 2: Placa de Cierre (Final de Programa) */}
      <section className="bg-[#121720] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Placa de Cierre · Final de Programa
              </h2>
              <p className="text-xs text-slate-400">
                Muestra los logos del programa, la radio y la productora junto a los nombres de cada área
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetClosingSlate}
              className="min-h-[38px] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Créditos Base</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onChangeClosingSlate({
                  ...closingSlate,
                  active: !closingSlate.active,
                })
              }
              className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                closingSlate.active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>
                {closingSlate.active
                  ? 'Ocultar Placa de Cierre'
                  : 'Mostrar Placa de Cierre al Aire'}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Logos + Textos Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Encabezado de Cierre
            </label>
            <input
              type="text"
              value={closingSlate.headline}
              onChange={(e) =>
                onChangeClosingSlate({
                  ...closingSlate,
                  headline: e.target.value,
                })
              }
              placeholder="GRACIAS POR ACOMPAÑARNOS"
              className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Dueño y Creador de la Productora
            </label>
            <input
              type="text"
              value={closingSlate.ownerCredit}
              onChange={(e) =>
                onChangeClosingSlate({
                  ...closingSlate,
                  ownerCredit: e.target.value,
                })
              }
              placeholder="Dueño y Creador: ALMADA EDUARDO THOMAS"
              className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-emerald-300"
            />
          </div>

          {/* Program Logo */}
          <div className="p-3 bg-[#121720] border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white">
                1. Programa y Logo
              </span>
              {(closingSlate.programLogoUrl || programLogoUrl) && (
                <img
                  src={closingSlate.programLogoUrl || programLogoUrl}
                  alt={closingSlate.programTitle || programTitle}
                  className="h-7 w-auto object-contain"
                />
              )}
            </div>
            <input
              type="text"
              value={closingSlate.programTitle || programTitle}
              onChange={(e) =>
                onChangeClosingSlate({
                  ...closingSlate,
                  programTitle: e.target.value,
                })
              }
              placeholder="Nombre del programa"
              className="w-full px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-xs text-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={closingSlate.programLogoUrl || ''}
                onChange={(e) =>
                  onChangeClosingSlate({
                    ...closingSlate,
                    programLogoUrl: e.target.value,
                  })
                }
                placeholder="URL del logo del programa"
                className="flex-1 px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-[11px] text-slate-200"
              />
              <label className="px-2.5 py-1.5 bg-white/8 hover:bg-white/15 border border-white/10 rounded text-[11px] text-white cursor-pointer flex items-center gap-1 shrink-0">
                <Upload className="w-3 h-3" />
                <span>Subir</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload('programLogoUrl', e.target.files?.[0])
                  }
                />
              </label>
            </div>
          </div>

          {/* Radio Logo */}
          <div className="p-3 bg-[#121720] border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Radio y Logo</span>
              </span>
              {closingSlate.radioLogoUrl ? (
                <img
                  src={closingSlate.radioLogoUrl}
                  alt={closingSlate.radioName}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/40">
                  Emblema 88.5 FM
                </span>
              )}
            </div>
            <input
              type="text"
              value={closingSlate.radioName}
              onChange={(e) =>
                onChangeClosingSlate({
                  ...closingSlate,
                  radioName: e.target.value,
                })
              }
              placeholder="Radioactiva 88.5 FM"
              className="w-full px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-xs text-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={closingSlate.radioLogoUrl || ''}
                onChange={(e) =>
                  onChangeClosingSlate({
                    ...closingSlate,
                    radioLogoUrl: e.target.value,
                  })
                }
                placeholder="URL del logo de la radio (opcional)"
                className="flex-1 px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-[11px] text-slate-200"
              />
              <label className="px-2.5 py-1.5 bg-white/8 hover:bg-white/15 border border-white/10 rounded text-[11px] text-white cursor-pointer flex items-center gap-1 shrink-0">
                <Upload className="w-3 h-3" />
                <span>Subir</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload('radioLogoUrl', e.target.files?.[0])
                  }
                />
              </label>
            </div>
          </div>

          {/* Producer Logo */}
          <div className="md:col-span-2 p-3 bg-[#121720] border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white">
                3. Productora y Logo
              </span>
              <img
                src={closingSlate.producerLogoUrl || OFFICIAL_PRODUCER_LOGO}
                alt={closingSlate.producerName}
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={closingSlate.producerName}
                onChange={(e) =>
                  onChangeClosingSlate({
                    ...closingSlate,
                    producerName: e.target.value,
                  })
                }
                placeholder="JUGEND FÜR EINE GRÜNE ZUKUNFT"
                className="w-full px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-xs text-white"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={closingSlate.producerLogoUrl || ''}
                  onChange={(e) =>
                    onChangeClosingSlate({
                      ...closingSlate,
                      producerLogoUrl: e.target.value,
                    })
                  }
                  placeholder="URL del logo de la productora"
                  className="flex-1 px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-[11px] text-slate-200"
                />
                <label className="px-2.5 py-1.5 bg-white/8 hover:bg-white/15 border border-white/10 rounded text-[11px] text-white cursor-pointer flex items-center gap-1 shrink-0">
                  <Upload className="w-3 h-3" />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload('producerLogoUrl', e.target.files?.[0])
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Credits Table by Area */}
        <div className="p-4 bg-[#0A0D12] border border-white/8 rounded-lg space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-white">
                Equipo y Nombres por Área (en Placa de Cierre)
              </h3>
              <p className="text-[11px] text-slate-400">
                Cada fila muestra el área y los nombres de las personas responsables al finalizar el programa
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCredit}
              className="min-h-[34px] px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Área</span>
            </button>
          </div>

          <div className="space-y-2">
            {closingSlate.credits.map((entry, idx) => (
              <div
                key={`credit-${idx}`}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                <input
                  type="text"
                  value={entry.area}
                  onChange={(e) =>
                    handleUpdateCredit(idx, { area: e.target.value })
                  }
                  placeholder="Área (ej: Conducción)"
                  className="sm:col-span-5 px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-medium text-emerald-300"
                />
                <input
                  type="text"
                  value={entry.names}
                  onChange={(e) =>
                    handleUpdateCredit(idx, { names: e.target.value })
                  }
                  placeholder="Nombres de las personas"
                  className="sm:col-span-6 px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCredit(idx)}
                  title="Eliminar área"
                  className="sm:col-span-1 min-h-[36px] flex items-center justify-center bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
