import React, { useEffect, useRef, useState } from 'react';
import { Camera, Edit3, MonitorUp, Radio, VideoOff } from 'lucide-react';
import { BroadcastScene, OverlayState, TransitionType } from '../types/broadcast';
import { OFFICIAL_PRODUCER_LOGO } from '../data/tvTemplates';

interface BroadcastMonitorProps {
  role: 'PGM' | 'PVW';
  scene: BroadcastScene;
  overlays: OverlayState;
  accentHex: string;
  isLiveOnAir: boolean;
  transitionType: TransitionType;
  liveStream: MediaStream | null;
  onRequestWebcam?: () => void;
  onRequestScreen?: () => void;
  onStopCamera?: () => void;
  onEditScene?: () => void;
  compact?: boolean;
}

export const BroadcastMonitor: React.FC<BroadcastMonitorProps> = ({
  role,
  scene,
  overlays,
  accentHex,
  isLiveOnAir,
  transitionType,
  liveStream,
  onRequestWebcam,
  onRequestScreen,
  onStopCamera,
  onEditScene,
  compact = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [clockText, setClockText] = useState<string>(() =>
    new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [scene.backdropUrl, scene.mediaUrl]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = liveStream;
    }
  }, [liveStream, scene.layoutMode, scene.cameraType]);

  const isPgm = role === 'PGM';
  const borderClass = isPgm
    ? isLiveOnAir
      ? 'border-red-600'
      : 'border-emerald-500/60'
    : 'border-amber-500/60';

  const useLiveFeed =
    (scene.cameraType === 'webcam' || scene.cameraType === 'screen') &&
    liveStream !== null;

  const useUploadedVideo =
    scene.cameraType === 'media' &&
    scene.mediaKind === 'video' &&
    Boolean(scene.mediaUrl);

  const imageSrc =
    scene.cameraType === 'media' && scene.mediaKind === 'image' && scene.mediaUrl
      ? scene.mediaUrl
      : scene.backdropUrl;

  return (
    <div
      className={`bg-[#11161F] border ${borderClass} rounded-lg overflow-hidden flex flex-col transition-colors duration-200`}
    >
      {/* Monitor Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0D1118] border-b border-white/8">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider rounded shrink-0 ${
              isPgm
                ? isLiveOnAir
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                : 'bg-amber-950 text-amber-300 border border-amber-700/60'
            }`}
          >
            {isPgm ? (isLiveOnAir ? 'PGM · AL AIRE' : 'PGM · PROGRAMA') : 'PVW · PREVIO'}
          </span>
          <span className="text-xs font-medium text-slate-200 truncate">
            {scene.name}
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline whitespace-nowrap truncate">
            · {scene.cameraLabel}
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-1 shrink-0">
            {onEditScene && (
              <button
                type="button"
                onClick={onEditScene}
                title="Editar cámara o fuente"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Editar</span>
              </button>
            )}
            {liveStream ? (
              <button
                type="button"
                onClick={onStopCamera}
                title="Detener cámara local"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Cortar</span>
              </button>
            ) : (
              <>
                {onRequestWebcam && (
                  <button
                    type="button"
                    onClick={onRequestWebcam}
                    title="Conectar cámara real a esta escena"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Cámara</span>
                  </button>
                )}
                {onRequestScreen && (
                  <button
                    type="button"
                    onClick={onRequestScreen}
                    title="Capturar pantalla en esta escena"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MonitorUp className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Pantalla</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 16:9 Broadcast Viewport */}
      <div className="relative aspect-video w-full bg-[#06080C] overflow-hidden select-none">
        {scene.cameraType === 'slate' ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${accentHex}44 0%, ${
                scene.slateColor || '#052E2B'
              } 70%)`,
            }}
          >
            {overlays.logoUrl ? (
              <img
                src={overlays.logoUrl}
                alt={overlays.channelName}
                className="h-20 w-auto object-contain mb-3 drop-shadow-xl"
              />
            ) : (
              <div
                className="w-16 h-1 mb-4 rounded-full"
                style={{ backgroundColor: accentHex }}
              />
            )}
            <p className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white max-w-md text-balance uppercase">
              {overlays.channelName || scene.slateHeadline || scene.name}
            </p>
            <p className="mt-2 px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-xs sm:text-sm font-mono font-bold tracking-[0.25em] text-emerald-300 uppercase">
              YA VOLVEMOS
            </p>
          </div>
        ) : scene.layoutMode === 'split' && !useUploadedVideo ? (
          <div className="absolute inset-0 grid grid-cols-2 gap-1 bg-black p-1">
            <div className="relative overflow-hidden bg-slate-900">
              {!imgFailed ? (
                <img
                  src={imageSrc}
                  alt={scene.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover object-left scale-110"
                />
              ) : (
                <div className="w-full h-full bg-slate-900" />
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 text-[10px] font-mono text-white">
                MESA PRINCIPAL
              </div>
            </div>
            <div className="relative overflow-hidden bg-slate-900">
              {liveStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : !imgFailed ? (
                <img
                  src={imageSrc}
                  alt={`${scene.name} señal remota`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover object-right scale-125 brightness-95"
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 text-[10px] font-mono text-white">
                {liveStream ? scene.cameraLabel : 'INVITADO'}
              </div>
            </div>
          </div>
        ) : useLiveFeed ? (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {scene.layoutMode === 'pip' && imageSrc && !imgFailed && (
              <div className="absolute top-10 right-3 w-[28%] aspect-video border border-white/30 bg-slate-950 shadow-lg overflow-hidden rounded-sm">
                <img
                  src={imageSrc}
                  alt="PIP"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover object-right scale-125"
                />
                <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/75 text-[9px] font-mono text-slate-200">
                  PIP
                </div>
              </div>
            )}
          </div>
        ) : useUploadedVideo ? (
          <video
            src={scene.mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            {!imgFailed ? (
              <img
                src={imageSrc}
                alt={scene.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  scene.layoutMode === 'pip' ? 'scale-110 object-center' : 'scale-100'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center text-xs text-slate-400">
                {scene.name}
              </div>
            )}
            {scene.layoutMode === 'pip' && (
              <div className="absolute top-10 right-3 w-[28%] aspect-video border border-white/30 bg-slate-950 shadow-lg overflow-hidden rounded-sm">
                <img
                  src={imageSrc}
                  alt="PIP"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-right scale-125"
                />
                <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/75 text-[9px] font-mono text-slate-200">
                  PIP
                </div>
              </div>
            )}
          </div>
        )}

        {/* Measured Contrast Scrim for Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 pointer-events-none" />

        {/* Top-Left: Live Badge + #SinFiltro Logo Bug + Clock */}
        <div className="absolute top-2.5 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5">
            {overlays.showLiveBadge && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-mono font-semibold tracking-wider rounded-sm shadow">
                EN VIVO
              </span>
            )}
            {overlays.showBug && (
              overlays.logoUrl ? (
                <img
                  src={overlays.logoUrl}
                  alt={overlays.channelName}
                  className="h-8 w-auto object-contain drop-shadow"
                />
              ) : (
                <span
                  className="px-2 py-0.5 text-white text-[10px] font-display font-bold tracking-wide rounded-sm border border-white/20 shadow"
                  style={{ backgroundColor: `${accentHex}E6` }}
                >
                  {overlays.channelName}
                </span>
              )
            )}
            {overlays.showClock && (
              <span className="px-2 py-0.5 bg-black/75 text-slate-200 text-[10px] font-mono tabular-nums rounded-sm border border-white/10">
                {clockText}
              </span>
            )}
          </div>

          {overlays.showScoreboard && (
            <div className="flex items-center bg-slate-950/90 border border-white/15 rounded-sm overflow-hidden shadow text-[11px] font-mono">
              <span className="px-2 py-0.5 font-semibold text-white bg-slate-800">
                {overlays.scoreHomeName}
              </span>
              <span className="px-2 py-0.5 font-bold text-white bg-emerald-700 tabular-nums">
                {overlays.scoreHome}
              </span>
              <span className="px-1 text-slate-400">-</span>
              <span className="px-2 py-0.5 font-bold text-white bg-blue-700 tabular-nums">
                {overlays.scoreAway}
              </span>
              <span className="px-2 py-0.5 font-semibold text-white bg-slate-800">
                {overlays.scoreAwayName}
              </span>
              <span className="px-2 py-0.5 text-amber-300 bg-black/80 tabular-nums border-l border-white/10">
                {overlays.matchClock}
              </span>
            </div>
          )}

          {/* Guest Welcome Badge ("Cartelito de Bienvenida") */}
          {overlays.activeGuestBadge && (
            <div
              className={`bg-slate-950/92 border border-white/15 rounded-sm px-2.5 py-1.5 shadow-xl max-w-[44%] ${
                overlays.showScoreboard ? 'mt-9' : ''
              }`}
              style={{ borderLeft: `4px solid ${accentHex}` }}
            >
              <span
                className="inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-white rounded-sm"
                style={{ backgroundColor: accentHex }}
              >
                {overlays.activeGuestBadge.greeting || 'BIENVENIDO'}
              </span>
              <p className="font-display text-xs sm:text-sm font-bold text-white leading-tight truncate mt-0.5">
                {overlays.activeGuestBadge.name}
              </p>
              {overlays.activeGuestBadge.role && (
                <p className="text-[10px] text-slate-300 truncate">
                  {overlays.activeGuestBadge.role}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lower Third Graphic */}
        {overlays.showLowerThird && (
          <div
            className={`absolute left-3 right-3 ${
              overlays.showTicker ? 'bottom-8' : 'bottom-3'
            } pointer-events-none`}
          >
            <div className="inline-flex flex-col max-w-[85%] bg-slate-950/92 border border-white/15 rounded-sm overflow-hidden shadow-lg">
              <div
                className="h-1 w-full"
                style={{ backgroundColor: accentHex }}
              />
              <div className="px-3 py-1.5">
                <p className="font-display text-xs sm:text-sm font-bold text-white leading-tight truncate">
                  {overlays.lowerThirdTitle}
                </p>
                {overlays.lowerThirdSubtitle && (
                  <p className="text-[11px] text-slate-300 leading-snug truncate">
                    {overlays.lowerThirdSubtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TV Headline Banner / Full Title Plate */}
        {overlays.activeBannerTitle &&
          overlays.activeBannerTitle.style === 'headline_banner' && (
            <div className="absolute top-12 left-3 right-3 pointer-events-none">
              <div
                className="bg-slate-950/92 border border-white/15 rounded-sm px-3 py-2 shadow-lg max-w-[92%]"
                style={{ borderLeft: `4px solid ${accentHex}` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-white rounded-sm shrink-0"
                    style={{ backgroundColor: accentHex }}
                  >
                    {overlays.activeBannerTitle.tag || 'TITULAR'}
                  </span>
                  <p className="font-display text-xs sm:text-sm font-bold text-white truncate">
                    {overlays.activeBannerTitle.title}
                  </p>
                </div>
                {overlays.activeBannerTitle.subtitle && (
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                    {overlays.activeBannerTitle.subtitle}
                  </p>
                )}
              </div>
            </div>
          )}

        {overlays.activeBannerTitle &&
          overlays.activeBannerTitle.style === 'full_title' && (
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none bg-black/45">
              <div className="w-full max-w-md bg-slate-950/95 border border-white/20 rounded-md overflow-hidden shadow-2xl text-center">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: accentHex }}
                />
                <div className="p-4 space-y-1.5">
                  {overlays.activeBannerTitle.tag && (
                    <span
                      className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-white rounded-sm"
                      style={{ backgroundColor: accentHex }}
                    >
                      {overlays.activeBannerTitle.tag}
                    </span>
                  )}
                  <p className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                    {overlays.activeBannerTitle.title}
                  </p>
                  {overlays.activeBannerTitle.subtitle && (
                    <p className="text-xs text-slate-300">
                      {overlays.activeBannerTitle.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Live Giveaway / Trivia / Raffle / Winner Broadcast Placa */}
        {overlays.giveaway && overlays.giveaway.stage !== 'hidden' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div
              className={`w-full max-w-md bg-[#050B08]/95 border-2 rounded-md overflow-hidden shadow-2xl text-center ${
                overlays.giveaway.stage === 'winner'
                  ? 'border-amber-400'
                  : 'border-emerald-500/80'
              }`}
            >
              <div
                className="h-1.5 w-full"
                style={{
                  backgroundColor:
                    overlays.giveaway.stage === 'winner' ? '#F59E0B' : accentHex,
                }}
              />
              <div className="p-3.5 space-y-1.5">
                <span
                  className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-sm ${
                    overlays.giveaway.stage === 'winner'
                      ? 'bg-amber-400 text-black'
                      : 'text-white'
                  }`}
                  style={
                    overlays.giveaway.stage === 'winner'
                      ? undefined
                      : { backgroundColor: accentHex }
                  }
                >
                  {overlays.giveaway.stage === 'winner'
                    ? '¡GANADOR/A EN VIVO!'
                    : overlays.giveaway.stage === 'rolling'
                    ? 'SORTEANDO EN VIVO...'
                    : overlays.giveaway.title || 'PREMIO EN VIVO'}
                </span>

                {overlays.giveaway.stage === 'rolling' ? (
                  <>
                    <p className="font-display text-lg sm:text-xl font-extrabold text-amber-300 truncate">
                      {overlays.giveaway.rollingName || '...'}
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      Premio: {overlays.giveaway.prize}
                    </p>
                  </>
                ) : overlays.giveaway.stage === 'winner' ? (
                  <>
                    <p className="font-display text-lg sm:text-xl font-extrabold text-white truncate">
                      {overlays.giveaway.winnerName || 'GANADOR/A'}
                    </p>
                    <p className="text-xs font-semibold text-emerald-300 truncate">
                      Premio: {overlays.giveaway.prize}
                    </p>
                    {overlays.giveaway.winnerNote && (
                      <p className="text-[11px] text-slate-300 truncate">
                        {overlays.giveaway.winnerNote}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                      {overlays.giveaway.prize}
                    </p>
                    <p className="text-xs text-slate-300">
                      {overlays.giveaway.promptText}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-300">
                      Participantes anotados: {overlays.giveaway.participants.length}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom News / Program Ticker */}
        {overlays.showTicker && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-950/95 border-t border-white/15 flex items-center overflow-hidden pointer-events-none">
            <span
              className="px-2 h-full flex items-center text-[10px] font-mono font-bold text-white shrink-0 z-10"
              style={{ backgroundColor: accentHex }}
            >
              {overlays.channelName || 'INFO'}
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="animate-ticker text-[11px] text-slate-100 font-medium">
                <span className="px-4">{overlays.tickerText}</span>
                <span className="px-4" aria-hidden="true">
                  {overlays.tickerText}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* End-of-Program Closing Slate ("Placa de Cierre") */}
        {overlays.closingSlate?.active && (
          <div
            className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 text-center pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 25%, ${accentHex}44 0%, #050907 78%)`,
            }}
          >
            {/* Top 3 Logos Row: Program + Radio + Production House */}
            <div className="grid grid-cols-3 items-center gap-2 border-b border-white/15 pb-2">
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                {(overlays.closingSlate.programLogoUrl || overlays.logoUrl) ? (
                  <img
                    src={overlays.closingSlate.programLogoUrl || overlays.logoUrl}
                    alt={overlays.closingSlate.programTitle || overlays.channelName}
                    className="h-7 sm:h-9 w-auto object-contain drop-shadow"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-white truncate">
                    {overlays.closingSlate.programTitle || overlays.channelName}
                  </span>
                )}
                <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 truncate max-w-full">
                  {overlays.closingSlate.programTitle || overlays.channelName}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-0">
                {overlays.closingSlate.radioLogoUrl ? (
                  <img
                    src={overlays.closingSlate.radioLogoUrl}
                    alt={overlays.closingSlate.radioName}
                    className="h-7 sm:h-9 w-auto object-contain drop-shadow"
                  />
                ) : (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold">
                      88.5 FM
                    </span>
                  </div>
                )}
                <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 truncate max-w-full">
                  {overlays.closingSlate.radioName || 'Radioactiva 88.5 FM'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-0">
                <img
                  src={overlays.closingSlate.producerLogoUrl || OFFICIAL_PRODUCER_LOGO}
                  alt={overlays.closingSlate.producerName}
                  className="h-7 sm:h-9 w-auto object-contain drop-shadow"
                />
                <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 truncate max-w-full">
                  {overlays.closingSlate.producerName || 'JUGEND FÜR EINE GRÜNE ZUKUNFT'}
                </span>
              </div>
            </div>

            {/* Center Headline & Area Credits */}
            <div className="flex-1 flex flex-col justify-center gap-2 py-1 min-h-0">
              <p className="font-display text-xs sm:text-sm font-extrabold tracking-wider text-emerald-300 uppercase">
                {overlays.closingSlate.headline || 'GRACIAS POR ACOMPAÑARNOS'}
              </p>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-left max-w-lg mx-auto w-full px-1">
                {overlays.closingSlate.credits.slice(0, 8).map((item, idx) => (
                  <div
                    key={`${item.area}-${idx}`}
                    className="bg-black/45 border border-white/10 rounded px-2 py-1 min-w-0"
                  >
                    <p className="text-[7px] sm:text-[8px] font-mono uppercase tracking-wider text-emerald-400 truncate">
                      {item.area}
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-semibold text-white truncate">
                      {item.names}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Owner Credit */}
            <div className="border-t border-white/15 pt-1.5 flex items-center justify-between gap-2 text-[8px] sm:text-[9px] font-mono text-slate-300">
              <span className="truncate">
                {overlays.closingSlate.producerName || 'JUGEND FÜR EINE GRÜNE ZUKUNFT'}
              </span>
              <span className="text-emerald-300 font-semibold truncate">
                {overlays.closingSlate.ownerCredit ||
                  'Dueño y Creador: ALMADA EDUARDO THOMAS'}
              </span>
            </div>
          </div>
        )}

        {/* Fade To Black Overlay */}
        {overlays.fadeToBlack && (
          <div className="absolute inset-0 bg-black/95 flex items-center justify-center pointer-events-none z-30">
            <span className="px-3 py-1 border border-white/20 text-[10px] font-mono tracking-widest text-slate-400">
              FTB · NEGRO AL AIRE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
