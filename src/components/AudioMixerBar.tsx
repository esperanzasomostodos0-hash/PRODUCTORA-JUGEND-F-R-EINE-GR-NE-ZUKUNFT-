import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Mic,
  MicOff,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  TV_SOUND_EFFECTS,
  playBroadcastStinger,
} from '../services/soundEffects';
import { AudioChannel } from '../types/broadcast';

interface AudioMixerBarProps {
  channels: AudioChannel[];
  masterLevelDb: number;
  onChangeVolume: (channelId: string, volumeDb: number) => void;
  onToggleMute: (channelId: string) => void;
  onConnectMic: (channelId: string, deviceId?: string) => Promise<void>;
  onDisconnectMic: (channelId: string) => void;
  onToggleMonitor: (channelId: string) => void;
  onSelectDevice: (channelId: string, deviceId: string) => void;
}

export const AudioMixerBar: React.FC<AudioMixerBarProps> = ({
  channels,
  masterLevelDb,
  onChangeVolume,
  onToggleMute,
  onConnectMic,
  onDisconnectMic,
  onToggleMonitor,
  onSelectDevice,
}) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);

  const scanMicrophones = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    setScanning(true);
    try {
      let list = await navigator.mediaDevices.enumerateDevices();
      let inputs = list.filter((d) => d.kind === 'audioinput');
      if (inputs.length > 0 && inputs.every((d) => !d.label)) {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({ audio: true });
          temp.getTracks().forEach((t) => t.stop());
          list = await navigator.mediaDevices.enumerateDevices();
          inputs = list.filter((d) => d.kind === 'audioinput');
        } catch {
          // permission denied
        }
      }
      setAudioDevices(inputs);
    } catch {
      setAudioDevices([]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setAudioDevices(list.filter((d) => d.kind === 'audioinput')))
      .catch(() => {});
  }, []);

  const masterPct = Math.max(
    0,
    Math.min(100, ((masterLevelDb + 60) / 60) * 100)
  );

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-white">
            Consola de Audio y Micrófonos en Vivo
          </h2>
          <p className="text-xs text-slate-400">
            Ingresá micrófonos reales a la app para que salgan al aire en el link y en OBS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Master Bus Output Meter */}
          <div className="px-3 py-1.5 bg-[#0A0D12] border border-white/10 rounded-lg flex items-center gap-2.5">
            <span className="text-[11px] font-mono text-slate-300 whitespace-nowrap">
              SALIDA AIRE
            </span>
            <div className="w-24 h-2 bg-[#161D28] rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  masterPct > 85
                    ? 'bg-red-500'
                    : masterPct > 65
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${masterPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 w-12 text-right tabular-nums">
              {masterLevelDb <= -59 ? 'SIL' : `${masterLevelDb} dB`}
            </span>
          </div>

          <button
            type="button"
            onClick={scanMicrophones}
            className="min-h-[36px] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`}
            />
            <span>Detectar Micrófonos ({audioDevices.length})</span>
          </button>
        </div>
      </div>

      {/* Microphone Input Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {channels.map((ch) => {
          const meterPct = ch.muted
            ? 0
            : Math.max(0, Math.min(100, ((ch.levelDb + 60) / 60) * 100));

          return (
            <div
              key={ch.id}
              className={`p-3 bg-[#0A0D12] border rounded-lg space-y-2.5 ${
                ch.micConnected ? 'border-emerald-500/50' : 'border-white/8'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {ch.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {ch.micConnected ? 'MIC EN VIVO' : `OBS: ${ch.obsInputName}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {ch.micConnected && (
                    <button
                      type="button"
                      onClick={() => onToggleMonitor(ch.id)}
                      title="Escucha local en auriculares"
                      className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border cursor-pointer ${
                        ch.monitoring
                          ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleMute(ch.id)}
                    aria-label={
                      ch.muted ? `Activar ${ch.name}` : `Silenciar ${ch.name}`
                    }
                    className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                      ch.muted
                        ? 'bg-red-600/20 border-red-600 text-red-300'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {ch.muted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Microphone Device Selector + Connect Toggle */}
              <div className="flex items-center gap-1.5">
                <select
                  value={ch.audioDeviceId || ''}
                  onChange={(e) => onSelectDevice(ch.id, e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 bg-[#121720] border border-white/10 rounded text-[11px] text-slate-200 truncate"
                >
                  <option value="">Micrófono por defecto</option>
                  {audioDevices.map((dev, idx) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Micrófono ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    ch.micConnected
                      ? onDisconnectMic(ch.id)
                      : onConnectMic(ch.id, ch.audioDeviceId)
                  }
                  className={`min-h-[30px] px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0 ${
                    ch.micConnected
                      ? 'bg-red-600/25 border border-red-500/60 text-red-200 hover:bg-red-600/40'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {ch.micConnected ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      <span>Quitar</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      <span>Meter Mic</span>
                    </>
                  )}
                </button>
              </div>

              {/* VU Meter */}
              <div className="h-2 w-full bg-[#161D28] rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    meterPct > 85
                      ? 'bg-red-500'
                      : meterPct > 65
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${meterPct}%` }}
                />
              </div>

              {/* Gain Fader */}
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={-60}
                  max={0}
                  step={1}
                  value={ch.volumeDb}
                  onChange={(e) =>
                    onChangeVolume(ch.id, Number(e.target.value))
                  }
                  className="flex-1 broadcast-fader"
                />
                <span className="font-mono text-[11px] text-slate-300 w-12 text-right tabular-nums">
                  {ch.muted ? 'MUTE' : `${ch.volumeDb} dB`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Professional TV Soundboard Strip */}
      <div className="pt-3 border-t border-white/8 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">
            Efectos y Cortinas de Televisión (Salen al Aire)
          </span>
          <span className="text-[11px] text-slate-400">
            Audio maestro comprimido para emisión en vivo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {TV_SOUND_EFFECTS.map((fx) => (
            <button
              key={fx.id}
              type="button"
              onClick={() => playBroadcastStinger(fx.id)}
              className="min-h-[54px] px-2.5 py-2 bg-[#0A0D12] hover:bg-[#16221B] active:scale-[0.97] border border-white/12 hover:border-emerald-500/60 rounded-lg text-left flex flex-col justify-between transition-all cursor-pointer"
            >
              <span className="text-[9px] font-mono text-emerald-400 tracking-wider">
                {fx.sublabel}
              </span>
              <span className="text-xs font-semibold text-white leading-tight line-clamp-2 mt-0.5">
                {fx.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
