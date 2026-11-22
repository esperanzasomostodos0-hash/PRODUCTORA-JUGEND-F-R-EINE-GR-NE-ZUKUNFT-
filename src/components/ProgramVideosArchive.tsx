import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  Film,
  Link2,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  PRODUCER_ROLES,
  ProgramArchiveVideo,
  StaffUserPublic,
} from '../types/producer';

interface ProgramVideosArchiveProps {
  programId: string;
  programTitle: string;
  authToken: string | null;
  currentUser: StaffUserPublic | null;
  onRequestAuth: () => void;
}

function formatDurationSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return 'HD';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ProgramVideosArchive: React.FC<ProgramVideosArchiveProps> = ({
  programId,
  programTitle,
  authToken,
  currentUser,
  onRequestAuth,
}) => {
  const [videos, setVideos] = useState<ProgramArchiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Upload / Add Form State
  const [formOpen, setFormOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [episodeLabel, setEpisodeLabel] = useState(() =>
    new Date().toLocaleDateString('es-AR')
  );
  const [durationLabel, setDurationLabel] = useState('HD');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Metadata State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEpisodeLabel, setEditEpisodeLabel] = useState('');
  const [editDurationLabel, setEditDurationLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const perms = currentUser ? PRODUCER_ROLES[currentUser.role] : null;
  const canManageVideos = Boolean(
    authToken &&
      currentUser &&
      perms &&
      (perms.canCreatePrograms || perms.canOperateStudio || perms.canEditSite)
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(programId)}/videos`
      );
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.videos)) {
        setVideos(data.videos);
        setSelectedVideoId((prev) =>
          prev && data.videos.some((v: ProgramArchiveVideo) => v.id === prev)
            ? prev
            : data.videos[0]?.id || null
        );
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const activeVideo =
    videos.find((v) => v.id === selectedVideoId) || videos[0] || null;

  const handleOpenUpload = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!currentUser || !authToken) {
      onRequestAuth();
      return;
    }
    if (!canManageVideos) {
      setErrorMsg(
        'Tu rol actual no tiene permisos para subir videos. Solicitá acceso al Administrador Total.'
      );
      return;
    }
    setFormOpen((v) => !v);
  };

  const handlePickFile = (file?: File) => {
    if (!file) return;
    setErrorMsg(null);
    if (file.size > 250 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 250 MB.');
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      setTitle(base || `Emisión de ${programTitle}`);
    }

    // Detect real video duration cleanly from metadata
    try {
      const tmpUrl = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        if (Number.isFinite(vid.duration) && vid.duration > 0) {
          setDurationLabel(formatDurationSeconds(vid.duration));
        }
        URL.revokeObjectURL(tmpUrl);
      };
      vid.onerror = () => URL.revokeObjectURL(tmpUrl);
      vid.src = tmpUrl;
    } catch {
      // ignore duration probe errors
    }
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      onRequestAuth();
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Ingresá un título para la emisión.');
      return;
    }

    if (uploadMode === 'file') {
      if (!selectedFile) {
        setErrorMsg('Seleccioná un archivo de video (.mp4, .webm o .mov).');
        return;
      }
      setUploading(true);
      setUploadProgress(0);

      try {
        const result = await new Promise<{
          ok: boolean;
          video?: ProgramArchiveVideo;
          videos?: ProgramArchiveVideo[];
          error?: string;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            'POST',
            `/api/producer/programs/${encodeURIComponent(programId)}/videos/upload`
          );
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          xhr.setRequestHeader(
            'Content-Type',
            selectedFile.type || 'application/octet-stream'
          );
          xhr.setRequestHeader(
            'x-video-filename',
            encodeURIComponent(selectedFile.name)
          );
          xhr.setRequestHeader('x-video-title', encodeURIComponent(cleanTitle));
          xhr.setRequestHeader(
            'x-video-episode',
            encodeURIComponent(
              episodeLabel.trim() || new Date().toLocaleDateString('es-AR')
            )
          );
          xhr.setRequestHeader(
            'x-video-duration',
            encodeURIComponent(durationLabel.trim() || 'HD')
          );
          xhr.setRequestHeader(
            'x-video-description',
            encodeURIComponent(description.trim())
          );

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && ev.total > 0) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };

          xhr.onload = () => {
            try {
              const parsed = JSON.parse(xhr.responseText);
              resolve(parsed);
            } catch {
              if (xhr.status === 413) {
                reject(
                  new Error(
                    'El servidor limita subidas directas a 4.5 MB. Para videos pesados usá la pestaña "Enlace Directo URL" (MP4/WebM externo).'
                  )
                );
                return;
              }
              reject(new Error(`Respuesta inválida del servidor (HTTP ${xhr.status}).`));
            }
          };

          xhr.onerror = () => reject(new Error('Error de red al subir el video.'));
          xhr.send(selectedFile);
        });

        if (!result.ok || !Array.isArray(result.videos)) {
          setErrorMsg(result.error || 'No se pudo subir el video.');
          return;
        }

        setVideos(result.videos);
        if (result.video) setSelectedVideoId(result.video.id);
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        setDurationLabel('HD');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormOpen(false);
        setSuccessMsg('Video publicado en el archivo del programa.');
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Error al subir el video.'
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
      return;
    }

    // External URL mode
    if (!externalUrl.trim()) {
      setErrorMsg('Ingresá el enlace directo del video (.mp4 o .webm).');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(programId)}/videos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: cleanTitle,
            episodeLabel: episodeLabel.trim(),
            durationLabel: durationLabel.trim() || 'HD',
            description: description.trim(),
            videoUrl: externalUrl.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo agregar el enlace de video.');
        return;
      }
      setVideos(data.videos);
      if (data.video) setSelectedVideoId(data.video.id);
      setExternalUrl('');
      setTitle('');
      setDescription('');
      setDurationLabel('HD');
      setFormOpen(false);
      setSuccessMsg('Enlace de programa anterior guardado.');
    } catch {
      setErrorMsg('Error de conexión al guardar el video.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async (videoId: string) => {
    if (!authToken) {
      onRequestAuth();
      return;
    }
    setSavingEdit(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(
          programId
        )}/videos/${encodeURIComponent(videoId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            episodeLabel: editEpisodeLabel.trim(),
            durationLabel: editDurationLabel.trim(),
            description: editDescription.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo actualizar el episodio.');
        return;
      }
      setVideos(data.videos);
      setEditingId(null);
      setSuccessMsg('Datos del video actualizados.');
    } catch {
      setErrorMsg('Error al actualizar datos del video.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!authToken) {
      onRequestAuth();
      return;
    }
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(
          programId
        )}/videos/${encodeURIComponent(videoId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo eliminar el video.');
        return;
      }
      setVideos(data.videos);
      if (selectedVideoId === videoId) {
        setSelectedVideoId(data.videos[0]?.id || null);
      }
      setSuccessMsg('Video quitado del archivo.');
    } catch {
      setErrorMsg('Error al eliminar el video.');
    }
  };

  return (
    <section
      aria-labelledby={`archive-heading-${programId}`}
      className="bg-[#080D0A] border border-white/12 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono text-emerald-400 tracking-wider">
            <Film className="w-3.5 h-3.5" />
            <span>PROGRAMAS ANTERIORES · ARCHIVO ON-DEMAND</span>
          </div>
          <h2
            id={`archive-heading-${programId}`}
            className="font-display text-xl sm:text-2xl font-bold text-white"
          >
            Emisiones Anteriores de {programTitle}
          </h2>
          <p className="text-xs text-slate-400">
            {canManageVideos
              ? `Volvé a mirar programas grabados completos o subí nuevas emisiones al archivo de ${programTitle}.`
              : `Volvé a mirar las emisiones grabadas completas de ${programTitle}.`}
          </p>
        </div>

        {canManageVideos && (
          <button
            type="button"
            onClick={handleOpenUpload}
            className="min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
          >
            {formOpen ? (
              <>
                <X className="w-4 h-4" />
                <span>Cerrar Formulario</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Subir Video de Programa Anterior</span>
              </>
            )}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Upload / Add Video Form */}
      {formOpen && canManageVideos && (
        <form
          onSubmit={handleSubmitVideo}
          className="bg-[#050806] border border-emerald-500/35 rounded-xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">
              Agregar Emisión Anterior a {programTitle}
            </div>
            <div className="inline-flex p-1 bg-[#0B110D] border border-white/10 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-3 py-1 rounded-md font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Archivo MP4 / WebM</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`px-3 py-1 rounded-md font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  uploadMode === 'url'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Enlace Directo URL</span>
              </button>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div className="border border-dashed border-emerald-500/40 bg-[#08100B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">
                  {selectedFile
                    ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                    : 'Elegí un archivo de video grabado (MP4, WebM, MOV hasta 250 MB)'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Se guarda en la productora con reproducción instantánea y barra de progreso.
                </p>
              </div>
              <label className="min-h-[40px] px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{selectedFile ? 'Cambiar Archivo' : 'Seleccionar Video'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg,.mp4,.webm,.mov,.mkv,.ogv"
                  onChange={(e) => handlePickFile(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                URL directa del video (.mp4 / .webm)
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://servidor.com/videos/programa-completo.mp4"
                className="w-full min-h-[40px] px-3 py-2 bg-[#0A0F0C] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Título del Programa / Episodio
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Ej: ${programTitle} · Emisión Completa`}
                className="w-full min-h-[40px] px-3 py-2 bg-[#0A0F0C] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Fecha / Cap.
                </label>
                <input
                  type="text"
                  value={episodeLabel}
                  onChange={(e) => setEpisodeLabel(e.target.value)}
                  placeholder="22/11/2026"
                  className="w-full min-h-[40px] px-2.5 py-2 bg-[#0A0F0C] border border-white/15 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Duración
                </label>
                <input
                  type="text"
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  placeholder="45:00"
                  className="w-full min-h-[40px] px-2.5 py-2 bg-[#0A0F0C] border border-white/15 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Temas o descripción breve (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invitados, agenda tratada o momentos destacados de esta emisión..."
              className="w-full px-3 py-2 bg-[#0A0F0C] border border-white/15 rounded-lg text-xs text-white resize-none"
            />
          </div>

          {uploading && uploadMode === 'file' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300">
                <span>Subiendo video al servidor de la productora...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[38px] px-4 py-1.5 border border-white/15 text-xs text-slate-300 hover:text-white rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="min-h-[38px] px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {uploading ? 'Subiendo y publicando...' : 'Publicar Video en Archivo'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Video Player + Playlist */}
      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Cargando archivo de programas anteriores...
        </div>
      ) : videos.length === 0 ? (
        <div className="py-10 px-4 bg-[#050806] border border-white/8 rounded-xl text-center space-y-2">
          <Video className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">
            Todavía no hay emisiones anteriores subidas para {programTitle}.
          </p>
          <p className="text-xs text-slate-500">
            Usá el botón "Subir Video de Programa Anterior" para cargar grabaciones de emisiones pasadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Active Video Player */}
          {activeVideo && (
            <div className="lg:col-span-7 space-y-3">
              <div className="aspect-video w-full bg-black border border-white/12 rounded-xl overflow-hidden">
                <video
                  key={activeVideo.id}
                  src={activeVideo.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              </div>

              <div className="p-4 bg-[#050806] border border-white/10 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-emerald-400">
                  <span>
                    {activeVideo.episodeLabel} · {activeVideo.durationLabel}
                  </span>
                  {activeVideo.fileSizeBytes && (
                    <span className="text-slate-400">
                      {formatBytes(activeVideo.fileSizeBytes)}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
                  {activeVideo.title}
                </h3>
                {activeVideo.description && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeVideo.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Playlist Cards */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {videos.map((vid) => {
              const isSelected = activeVideo?.id === vid.id;
              const isEditing = editingId === vid.id;

              return (
                <div
                  key={vid.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/35 border-emerald-500/60'
                      : 'bg-[#050806] border-white/10 hover:border-white/25'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0A0F0C] border border-white/15 rounded text-xs text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editEpisodeLabel}
                          onChange={(e) => setEditEpisodeLabel(e.target.value)}
                          placeholder="Fecha / Cap."
                          className="px-2.5 py-1.5 bg-[#0A0F0C] border border-white/15 rounded text-xs text-white"
                        />
                        <input
                          type="text"
                          value={editDurationLabel}
                          onChange={(e) => setEditDurationLabel(e.target.value)}
                          placeholder="Duración"
                          className="px-2.5 py-1.5 bg-[#0A0F0C] border border-white/15 rounded text-xs text-white"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0A0F0C] border border-white/15 rounded text-xs text-white resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(vid.id)}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded cursor-pointer"
                        >
                          {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedVideoId(vid.id)}
                        className="flex-1 text-left space-y-1 cursor-pointer min-w-0"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                          <Play
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'fill-emerald-400' : ''
                            }`}
                          />
                          <span className="truncate">{vid.episodeLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {vid.durationLabel}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-white line-clamp-2">
                          {vid.title}
                        </p>
                        {vid.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {vid.description}
                          </p>
                        )}
                      </button>

                      {canManageVideos && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Editar ${vid.title}`}
                            onClick={() => {
                              setEditingId(vid.id);
                              setEditTitle(vid.title);
                              setEditEpisodeLabel(vid.episodeLabel);
                              setEditDurationLabel(vid.durationLabel);
                              setEditDescription(vid.description);
                            }}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Eliminar ${vid.title}`}
                            onClick={() => handleDeleteVideo(vid.id)}
                            className="p-1.5 rounded bg-white/5 hover:bg-red-950/60 text-slate-300 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
