import React, { useRef } from 'react';
import {
  ImagePlus,
  Megaphone,
  Plus,
  RotateCcw,
  Trash2,
  Tv,
} from 'lucide-react';
import { DEFAULT_SPONSOR_BANNERS, WHATSAPP_DISPLAY } from '../data/tvTemplates';
import { SponsorBanner } from '../types/broadcast';

interface SponsorManagerPanelProps {
  programTitle?: string;
  sponsors: SponsorBanner[];
  onUpdateSponsors: (next: SponsorBanner[]) => void;
  onPushSponsorToLowerThird: (sponsor: SponsorBanner) => void;
  onResetSponsors: () => void;
}

async function resizeLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error leyendo imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida'));
      img.onload = () => {
        const maxSide = 360;
        let w = img.naturalWidth || 360;
        let h = img.naturalHeight || 360;
        if (w > maxSide || h > maxSide) {
          if (w >= h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const SponsorManagerPanel: React.FC<SponsorManagerPanelProps> = ({
  programTitle = '#SinFiltro',
  sponsors,
  onUpdateSponsors,
  onPushSponsorToLowerThird,
  onResetSponsors,
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateOne = (id: string, patch: Partial<SponsorBanner>) => {
    onUpdateSponsors(
      sponsors.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp))
    );
  };

  const handleUploadLogo = async (id: string, file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await resizeLogoFileToDataUrl(file);
      updateOne(id, {
        logoUrl: dataUrl,
        isOccupied: true,
        badgeText: 'Auspiciante Oficial',
      });
    } catch {
      // ignore invalid image
    }
  };

  const handleClearSlot = (id: string, index: number) => {
    const template = DEFAULT_SPONSOR_BANNERS[index];
    updateOne(id, {
      name: template?.name || `Auspiciante ${index + 1}`,
      message:
        template?.message ||
        'Espacio reservado para comercio o anunciante local.',
      logoUrl: undefined,
      badgeText: 'Espacio publicitario disponible',
      ctaText: 'Contactar para anunciar',
      isOccupied: false,
    });
  };

  const handleAddBanner = () => {
    const num = sponsors.length + 1;
    const next: SponsorBanner = {
      id: `sponsor-${Date.now()}`,
      slotLabel: `BANNER ${num}`,
      name: `Auspiciante ${num}`,
      message: 'Espacio reservado para comercio o anunciante local.',
      badgeText: 'Espacio publicitario disponible',
      ctaText: 'Contactar para anunciar',
      isOccupied: false,
    };
    onUpdateSponsors([...sponsors, next]);
  };

  const handleDeleteBanner = (id: string) => {
    if (sponsors.length <= 1) return;
    onUpdateSponsors(sponsors.filter((s) => s.id !== id));
  };

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 sm:p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-base font-semibold text-white">
              Espacio Publicitario y Auspiciantes ({programTitle})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Agregá el logo, nombre y mensaje de cada comercio o auspiciante. Los espacios libres derivan al WhatsApp {WHATSAPP_DISPLAY}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddBanner}
            className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Banner</span>
          </button>
          <button
            type="button"
            onClick={onResetSponsors}
            className="min-h-[38px] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar 3 Espacios</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sponsors.map((sp, idx) => (
          <div
            key={sp.id}
            className={`p-4 rounded-xl border space-y-3.5 flex flex-col justify-between ${
              sp.isOccupied
                ? 'bg-[#0C1812] border-emerald-500/45'
                : 'bg-[#0A0D12] border-white/10'
            }`}
          >
            <div className="space-y-3">
              {/* Top Slot Header */}
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={sp.slotLabel}
                  onChange={(e) =>
                    updateOne(sp.id, { slotLabel: e.target.value })
                  }
                  className="w-28 px-2 py-1 bg-[#121720] border border-white/12 rounded text-[11px] font-mono font-bold text-emerald-300"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateOne(sp.id, {
                        isOccupied: !sp.isOccupied,
                        badgeText: !sp.isOccupied
                          ? 'Auspiciante Oficial'
                          : 'Espacio publicitario disponible',
                      })
                    }
                    className={`min-h-[30px] px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      sp.isOccupied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/8 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {sp.isOccupied ? 'Publicado' : 'Disponible'}
                  </button>

                  {sponsors.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(sp.id)}
                      title="Eliminar banner"
                      className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded bg-red-950/50 hover:bg-red-900/70 text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Logo Upload + Preview */}
              <div className="flex items-center gap-3 p-2.5 bg-[#121720] border border-white/10 rounded-lg">
                <div className="w-16 h-16 rounded-lg bg-[#080B10] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {sp.logoUrl ? (
                    <img
                      src={sp.logoUrl}
                      alt={sp.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[sp.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleUploadLogo(sp.id, e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[sp.id]?.click()}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium rounded cursor-pointer"
                    >
                      {sp.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </button>
                    {sp.logoUrl && (
                      <button
                        type="button"
                        onClick={() => updateOne(sp.id, { logoUrl: undefined })}
                        className="px-2 py-1 bg-white/8 hover:bg-white/15 text-slate-300 text-[11px] rounded cursor-pointer"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={
                      sp.logoUrl && !sp.logoUrl.startsWith('data:')
                        ? sp.logoUrl
                        : ''
                    }
                    onChange={(e) =>
                      updateOne(sp.id, {
                        logoUrl: e.target.value || undefined,
                        isOccupied: Boolean(e.target.value) || sp.isOccupied,
                      })
                    }
                    placeholder="O pegá URL del logo..."
                    className="w-full px-2 py-1 bg-[#0A0D12] border border-white/10 rounded text-[11px] text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Sponsor Name */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nombre del Auspiciante / Comercio
                </label>
                <input
                  type="text"
                  value={sp.name}
                  onChange={(e) =>
                    updateOne(sp.id, {
                      name: e.target.value,
                      isOccupied: true,
                      badgeText:
                        sp.badgeText === 'Espacio publicitario disponible'
                          ? 'Auspiciante Oficial'
                          : sp.badgeText || 'Auspiciante Oficial',
                    })
                  }
                  placeholder={`Ej: Comercio Local ${idx + 1}`}
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-white"
                />
              </div>

              {/* Sponsor Message */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Mensaje del Auspiciante
                </label>
                <textarea
                  rows={2}
                  value={sp.message}
                  onChange={(e) =>
                    updateOne(sp.id, {
                      message: e.target.value,
                      isOccupied: true,
                    })
                  }
                  placeholder="Promoción, horario, dirección o saludo al programa..."
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-slate-200 resize-none"
                />
              </div>

              {/* Contact / CTA & Badge */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Etiqueta
                  </label>
                  <input
                    type="text"
                    value={sp.badgeText || ''}
                    onChange={(e) =>
                      updateOne(sp.id, { badgeText: e.target.value })
                    }
                    placeholder="Auspiciante Oficial"
                    className="w-full px-2.5 py-1.5 bg-[#121720] border border-white/10 rounded text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Contacto / Pie
                  </label>
                  <input
                    type="text"
                    value={sp.ctaText || ''}
                    onChange={(e) =>
                      updateOne(sp.id, { ctaText: e.target.value })
                    }
                    placeholder="Instagram / WhatsApp"
                    className="w-full px-2.5 py-1.5 bg-[#121720] border border-white/10 rounded text-[11px] text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-white/8 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onPushSponsorToLowerThird(sp)}
                className="flex-1 min-h-[34px] px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Sacar en Zócalo</span>
              </button>
              <button
                type="button"
                onClick={() => handleClearSlot(sp.id, idx)}
                className="min-h-[34px] px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] rounded-lg cursor-pointer"
              >
                Dejar disponible
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
