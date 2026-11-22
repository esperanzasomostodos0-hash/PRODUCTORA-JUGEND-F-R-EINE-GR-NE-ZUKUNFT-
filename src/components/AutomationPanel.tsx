import React, { useEffect, useState } from 'react';
import {
  Clock,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  SkipForward,
  Trash2,
} from 'lucide-react';
import {
  AudioChannel,
  BroadcastScene,
  RundownStep,
  ScheduledTrigger,
  TransitionType,
} from '../types/broadcast';

interface AutomationPanelProps {
  scenes: BroadcastScene[];
  audioChannels: AudioChannel[];
  rundown: RundownStep[];
  onUpdateRundown: (steps: RundownStep[]) => void;
  // Rundown Runner State
  rundownRunning: boolean;
  rundownLoop: boolean;
  rundownIndex: number;
  rundownRemainingSec: number;
  onToggleRundown: () => void;
  onToggleRundownLoop: () => void;
  onSkipRundownNext: () => void;
  onJumpToRundownStep: (index: number) => void;
  // Cyclic Rotation State
  cycleRunning: boolean;
  cycleIntervalSec: number;
  cycleSceneIds: string[];
  cycleRemainingSec: number;
  onToggleCycle: () => void;
  onChangeCycleInterval: (sec: number) => void;
  onToggleCycleScene: (sceneId: string) => void;
  // Audio-Follow-Video State
  afvEnabled: boolean;
  afvThresholdDb: number;
  afvHoldSec: number;
  micActive: boolean;
  micLevelDb: number;
  onToggleAfv: () => void;
  onChangeAfvThreshold: (db: number) => void;
  onChangeAfvHold: (sec: number) => void;
  onToggleRealMic: () => void;
  onAssignChannelScene: (channelId: string, sceneId: string) => void;
  // Scheduled Clock Triggers
  schedules: ScheduledTrigger[];
  onAddSchedule: (item: ScheduledTrigger) => void;
  onToggleSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
}

export const AutomationPanel: React.FC<AutomationPanelProps> = ({
  scenes,
  audioChannels,
  rundown,
  onUpdateRundown,
  rundownRunning,
  rundownLoop,
  rundownIndex,
  rundownRemainingSec,
  onToggleRundown,
  onToggleRundownLoop,
  onSkipRundownNext,
  onJumpToRundownStep,
  cycleRunning,
  cycleIntervalSec,
  cycleSceneIds,
  cycleRemainingSec,
  onToggleCycle,
  onChangeCycleInterval,
  onToggleCycleScene,
  afvEnabled,
  afvThresholdDb,
  afvHoldSec,
  micActive,
  micLevelDb,
  onToggleAfv,
  onChangeAfvThreshold,
  onChangeAfvHold,
  onToggleRealMic,
  onAssignChannelScene,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
}) => {
  const [tab, setTab] = useState<'rundown' | 'cycle' | 'afv' | 'schedule'>(
    'rundown'
  );

  // New schedule form state
  const [newTime, setNewTime] = useState('20:00');
  const [newLabel, setNewLabel] = useState('Inicio de Emisión');
  const [newAction, setNewAction] = useState<'scene' | 'start_stream' | 'stop_stream'>('scene');
  const [newSceneId, setNewSceneId] = useState(scenes[0]?.id || '');

  useEffect(() => {
    if (scenes.length > 0 && !scenes.some((s) => s.id === newSceneId)) {
      setNewSceneId(scenes[0].id);
    }
  }, [newSceneId, scenes]);

  const currentStep = rundown[rundownIndex];
  const progressPct =
    currentStep && currentStep.durationSec > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((currentStep.durationSec - rundownRemainingSec) /
              currentStep.durationSec) *
              100
          )
        )
      : 0;

  const handleAddRundownStep = () => {
    const firstScene = scenes[0];
    if (!firstScene) return;
    const nextStep: RundownStep = {
      id: `step-${Date.now()}`,
      title: `Bloque ${rundown.length + 1}`,
      sceneId: firstScene.id,
      durationSec: 20,
      transitionType: 'fade',
      autoLowerThird: false,
    };
    onUpdateRundown([...rundown, nextStep]);
  };

  const handleUpdateStep = (
    stepId: string,
    patch: Partial<RundownStep>
  ) => {
    onUpdateRundown(
      rundown.map((s) => (s.id === stepId ? { ...s, ...patch } : s))
    );
  };

  const handleDeleteStep = (stepId: string) => {
    onUpdateRundown(rundown.filter((s) => s.id !== stepId));
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSchedule({
      id: `sched-${Date.now()}`,
      timeHHMM: newTime,
      label: newLabel.trim() || 'Regla programada',
      action: newAction,
      sceneId: newAction === 'scene' ? newSceneId || scenes[0]?.id : undefined,
      enabled: true,
    });
  };

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
      {/* Header & Automation Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            Automatización de Cambios de Escena
          </h2>
          <p className="text-xs text-slate-400">
            Ejecutá escaletas temporizadas, rotación de cámaras o disparo por voz
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0A0D12] border border-white/8 rounded-lg">
          {(
            [
              { id: 'rundown', label: 'Escaleta' },
              { id: 'cycle', label: 'Rotación Cámaras' },
              { id: 'afv', label: 'Por Voz (Audio)' },
              { id: 'schedule', label: 'Horarios' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-[#1D2636] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: RUNDOWN (ESCALETA AUTOMÁTICA) */}
      {tab === 'rundown' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0A0D12] border border-white/8 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onToggleRundown}
                disabled={rundown.length === 0}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  rundownRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                }`}
              >
                {rundownRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pausar Escaleta</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Iniciar Escaleta</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onSkipRundownNext}
                disabled={rundown.length === 0}
                className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <SkipForward className="w-4 h-4" />
                <span>Siguiente</span>
              </button>

              <button
                type="button"
                onClick={onToggleRundownLoop}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  rundownLoop
                    ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>Bucle</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <p className="text-slate-400">
                  {currentStep
                    ? `En curso: ${currentStep.title}`
                    : 'Sin bloques cargados'}
                </p>
                <p className="font-mono text-sm font-semibold text-white tabular-nums">
                  Restante: {rundownRemainingSec}s
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRundownStep}
                className="min-h-[40px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Bloque</span>
              </button>
            </div>
          </div>

          {/* Active Step Progress */}
          {currentStep && (
            <div className="h-1.5 w-full bg-[#0A0D12] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* Rundown Table */}
          {rundown.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded-lg">
              <p className="text-sm text-slate-300">
                No hay bloques en la escaleta automática.
              </p>
              <button
                type="button"
                onClick={handleAddRundownStep}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg cursor-pointer"
              >
                Crear Primer Bloque
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {rundown.map((step, idx) => {
                const isActive = idx === rundownIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-[#172030] border-blue-500/50'
                        : 'bg-[#0A0D12] border-white/8'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onJumpToRundownStep(idx)}
                      className={`min-h-[36px] min-w-[36px] rounded-md font-mono text-xs font-semibold flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </button>

                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) =>
                        handleUpdateStep(step.id, { title: e.target.value })
                      }
                      className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-[#121720] border border-white/10 rounded text-xs text-white"
                    />

                    <select
                      value={step.sceneId}
                      onChange={(e) =>
                        handleUpdateStep(step.id, { sceneId: e.target.value })
                      }
                      className="px-2.5 py-1.5 bg-[#121720] border border-white/10 rounded text-xs text-slate-200"
                    >
                      {scenes.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={step.transitionType}
                      onChange={(e) =>
                        handleUpdateStep(step.id, {
                          transitionType: e.target.value as TransitionType,
                        })
                      }
                      className="px-2.5 py-1.5 bg-[#121720] border border-white/10 rounded text-xs text-slate-200"
                    >
                      <option value="cut">Corte</option>
                      <option value="fade">Fundido</option>
                      <option value="wipe">Barrido</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={3}
                        max={3600}
                        value={step.durationSec}
                        onChange={(e) =>
                          handleUpdateStep(step.id, {
                            durationSec: Math.max(
                              3,
                              Number(e.target.value) || 10
                            ),
                          })
                        }
                        className="w-16 px-2 py-1.5 bg-[#121720] border border-white/10 rounded text-xs font-mono text-right text-white tabular-nums"
                      />
                      <span className="text-xs text-slate-400">seg</span>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.autoLowerThird}
                        onChange={(e) =>
                          handleUpdateStep(step.id, {
                            autoLowerThird: e.target.checked,
                          })
                        }
                        className="rounded accent-blue-600"
                      />
                      <span>Zócalo</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteStep(step.id)}
                      aria-label="Eliminar bloque"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-red-400 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CYCLIC CAMERA ROTATION */}
      {tab === 'cycle' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleCycle}
                disabled={cycleSceneIds.length < 2}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  cycleRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                }`}
              >
                <RefreshCw
                  className={`w-4 h-4 ${cycleRunning ? 'animate-spin' : ''}`}
                />
                <span>
                  {cycleRunning
                    ? 'Detener Rotación'
                    : 'Activar Rotación Automática'}
                </span>
              </button>
              <div className="text-xs">
                <p className="text-slate-300">
                  {cycleSceneIds.length} cámaras seleccionadas
                </p>
                <p className="font-mono text-slate-400 tabular-nums">
                  {cycleRunning
                    ? `Próximo cambio en ${cycleRemainingSec}s`
                    : 'Seleccioná al menos 2 escenas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300 whitespace-nowrap">
                Intervalo de cambio:
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={cycleIntervalSec}
                onChange={(e) => onChangeCycleInterval(Number(e.target.value))}
                className="w-32 broadcast-fader"
              />
              <span className="font-mono text-xs font-semibold text-white w-10 text-right tabular-nums">
                {cycleIntervalSec}s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenes.map((sc) => {
              const selected = cycleSceneIds.includes(sc.id);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onToggleCycleScene(sc.id)}
                  className={`min-h-[64px] p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    selected
                      ? 'bg-blue-950/50 border-blue-500 text-white'
                      : 'bg-[#0A0D12] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span>{sc.cameraLabel}</span>
                    <span>{selected ? 'ACTIVA' : 'EXCLUIDA'}</span>
                  </div>
                  <p className="font-display text-sm font-semibold mt-1 truncate">
                    {sc.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO-FOLLOW-VIDEO (CAMBIO POR VOZ) */}
      {tab === 'afv' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A0D12] border border-white/8 rounded-lg">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onToggleAfv}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  afvEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {afvEnabled
                    ? 'Auto-Cambio por Voz Activo'
                    : 'Activar Cambio por Voz'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleRealMic}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  micActive
                    ? 'bg-red-950/60 border-red-600 text-red-200'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
              >
                {micActive ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Desconectar Micrófono ({micLevelDb} dB)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Usar Micrófono Local</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Umbral:</span>
                <input
                  type="range"
                  min={-45}
                  max={-5}
                  value={afvThresholdDb}
                  onChange={(e) => onChangeAfvThreshold(Number(e.target.value))}
                  className="w-24 broadcast-fader"
                />
                <span className="font-mono text-white w-12 text-right tabular-nums">
                  {afvThresholdDb} dB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Retención:</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={afvHoldSec}
                  onChange={(e) => onChangeAfvHold(Number(e.target.value))}
                  className="w-20 broadcast-fader"
                />
                <span className="font-mono text-white w-9 text-right tabular-nums">
                  {afvHoldSec}s
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audioChannels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-3 p-3 bg-[#0A0D12] border border-white/8 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {ch.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                    Nivel actual: {ch.levelDb} dB · OBS: {ch.obsInputName}
                  </p>
                </div>
                <select
                  value={ch.linkedSceneId || ''}
                  onChange={(e) => onAssignChannelScene(ch.id, e.target.value)}
                  className="px-2.5 py-1.5 bg-[#121720] border border-white/12 rounded text-xs text-slate-200 max-w-[180px]"
                >
                  <option value="">Sin escena asignada</option>
                  {scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      Cambiar a: {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SCHEDULED CLOCK TRIGGERS */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateSchedule}
            className="flex flex-wrap items-end gap-3 p-3.5 bg-[#0A0D12] border border-white/8 rounded-lg"
          >
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Hora (24h)
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="px-2.5 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-mono text-white"
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] text-slate-400 mb-1">
                Nombre de la Regla
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ej. Inicio Noticiero"
                className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Acción Automática
              </label>
              <select
                value={newAction}
                onChange={(e) =>
                  setNewAction(
                    e.target.value as 'scene' | 'start_stream' | 'stop_stream'
                  )
                }
                className="px-2.5 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
              >
                <option value="scene">Cambiar Escena</option>
                <option value="start_stream">Iniciar Transmisión OBS</option>
                <option value="stop_stream">Detener Transmisión OBS</option>
              </select>
            </div>

            {newAction === 'scene' && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Escena Destino
                </label>
                <select
                  value={newSceneId}
                  onChange={(e) => setNewSceneId(e.target.value)}
                  className="px-2.5 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
                >
                  {scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="min-h-[38px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Programar</span>
            </button>
          </form>

          {schedules.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-lg">
              No hay disparos horarios configurados. Agregá una hora arriba para automatizar cortes o inicios de emisión.
            </p>
          ) : (
            <div className="space-y-2">
              {schedules.map((item) => {
                const targetScene = scenes.find((s) => s.id === item.sceneId);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#0A0D12] border border-white/8 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {item.timeHHMM}
                      </span>
                      <span className="text-slate-200 font-medium truncate">
                        {item.label}
                      </span>
                      <span className="text-slate-400 truncate">
                        ·{' '}
                        {item.action === 'start_stream'
                          ? 'Iniciar Transmisión'
                          : item.action === 'stop_stream'
                          ? 'Detener Transmisión'
                          : `Escena: ${targetScene?.name || 'Principal'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleSchedule(item.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                          item.enabled
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/50'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {item.enabled ? 'Activa' : 'Pausada'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSchedule(item.id)}
                        aria-label="Eliminar horario"
                        className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
