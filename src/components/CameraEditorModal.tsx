import React, { useEffect, useState } from 'react';
import { Camera, MonitorUp, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { BroadcastScene, CameraSourceType } from '../types/broadcast';

interface CameraEditorModalProps {
  isOpen: boolean;
  scene: BroadcastScene | null; // null = creating new camera/scene
  hasActiveStream?: boolean;
  obsScenes: string[];
  onClose: () => void;
  onSave: (scene: BroadcastScene) => void;
  onDelete?: (sceneId: string) => void;
  onConnectDevice: (sceneId: string, deviceId?: string) => Promise<void>;
  onConnectScreen: (sceneId: string) => Promise<void>;
}

const STUDIO_PRESETS = [
  {
    label: 'Set Podcast / Debate',
    url: '/src/assets/images/studio_podcast_desk_1795296509941.jpg',
  },
  {
    label: 'Set Talk Show',
    url: '/src/assets/images/studio_talk_show_1795296510184.jpg',
  },
  {
    label: 'Set Noticiero',
    url: '/src/assets/images/studio_news_anchor_1795296509451.jpg',
  },
  {
    label: 'Estadio Deportivo',
    url: '/src/assets/images/studio_sports_arena_1795296509691.jpg',
  },
];

export const CameraEditorModal: React.FC<CameraEditorModalProps> = ({
  isOpen,
  scene,
  hasActiveStream = false,
  obsScenes,
  onClose,
  onSave,
  onDelete,
  onConnectDevice,
  onConnectScreen,
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [draft, setDraft] = useState<BroadcastScene>(() => ({
    id: `cam-${Date.now()}`,
    name: 'Nueva Cámara',
    obsSceneName: 'Cámara Extra',
    cameraLabel: 'CAM · EN VIVO',
    backdropUrl: STUDIO_PRESETS[0].url,
    cameraType: 'webcam',
    layoutMode: 'full',
    slateColor: '#07170E',
    slateHeadline: '#SIN FILTRO EN VIVO',
    description: 'Fuente de video personalizada.',
  }));

  useEffect(() => {
    if (!isOpen) return;
    if (scene) {
      setDraft({ ...scene });
    } else {
      setDraft({
        id: `cam-${Date.now()}`,
        name: 'Cámara Invitado',
        obsSceneName: '#SIN FILTRO - Cámara Extra',
        cameraLabel: 'CAM EXTRA · VIVO',
        backdropUrl: STUDIO_PRESETS[0].url,
        cameraType: 'webcam',
        layoutMode: 'full',
        slateColor: '#07170E',
        slateHeadline: '#SIN FILTRO · EN VIVO',
        description: 'Cámara agregada manualmente al switcher.',
      });
    }
    refreshVideoDevices();
  }, [isOpen, scene]);

  const refreshVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    setLoadingDevices(true);
    try {
      // Request permission briefly if labels are hidden
      const list = await navigator.mediaDevices.enumerateDevices();
      const vids = list.filter((d) => d.kind === 'videoinput');
      if (vids.length > 0 && vids.every((v) => !v.label)) {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({ video: true });
          temp.getTracks().forEach((t) => t.stop());
          const updated = await navigator.mediaDevices.enumerateDevices();
          setDevices(updated.filter((d) => d.kind === 'videoinput'));
        } catch {
          setDevices(vids);
        }
      } else {
        setDevices(vids);
      }
    } catch {
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setDraft((prev) => ({
        ...prev,
        cameraType: 'media',
        mediaUrl: url,
        mediaKind: 'video',
      }));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setDraft((prev) => ({
            ...prev,
            cameraType: 'media',
            mediaUrl: reader.result as string,
            mediaKind: 'image',
            backdropUrl: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    if (draft.cameraType === 'webcam') {
      const sameActiveWebcam =
        hasActiveStream &&
        scene?.cameraType === 'webcam' &&
        (scene.deviceId || '') === (draft.deviceId || '');
      if (!sameActiveWebcam) {
        await onConnectDevice(draft.id, draft.deviceId);
      }
    } else if (draft.cameraType === 'screen') {
      const sameActiveScreen =
        hasActiveStream && scene?.cameraType === 'screen';
      if (!sameActiveScreen) {
        await onConnectScreen(draft.id);
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-[#121720] border border-white/12 rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {scene ? 'Editar Cámara / Escena' : 'Agregar Nueva Cámara'}
            </h2>
            <p className="text-xs text-slate-400">
              Asigná una cámara física, captura de pantalla, video o placa gráfica
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre en el Switcher
              </label>
              <input
                type="text"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Etiqueta de Cámara
              </label>
              <input
                type="text"
                value={draft.cameraLabel}
                onChange={(e) =>
                  setDraft({ ...draft, cameraLabel: e.target.value })
                }
                placeholder="Ej. CAM 3 · INVITADO"
                className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Fuente de Video
              </label>
              <select
                value={draft.cameraType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cameraType: e.target.value as CameraSourceType,
                  })
                }
                className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
              >
                <option value="webcam">Cámara Real / USB / OBS Virtual Cam</option>
                <option value="screen">Capturar Pantalla o Ventana</option>
                <option value="media">Subir Video MP4 o Imagen</option>
                <option value="studio">Fondo Escénico Predefinido</option>
                <option value="slate">Placa Gráfica / Pausa (Slate)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Encuadre / Diseño
              </label>
              <select
                value={draft.layoutMode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    layoutMode: e.target.value as 'full' | 'pip' | 'split',
                  })
                }
                className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white"
              >
                <option value="full">Pantalla Completa (Full)</option>
                <option value="pip">Con Recuadro PIP</option>
                <option value="split">Pantalla Dividida (2 Cámaras)</option>
              </select>
            </div>
          </div>

          {/* Conditional Source Options */}
          {draft.cameraType === 'webcam' && (
            <div className="p-3.5 bg-[#0A0D12] border border-white/10 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Dispositivo de Cámara</span>
                </span>
                <button
                  type="button"
                  onClick={refreshVideoDevices}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingDevices ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Detectar cámaras</span>
                </button>
              </div>
              <select
                value={draft.deviceId || ''}
                onChange={(e) =>
                  setDraft({ ...draft, deviceId: e.target.value || undefined })
                }
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              >
                <option value="">Cámara predeterminada del sistema</option>
                {devices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Al guardar, el navegador conectará esta cámara en vivo (compatible con cámaras USB, webcams y OBS Virtual Camera).
              </p>
            </div>
          )}

          {draft.cameraType === 'screen' && (
            <div className="p-3.5 bg-[#0A0D12] border border-white/10 rounded-lg flex items-center gap-3 text-xs text-slate-300">
              <MonitorUp className="w-5 h-5 text-blue-400 shrink-0" />
              <p>
                Al guardar esta escena se abrirá el selector del navegador para elegir la ventana, pestaña o pantalla que querés transmitir en vivo.
              </p>
            </div>
          )}

          {draft.cameraType === 'media' && (
            <div className="p-3.5 bg-[#0A0D12] border border-white/10 rounded-lg space-y-2.5">
              <label className="block text-xs font-semibold text-white">
                Cargar archivo de Video (.mp4 / .webm) o Imagen (.jpg / .png)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-[#121720] hover:bg-[#19202D] border border-dashed border-white/20 rounded-lg text-xs text-slate-200 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Seleccionar archivo desde tu equipo</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {draft.mediaUrl && (
                <p className="text-[11px] text-emerald-400 font-mono truncate">
                  Archivo cargado ({draft.mediaKind === 'video' ? 'Video en bucle' : 'Imagen'})
                </p>
              )}
            </div>
          )}

          {draft.cameraType === 'studio' && (
            <div className="p-3.5 bg-[#0A0D12] border border-white/10 rounded-lg space-y-2.5">
              <label className="block text-xs font-semibold text-white">
                Fondo Escénico
              </label>
              <select
                value={draft.backdropUrl}
                onChange={(e) =>
                  setDraft({ ...draft, backdropUrl: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              >
                {STUDIO_PRESETS.map((p) => (
                  <option key={p.url} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {draft.cameraType === 'slate' && (
            <div className="p-3.5 bg-[#0A0D12] border border-white/10 rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Texto Principal de la Placa
                </label>
                <input
                  type="text"
                  value={draft.slateHeadline || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, slateHeadline: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-300">Color de fondo:</label>
                <input
                  type="color"
                  value={draft.slateColor || '#07170E'}
                  onChange={(e) =>
                    setDraft({ ...draft, slateColor: e.target.value })
                  }
                  className="w-10 h-8 rounded cursor-pointer bg-transparent border border-white/15"
                />
              </div>
            </div>
          )}

          {/* OBS Studio Mapping */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nombre de Escena vinculada en OBS Studio
            </label>
            <input
              type="text"
              list="obs-scene-suggestions"
              value={draft.obsSceneName}
              onChange={(e) =>
                setDraft({ ...draft, obsSceneName: e.target.value })
              }
              className="w-full px-3 py-2 bg-[#0A0D12] border border-white/12 rounded-lg text-xs font-mono text-white"
            />
            <datalist id="obs-scene-suggestions">
              {obsScenes.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-[#0D1118]">
          {scene && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(scene.id);
                onClose();
              }}
              className="min-h-[40px] px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Cámara</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              {scene ? 'Guardar Cambios' : 'Agregar al Switcher'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
