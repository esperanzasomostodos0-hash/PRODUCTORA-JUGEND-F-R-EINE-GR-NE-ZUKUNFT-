import React, { useEffect, useState } from 'react';
import { TV_SHOW_TEMPLATES } from '../data/tvTemplates';
import { OverlayState } from '../types/broadcast';

export const OVERLAY_CHANNEL_NAME = 'mesacontrol_overlay_sync';
export const OVERLAY_STORAGE_KEY = 'mesacontrol_live_overlay_payload';

export interface SyncedOverlayPayload {
  overlays: OverlayState;
  accentHex: string;
}

export const OverlayBrowserSource: React.FC = () => {
  const [payload, setPayload] = useState<SyncedOverlayPayload>(() => {
    try {
      const saved = localStorage.getItem(OVERLAY_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as SyncedOverlayPayload;
    } catch {
      // ignore
    }
    return {
      overlays: TV_SHOW_TEMPLATES[0].defaultOverlays,
      accentHex: TV_SHOW_TEMPLATES[0].accentHex,
    };
  });

  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  );

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    const clockId = window.setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }, 1000);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(OVERLAY_CHANNEL_NAME);
      channel.onmessage = (ev) => {
        if (ev.data) {
          setPayload(ev.data as SyncedOverlayPayload);
        }
      };
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === OVERLAY_STORAGE_KEY && ev.newValue) {
        try {
          setPayload(JSON.parse(ev.newValue) as SyncedOverlayPayload);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(clockId);
      channel?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const { overlays, accentHex } = payload;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent select-none">
      {/* Top Bar: Live Bug + #SinFiltro Logo + Clock + Scoreboard */}
      <div className="absolute top-6 left-8 right-8 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {overlays.showLiveBadge && (
            <span className="px-3 py-1 bg-red-600 text-white text-sm font-mono font-bold tracking-wider rounded-sm shadow-lg">
              EN VIVO
            </span>
          )}
          {overlays.showBug && (
            overlays.logoUrl ? (
              <img
                src={overlays.logoUrl}
                alt={overlays.channelName}
                className="h-12 w-auto object-contain drop-shadow-lg"
              />
            ) : (
              <span className="px-3 py-1 bg-black/80 text-white text-sm font-display font-semibold tracking-wide rounded-sm border border-white/15 shadow-lg">
                {overlays.channelName}
              </span>
            )
          )}
          {overlays.showClock && (
            <span className="px-3 py-1 bg-black/80 text-slate-200 text-sm font-mono tabular-nums rounded-sm border border-white/10 shadow-lg">
              {clockText}
            </span>
          )}
        </div>

        {overlays.showScoreboard && (
          <div className="flex items-center bg-slate-950/95 border border-white/15 rounded-sm overflow-hidden shadow-xl text-base font-mono">
            <span className="px-3 py-1 font-semibold text-white bg-slate-800">
              {overlays.scoreHomeName}
            </span>
            <span className="px-3 py-1 font-bold text-white bg-emerald-700 tabular-nums">
              {overlays.scoreHome}
            </span>
            <span className="px-1.5 text-slate-400">-</span>
            <span className="px-3 py-1 font-bold text-white bg-blue-700 tabular-nums">
              {overlays.scoreAway}
            </span>
            <span className="px-3 py-1 font-semibold text-white bg-slate-800">
              {overlays.scoreAwayName}
            </span>
            <span className="px-3 py-1 text-amber-300 bg-black/85 tabular-nums border-l border-white/10">
              {overlays.matchClock}
            </span>
          </div>
        )}

        {overlays.activeGuestBadge && (
          <div
            className="bg-slate-950/92 border border-white/15 rounded-sm px-4 py-2.5 shadow-2xl max-w-md"
            style={{ borderLeft: `6px solid ${accentHex}` }}
          >
            <span
              className="inline-block px-2 py-0.5 text-xs font-mono font-bold text-white rounded-sm"
              style={{ backgroundColor: accentHex }}
            >
              {overlays.activeGuestBadge.greeting || 'BIENVENIDO'}
            </span>
            <p className="font-display text-2xl font-bold text-white leading-tight mt-1">
              {overlays.activeGuestBadge.name}
            </p>
            {overlays.activeGuestBadge.role && (
              <p className="text-sm text-slate-300">
                {overlays.activeGuestBadge.role}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lower Third */}
      {overlays.showLowerThird && (
        <div
          className={`absolute left-8 right-8 ${
            overlays.showTicker ? 'bottom-16' : 'bottom-8'
          }`}
        >
          <div className="inline-flex flex-col max-w-2xl bg-slate-950/92 border border-white/15 rounded-sm overflow-hidden shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentHex }} />
            <div className="px-5 py-3">
              <p className="font-display text-2xl font-bold text-white leading-tight">
                {overlays.lowerThirdTitle}
              </p>
              {overlays.lowerThirdSubtitle && (
                <p className="text-base text-slate-300 mt-0.5">
                  {overlays.lowerThirdSubtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TV Headline / Full Title Plate */}
      {overlays.activeBannerTitle &&
        overlays.activeBannerTitle.style === 'headline_banner' && (
          <div className="absolute top-24 left-8 right-8">
            <div
              className="inline-flex flex-col max-w-4xl bg-slate-950/95 border border-white/15 rounded-sm px-5 py-3 shadow-2xl"
              style={{ borderLeft: `6px solid ${accentHex}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-2.5 py-0.5 text-xs font-mono font-bold text-white rounded-sm shrink-0"
                  style={{ backgroundColor: accentHex }}
                >
                  {overlays.activeBannerTitle.tag || 'TITULAR'}
                </span>
                <p className="font-display text-2xl font-bold text-white">
                  {overlays.activeBannerTitle.title}
                </p>
              </div>
              {overlays.activeBannerTitle.subtitle && (
                <p className="text-base text-slate-300 mt-1">
                  {overlays.activeBannerTitle.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

      {overlays.activeBannerTitle &&
        overlays.activeBannerTitle.style === 'full_title' && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl bg-slate-950/95 border border-white/20 rounded-lg overflow-hidden shadow-2xl text-center">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: accentHex }}
              />
              <div className="p-8 space-y-3">
                {overlays.activeBannerTitle.tag && (
                  <span
                    className="inline-block px-3 py-1 text-xs font-mono font-bold text-white rounded-sm"
                    style={{ backgroundColor: accentHex }}
                  >
                    {overlays.activeBannerTitle.tag}
                  </span>
                )}
                <p className="font-display text-4xl font-bold text-white">
                  {overlays.activeBannerTitle.title}
                </p>
                {overlays.activeBannerTitle.subtitle && (
                  <p className="text-xl text-slate-300">
                    {overlays.activeBannerTitle.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Giveaway / Trivia / Winner Overlay */}
      {overlays.giveaway && overlays.giveaway.stage !== 'hidden' && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div
            className={`w-full max-w-3xl bg-[#050B08]/95 border-2 rounded-lg overflow-hidden shadow-2xl text-center ${
              overlays.giveaway.stage === 'winner'
                ? 'border-amber-400'
                : 'border-emerald-500/80'
            }`}
          >
            <div
              className="h-2 w-full"
              style={{
                backgroundColor:
                  overlays.giveaway.stage === 'winner' ? '#F59E0B' : accentHex,
              }}
            />
            <div className="p-8 space-y-3">
              <span
                className={`inline-block px-3.5 py-1 text-xs font-mono font-bold rounded-sm ${
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
                  <p className="font-display text-4xl font-extrabold text-amber-300">
                    {overlays.giveaway.rollingName || '...'}
                  </p>
                  <p className="text-xl text-slate-300">
                    Premio: {overlays.giveaway.prize}
                  </p>
                </>
              ) : overlays.giveaway.stage === 'winner' ? (
                <>
                  <p className="font-display text-5xl font-extrabold text-white">
                    {overlays.giveaway.winnerName || 'GANADOR/A'}
                  </p>
                  <p className="text-2xl font-semibold text-emerald-300">
                    Premio: {overlays.giveaway.prize}
                  </p>
                  {overlays.giveaway.winnerNote && (
                    <p className="text-lg text-slate-300">
                      {overlays.giveaway.winnerNote}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-display text-4xl font-bold text-white">
                    {overlays.giveaway.prize}
                  </p>
                  <p className="text-xl text-slate-300">
                    {overlays.giveaway.promptText}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticker */}
      {overlays.showTicker && (
        <div className="absolute bottom-0 left-0 right-0 h-11 bg-slate-950/95 border-t border-white/15 flex items-center overflow-hidden">
          <span
            className="px-4 h-full flex items-center text-sm font-mono font-bold text-white shrink-0 z-10"
            style={{ backgroundColor: accentHex }}
          >
            {overlays.channelName || 'INFO'}
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="animate-ticker text-base text-slate-100 font-medium">
              <span className="px-8">{overlays.tickerText}</span>
              <span className="px-8" aria-hidden="true">
                {overlays.tickerText}
              </span>
            </div>
          </div>
        </div>
      )}

      {overlays.fadeToBlack && (
        <div className="absolute inset-0 bg-black z-50" />
      )}
    </div>
  );
};
