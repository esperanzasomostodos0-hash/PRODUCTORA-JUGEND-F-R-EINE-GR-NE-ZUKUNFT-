import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Plug, Unplug, X } from 'lucide-react';
import { ObsStatusSnapshot } from '../types/broadcast';

interface ObsConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  obsStatus: ObsStatusSnapshot;
  onConnect: (url: string, password: string) => Promise<void>;
  onDisconnect: () => void;
}

export const ObsConnectionModal: React.FC<ObsConnectionModalProps> = ({
  isOpen,
  onClose,
  obsStatus,
  onConnect,
  onDisconnect,
}) => {
  const [url, setUrl] = useState(obsStatus.url || 'ws://localhost:4455');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedLiveUrl, setCopiedLiveUrl] = useState(false);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const liveViewerUrl = `${baseUrl}?live=1`;
  const browserSourceUrl = `${baseUrl}?overlay=1`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onConnect(url, password);
    } catch {
      // error is shown via obsStatus.lastError
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (value: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(value).then(() => {
      setter(true);
      window.setTimeout(() => setter(false), 2000);
    });
  };

  const isConnected = obsStatus.connectionStatus === 'connected';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="obs-modal-title"
    >
      <div className="w-full max-w-lg bg-[#121720] border border-white/12 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2
              id="obs-modal-title"
              className="font-display text-lg font-semibold text-white"
            >
              OBS Studio y Enlace de Transmisión
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sincronización OBS WebSocket v5 y enlace público en vivo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Public Live Broadcast Link (?live=1) */}
          <div className="p-3.5 bg-[#0B1610] border border-emerald-600/40 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-emerald-300">
                Link Público de Transmisión en Vivo
              </h3>
              <a
                href={liveViewerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <span>Abrir canal en vivo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compartí este enlace para que cualquier persona vea en tiempo real tus cámaras, videos, placas y gráficas de #SIN FILTRO mientras transmitís:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={liveViewerUrl}
                className="flex-1 px-3 py-2 bg-[#0A0D12] border border-white/10 rounded-lg text-xs font-mono text-slate-200"
              />
              <button
                type="button"
                onClick={() => handleCopy(liveViewerUrl, setCopiedLiveUrl)}
                className="min-h-[38px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedLiveUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* OBS Status Summary */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0A0D12] border border-white/8 rounded-lg text-xs">
            <span className="text-slate-400">Estado de enlace OBS</span>
            <span
              className={`font-mono font-semibold ${
                isConnected
                  ? 'text-emerald-400'
                  : obsStatus.connectionStatus === 'error'
                  ? 'text-red-400'
                  : 'text-slate-300'
              }`}
            >
              {isConnected
                ? `CONECTADO · OBS ${obsStatus.obsVersion || 'v5'}`
                : obsStatus.connectionStatus === 'connecting'
                ? 'CONECTANDO...'
                : obsStatus.connectionStatus === 'error'
                ? 'ERROR DE CONEXIÓN'
                : 'MODO CONSOLA LOCAL'}
            </span>
          </div>

          {obsStatus.lastError && (
            <div className="p-3 bg-red-950/50 border border-red-700/60 rounded-lg text-xs text-red-200 leading-relaxed">
              {obsStatus.lastError}
            </div>
          )}

          {/* Connection Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="obs-ws-url"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Dirección WebSocket de OBS (Local o Red LAN)
              </label>
              <input
                id="obs-ws-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ws://localhost:4455"
                className="w-full px-3 py-2.5 bg-[#0A0D12] border border-white/12 rounded-lg text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="obs-ws-pass"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Contraseña del Servidor WebSocket (opcional)
              </label>
              <input
                id="obs-ws-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresá la contraseña de OBS si está habilitada"
                className="w-full px-3 py-2.5 bg-[#0A0D12] border border-white/12 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              {isConnected ? (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Unplug className="w-4 h-4" />
                  <span>Desconectar OBS</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Plug className="w-4 h-4" />
                  <span>{busy ? 'Conectando...' : 'Conectar con OBS Studio'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Browser Source Integration for TV Templates */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white">
                Fuente de Navegador para Gráficas dentro de OBS
              </h3>
              <a
                href={browserSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <span>Abrir vista limpia</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={browserSourceUrl}
                className="flex-1 px-3 py-2 bg-[#0A0D12] border border-white/10 rounded-lg text-xs font-mono text-slate-300"
              />
              <button
                type="button"
                onClick={() => handleCopy(browserSourceUrl, setCopiedOverlayUrl)}
                className="min-h-[38px] px-3 py-2 bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedOverlayUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
