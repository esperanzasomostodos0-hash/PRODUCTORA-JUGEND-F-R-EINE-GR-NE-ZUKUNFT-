import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save, Upload, X } from 'lucide-react';
import { ProducerProgram, ProgramStatusKey } from '../types/producer';

interface ProgramQuickEditModalProps {
  open: boolean;
  program: ProducerProgram | null;
  authToken: string | null;
  onClose: () => void;
  onRequestAuth: () => void;
  onSaved: (updated: ProducerProgram, allPrograms: ProducerProgram[]) => void;
}

export const ProgramQuickEditModal: React.FC<ProgramQuickEditModalProps> = ({
  open,
  program,
  authToken,
  onClose,
  onRequestAuth,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [statusKey, setStatusKey] = useState<ProgramStatusKey>('airing');
  const [statusLabel, setStatusLabel] = useState('En emisión');
  const [format, setFormat] = useState('');
  const [schedule, setSchedule] = useState('');
  const [duration, setDuration] = useState('');
  const [hostTeam, setHostTeam] = useState('');
  const [channelOrSignal, setChannelOrSignal] = useState('');
  const [summary, setSummary] = useState('');
  const [fullSynopsis, setFullSynopsis] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!open || !program) return;
    setErrorMsg(null);
    setSavedOk(false);
    setTitle(program.title);
    setStatusKey(program.statusKey);
    setStatusLabel(program.statusLabel);
    setFormat(program.format);
    setSchedule(program.schedule);
    setDuration(program.duration);
    setHostTeam(program.hostTeam || '');
    setChannelOrSignal(program.channelOrSignal || '');
    setSummary(program.summary);
    setFullSynopsis(program.fullSynopsis);
    setSpecsText((program.technicalSpecs || []).join('\n'));
    setImageUrl(program.imageUrl || '');
    setLogoUrl(program.logoUrl || '');
    setFeatured(Boolean(program.featured));
  }, [open, program]);

  if (!open || !program) return null;

  const handleImageFile = (file: File | undefined, target: 'cover' | 'logo') => {
    if (!file) return;
    if (file.size > 1_400_000) {
      setErrorMsg('La imagen supera 1.4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'cover') setImageUrl(reader.result);
        else setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      onRequestAuth();
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSavedOk(false);

    try {
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(program.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            statusKey,
            statusLabel: statusLabel.trim(),
            format: format.trim(),
            schedule: schedule.trim(),
            duration: duration.trim(),
            hostTeam: hostTeam.trim(),
            channelOrSignal: channelOrSignal.trim(),
            summary: summary.trim(),
            fullSynopsis: fullSynopsis.trim() || summary.trim(),
            technicalSpecs: specsText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
            imageUrl: imageUrl.trim(),
            logoUrl: logoUrl.trim(),
            featured,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudieron guardar los cambios.');
        return;
      }
      setSavedOk(true);
      onSaved(data.program, data.programs);
      window.setTimeout(() => {
        onClose();
      }, 650);
    } catch {
      setErrorMsg('Error de conexión al guardar programa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-program-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#090D0F] border border-white/15 rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-emerald-400">
              EDICIÓN DE PROGRAMA · {program.id.toUpperCase()}
            </div>
            <h2
              id="quick-edit-program-title"
              className="font-cinema text-xl font-semibold text-white"
            >
              Editar {program.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar editor"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {!authToken && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
              <span>Iniciá sesión para guardar cambios permanentes en la productora.</span>
              <button
                type="button"
                onClick={onRequestAuth}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nombre del Programa
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Estado en Cartelera
              </label>
              <select
                value={statusKey}
                onChange={(e) => {
                  const val = e.target.value as ProgramStatusKey;
                  setStatusKey(val);
                  setStatusLabel(
                    val === 'airing'
                      ? 'En emisión'
                      : val === 'preproduction'
                      ? 'En preproducción'
                      : 'En desarrollo'
                  );
                }}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
              >
                <option value="airing">En emisión (Habilitado para salir en vivo)</option>
                <option value="preproduction">En preproducción</option>
                <option value="development">En desarrollo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Etiqueta de estado
              </label>
              <input
                type="text"
                value={statusLabel}
                onChange={(e) => setStatusLabel(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Formato</label>
              <input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Duración</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Días y Horario
              </label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Equipo / Conducción
              </label>
              <input
                type="text"
                value={hostTeam}
                onChange={(e) => setHostTeam(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Canal o Señal
              </label>
              <input
                type="text"
                value={channelOrSignal}
                onChange={(e) => setChannelOrSignal(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Resumen de cartelera
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Sinopsis completa
            </label>
            <textarea
              rows={3}
              value={fullSynopsis}
              onChange={(e) => setFullSynopsis(e.target.value)}
              className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Especificaciones técnicas del apartado (una por línea)
            </label>
            <textarea
              rows={3}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Portada (URL o Subir)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 min-h-[38px] px-2.5 py-1.5 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                />
                <label className="min-h-[38px] px-3 py-1.5 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFile(e.target.files?.[0], 'cover')}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Logo del Programa (URL o Subir)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Opcional"
                  className="flex-1 min-h-[38px] px-2.5 py-1.5 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                />
                <label className="min-h-[38px] px-3 py-1.5 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFile(e.target.files?.[0], 'logo')}
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded border-white/20 bg-[#050708]"
            />
            <span>Destacar programa a ancho completo</span>
          </label>

          {errorMsg && (
            <p className="text-xs font-medium text-red-400">{errorMsg}</p>
          )}
          {savedOk && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Programa actualizado correctamente!</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 border border-white/15 text-xs text-slate-300 hover:text-white rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
