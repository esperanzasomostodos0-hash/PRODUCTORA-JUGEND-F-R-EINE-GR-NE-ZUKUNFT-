import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import { PRODUCER_ROLES, SiteContentConfig, StaffUserPublic } from '../types/producer';

interface ProducerSiteEditorProps {
  token: string;
  currentUser: StaffUserPublic;
  siteContent: SiteContentConfig;
  onSiteContentUpdated: (next: SiteContentConfig) => void;
  onBack: () => void;
  onHome: () => void;
}

type EditorTab =
  | 'hero'
  | 'metrics'
  | 'manifesto'
  | 'programs'
  | 'services'
  | 'alliances'
  | 'contact';

export const ProducerSiteEditor: React.FC<ProducerSiteEditorProps> = ({
  token,
  currentUser,
  siteContent,
  onSiteContentUpdated,
  onBack,
  onHome,
}) => {
  const [draft, setDraft] = useState<SiteContentConfig>(siteContent);
  const [activeTab, setActiveTab] = useState<EditorTab>('hero');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdminTotal = PRODUCER_ROLES[currentUser.role].canManageUsers;

  const handleImageUpload = (
    field: 'logoUrl' | 'heroImageUrl' | 'manifestoImageUrl' | 'controlRoomImageUrl',
    file?: File
  ) => {
    if (!file) return;
    if (file.size > 1_400_000) {
      setErrorMsg('La imagen supera 1.4 MB. Usá una imagen más liviana.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((prev) => ({ ...prev, [field]: reader.result as string }));
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/producer/site', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudieron guardar los cambios.');
        return;
      }
      setDraft(data.siteContent);
      onSiteContentUpdated(data.siteContent);
      setStatusMsg('Todos los cambios del sitio fueron publicados.');
    } catch {
      setErrorMsg('Error de conexión al guardar el sitio.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/producer/site/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo restablecer el sitio.');
        return;
      }
      setDraft(data.siteContent);
      onSiteContentUpdated(data.siteContent);
      setStatusMsg('Textos e imágenes restaurados a los valores base.');
    } catch {
      setErrorMsg('Error al restablecer valores.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050708] text-slate-100 flex flex-col">
      {/* Persistent Return Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#080B0D]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-3.5 py-2 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver atrás</span>
            </button>
            <button
              type="button"
              onClick={onHome}
              className="min-h-[40px] px-3.5 py-2 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span>Volver al inicio</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdminTotal && (
              <button
                type="button"
                disabled={saving}
                onClick={handleReset}
                className="min-h-[40px] px-3.5 py-2 border border-white/15 hover:border-red-400/50 text-slate-300 hover:text-red-300 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Base</span>
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="min-h-[40px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Publicar Cambios en el Sitio'}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-mono text-emerald-400">
            EDITOR COMPLETO DEL SITIO · {PRODUCER_ROLES[currentUser.role].label.toUpperCase()}
          </div>
          <h1 className="font-cinema text-2xl sm:text-3xl font-semibold text-white">
            Editar Todo el Contenido del Sitio Web
          </h1>
          <p className="text-sm text-slate-400">
            Modificá títulos, descripciones, fechas, fotografías, logotipo, pilares, servicios, alianzas y datos de contacto de cada apartado.
          </p>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0A0E10] border border-white/10 rounded-xl">
          {(
            [
              { id: 'hero', label: 'Identidad y Portada' },
              { id: 'metrics', label: 'Cinta de 4 Datos' },
              { id: 'manifesto', label: 'Manifiesto y Pilares' },
              { id: 'programs', label: 'Encabezado Cartelera' },
              { id: 'services', label: 'Servicios y Consola' },
              { id: 'alliances', label: 'Alianzas' },
              { id: 'contact', label: 'Contacto y Pie' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Form */}
        <div className="bg-[#090D0F] border border-white/12 rounded-xl p-6 sm:p-8 space-y-6">
          {activeTab === 'hero' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre de la Productora (Barra y Marca)
                </label>
                <input
                  type="text"
                  value={draft.brandName}
                  onChange={(e) =>
                    setDraft({ ...draft, brandName: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Lema Principal
                </label>
                <input
                  type="text"
                  value={draft.mottoText}
                  onChange={(e) =>
                    setDraft({ ...draft, mottoText: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dueño y Creador de la Productora
                </label>
                <input
                  type="text"
                  value={draft.ownerName || 'ALMADA EDUARDO THOMAS'}
                  onChange={(e) =>
                    setDraft({ ...draft, ownerName: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm font-semibold text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Fecha Fundacional
                </label>
                <input
                  type="text"
                  value={draft.foundingDateText}
                  onChange={(e) =>
                    setDraft({ ...draft, foundingDateText: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Ciudad / Sede
                </label>
                <input
                  type="text"
                  value={draft.locationText}
                  onChange={(e) =>
                    setDraft({ ...draft, locationText: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Titular Principal (Hero H1)
                </label>
                <input
                  type="text"
                  value={draft.heroHeadline}
                  onChange={(e) =>
                    setDraft({ ...draft, heroHeadline: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Párrafo de Presentación
                </label>
                <textarea
                  rows={3}
                  value={draft.heroDescription}
                  onChange={(e) =>
                    setDraft({ ...draft, heroDescription: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Botón Principal del Hero
                </label>
                <input
                  type="text"
                  value={draft.heroPrimaryCta}
                  onChange={(e) =>
                    setDraft({ ...draft, heroPrimaryCta: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Enlace Secundario del Hero
                </label>
                <input
                  type="text"
                  value={draft.heroSecondaryCta}
                  onChange={(e) =>
                    setDraft({ ...draft, heroSecondaryCta: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Subtítulo bajo el Logo (Izquierda)
                </label>
                <input
                  type="text"
                  value={draft.emblemTagline}
                  onChange={(e) =>
                    setDraft({ ...draft, emblemTagline: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Etiqueta bajo el Logo (Derecha)
                </label>
                <input
                  type="text"
                  value={draft.emblemCategory}
                  onChange={(e) =>
                    setDraft({ ...draft, emblemCategory: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL o Archivo del Logotipo Oficial
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.logoUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, logoUrl: e.target.value })
                    }
                    className="flex-1 min-h-[42px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                  />
                  <label className="min-h-[42px] px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload('logoUrl', e.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL o Archivo de Imagen Fondo de Portada
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.heroImageUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, heroImageUrl: e.target.value })
                    }
                    className="flex-1 min-h-[42px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                  />
                  <label className="min-h-[42px] px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload('heroImageUrl', e.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {draft.dossierMetrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#050708] border border-white/10 rounded-lg space-y-3"
                >
                  <div className="text-xs font-mono text-emerald-400">
                    BLOQUE DE DATO #{idx + 1}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Etiqueta
                    </label>
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => {
                        const next = [...draft.dossierMetrics];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setDraft({ ...draft, dossierMetrics: next });
                      }}
                      className="w-full px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Valor destacado
                    </label>
                    <input
                      type="text"
                      value={m.value}
                      onChange={(e) => {
                        const next = [...draft.dossierMetrics];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setDraft({ ...draft, dossierMetrics: next });
                      }}
                      className="w-full px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'manifesto' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Antetítulo Manifiesto
                  </label>
                  <input
                    type="text"
                    value={draft.manifestoEyebrow}
                    onChange={(e) =>
                      setDraft({ ...draft, manifestoEyebrow: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Imagen Manifiesto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draft.manifestoImageUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, manifestoImageUrl: e.target.value })
                      }
                      className="flex-1 px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                    />
                    <label className="px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(
                            'manifestoImageUrl',
                            e.target.files?.[0]
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Título Manifiesto
                </label>
                <input
                  type="text"
                  value={draft.manifestoTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, manifestoTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Cuerpo del Manifiesto
                </label>
                <textarea
                  rows={3}
                  value={draft.manifestoBody}
                  onChange={(e) =>
                    setDraft({ ...draft, manifestoBody: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {draft.manifestoPillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#050708] border border-white/10 rounded-lg space-y-2.5"
                  >
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => {
                        const next = [...draft.manifestoPillars];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setDraft({ ...draft, manifestoPillars: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs font-semibold text-white"
                    />
                    <textarea
                      rows={3}
                      value={pillar.description}
                      onChange={(e) => {
                        const next = [...draft.manifestoPillars];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setDraft({ ...draft, manifestoPillars: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs text-slate-300 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'programs' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Antetítulo Sección Programas
                </label>
                <input
                  type="text"
                  value={draft.programsEyebrow}
                  onChange={(e) =>
                    setDraft({ ...draft, programsEyebrow: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Título Sección Programas
                </label>
                <input
                  type="text"
                  value={draft.programsTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, programsTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Subtítulo Sección Programas
                </label>
                <textarea
                  rows={2}
                  value={draft.programsSubtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, programsSubtitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>
              <p className="text-xs text-slate-400">
                Para agregar, editar o eliminar cada programa individual (como #SinFiltro o nuevos ciclos), utilizá el Panel de Productora → Cartelera de Programas.
              </p>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Antetítulo Servicios
                  </label>
                  <input
                    type="text"
                    value={draft.servicesEyebrow}
                    onChange={(e) =>
                      setDraft({ ...draft, servicesEyebrow: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Título Servicios
                  </label>
                  <input
                    type="text"
                    value={draft.servicesTitle}
                    onChange={(e) =>
                      setDraft({ ...draft, servicesTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#050708] border border-white/10 rounded-lg space-y-3">
                <div className="text-xs font-mono text-emerald-400">
                  BLOQUE CONSOLA DIGITAL MESACONTROL TV
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={draft.controlRoomEyebrow}
                    onChange={(e) =>
                      setDraft({ ...draft, controlRoomEyebrow: e.target.value })
                    }
                    placeholder="Subtítulo consola"
                    className="px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={draft.controlRoomTitle}
                    onChange={(e) =>
                      setDraft({ ...draft, controlRoomTitle: e.target.value })
                    }
                    placeholder="Título consola"
                    className="px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-xs text-white"
                  />
                </div>
                <textarea
                  rows={2}
                  value={draft.controlRoomBody}
                  onChange={(e) =>
                    setDraft({ ...draft, controlRoomBody: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-xs text-slate-300 resize-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.controlRoomImageUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, controlRoomImageUrl: e.target.value })
                    }
                    className="flex-1 px-3 py-2 bg-[#090D0F] border border-white/15 rounded-lg text-xs text-white font-mono"
                  />
                  <label className="px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(
                          'controlRoomImageUrl',
                          e.target.files?.[0]
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draft.capabilities.map((cap, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#050708] border border-white/10 rounded-lg space-y-2.5"
                  >
                    <input
                      type="text"
                      value={cap.title}
                      onChange={(e) => {
                        const next = [...draft.capabilities];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setDraft({ ...draft, capabilities: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs font-semibold text-white"
                    />
                    <textarea
                      rows={2}
                      value={cap.description}
                      onChange={(e) => {
                        const next = [...draft.capabilities];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setDraft({ ...draft, capabilities: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs text-slate-300 resize-none"
                    />
                    <input
                      type="text"
                      value={cap.deliverable}
                      onChange={(e) => {
                        const next = [...draft.capabilities];
                        next[idx] = { ...next[idx], deliverable: e.target.value };
                        setDraft({ ...draft, capabilities: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs text-emerald-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alliances' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Antetítulo Alianzas
                  </label>
                  <input
                    type="text"
                    value={draft.alliancesEyebrow}
                    onChange={(e) =>
                      setDraft({ ...draft, alliancesEyebrow: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Título Alianzas
                  </label>
                  <input
                    type="text"
                    value={draft.alliancesTitle}
                    onChange={(e) =>
                      setDraft({ ...draft, alliancesTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={draft.alliancesSubtitle}
                onChange={(e) =>
                  setDraft({ ...draft, alliancesSubtitle: e.target.value })
                }
                className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {draft.partnershipModels.map((pm, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#050708] border border-white/10 rounded-lg space-y-2.5"
                  >
                    <input
                      type="text"
                      value={pm.name}
                      onChange={(e) => {
                        const next = [...draft.partnershipModels];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setDraft({ ...draft, partnershipModels: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs font-semibold text-white"
                    />
                    <textarea
                      rows={3}
                      value={pm.detail}
                      onChange={(e) => {
                        const next = [...draft.partnershipModels];
                        next[idx] = { ...next[idx], detail: e.target.value };
                        setDraft({ ...draft, partnershipModels: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs text-slate-300 resize-none"
                    />
                    <input
                      type="text"
                      value={pm.actionLabel}
                      onChange={(e) => {
                        const next = [...draft.partnershipModels];
                        next[idx] = { ...next[idx], actionLabel: e.target.value };
                        setDraft({ ...draft, partnershipModels: next });
                      }}
                      className="w-full px-3 py-1.5 bg-[#090D0F] border border-white/15 rounded-md text-xs text-emerald-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Antetítulo Contacto
                </label>
                <input
                  type="text"
                  value={draft.contactEyebrow}
                  onChange={(e) =>
                    setDraft({ ...draft, contactEyebrow: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Título Contacto
                </label>
                <input
                  type="text"
                  value={draft.contactTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, contactTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-300 mb-1.5">
                  Texto Invitación Contacto
                </label>
                <textarea
                  rows={2}
                  value={draft.contactBody}
                  onChange={(e) =>
                    setDraft({ ...draft, contactBody: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  WhatsApp Visible
                </label>
                <input
                  type="text"
                  value={draft.whatsappDisplay}
                  onChange={(e) =>
                    setDraft({ ...draft, whatsappDisplay: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Número WhatsApp (solo dígitos, con código país)
                </label>
                <input
                  type="text"
                  value={draft.whatsappNumber}
                  onChange={(e) =>
                    setDraft({ ...draft, whatsappNumber: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Correo Institucional
                </label>
                <input
                  type="text"
                  value={draft.contactEmail}
                  onChange={(e) =>
                    setDraft({ ...draft, contactEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Línea del Pie de Página
                </label>
                <input
                  type="text"
                  value={draft.footerSubline}
                  onChange={(e) =>
                    setDraft({ ...draft, footerSubline: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
