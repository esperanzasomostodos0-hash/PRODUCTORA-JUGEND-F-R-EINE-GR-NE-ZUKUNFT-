import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  Circle,
  Clapperboard,
  Copy,
  Edit3,
  ExternalLink,
  Gift,
  Home,
  Layers,
  Lock,
  Megaphone,
  MessageSquare,
  Play,
  Plus,
  Radio,
  Scissors,
  Sliders,
  Square,
  Tv,
  Type,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { AudioMixerBar } from './components/AudioMixerBar';
import { AudienceAndClosingPanel } from './components/AudienceAndClosingPanel';
import { AutomationPanel } from './components/AutomationPanel';
import { BroadcastMonitor } from './components/BroadcastMonitor';
import { CameraEditorModal } from './components/CameraEditorModal';
import { GiveawayPanel } from './components/GiveawayPanel';
import { GuestBadgesPanel } from './components/GuestBadgesPanel';
import { LiveCommentsPanel } from './components/LiveCommentsPanel';
import { LiveViewerPage } from './components/LiveViewerPage';
import { ObsConnectionModal } from './components/ObsConnectionModal';
import {
  OVERLAY_CHANNEL_NAME,
  OVERLAY_STORAGE_KEY,
  OverlayBrowserSource,
} from './components/OverlayBrowserSource';
import { ProducerAuthModal } from './components/ProducerAuthModal';
import { ProductionHouseSite } from './components/ProductionHouseSite';
import { ProgramQuickEditModal } from './components/ProgramQuickEditModal';
import { SponsorManagerPanel } from './components/SponsorManagerPanel';
import { TemplateStudioPanel } from './components/TemplateStudioPanel';
import { TouchDeckPanel } from './components/TouchDeckPanel';
import { TvTitlesPanel } from './components/TvTitlesPanel';
import {
  DEFAULT_CLOSING_SLATE,
  DEFAULT_GIVEAWAY_STATE,
  DEFAULT_GUEST_BADGES,
  DEFAULT_SPONSOR_BANNERS,
  DEFAULT_TV_TITLES,
  OFFICIAL_PRODUCER_LOGO,
  OFFICIAL_SINFILTRO_LOGO,
  TV_SHOW_TEMPLATES,
} from './data/tvTemplates';
import { renderBroadcastFrame } from './services/liveCompositor';
import { obsClient } from './services/obsWebSocket';
import {
  MicAnalyzerHandle,
  broadcastAudio,
  playBroadcastStinger,
  startMicLevelMonitor,
} from './services/soundEffects';
import {
  AudioChannel,
  BroadcastScene,
  ClosingSlateConfig,
  GiveawayState,
  GuestBadgeItem,
  ObsStatusSnapshot,
  OverlayState,
  RundownStep,
  ScheduledTrigger,
  ShowTemplate,
  SponsorBanner,
  TouchPadItem,
  TransitionType,
  TvTitlePreset,
  ViewerComment,
} from './types/broadcast';
import {
  PRODUCER_ROLES,
  ProducerProgram,
  StaffUserPublic,
} from './types/producer';

type StudioModuleTab =
  | 'titles'
  | 'guests'
  | 'giveaway'
  | 'audience_closing'
  | 'comments'
  | 'sponsors';

type WorkspaceView =
  | 'switcher'
  | 'deck'
  | 'automation'
  | 'templates'
  | 'sponsors';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function boostVideoBitrateSdp(sdp: string): string {
  const lines = sdp.split('\r\n');
  const out: string[] = [];
  let inVideo = false;
  let addedBandwidth = false;
  for (const line of lines) {
    if (line.startsWith('m=video ')) {
      inVideo = true;
      addedBandwidth = false;
      out.push(line);
      continue;
    }
    if (line.startsWith('m=')) {
      inVideo = false;
    }
    if (inVideo && line.startsWith('c=IN ') && !addedBandwidth) {
      out.push(line);
      out.push('b=AS:4500');
      addedBandwidth = true;
      continue;
    }
    if (inVideo && line.startsWith('a=fmtp:')) {
      if (!line.includes('x-google-start-bitrate')) {
        out.push(
          `${line};x-google-min-bitrate=1200;x-google-start-bitrate=2500;x-google-max-bitrate=4500`
        );
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\r\n');
}

function formatSecondsToHms(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

type AppRouteMode = 'site' | 'studio' | 'live' | 'overlay';

interface AppRouteState {
  mode: AppRouteMode;
  programId: string;
}

function getRouteStateFromSearch(search: string): AppRouteState {
  const params = new URLSearchParams(search);
  const rawProgram =
    (params.get('program') || params.get('programa') || 'sin-filtro').trim() ||
    'sin-filtro';
  if (params.get('overlay') === '1') {
    return { mode: 'overlay', programId: rawProgram };
  }
  if (params.get('live') === '1' || params.get('ver') === '1') {
    return { mode: 'live', programId: rawProgram };
  }
  if (params.get('studio') === '1' || params.get('consola') === '1') {
    return { mode: 'studio', programId: rawProgram };
  }
  return { mode: 'site', programId: rawProgram };
}

export default function App() {
  const [routeState, setRouteState] = useState<AppRouteState>(() =>
    typeof window !== 'undefined'
      ? getRouteStateFromSearch(window.location.search)
      : { mode: 'site', programId: 'sin-filtro' }
  );

  // Staff auth session kept strictly in React memory (never persisted in localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffUserPublic | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setRouteState(getRouteStateFromSearch(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateRoute = useCallback(
    (nextMode: AppRouteMode, nextProgramId?: string, apartadoProgramId?: string) => {
      const targetProgram =
        (typeof nextProgramId === 'string' && nextProgramId.trim()) ||
        routeState.programId ||
        'sin-filtro';

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('overlay');
        url.searchParams.delete('live');
        url.searchParams.delete('ver');
        url.searchParams.delete('studio');
        url.searchParams.delete('consola');
        url.searchParams.delete('program');
        url.searchParams.delete('programa');
        url.searchParams.delete('apartado');
        if (nextMode === 'studio') {
          url.searchParams.set('studio', '1');
          url.searchParams.set('program', targetProgram);
        } else if (nextMode === 'live') {
          url.searchParams.set('live', '1');
          url.searchParams.set('program', targetProgram);
        } else if (nextMode === 'overlay') {
          url.searchParams.set('overlay', '1');
        } else if (apartadoProgramId) {
          url.searchParams.set('programa', apartadoProgramId);
        }
        window.history.pushState({}, '', `${url.pathname}${url.search}`);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setRouteState({ mode: nextMode, programId: targetProgram });
    },
    [routeState.programId]
  );

  const authModalElement = (
    <ProducerAuthModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      onAuthenticated={(token, user) => {
        setAuthToken(token);
        setCurrentUser(user);
      }}
    />
  );

  if (routeState.mode === 'overlay') {
    return <OverlayBrowserSource />;
  }

  if (routeState.mode === 'live') {
    return (
      <>
        <LiveViewerPage
          programId={routeState.programId}
          authToken={authToken}
          currentUser={currentUser}
          onRequestAuth={() => setAuthModalOpen(true)}
          onOpenApartado={(pid) => navigateRoute('site', pid, pid)}
          onBack={() => {
            if (window.history.length > 1) window.history.back();
            else navigateRoute('site');
          }}
          onHome={() => navigateRoute('site')}
        />
        {authModalElement}
      </>
    );
  }

  if (routeState.mode === 'studio') {
    const canOperateStudio = Boolean(
      authToken &&
        currentUser &&
        PRODUCER_ROLES[currentUser.role]?.canOperateStudio
    );
    if (!canOperateStudio) {
      return (
        <>
          <div className="min-h-screen bg-[#050708] text-slate-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#090D0F] border border-white/12 rounded-2xl p-7 space-y-5 text-center shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono text-emerald-400 tracking-wider">
                  ACCESO RESTRINGIDO · MESACONTROL TV
                </p>
                <h1 className="font-cinema text-2xl font-semibold text-white">
                  Consola exclusiva para personal autorizado
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {currentUser
                    ? `Tu rol (${PRODUCER_ROLES[currentUser.role]?.label || currentUser.role}) no tiene autorización para abrir la consola de emisión.`
                    : 'Solo el administrador total y los usuarios autorizados pueden ingresar a la consola de emisión en vivo.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full sm:w-auto min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg cursor-pointer"
                  >
                    Iniciar Sesión Autorizada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateRoute('site')}
                  className="w-full sm:w-auto min-h-[42px] px-5 py-2 border border-white/15 hover:border-white/30 text-slate-200 text-sm font-medium rounded-lg cursor-pointer"
                >
                  Volver al Inicio
                </button>
              </div>
            </div>
          </div>
          {authModalElement}
        </>
      );
    }

    return (
      <>
        <ControlConsole
          initialProgramId={routeState.programId}
          authToken={authToken}
          currentUser={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
          onChangeProgramRoute={(pid) => navigateRoute('studio', pid)}
          onOpenLive={(pid) => navigateRoute('live', pid)}
          onBack={() => {
            if (window.history.length > 1) window.history.back();
            else navigateRoute('site');
          }}
          onBackToSite={() => navigateRoute('site')}
        />
        {authModalElement}
      </>
    );
  }

  return (
    <>
      <ProductionHouseSite
        authToken={authToken}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={() => {
          setAuthToken(null);
          setCurrentUser(null);
        }}
        onOpenStudio={(programId) =>
          navigateRoute('studio', programId || 'sin-filtro')
        }
        onOpenLive={(programId) =>
          navigateRoute('live', programId || 'sin-filtro')
        }
      />
      {authModalElement}
    </>
  );
}

function sanitizeLegacyHostText(value: string): string {
  return value
    .replace(/Conducción:\s*Camila Rodr[ií]guez\s*·?\s*/gi, '')
    .replace(/Camila Rodr[ií]guez\s*·\s*#SinFiltro/gi, '#SinFiltro en Vivo')
    .replace(/Bienvenida Camila Rodr[ií]guez/gi, 'Bienvenida #SinFiltro')
    .replace(/Mic Camila \(Conducción\)/gi, 'Mic 1 (Conducción)')
    .replace(/Camila Rodr[ií]guez/gi, 'Conducción')
    .replace(/CAMILA RODR[IÍ]GUEZ/g, '#SINFILTRO EN VIVO')
    .replace(/Camila & Sof[ií]a/gi, 'Lucía & Sofía')
    .replace(/Plano de conducción Conducción con PIP\./gi, 'Plano principal de conducción con recuadro PIP.');
}

function buildProgramStudioConfig(
  programId: string,
  catalog: ProducerProgram[]
): ShowTemplate {
  const existingTpl = TV_SHOW_TEMPLATES.find((t) => t.id === programId);
  const prog = catalog.find((p) => p.id === programId);
  if (existingTpl) {
    if (!prog) return existingTpl;
    return {
      ...existingTpl,
      name: prog.title || existingTpl.name,
      logoUrl: prog.logoUrl || existingTpl.logoUrl,
      defaultOverlays: {
        ...existingTpl.defaultOverlays,
        channelName: prog.title || existingTpl.defaultOverlays.channelName,
        logoUrl: prog.logoUrl || existingTpl.defaultOverlays.logoUrl,
      },
    };
  }

  const baseTpl = TV_SHOW_TEMPLATES[0];
  const title = prog?.title || programId;
  const logoUrl = prog?.logoUrl || OFFICIAL_PRODUCER_LOGO;
  const backdropUrl =
    prog?.imageUrl || baseTpl.previewImageUrl || '/src/assets/images/hero_production_set_1795376282591.jpg';
  const subtitle =
    prog?.schedule ||
    prog?.format ||
    'JUGEND FÜR EINE GRÜNE ZUKUNFT · Señal HD en Vivo';

  const scenes: BroadcastScene[] = [
    {
      id: `${programId}-cam1`,
      name: 'Cámara 1 · Principal',
      obsSceneName: `${title} - Cam 1`,
      cameraLabel: 'CAM 1',
      backdropUrl,
      cameraType: 'studio',
      layoutMode: 'full',
      description: `Plano principal de conducción · ${title}`,
    },
    {
      id: `${programId}-cam2`,
      name: 'Cámara 2 · Mesa / Invitados',
      obsSceneName: `${title} - Cam 2`,
      cameraLabel: 'CAM 2',
      backdropUrl,
      cameraType: 'studio',
      layoutMode: 'pip',
      description: `Plano de invitados y debate en mesa · ${title}`,
    },
    {
      id: `${programId}-screen`,
      name: 'Pantalla / Material',
      obsSceneName: `${title} - Pantalla`,
      cameraLabel: 'PANTALLA',
      backdropUrl,
      cameraType: 'screen',
      layoutMode: 'split',
      description: `Presentación de material audiovisual · ${title}`,
    },
    {
      id: `${programId}-pausa`,
      name: 'Placa Institucional',
      obsSceneName: `${title} - Pausa`,
      cameraLabel: 'PLACA',
      backdropUrl,
      cameraType: 'slate',
      layoutMode: 'full',
      slateColor: '#062614',
      slateHeadline: title,
      description: 'YA VOLVEMOS',
    },
  ];

  const touchPads: TouchPadItem[] = [
    {
      id: `${programId}-pad-c1`,
      label: 'CAM 1',
      sublabel: 'Principal',
      color: 'emerald',
      actionType: 'scene',
      targetValue: scenes[0].id,
      category: 'escenas',
    },
    {
      id: `${programId}-pad-c2`,
      label: 'CAM 2 / PIP',
      sublabel: 'Invitados',
      color: 'emerald',
      actionType: 'scene',
      targetValue: scenes[1].id,
      category: 'escenas',
    },
    {
      id: `${programId}-pad-pausa`,
      label: 'PLACA PAUSA',
      sublabel: 'Corte',
      color: 'slate',
      actionType: 'scene',
      targetValue: scenes[3].id,
      category: 'escenas',
    },
    {
      id: `${programId}-pad-zocalo`,
      label: 'ZÓCALO',
      sublabel: 'Mostrar / Ocultar',
      color: 'blue',
      actionType: 'overlay',
      targetValue: 'toggleLowerThird',
      category: 'graficas',
    },
    {
      id: `${programId}-pad-cintillo`,
      label: 'CINTILLO',
      sublabel: 'Ticker inferior',
      color: 'blue',
      actionType: 'overlay',
      targetValue: 'toggleTicker',
      category: 'graficas',
    },
    {
      id: `${programId}-pad-alert`,
      label: 'ALERTA VIVO',
      sublabel: 'Última hora',
      color: 'crimson',
      actionType: 'macro',
      targetValue: 'breaking_news_alert',
      category: 'macros',
    },
    {
      id: `${programId}-pad-stinger`,
      label: 'CORTINA TV',
      sublabel: 'Inicio de bloque',
      color: 'amber',
      actionType: 'audio_stinger',
      targetValue: 'inicio_bloque',
      category: 'macros',
    },
    {
      id: `${programId}-pad-cut`,
      label: 'PASAR AIRE',
      sublabel: 'Transición',
      color: 'amber',
      actionType: 'transition',
      targetValue: 'fade',
      category: 'macros',
    },
  ];

  return {
    ...baseTpl,
    id: programId,
    name: title,
    formatLabel: prog?.format || baseTpl.formatLabel,
    description: prog?.summary || subtitle,
    previewImageUrl: backdropUrl,
    logoUrl,
    accentHex: '#16A34A',
    scenes,
    touchPads,
    rundown: [
      {
        id: `${programId}-rd-1`,
        title: `Apertura ${title}`,
        sceneId: scenes[0].id,
        durationSec: 20,
        transitionType: 'fade',
        autoLowerThird: true,
        lowerThirdTitle: `${title} EN VIVO`,
        lowerThirdSubtitle: subtitle,
      },
      {
        id: `${programId}-rd-2`,
        title: 'Bloque Invitados / Mesa',
        sceneId: scenes[1].id,
        durationSec: 25,
        transitionType: 'cut',
        autoLowerThird: false,
      },
    ],
    defaultOverlays: {
      ...baseTpl.defaultOverlays,
      showLiveBadge: true,
      channelName: title,
      logoUrl,
      showLowerThird: true,
      lowerThirdTitle: `${title.toUpperCase()} · EN VIVO`,
      lowerThirdSubtitle: subtitle,
      showTicker: true,
      tickerText: `${title} por JUGEND FÜR EINE GRÜNE ZUKUNFT · Participá en vivo dejando tu comentario`,
      activeBannerTitle: null,
      activeGuestBadge: null,
      giveaway: null,
      closingSlate: {
        ...DEFAULT_CLOSING_SLATE,
        active: false,
        programTitle: title,
        programLogoUrl: logoUrl,
      },
      fadeToBlack: false,
    },
  };
}

function ControlConsole({
  initialProgramId = 'sin-filtro',
  authToken,
  currentUser,
  onOpenAuth,
  onChangeProgramRoute,
  onOpenLive,
  onBack,
  onBackToSite,
}: {
  initialProgramId?: string;
  authToken: string | null;
  currentUser: StaffUserPublic | null;
  onOpenAuth: () => void;
  onChangeProgramRoute: (programId: string) => void;
  onOpenLive: (programId: string) => void;
  onBack: () => void;
  onBackToSite: () => void;
}) {
  // One-time migration: preserve custom user items while removing stale brand/host strings
  if (
    typeof window !== 'undefined' &&
    localStorage.getItem('mesacontrol_brand_rev') !== 'sinfiltro-v5'
  ) {
    if (!localStorage.getItem('mesacontrol_template_id')) {
      localStorage.setItem('mesacontrol_template_id', 'sin-filtro');
    }
    if (!localStorage.getItem('mesacontrol_showname_sin-filtro')) {
      localStorage.setItem('mesacontrol_showname_sin-filtro', '#SinFiltro');
    }
    if (!localStorage.getItem('mesacontrol_accent_sin-filtro')) {
      localStorage.setItem('mesacontrol_accent_sin-filtro', '#16A34A');
    }

    const keysToSanitize = [
      'mesacontrol_overlays_sin-filtro',
      'mesacontrol_scenes_sin-filtro',
      'mesacontrol_pads_sin-filtro',
      'mesacontrol_tvtitles_v1',
      'mesacontrol_live_overlay_payload',
    ];
    keysToSanitize.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw && /camila/i.test(raw)) {
        localStorage.setItem(k, sanitizeLegacyHostText(raw));
      }
    });

    const rawGuests = localStorage.getItem('mesacontrol_guests_v1');
    if (rawGuests && /camila/i.test(rawGuests)) {
      try {
        const parsed = JSON.parse(rawGuests) as GuestBadgeItem[];
        const cleaned = parsed.map((g) =>
          /camila/i.test(g.name)
            ? {
                ...g,
                greeting: 'BIENVENIDO/A',
                name: 'Invitado de Mesa',
                role: 'Participación en vivo · #SinFiltro',
              }
            : g
        );
        localStorage.setItem('mesacontrol_guests_v1', JSON.stringify(cleaned));
      } catch {
        localStorage.removeItem('mesacontrol_guests_v1');
      }
    }

    localStorage.setItem('mesacontrol_brand_rev', 'sinfiltro-v5');
  }

  const [activeView, setActiveView] = useState<WorkspaceView>('switcher');
  const [catalogPrograms, setCatalogPrograms] = useState<ProducerProgram[]>([]);
  const [editProgramModalOpen, setEditProgramModalOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    return (
      initialProgramId ||
      localStorage.getItem('mesacontrol_template_id') ||
      'sin-filtro'
    );
  });
  const activeProgramIdRef = useRef(activeTemplateId);
  activeProgramIdRef.current = activeTemplateId;

  const activeTemplate: ShowTemplate = useMemo(() => {
    return buildProgramStudioConfig(activeTemplateId, catalogPrograms);
  }, [activeTemplateId, catalogPrograms]);

  const activeCatalogProgram = useMemo(
    () => catalogPrograms.find((p) => p.id === activeTemplateId) || null,
    [activeTemplateId, catalogPrograms]
  );

  // Editable Show Identity
  const [showName, setShowName] = useState<string>(() => {
    return (
      localStorage.getItem(`mesacontrol_showname_${activeTemplate.id}`) ||
      activeTemplate.name
    );
  });
  const [accentHex, setAccentHex] = useState<string>(() => {
    return (
      localStorage.getItem(`mesacontrol_accent_${activeTemplate.id}`) ||
      activeTemplate.accentHex
    );
  });

  // Scenes & Per-Scene Live Camera Streams
  const [scenes, setScenes] = useState<BroadcastScene[]>(() => {
    try {
      const saved = localStorage.getItem(`mesacontrol_scenes_${activeTemplate.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as BroadcastScene[];
        return parsed.map((sc) =>
          sc.id === 'sf-pausa' &&
          sc.description?.toLowerCase().includes('placa institucional verde')
            ? { ...sc, description: '' }
            : sc
        );
      }
    } catch {
      // ignore
    }
    return activeTemplate.scenes;
  });
  const [sceneStreams, setSceneStreams] = useState<Record<string, MediaStream>>(
    {}
  );

  const [programSceneId, setProgramSceneId] = useState<string>(
    scenes[0]?.id || activeTemplate.scenes[0].id
  );
  const [previewSceneId, setPreviewSceneId] = useState<string>(
    scenes[1]?.id || scenes[0]?.id || activeTemplate.scenes[0].id
  );
  const [studioMode, setStudioMode] = useState<boolean>(true);
  const [transitionType, setTransitionType] = useState<TransitionType>('fade');

  const [overlays, setOverlays] = useState<OverlayState>(() => {
    try {
      const saved = localStorage.getItem(
        `mesacontrol_overlays_${activeTemplate.id}`
      );
      if (saved) {
        const parsed = JSON.parse(saved) as OverlayState;
        return {
          ...activeTemplate.defaultOverlays,
          ...parsed,
          logoUrl:
            activeTemplate.id === 'sin-filtro'
              ? OFFICIAL_SINFILTRO_LOGO
              : parsed.logoUrl || activeTemplate.logoUrl,
          closingSlate: parsed.closingSlate
            ? { ...parsed.closingSlate, active: false }
            : {
                ...DEFAULT_CLOSING_SLATE,
                active: false,
                programTitle: activeTemplate.name,
                programLogoUrl: activeTemplate.logoUrl,
              },
        };
      }
    } catch {
      // ignore
    }
    return activeTemplate.defaultOverlays;
  });

  const [sponsors, setSponsors] = useState<SponsorBanner[]>(() => {
    try {
      const perProgramKey = `mesacontrol_sponsors_${activeTemplate.id}`;
      const saved =
        localStorage.getItem(perProgramKey) ||
        (activeTemplate.id === 'sin-filtro'
          ? localStorage.getItem('mesacontrol_sponsors_v1')
          : null);
      if (saved) {
        const parsed = JSON.parse(saved) as SponsorBanner[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_SPONSOR_BANNERS;
  });

  const [tvTitles, setTvTitles] = useState<TvTitlePreset[]>(() => {
    try {
      const saved = localStorage.getItem('mesacontrol_tvtitles_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as TvTitlePreset[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_TV_TITLES;
  });

  const [guestBadges, setGuestBadges] = useState<GuestBadgeItem[]>(() => {
    try {
      const saved = localStorage.getItem('mesacontrol_guests_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as GuestBadgeItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_GUEST_BADGES;
  });

  const [giveawayConfig, setGiveawayConfig] = useState<GiveawayState>(() => {
    try {
      const saved = localStorage.getItem('mesacontrol_giveaway_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as GiveawayState;
        if (parsed && parsed.prize) return { ...parsed, stage: 'hidden' };
      }
    } catch {
      // ignore
    }
    return DEFAULT_GIVEAWAY_STATE;
  });

  const [studioModuleTab, setStudioModuleTab] = useState<StudioModuleTab>('guests');
  const [comments, setComments] = useState<ViewerComment[]>([]);

  const [touchPads, setTouchPads] = useState<TouchPadItem[]>(() => {
    try {
      const saved = localStorage.getItem(`mesacontrol_pads_${activeTemplate.id}`);
      if (saved) return JSON.parse(saved) as TouchPadItem[];
    } catch {
      // ignore
    }
    return activeTemplate.touchPads;
  });

  const [rundown, setRundown] = useState<RundownStep[]>(activeTemplate.rundown);
  const [audioChannels, setAudioChannels] = useState<AudioChannel[]>(
    activeTemplate.audioChannels
  );
  const [masterLevelDb, setMasterLevelDb] = useState<number>(-60);

  // Camera Editor Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<BroadcastScene | null>(null);

  // OBS WebSocket State
  const [obsStatus, setObsStatus] = useState<ObsStatusSnapshot>(() =>
    obsClient.getSnapshot()
  );
  const [obsModalOpen, setObsModalOpen] = useState(false);

  // Live Streaming & Recording State
  const [localStreaming, setLocalStreaming] = useState(false);
  const [localRecording, setLocalRecording] = useState(false);
  const [localStreamSec, setLocalStreamSec] = useState(0);
  const [localRecordSec, setLocalRecordSec] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [audienceCount, setAudienceCount] = useState(0);
  const [audienceMode, setAudienceMode] = useState<'real' | 'inflated'>('real');
  const [inflatedCount, setInflatedCount] = useState(0);
  const [copiedLiveLink, setCopiedLiveLink] = useState(false);
  const [lastRecordedClip, setLastRecordedClip] = useState<{
    blob: Blob;
    filename: string;
    programId: string;
  } | null>(null);
  const [publishingClip, setPublishingClip] = useState(false);

  // Offscreen Broadcast Compositor & WebRTC Peers
  const compositorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositorVideoRef = useRef<HTMLVideoElement | null>(null);
  const compositorStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceMapRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [rtcReadyPeersCount, setRtcReadyPeersCount] = useState(0);
  const rtcReadyPeersCountRef = useRef(0);
  const viewerCountRef = useRef(0);
  viewerCountRef.current = viewerCount;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Automation States
  const [rundownRunning, setRundownRunning] = useState(false);
  const [rundownLoop, setRundownLoop] = useState(true);
  const [rundownIndex, setRundownIndex] = useState(0);
  const [rundownRemainingSec, setRundownRemainingSec] = useState<number>(
    activeTemplate.rundown[0]?.durationSec || 15
  );

  const [cycleRunning, setCycleRunning] = useState(false);
  const [cycleIntervalSec, setCycleIntervalSec] = useState(12);
  const [cycleSceneIds, setCycleSceneIds] = useState<string[]>(
    scenes.slice(0, 3).map((s) => s.id)
  );
  const [cycleRemainingSec, setCycleRemainingSec] = useState(12);

  const [afvEnabled, setAfvEnabled] = useState(false);
  const [afvThresholdDb, setAfvThresholdDb] = useState(-24);
  const [afvHoldSec, setAfvHoldSec] = useState(2.5);
  const [micActive, setMicActive] = useState(false);
  const [micLevelDb, setMicLevelDb] = useState(-60);
  const micHandleRef = useRef<MicAnalyzerHandle | null>(null);
  const lastAfvSwitchRef = useRef<number>(0);

  const [schedules, setSchedules] = useState<ScheduledTrigger[]>([]);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNoticeText(msg);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeText(null);
    }, 3200);
  }, []);

  const programScene = useMemo(
    () => scenes.find((s) => s.id === programSceneId) || scenes[0],
    [programSceneId, scenes]
  );
  const previewScene = useMemo(
    () => scenes.find((s) => s.id === previewSceneId) || scenes[0],
    [previewSceneId, scenes]
  );

  const isStreaming =
    obsStatus.connectionStatus === 'connected'
      ? obsStatus.isStreaming
      : localStreaming;

  const isRecording =
    obsStatus.connectionStatus === 'connected'
      ? obsStatus.isRecording
      : localRecording;

  // Persist scenes & overlays per template (excluding ephemeral blob URLs)
  useEffect(() => {
    try {
      const serializableScenes = scenes.map((s) => ({
        ...s,
        mediaUrl: s.mediaUrl?.startsWith('blob:') ? undefined : s.mediaUrl,
      }));
      localStorage.setItem(
        `mesacontrol_scenes_${activeTemplateId}`,
        JSON.stringify(serializableScenes)
      );
    } catch {
      // ignore quota errors
    }
  }, [activeTemplateId, scenes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `mesacontrol_overlays_${activeTemplateId}`,
        JSON.stringify(overlays)
      );
    } catch {
      // ignore
    }
  }, [activeTemplateId, overlays]);

  // Subscribe to OBS WebSocket client
  useEffect(() => {
    const unsubState = obsClient.subscribeState((snap) => {
      setObsStatus(snap);
    });
    const unsubEvents = obsClient.subscribeEvents((eventType, data) => {
      if (eventType === 'CurrentProgramSceneChanged') {
        const obsName = String(data.sceneName || '');
        const match = scenes.find(
          (s) => s.obsSceneName === obsName || s.name === obsName
        );
        if (match) setProgramSceneId(match.id);
      } else if (eventType === 'CurrentPreviewSceneChanged') {
        const obsName = String(data.sceneName || '');
        const match = scenes.find(
          (s) => s.obsSceneName === obsName || s.name === obsName
        );
        if (match) setPreviewSceneId(match.id);
      }
    });
    return () => {
      unsubState();
      unsubEvents();
    };
  }, [scenes]);

  // Sync Overlays to OBS Browser Source (?overlay=1) via BroadcastChannel + localStorage
  useEffect(() => {
    const payload = { overlays, accentHex };
    try {
      localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(payload));
      if ('BroadcastChannel' in window) {
        const ch = new BroadcastChannel(OVERLAY_CHANNEL_NAME);
        ch.postMessage(payload);
        ch.close();
      }
    } catch {
      // ignore
    }
  }, [overlays, accentHex]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `mesacontrol_sponsors_${activeTemplateId}`,
        JSON.stringify(sponsors)
      );
      if (activeTemplateId === 'sin-filtro') {
        localStorage.setItem('mesacontrol_sponsors_v1', JSON.stringify(sponsors));
      }
    } catch {
      // ignore quota errors
    }
  }, [activeTemplateId, sponsors]);

  useEffect(() => {
    try {
      localStorage.setItem('mesacontrol_tvtitles_v1', JSON.stringify(tvTitles));
    } catch {
      // ignore quota errors
    }
  }, [tvTitles]);

  useEffect(() => {
    try {
      localStorage.setItem('mesacontrol_guests_v1', JSON.stringify(guestBadges));
    } catch {
      // ignore
    }
  }, [guestBadges]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'mesacontrol_giveaway_v1',
        JSON.stringify({ ...giveawayConfig, stage: 'hidden' })
      );
    } catch {
      // ignore
    }
  }, [giveawayConfig]);

  // Sync State to Express Live Broadcast Server (/api/broadcast/state) scoped to activeTemplateId
  const prevSyncedLiveRef = useRef<boolean | null>(null);
  const prevSyncedSceneIdRef = useRef<string | null>(null);
  const prevSyncedProgramIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!programScene) return;
    const isUrgent =
      prevSyncedLiveRef.current !== isStreaming ||
      prevSyncedSceneIdRef.current !== programScene.id ||
      prevSyncedProgramIdRef.current !== activeTemplateId;
    prevSyncedLiveRef.current = isStreaming;
    prevSyncedSceneIdRef.current = programScene.id;
    prevSyncedProgramIdRef.current = activeTemplateId;

    const sendState = () => {
      fetch('/api/broadcast/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: activeTemplateId,
          isLive: isStreaming,
          showName,
          accentHex,
          activeScene: {
            id: programScene.id,
            name: programScene.name,
            cameraLabel: programScene.cameraLabel,
            cameraType: programScene.cameraType,
            layoutMode: programScene.layoutMode,
            slateColor: programScene.slateColor,
            slateHeadline: programScene.slateHeadline,
            description: programScene.description,
          },
          overlays,
          sponsors,
        }),
      }).catch(() => {});
    };

    if (isUrgent) {
      sendState();
      return;
    }

    const timer = window.setTimeout(sendState, 60);
    return () => window.clearTimeout(timer);
  }, [activeTemplateId, accentHex, isStreaming, overlays, programScene, showName, sponsors]);

  // Keep a hidden video element synced to the current Program scene's live stream/MP4
  useEffect(() => {
    if (!compositorVideoRef.current) {
      const vid = document.createElement('video');
      vid.autoplay = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.loop = true;
      compositorVideoRef.current = vid;
    }
    const vid = compositorVideoRef.current;
    const stream = programScene ? sceneStreams[programScene.id] : undefined;

    if (
      stream &&
      (programScene.cameraType === 'webcam' ||
        programScene.cameraType === 'screen')
    ) {
      if (vid.srcObject !== stream) {
        vid.src = '';
        vid.srcObject = stream;
        vid.play().catch(() => {});
      }
    } else if (
      programScene?.cameraType === 'media' &&
      programScene.mediaKind === 'video' &&
      programScene.mediaUrl
    ) {
      if (vid.src !== programScene.mediaUrl) {
        vid.srcObject = null;
        vid.src = programScene.mediaUrl;
        vid.loop = true;
        vid.play().catch(() => {});
      }
    } else {
      vid.srcObject = null;
      vid.removeAttribute('src');
    }
  }, [programScene, sceneStreams]);

  // Real-time 1280x720 Program Compositor Loop (ONLY runs while Streaming or Recording to keep studio UI 100% lag-free)
  const latestSceneRef = useRef(programScene);
  latestSceneRef.current = programScene;
  const latestOverlaysRef = useRef(overlays);
  latestOverlaysRef.current = overlays;
  const latestAccentRef = useRef(accentHex);
  latestAccentRef.current = accentHex;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  useEffect(() => {
    if (!compositorCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      compositorCanvasRef.current = canvas;
    }

    if (!isStreaming && !isRecording) {
      return;
    }

    const canvas = compositorCanvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let tickerOffset = 0;
    let lastDrawTime = performance.now();
    let lastRenderedAt = 0;
    let lastFrameSent = 0;
    let frameInFlight = false;
    let frameSeq = 0;
    let disposed = false;

    const uploadBlob = (blob: Blob, seq: number) => {
      if (disposed) {
        frameInFlight = false;
        return;
      }
      const ctrl = new AbortController();
      const abortId = window.setTimeout(() => ctrl.abort(), 900);
      fetch(
        `/api/broadcast/frame?seq=${seq}&programId=${encodeURIComponent(
          activeProgramIdRef.current
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/webp' },
          body: blob,
          signal: ctrl.signal,
        }
      )
        .catch(() => {})
        .finally(() => {
          window.clearTimeout(abortId);
          frameInFlight = false;
        });
    };

    // Off-thread 1280x720 HD WebP Encoder Worker (0ms main-thread freeze, crisp HD output)
    let encoderWorker: Worker | null = null;
    let encoderWorkerUrl: string | null = null;
    const canOffscreenEncode =
      typeof OffscreenCanvas !== 'undefined' &&
      typeof createImageBitmap === 'function';

    if (canOffscreenEncode) {
      try {
        const encoderCode = `
          let off = null;
          let offCtx = null;
          self.onmessage = async (ev) => {
            const { bitmap, seq } = ev.data;
            try {
              if (!off) {
                off = new OffscreenCanvas(1280, 720);
                offCtx = off.getContext('2d', { alpha: false });
              }
              offCtx.drawImage(bitmap, 0, 0, 1280, 720);
              bitmap.close();
              const blob = await off.convertToBlob({ type: 'image/webp', quality: 0.86 });
              self.postMessage({ blob, seq });
            } catch (err) {
              try { bitmap.close(); } catch {}
              self.postMessage({ error: true, seq });
            }
          };
        `;
        const encBlob = new Blob([encoderCode], {
          type: 'application/javascript',
        });
        encoderWorkerUrl = URL.createObjectURL(encBlob);
        encoderWorker = new Worker(encoderWorkerUrl);
        encoderWorker.onmessage = (ev) => {
          const { blob, seq, error } = ev.data as {
            blob?: Blob;
            seq: number;
            error?: boolean;
          };
          if (error || !blob) {
            frameInFlight = false;
            return;
          }
          uploadBlob(blob, seq);
        };
      } catch {
        encoderWorker = null;
      }
    }

    const drawAndRelay = (fromSource: 'raf' | 'worker' | 'init') => {
      if (disposed || (!isStreamingRef.current && !isRecordingRef.current)) return;
      if (fromSource === 'worker' && !document.hidden) return;

      const now = performance.now();
      if (fromSource === 'raf' && now - lastRenderedAt < 30) {
        return;
      }
      lastRenderedAt = now;

      const dt = Math.min(0.1, Math.max(0.008, (now - lastDrawTime) / 1000));
      lastDrawTime = now;
      tickerOffset += dt * 72;

      if (latestSceneRef.current) {
        renderBroadcastFrame({
          ctx,
          width: 1280,
          height: 720,
          scene: latestSceneRef.current,
          overlays: latestOverlaysRef.current,
          accentHex: latestAccentRef.current,
          videoEl: compositorVideoRef.current,
          tickerOffsetPx: tickerOffset,
        });
      }

      // Deterministic frame push for WebRTC captureStream(0)
      const vTrack = compositorStreamRef.current?.getVideoTracks()[0] as
        | (MediaStreamTrack & { requestFrame?: () => void })
        | undefined;
      vTrack?.requestFrame?.();

      // Send full 1280x720 HD fallback frames (~20 FPS) when any viewer lacks WebRTC
      const hasFallbackViewers =
        viewerCountRef.current > rtcReadyPeersCountRef.current;
      const relayInterval = hasFallbackViewers ? 48 : 4000;

      if (
        isStreamingRef.current &&
        viewerCountRef.current > 0 &&
        !frameInFlight &&
        now - lastFrameSent >= relayInterval
      ) {
        lastFrameSent = now;
        frameInFlight = true;
        const seq = ++frameSeq;

        if (encoderWorker) {
          createImageBitmap(canvas)
            .then((bitmap) => {
              if (disposed || !encoderWorker) {
                bitmap.close();
                frameInFlight = false;
                return;
              }
              encoderWorker.postMessage({ bitmap, seq }, [bitmap]);
            })
            .catch(() => {
              frameInFlight = false;
            });
        } else {
          try {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  frameInFlight = false;
                  return;
                }
                uploadBlob(blob, seq);
              },
              'image/jpeg',
              0.88
            );
          } catch {
            frameInFlight = false;
          }
        }
      }
    };

    // Draw initial frame right away when stream/recording starts
    drawAndRelay('init');

    // VSync-locked rAF when tab is visible -> zero judder
    let rafId = 0;
    const rafLoop = () => {
      if (disposed) return;
      drawAndRelay('raf');
      rafId = window.requestAnimationFrame(rafLoop);
    };
    rafId = window.requestAnimationFrame(rafLoop);

    // Background Web Worker keeps 30 FPS running smoothly even when studio tab is hidden
    let worker: Worker | null = null;
    let workerUrl: string | null = null;
    let fallbackTimer = 0;

    try {
      const blob = new Blob(['setInterval(() => postMessage(0), 33);'], {
        type: 'application/javascript',
      });
      workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = () => drawAndRelay('worker');
    } catch {
      fallbackTimer = window.setInterval(() => drawAndRelay('worker'), 33);
    }

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (worker) worker.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
      if (encoderWorker) encoderWorker.terminate();
      if (encoderWorkerUrl) URL.revokeObjectURL(encoderWorkerUrl);
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [isRecording, isStreaming]);

  const recountConnectedPeers = useCallback(() => {
    let ready = 0;
    peersRef.current.forEach((p) => {
      if (p.connectionState === 'connected') ready += 1;
    });
    rtcReadyPeersCountRef.current = ready;
    setRtcReadyPeersCount(ready);
  }, []);

  // Broadcaster SSE + WebRTC Signaling to live viewers (?live=1)
  const createOfferForViewer = useCallback(async (viewerId: string) => {
    if (!compositorCanvasRef.current) return;
    await broadcastAudio.resume();
    let stream = compositorStreamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === 'ended')) {
      const canManualFrame =
        typeof CanvasCaptureMediaStreamTrack !== 'undefined' &&
        'requestFrame' in CanvasCaptureMediaStreamTrack.prototype;
      const videoStream = compositorCanvasRef.current.captureStream(
        canManualFrame ? 0 : 30
      );
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack && 'contentHint' in videoTrack) {
        videoTrack.contentHint = 'motion';
      }
      const audioStream = broadcastAudio.getBroadcastAudioStream();
      stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      compositorStreamRef.current = stream;
    }

    const oldPc = peersRef.current.get(viewerId);
    if (oldPc) oldPc.close();
    pendingIceMapRef.current.delete(viewerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(viewerId, pc);
    pc.onconnectionstatechange = recountConnectedPeers;

    stream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream);
      if (track.kind === 'video') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 4_000_000;
          params.encodings[0].maxFramerate = 30;
          params.encodings[0].scaleResolutionDownBy = 1;
          params.degradationPreference = 'maintain-resolution';
          sender.setParameters(params).catch(() => {});
        } catch {
          // ignore unsupported parameter tuning
        }
      }
    });

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        fetch('/api/rtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: activeProgramIdRef.current,
            targetId: viewerId,
            fromId: 'broadcaster',
            type: 'ice',
            payload: ev.candidate,
          }),
        }).catch(() => {});
      }
    };

    try {
      const offer = await pc.createOffer();
      const boostedOffer: RTCSessionDescriptionInit = {
        type: offer.type,
        sdp: offer.sdp ? boostVideoBitrateSdp(offer.sdp) : offer.sdp,
      };
      await pc.setLocalDescription(boostedOffer);
      await fetch('/api/rtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: activeProgramIdRef.current,
          targetId: viewerId,
          fromId: 'broadcaster',
          type: 'offer',
          payload: boostedOffer,
        }),
      });
    } catch {
      // ignore offer errors
    }
  }, []);

  useEffect(() => {
    fetch(`/api/broadcast/state?programId=${encodeURIComponent(activeTemplateId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.viewerCount === 'number') setViewerCount(d.viewerCount);
        if (typeof d.audienceCount === 'number') setAudienceCount(d.audienceCount);
        if (d.audienceMode === 'real' || d.audienceMode === 'inflated') {
          setAudienceMode(d.audienceMode);
        }
        if (typeof d.inflatedCount === 'number') setInflatedCount(d.inflatedCount);
      })
      .catch(() => {});

    fetch(
      `/api/broadcast/comments?programId=${encodeURIComponent(activeTemplateId)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.comments)) setComments(d.comments);
      })
      .catch(() => {});

    const es = new EventSource(
      `/api/broadcast/events?role=broadcaster&clientId=broadcaster_main&programId=${encodeURIComponent(
        activeTemplateId
      )}`
    );

    es.addEventListener('init', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          viewerCount?: number;
          audienceCount?: number;
          audienceMode?: 'real' | 'inflated';
          inflatedCount?: number;
          comments?: ViewerComment[];
        };
        if (typeof data.viewerCount === 'number') setViewerCount(data.viewerCount);
        if (typeof data.audienceCount === 'number') setAudienceCount(data.audienceCount);
        if (data.audienceMode === 'real' || data.audienceMode === 'inflated') {
          setAudienceMode(data.audienceMode);
        }
        if (typeof data.inflatedCount === 'number') setInflatedCount(data.inflatedCount);
        if (Array.isArray(data.comments)) setComments(data.comments);
      } catch {
        // ignore
      }
    });

    es.addEventListener('presence', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          viewerCount?: number;
          audienceCount?: number;
          audienceMode?: 'real' | 'inflated';
          inflatedCount?: number;
        };
        if (typeof data.viewerCount === 'number') setViewerCount(data.viewerCount);
        if (typeof data.audienceCount === 'number') setAudienceCount(data.audienceCount);
        if (data.audienceMode === 'real' || data.audienceMode === 'inflated') {
          setAudienceMode(data.audienceMode);
        }
        if (typeof data.inflatedCount === 'number') setInflatedCount(data.inflatedCount);
      } catch {
        // ignore
      }
    });

    es.addEventListener('comments', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          comments?: ViewerComment[];
        };
        if (Array.isArray(data.comments)) setComments(data.comments);
      } catch {
        // ignore
      }
    });

    es.addEventListener('viewer-joined', (ev) => {
      if (!isStreamingRef.current) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          viewerId?: string;
        };
        if (data.viewerId) {
          createOfferForViewer(data.viewerId);
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('viewer-left', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          viewerId?: string;
        };
        if (data.viewerId) {
          const pc = peersRef.current.get(data.viewerId);
          pc?.close();
          peersRef.current.delete(data.viewerId);
          pendingIceMapRef.current.delete(data.viewerId);
          recountConnectedPeers();
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('rtc-signal', async (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as {
          fromId: string;
          type: string;
          payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
        };
        const pc = peersRef.current.get(msg.fromId);
        if (!pc) return;
        if (msg.type === 'answer') {
          await pc.setRemoteDescription(
            new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
          );
          const queued = pendingIceMapRef.current.get(msg.fromId) || [];
          while (queued.length > 0) {
            const cand = queued.shift()!;
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingIceMapRef.current.delete(msg.fromId);
        } else if (msg.type === 'ice') {
          const cand = msg.payload as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } else {
            const list = pendingIceMapRef.current.get(msg.fromId) || [];
            list.push(cand);
            pendingIceMapRef.current.set(msg.fromId, list);
          }
        }
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      recountConnectedPeers();
    };
  }, [activeTemplateId, createOfferForViewer, recountConnectedPeers]);

  // Real-time PCM Audio Relay ONLY when at least one viewer lacks a direct WebRTC connection
  useEffect(() => {
    const needsFallbackAudio =
      isStreaming && viewerCount > 0 && rtcReadyPeersCount < viewerCount;
    if (!needsFallbackAudio) {
      broadcastAudio.stopPcmRelay();
      return;
    }

    let inFlightCount = 0;
    broadcastAudio.resume();
    broadcastAudio.startPcmRelay((pcm16, sampleRate) => {
      // Drop stale chunks rather than queueing HTTP requests into multi-second delay
      if (inFlightCount >= 2) return;
      inFlightCount += 1;
      const ctrl = new AbortController();
      const abortId = window.setTimeout(() => ctrl.abort(), 500);
      fetch(
        `/api/broadcast/audio?programId=${encodeURIComponent(
          activeProgramIdRef.current
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pcm16, sampleRate }),
          signal: ctrl.signal,
        }
      )
        .catch(() => {})
        .finally(() => {
          window.clearTimeout(abortId);
          inFlightCount = Math.max(0, inFlightCount - 1);
        });
    });

    return () => {
      broadcastAudio.stopPcmRelay();
    };
  }, [activeTemplateId, isStreaming, rtcReadyPeersCount, viewerCount]);

  // Load full catalog of producer programs and hydrate custom program studio identity
  useEffect(() => {
    fetch('/api/producer/programs')
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !Array.isArray(d.programs)) return;
        const list = d.programs as ProducerProgram[];
        setCatalogPrograms(list);

        const currId = activeProgramIdRef.current;
        const isStaticTpl = TV_SHOW_TEMPLATES.some((t) => t.id === currId);
        const matched = list.find((p) => p.id === currId);
        if (!isStaticTpl && matched) {
          const tpl = buildProgramStudioConfig(currId, list);
          if (!localStorage.getItem(`mesacontrol_showname_${currId}`)) {
            setShowName(tpl.name);
          }
          if (!localStorage.getItem(`mesacontrol_scenes_${currId}`)) {
            setScenes(tpl.scenes);
            setProgramSceneId(tpl.scenes[0].id);
            setPreviewSceneId(tpl.scenes[1]?.id || tpl.scenes[0].id);
          }
          if (!localStorage.getItem(`mesacontrol_overlays_${currId}`)) {
            setOverlays(tpl.defaultOverlays);
          }
          if (!localStorage.getItem(`mesacontrol_pads_${currId}`)) {
            setTouchPads(tpl.touchPads);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Switch active Program / TV Template cleanly
  const handleSelectTemplate = useCallback(
    (templateId: string, catalogOverride?: ProducerProgram[]) => {
      const prevId = activeProgramIdRef.current;
      if (prevId && prevId !== templateId && localStreaming) {
        fetch('/api/broadcast/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: prevId, isLive: false }),
        }).catch(() => {});
        setLocalStreaming(false);
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        recountConnectedPeers();
      }

      const tpl = buildProgramStudioConfig(
        templateId,
        catalogOverride || catalogPrograms
      );
      setActiveTemplateId(tpl.id);
      localStorage.setItem('mesacontrol_template_id', tpl.id);
      if (tpl.id !== prevId) {
        onChangeProgramRoute(tpl.id);
      }

      let savedScenes: BroadcastScene[] | null = null;
      let savedPads: TouchPadItem[] | null = null;
      let savedOverlays: OverlayState | null = null;
      let savedSponsors: SponsorBanner[] | null = null;
      try {
        const rawSc = localStorage.getItem(`mesacontrol_scenes_${tpl.id}`);
        if (rawSc) savedScenes = JSON.parse(rawSc) as BroadcastScene[];
        const rawPads = localStorage.getItem(`mesacontrol_pads_${tpl.id}`);
        if (rawPads) savedPads = JSON.parse(rawPads) as TouchPadItem[];
        const rawOv = localStorage.getItem(`mesacontrol_overlays_${tpl.id}`);
        if (rawOv) savedOverlays = JSON.parse(rawOv) as OverlayState;
        const rawSp =
          localStorage.getItem(`mesacontrol_sponsors_${tpl.id}`) ||
          (tpl.id === 'sin-filtro'
            ? localStorage.getItem('mesacontrol_sponsors_v1')
            : null);
        if (rawSp) {
          const parsedSp = JSON.parse(rawSp) as SponsorBanner[];
          if (Array.isArray(parsedSp) && parsedSp.length > 0) {
            savedSponsors = parsedSp;
          }
        }
      } catch {
        // ignore
      }

      const nextScenes = savedScenes || tpl.scenes;
      setShowName(
        localStorage.getItem(`mesacontrol_showname_${tpl.id}`) || tpl.name
      );
      setAccentHex(
        localStorage.getItem(`mesacontrol_accent_${tpl.id}`) || tpl.accentHex
      );
      setScenes(nextScenes);
      setProgramSceneId(nextScenes[0].id);
      setPreviewSceneId(nextScenes[1]?.id || nextScenes[0].id);
      setOverlays({
        ...(savedOverlays || tpl.defaultOverlays),
        activeBannerTitle: null,
        activeGuestBadge: null,
        giveaway: null,
        closingSlate: savedOverlays?.closingSlate
          ? { ...savedOverlays.closingSlate, active: false }
          : {
              ...DEFAULT_CLOSING_SLATE,
              active: false,
              programTitle: tpl.name,
              programLogoUrl: tpl.logoUrl,
            },
        fadeToBlack: false,
      });
      setSponsors(savedSponsors || DEFAULT_SPONSOR_BANNERS);
      setTouchPads(savedPads || tpl.touchPads);
      setRundown(tpl.rundown);
      setAudioChannels(tpl.audioChannels);

      setRundownRunning(false);
      setRundownIndex(0);
      setRundownRemainingSec(tpl.rundown[0]?.durationSec || 15);
      setCycleRunning(false);
      setCycleSceneIds(nextScenes.slice(0, 3).map((s) => s.id));
      setCycleRemainingSec(cycleIntervalSec);

      showNotice(`Consola lista para emitir "${tpl.name}"`);
    },
    [
      catalogPrograms,
      cycleIntervalSec,
      localStreaming,
      onChangeProgramRoute,
      recountConnectedPeers,
      showNotice,
    ]
  );

  // Sync studio program when URL route changes
  useEffect(() => {
    if (initialProgramId && initialProgramId !== activeTemplateId) {
      handleSelectTemplate(initialProgramId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProgramId]);

  // Camera Device & Screen Capture Connections per Scene
  const connectDeviceToScene = useCallback(
    async (sceneId: string, deviceId?: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
          audio: false,
        });
        setSceneStreams((prev) => {
          prev[sceneId]?.getTracks().forEach((t) => t.stop());
          return { ...prev, [sceneId]: stream };
        });
        setScenes((prev) =>
          prev.map((sc) =>
            sc.id === sceneId
              ? { ...sc, cameraType: 'webcam', deviceId }
              : sc
          )
        );
        showNotice('Cámara conectada en vivo');
      } catch {
        showNotice('No se pudo acceder a esa cámara (verificá permisos)');
      }
    },
    [showNotice]
  );

  const connectScreenToScene = useCallback(
    async (sceneId: string) => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        setSceneStreams((prev) => {
          prev[sceneId]?.getTracks().forEach((t) => t.stop());
          return { ...prev, [sceneId]: stream };
        });
        setScenes((prev) =>
          prev.map((sc) =>
            sc.id === sceneId ? { ...sc, cameraType: 'screen' } : sc
          )
        );
        showNotice('Captura de pantalla vinculada a la escena');
      } catch {
        showNotice('Captura de pantalla cancelada');
      }
    },
    [showNotice]
  );

  const disconnectSceneStream = useCallback(
    (sceneId: string) => {
      setSceneStreams((prev) => {
        prev[sceneId]?.getTracks().forEach((t) => t.stop());
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
      setScenes((prev) =>
        prev.map((sc) =>
          sc.id === sceneId ? { ...sc, cameraType: 'studio' } : sc
        )
      );
      showNotice('Video local desconectado');
    },
    [showNotice]
  );

  const handleSaveCameraScene = (saved: BroadcastScene) => {
    if (saved.cameraType !== 'webcam' && saved.cameraType !== 'screen') {
      setSceneStreams((prev) => {
        if (!prev[saved.id]) return prev;
        prev[saved.id].getTracks().forEach((t) => t.stop());
        const next = { ...prev };
        delete next[saved.id];
        return next;
      });
    }
    setScenes((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      if (exists) {
        return prev.map((s) => (s.id === saved.id ? saved : s));
      }
      return [...prev, saved];
    });
    showNotice(`Cámara "${saved.name}" guardada`);
  };

  const handleDeleteCameraScene = (sceneId: string) => {
    if (scenes.length <= 1) {
      showNotice('Debe quedar al menos una escena activa');
      return;
    }
    sceneStreams[sceneId]?.getTracks().forEach((t) => t.stop());
    const remaining = scenes.filter((s) => s.id !== sceneId);
    setScenes(remaining);
    if (programSceneId === sceneId) setProgramSceneId(remaining[0].id);
    if (previewSceneId === sceneId) setPreviewSceneId(remaining[0].id);
    showNotice('Cámara eliminada');
  };

  // Core Scene Cut / Transition Action
  const switchToProgramScene = useCallback(
    async (sceneId: string, viaTransition?: TransitionType) => {
      const target = scenes.find((s) => s.id === sceneId);
      if (!target) return;

      if (viaTransition) setTransitionType(viaTransition);
      setProgramSceneId(target.id);

      if (obsStatus.connectionStatus === 'connected') {
        const obsMatch =
          obsStatus.obsScenes.find((n) => n === target.obsSceneName) ||
          obsStatus.obsScenes.find((n) => n === target.name) ||
          target.obsSceneName;
        await obsClient.setProgramScene(obsMatch);
      }
    },
    [obsStatus.connectionStatus, obsStatus.obsScenes, scenes]
  );

  const selectPreviewScene = useCallback(
    async (sceneId: string) => {
      const target = scenes.find((s) => s.id === sceneId);
      if (!target) return;
      setPreviewSceneId(target.id);

      if (obsStatus.connectionStatus === 'connected') {
        const obsMatch =
          obsStatus.obsScenes.find((n) => n === target.obsSceneName) ||
          obsStatus.obsScenes.find((n) => n === target.name) ||
          target.obsSceneName;
        await obsClient.setPreviewScene(obsMatch);
      }
    },
    [obsStatus.connectionStatus, obsStatus.obsScenes, scenes]
  );

  const handleStudioTransition = useCallback(
    async (type?: TransitionType) => {
      const nextT = type || transitionType;
      setTransitionType(nextT);
      const oldPgm = programSceneId;
      await switchToProgramScene(previewSceneId, nextT);
      setPreviewSceneId(oldPgm);
      if (obsStatus.connectionStatus === 'connected') {
        await obsClient.triggerTransition();
      }
    },
    [
      obsStatus.connectionStatus,
      previewSceneId,
      programSceneId,
      switchToProgramScene,
      transitionType,
    ]
  );

  // Stream & Record Toggles
  const handleToggleStream = async () => {
    const next = !isStreaming;
    if (next) {
      await broadcastAudio.resume();
    }
    if (obsStatus.connectionStatus === 'connected') {
      await obsClient.toggleStream(next);
    }
    setLocalStreaming(next);
    if (next) {
      setLocalStreamSec(0);
      showNotice(`Transmitiendo en vivo por el link de ${showName}`);
    } else {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      recountConnectedPeers();
      showNotice('Transmisión en vivo detenida');
    }
  };

  const handleToggleRecord = async () => {
    const next = !isRecording;
    if (next) {
      await broadcastAudio.resume();
    }
    if (obsStatus.connectionStatus === 'connected') {
      const ok = await obsClient.toggleRecord(next);
      showNotice(
        ok
          ? next
            ? 'Grabación OBS iniciada'
            : 'Grabación OBS guardada'
          : 'Error en grabación OBS'
      );
      return;
    }

    if (next) {
      setLocalRecording(true);
      setLocalRecordSec(0);
      if (compositorCanvasRef.current && 'MediaRecorder' in window) {
        try {
          const videoStream = compositorCanvasRef.current.captureStream(30);
          const audioStream = broadcastAudio.getBroadcastAudioStream();
          const combined = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
          recordedChunksRef.current = [];
          const rec = new MediaRecorder(combined);
          rec.ondataavailable = (ev) => {
            if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
          };
          rec.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, {
              type: 'video/webm',
            });
            const fname = `${activeProgramIdRef.current}-${Date.now()}.webm`;
            setLastRecordedClip({
              blob,
              filename: fname,
              programId: activeProgramIdRef.current,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fname;
            a.click();
            URL.revokeObjectURL(url);
          };
          rec.start();
          mediaRecorderRef.current = rec;
          showNotice('Grabando señal completa del programa (.webm)');
          return;
        } catch {
          // fallback timer
        }
      }
      showNotice('Grabación iniciada');
    } else {
      setLocalRecording(false);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        showNotice('Grabación lista: podés publicarla directo en el Archivo del Programa');
      } else {
        showNotice('Grabación detenida');
      }
    }
  };

  const handlePublishLastClip = async () => {
    if (!lastRecordedClip) return;
    if (!authToken || !currentUser) {
      onOpenAuth();
      return;
    }
    setPublishingClip(true);
    try {
      const safeTitle = `${showName} · Emisión ${new Date().toLocaleDateString(
        'es-AR'
      )}`;
      const safeEpisode = new Date().toLocaleDateString('es-AR');
      const res = await fetch(
        `/api/producer/programs/${encodeURIComponent(
          lastRecordedClip.programId
        )}/videos/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': lastRecordedClip.blob.type || 'video/webm',
            'x-video-filename': encodeURIComponent(lastRecordedClip.filename),
            'x-video-title': encodeURIComponent(safeTitle),
            'x-video-episode': encodeURIComponent(safeEpisode),
            'x-video-duration': encodeURIComponent('HD'),
            'x-video-description': encodeURIComponent(
              `Grabación emitida en vivo desde MesaControl TV (${showName}).`
            ),
          },
          body: lastRecordedClip.blob,
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showNotice(data.error || 'No se pudo publicar la grabación');
        return;
      }
      setLastRecordedClip(null);
      showNotice(`Grabación publicada en el Archivo de ${showName}`);
    } catch {
      showNotice('Error de conexión al publicar grabación');
    } finally {
      setPublishingClip(false);
    }
  };

  // Local stream/record timecode tickers
  useEffect(() => {
    const id = window.setInterval(() => {
      if (localStreaming) setLocalStreamSec((s) => s + 1);
      if (localRecording) setLocalRecordSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [localStreaming, localRecording]);

  // Overlay & Show Meta Updates
  const handleUpdateOverlays = useCallback((patch: Partial<OverlayState>) => {
    setOverlays((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApplyAudience = useCallback(
    async (mode: 'real' | 'inflated', nextInflated: number) => {
      try {
        const res = await fetch('/api/broadcast/audience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: activeTemplateId,
            mode,
            inflatedCount: nextInflated,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          if (typeof data.viewerCount === 'number') setViewerCount(data.viewerCount);
          if (typeof data.audienceCount === 'number') setAudienceCount(data.audienceCount);
          if (data.audienceMode === 'real' || data.audienceMode === 'inflated') {
            setAudienceMode(data.audienceMode);
          }
          if (typeof data.inflatedCount === 'number') {
            setInflatedCount(data.inflatedCount);
          }
          showNotice(
            mode === 'real'
              ? `Vistas configuradas en modo 100% Real (${data.audienceCount})`
              : `Vistas en pantalla ajustadas a ${data.audienceCount}`
          );
        }
      } catch {
        showNotice('No se pudo actualizar el conteo de vistas');
      }
    },
    [activeTemplateId, showNotice]
  );

  const handleUpdateShowMeta = useCallback(
    (patch: { showName?: string; accentHex?: string }) => {
      if (typeof patch.showName === 'string') {
        setShowName(patch.showName);
        localStorage.setItem(
          `mesacontrol_showname_${activeTemplateId}`,
          patch.showName
        );
      }
      if (typeof patch.accentHex === 'string') {
        setAccentHex(patch.accentHex);
        localStorage.setItem(
          `mesacontrol_accent_${activeTemplateId}`,
          patch.accentHex
        );
      }
    },
    [activeTemplateId]
  );

  const syncOverlaysToObs = useCallback(async () => {
    if (obsStatus.connectionStatus !== 'connected') return;
    await Promise.allSettled([
      obsClient.setTextSource('Zocalo_Titulo', overlays.lowerThirdTitle),
      obsClient.setTextSource('Zocalo_Subtitulo', overlays.lowerThirdSubtitle),
      obsClient.setTextSource('Cintillo_Noticias', overlays.tickerText),
    ]);
    showNotice('Textos enviados a fuentes de OBS Studio');
  }, [
    obsStatus.connectionStatus,
    overlays.lowerThirdSubtitle,
    overlays.lowerThirdTitle,
    overlays.tickerText,
    showNotice,
  ]);

  // Touch Pad Trigger Engine
  const handleTriggerPad = useCallback(
    (pad: TouchPadItem) => {
      if (pad.actionType === 'scene') {
        switchToProgramScene(pad.targetValue);
      } else if (pad.actionType === 'overlay') {
        if (pad.targetValue === 'toggleLowerThird') {
          handleUpdateOverlays({ showLowerThird: !overlays.showLowerThird });
        } else if (pad.targetValue === 'toggleTicker') {
          handleUpdateOverlays({ showTicker: !overlays.showTicker });
        } else if (pad.targetValue === 'toggleLiveBadge') {
          handleUpdateOverlays({ showLiveBadge: !overlays.showLiveBadge });
        } else if (pad.targetValue === 'toggleScoreboard') {
          handleUpdateOverlays({ showScoreboard: !overlays.showScoreboard });
        }
      } else if (pad.actionType === 'audio_stinger') {
        playBroadcastStinger(pad.targetValue);
        showNotice(`Cortina reproducida: ${pad.label}`);
      } else if (pad.actionType === 'transition') {
        handleStudioTransition(pad.targetValue as TransitionType);
      } else if (pad.actionType === 'macro') {
        if (pad.targetValue === 'breaking_news_alert') {
          playBroadcastStinger('alerta_ultima_hora');
          handleUpdateOverlays({
            showLowerThird: true,
            showTicker: true,
            lowerThirdTitle: `${showName} · ÚLTIMA HORA`,
            lowerThirdSubtitle: 'Cobertura en directo',
          });
          showNotice('Macro ejecutada: Alerta En Vivo');
        } else if (pad.targetValue === 'welcome_segment') {
          playBroadcastStinger('inicio_bloque');
          handleUpdateOverlays({ showLowerThird: true });
          showNotice('Macro ejecutada: Entrada de bloque');
        } else if (pad.targetValue === 'goal_home') {
          playBroadcastStinger('pitazo_deportes');
          handleUpdateOverlays({
            showScoreboard: true,
            scoreHome: overlays.scoreHome + 1,
            showLowerThird: true,
            lowerThirdTitle: `GOL DE ${overlays.scoreHomeName}`,
            lowerThirdSubtitle: `Minuto ${overlays.matchClock} · Marcador ${
              overlays.scoreHome + 1
            }-${overlays.scoreAway}`,
          });
        } else if (pad.targetValue === 'goal_away') {
          playBroadcastStinger('pitazo_deportes');
          handleUpdateOverlays({
            showScoreboard: true,
            scoreAway: overlays.scoreAway + 1,
            showLowerThird: true,
            lowerThirdTitle: `GOL DE ${overlays.scoreAwayName}`,
            lowerThirdSubtitle: `Minuto ${overlays.matchClock} · Marcador ${
              overlays.scoreHome
            }-${overlays.scoreAway + 1}`,
          });
        }
      }
    },
    [
      handleStudioTransition,
      handleUpdateOverlays,
      overlays.matchClock,
      overlays.scoreAway,
      overlays.scoreAwayName,
      overlays.scoreHome,
      overlays.scoreHomeName,
      overlays.showLiveBadge,
      overlays.showLowerThird,
      overlays.showScoreboard,
      overlays.showTicker,
      showName,
      showNotice,
      switchToProgramScene,
    ]
  );

  const handleUpdateTouchPads = (nextPads: TouchPadItem[]) => {
    setTouchPads(nextPads);
    try {
      localStorage.setItem(
        `mesacontrol_pads_${activeTemplateId}`,
        JSON.stringify(nextPads)
      );
    } catch {
      // ignore
    }
  };

  const handleResetTouchPads = () => {
    setTouchPads(activeTemplate.touchPads);
    localStorage.removeItem(`mesacontrol_pads_${activeTemplateId}`);
    showNotice('Botones táctiles restaurados');
  };

  // Audio Mixer VU Meters + Master Bus Output + Real Per-Channel Microphone Levels
  useEffect(() => {
    const id = window.setInterval(() => {
      let realMicDb = -60;
      if (micActive && micHandleRef.current) {
        realMicDb = micHandleRef.current.getLevelDb();
        setMicLevelDb((prev) => (prev === realMicDb ? prev : realMicDb));
      }

      const nextMaster = broadcastAudio.getMasterLevelDb();
      setMasterLevelDb((prev) => (prev === nextMaster ? prev : nextMaster));

      setAudioChannels((prev) => {
        let changed = false;
        const next = prev.map((ch, idx) => {
          let targetDb = -60;
          if (!ch.muted) {
            const liveChannelDb = broadcastAudio.getChannelLevelDb(ch.id);
            if (liveChannelDb !== null) {
              targetDb = liveChannelDb;
            } else if (idx === 0 && micActive) {
              targetDb = Math.min(0, realMicDb + ch.volumeDb * 0.2);
            }
          }
          if (ch.levelDb !== targetDb) {
            changed = true;
            return { ...ch, levelDb: targetDb };
          }
          return ch;
        });
        return changed ? next : prev;
      });
    }, 150);
    return () => window.clearInterval(id);
  }, [micActive]);

  // Audio-Follow-Video Auto Switcher
  useEffect(() => {
    if (!afvEnabled) return;
    const now = Date.now();
    if (now - lastAfvSwitchRef.current < afvHoldSec * 1000) return;

    const candidate = audioChannels
      .filter((ch) => !ch.muted && ch.linkedSceneId && ch.levelDb >= afvThresholdDb)
      .sort((a, b) => b.levelDb - a.levelDb)[0];

    if (
      candidate &&
      candidate.linkedSceneId &&
      candidate.linkedSceneId !== programSceneId
    ) {
      lastAfvSwitchRef.current = now;
      switchToProgramScene(candidate.linkedSceneId, 'cut');
    }
  }, [
    afvEnabled,
    afvHoldSec,
    afvThresholdDb,
    audioChannels,
    programSceneId,
    switchToProgramScene,
  ]);

  const handleToggleRealMic = async () => {
    if (micActive) {
      micHandleRef.current?.stop();
      micHandleRef.current = null;
      setMicActive(false);
      setMicLevelDb(-60);
      showNotice('Micrófono local desconectado');
    } else {
      try {
        const handle = await startMicLevelMonitor();
        micHandleRef.current = handle;
        setMicActive(true);
        showNotice('Micrófono local monitoreando voz');
      } catch {
        showNotice('Permiso de micrófono denegado');
      }
    }
  };

  // Rundown Auto-Switcher
  const executeRundownStep = useCallback(
    (step: RundownStep) => {
      switchToProgramScene(step.sceneId, step.transitionType);
      if (step.autoLowerThird) {
        handleUpdateOverlays({
          showLowerThird: true,
          ...(step.lowerThirdTitle
            ? { lowerThirdTitle: step.lowerThirdTitle }
            : {}),
          ...(step.lowerThirdSubtitle
            ? { lowerThirdSubtitle: step.lowerThirdSubtitle }
            : {}),
        });
      }
    },
    [handleUpdateOverlays, switchToProgramScene]
  );

  useEffect(() => {
    if (!rundownRunning || rundown.length === 0) return;
    const id = window.setInterval(() => {
      setRundownRemainingSec((prev) => {
        if (prev > 1) return prev - 1;
        const nextIdx = rundownIndex + 1;
        if (nextIdx < rundown.length) {
          setRundownIndex(nextIdx);
          executeRundownStep(rundown[nextIdx]);
          return rundown[nextIdx].durationSec;
        } else if (rundownLoop) {
          setRundownIndex(0);
          executeRundownStep(rundown[0]);
          return rundown[0].durationSec;
        } else {
          setRundownRunning(false);
          showNotice('Escaleta automática finalizada');
          return 0;
        }
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    executeRundownStep,
    rundown,
    rundownIndex,
    rundownLoop,
    rundownRunning,
    showNotice,
  ]);

  const handleToggleRundown = () => {
    if (rundown.length === 0) return;
    if (!rundownRunning) {
      setCycleRunning(false);
      const step = rundown[rundownIndex] || rundown[0];
      executeRundownStep(step);
      setRundownRemainingSec(step.durationSec);
      setRundownRunning(true);
      showNotice('Escaleta automática en marcha');
    } else {
      setRundownRunning(false);
    }
  };

  const handleSkipRundownNext = () => {
    if (rundown.length === 0) return;
    const nextIdx = (rundownIndex + 1) % rundown.length;
    setRundownIndex(nextIdx);
    executeRundownStep(rundown[nextIdx]);
    setRundownRemainingSec(rundown[nextIdx].durationSec);
  };

  const handleJumpToRundownStep = (idx: number) => {
    const step = rundown[idx];
    if (!step) return;
    setRundownIndex(idx);
    executeRundownStep(step);
    setRundownRemainingSec(step.durationSec);
  };

  // Cyclic Camera Rotation
  useEffect(() => {
    if (!cycleRunning || cycleSceneIds.length < 2) return;
    const id = window.setInterval(() => {
      setCycleRemainingSec((prev) => {
        if (prev > 1) return prev - 1;
        const currIdx = cycleSceneIds.indexOf(programSceneId);
        const nextId = cycleSceneIds[(currIdx + 1) % cycleSceneIds.length];
        switchToProgramScene(nextId, 'fade');
        return cycleIntervalSec;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    cycleIntervalSec,
    cycleRunning,
    cycleSceneIds,
    programSceneId,
    switchToProgramScene,
  ]);

  // Scheduled Clock Triggers
  useEffect(() => {
    if (schedules.length === 0) return;
    const id = window.setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayKey = now.toISOString().slice(0, 10);

      setSchedules((prev) =>
        prev.map((item) => {
          if (
            item.enabled &&
            item.timeHHMM === hhmm &&
            item.lastTriggeredDate !== todayKey
          ) {
            if (item.action === 'scene' && item.sceneId) {
              switchToProgramScene(item.sceneId, 'fade');
              showNotice(`Regla horaria (${hhmm}): ${item.label}`);
            } else if (item.action === 'start_stream') {
              broadcastAudio.resume();
              if (obsStatus.connectionStatus === 'connected') {
                obsClient.toggleStream(true);
              }
              setLocalStreaming(true);
              setLocalStreamSec(0);
              showNotice(`Inicio programado de transmisión (${hhmm})`);
            } else if (item.action === 'stop_stream') {
              if (obsStatus.connectionStatus === 'connected') {
                obsClient.toggleStream(false);
              }
              setLocalStreaming(false);
              peersRef.current.forEach((pc) => pc.close());
              peersRef.current.clear();
              recountConnectedPeers();
              showNotice(`Cierre programado de transmisión (${hhmm})`);
            }
            return { ...item, lastTriggeredDate: todayKey };
          }
          return item;
        })
      );
    }, 5000);
    return () => window.clearInterval(id);
  }, [
    obsStatus.connectionStatus,
    recountConnectedPeers,
    schedules.length,
    showNotice,
    switchToProgramScene,
  ]);

  const streamTimecodeDisplay =
    obsStatus.connectionStatus === 'connected'
      ? obsStatus.streamTimecode
      : formatSecondsToHms(localStreamSec);

  const recordTimecodeDisplay =
    obsStatus.connectionStatus === 'connected'
      ? obsStatus.recordTimecode
      : formatSecondsToHms(localRecordSec);

  const obsConnected = obsStatus.connectionStatus === 'connected';
  const liveShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?live=1&program=${encodeURIComponent(
          activeTemplateId
        )}`
      : `?live=1&program=${encodeURIComponent(activeTemplateId)}`;

  const handleCopyLiveLink = () => {
    navigator.clipboard.writeText(liveShareUrl).then(() => {
      setCopiedLiveLink(true);
      showNotice('Link en vivo copiado al portapapeles');
      window.setTimeout(() => setCopiedLiveLink(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0D12] text-slate-100 flex flex-col">
      {/* TOP BAR CONTRACT: 3 Zones */}
      <header className="sticky top-0 z-40 bg-[#0D1118] border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveView('switcher')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            MesaControl TV
          </button>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: 'switcher', label: 'Mesa en Vivo' },
                { id: 'deck', label: 'Deck Táctil' },
                { id: 'automation', label: 'Automatización' },
                { id: 'templates', label: 'Plantillas TV' },
                { id: 'sponsors', label: 'Auspiciantes' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeView === item.id
                    ? 'text-white border-emerald-500'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setObsModalOpen(true)}
              className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                obsConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              {obsConnected ? 'OBS Sincronizado' : 'OBS y Link Vivo'}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Nav Row */}
        <div className="md:hidden border-t border-white/8 px-3 py-1.5 flex items-center justify-around gap-1">
          {(
            [
              { id: 'switcher', label: 'Mesa' },
              { id: 'deck', label: 'Deck' },
              { id: 'automation', label: 'Auto' },
              { id: 'templates', label: 'Plantillas' },
              { id: 'sponsors', label: 'Auspicios' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`min-h-[38px] flex-1 px-2 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                activeView === item.id
                  ? 'bg-[#1A2230] text-white'
                  : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* WORKSPACE TRANSPORT TOOLBAR */}
      <div className="bg-[#0E131B] border-b border-white/8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Show Selector + Metadata & Viewer Count */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
            {overlays.logoUrl ? (
              <img
                src={overlays.logoUrl}
                alt={showName}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: accentHex }}
              />
            )}

            <div className="flex items-center gap-1.5">
              <label htmlFor="studio-program-select" className="sr-only">
                Programa en emisión
              </label>
              <select
                id="studio-program-select"
                value={activeTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="min-h-[36px] px-2.5 py-1 bg-[#080B10] border border-emerald-500/40 rounded-lg text-xs font-semibold text-white cursor-pointer"
              >
                {(catalogPrograms.length > 0
                  ? catalogPrograms
                  : TV_SHOW_TEMPLATES.map((t) => ({ id: t.id, title: t.name }))
                ).map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.title}
                  </option>
                ))}
              </select>

              {activeCatalogProgram && (
                <button
                  type="button"
                  onClick={() => setEditProgramModalOpen(true)}
                  title="Editar programa actual"
                  className="min-h-[36px] px-2.5 py-1 border border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Editar Programa</span>
                </button>
              )}
            </div>

            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {obsConnected
                ? `OBS ${obsStatus.obsVersion || 'v5'}`
                : 'Consola Directa'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-300 tabular-nums">
              {isStreaming
                ? `AL AIRE ${streamTimecodeDisplay}`
                : 'LISTO PARA EMITIR'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400 hidden sm:inline tabular-nums">
              1280×720 · 30 FPS
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1 font-mono text-emerald-400 tabular-nums">
              <Users className="w-3.5 h-3.5" />
              <span>{audienceCount.toLocaleString('es-AR')} viendo</span>
            </span>
          </div>

          {/* Primary Broadcast Transport + Live Link Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atrás</span>
            </button>

            <button
              type="button"
              onClick={onBackToSite}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLiveLink}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-600/50 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedLiveLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link Vivo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenLive(activeTemplateId)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Emisión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !studioMode;
                setStudioMode(next);
                if (obsConnected) obsClient.setStudioMode(next);
              }}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                studioMode
                  ? 'bg-[#1A2230] border-amber-500/50 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modo Previo</span>
            </button>

            <button
              type="button"
              onClick={handleToggleRecord}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isRecording
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/12 text-slate-200'
              }`}
            >
              <Circle
                className={`w-3.5 h-3.5 ${
                  isRecording ? 'fill-white' : 'text-red-400'
                }`}
              />
              <span>
                {isRecording
                  ? `Grabando ${recordTimecodeDisplay}`
                  : 'Grabar'}
              </span>
            </button>

            {lastRecordedClip && !isRecording && (
              <button
                type="button"
                disabled={publishingClip}
                onClick={handlePublishLastClip}
                className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-400/50 bg-emerald-950/70 hover:bg-emerald-800 text-emerald-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {publishingClip ? 'Publicando...' : 'Publicar en Archivo'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleStream}
              className={`min-h-[40px] px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
                isStreaming
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isStreaming ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Detener Transmisión</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Transmitir en Vivo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Transient Feedback Bar */}
      {noticeText && (
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-3">
          <div className="px-3.5 py-2 bg-[#0F2418] border border-emerald-500/40 rounded-lg text-xs text-emerald-100 flex items-center justify-between">
            <span>{noticeText}</span>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE VIEWPORT */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* VIEW 1: LIVE SWITCHER */}
        {activeView === 'switcher' && (
          <>
            {/* Monitors & Transition Bar */}
            <div
              className={`grid gap-4 items-stretch ${
                studioMode ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
              }`}
            >
              {studioMode && previewScene && (
                <div className="lg:col-span-5">
                  <BroadcastMonitor
                    role="PVW"
                    scene={previewScene}
                    overlays={overlays}
                    accentHex={accentHex}
                    isLiveOnAir={false}
                    transitionType={transitionType}
                    liveStream={sceneStreams[previewScene.id] || null}
                    onRequestWebcam={() => connectDeviceToScene(previewScene.id)}
                    onRequestScreen={() => connectScreenToScene(previewScene.id)}
                    onStopCamera={() => disconnectSceneStream(previewScene.id)}
                    onEditScene={() => {
                      setEditingScene(previewScene);
                      setCameraModalOpen(true);
                    }}
                  />
                </div>
              )}

              {studioMode && (
                <div className="lg:col-span-2 bg-[#121720] border border-white/10 rounded-lg p-3 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-slate-400 text-center">
                      Transición
                    </p>
                    <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
                      {(
                        [
                          { id: 'cut', label: 'Corte' },
                          { id: 'fade', label: 'Fundido' },
                          { id: 'wipe', label: 'Barrido' },
                        ] as const
                      ).map((tr) => (
                        <button
                          key={tr.id}
                          type="button"
                          onClick={() => setTransitionType(tr.id)}
                          className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                            transitionType === tr.id
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-[#0A0D12] border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick On-Air Broadcast Toggles */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateOverlays({
                          showLowerThird: !overlays.showLowerThird,
                        })
                      }
                      className={`min-h-[30px] px-1.5 py-1 rounded text-[10px] font-mono font-semibold border cursor-pointer ${
                        overlays.showLowerThird
                          ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                          : 'bg-[#0A0D12] border-white/10 text-slate-400'
                      }`}
                    >
                      ZÓCALO
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateOverlays({ showTicker: !overlays.showTicker })
                      }
                      className={`min-h-[30px] px-1.5 py-1 rounded text-[10px] font-mono font-semibold border cursor-pointer ${
                        overlays.showTicker
                          ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                          : 'bg-[#0A0D12] border-white/10 text-slate-400'
                      }`}
                    >
                      CINTILLO
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleStudioTransition()}
                      className="min-h-[48px] w-full px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-display font-bold tracking-wide rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-lg shadow-red-950/50"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>PASAR AL AIRE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateOverlays({
                          fadeToBlack: !overlays.fadeToBlack,
                        })
                      }
                      className={`min-h-[34px] w-full px-2 py-1 rounded-md border text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                        overlays.fadeToBlack
                          ? 'bg-amber-600 border-amber-400 text-white'
                          : 'bg-[#0A0D12] border-white/12 text-slate-300 hover:text-white'
                      }`}
                    >
                      {overlays.fadeToBlack ? 'VOLVER DE NEGRO' : 'FTB · NEGRO'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const baseClosing: ClosingSlateConfig =
                          overlays.closingSlate || {
                            ...DEFAULT_CLOSING_SLATE,
                            active: false,
                            programTitle: showName,
                            programLogoUrl: overlays.logoUrl,
                          };
                        const nextActive = !baseClosing.active;
                        handleUpdateOverlays({
                          closingSlate: {
                            ...baseClosing,
                            active: nextActive,
                          },
                        });
                        showNotice(
                          nextActive
                            ? 'Placa de Cierre activada al aire'
                            : 'Placa de Cierre retirada'
                        );
                      }}
                      className={`min-h-[34px] w-full px-2 py-1 rounded-md border text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                        overlays.closingSlate?.active
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-[#0A0D12] border-white/12 text-slate-300 hover:text-white'
                      }`}
                    >
                      {overlays.closingSlate?.active
                        ? 'OCULTAR CIERRE'
                        : 'PLACA CIERRE'}
                    </button>
                  </div>
                </div>
              )}

              {programScene && (
                <div
                  className={
                    studioMode ? 'lg:col-span-5' : 'max-w-4xl mx-auto w-full'
                  }
                >
                  <BroadcastMonitor
                    role="PGM"
                    scene={programScene}
                    overlays={overlays}
                    accentHex={accentHex}
                    isLiveOnAir={isStreaming}
                    transitionType={transitionType}
                    liveStream={sceneStreams[programScene.id] || null}
                    onRequestWebcam={() => connectDeviceToScene(programScene.id)}
                    onRequestScreen={() => connectScreenToScene(programScene.id)}
                    onStopCamera={() => disconnectSceneStream(programScene.id)}
                    onEditScene={() => {
                      setEditingScene(programScene);
                      setCameraModalOpen(true);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cameras / Scenes Switcher & Quick Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <section className="lg:col-span-8 bg-[#121720] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-white">
                      Cámaras y Escenas ({showName})
                    </h2>
                    <p className="text-xs text-slate-400">
                      {studioMode
                        ? 'Un toque carga en Previo · Doble toque pasa al aire · Lápiz edita fuente o cámara'
                        : 'Tocá cualquier cámara para pasar directo al aire'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingScene(null);
                      setCameraModalOpen(true);
                    }}
                    className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Cámara</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {scenes.map((sc) => {
                    const isPgm = sc.id === programSceneId;
                    const isPvw = studioMode && sc.id === previewSceneId;
                    const hasCamStream = Boolean(sceneStreams[sc.id]);

                    return (
                      <div
                        key={sc.id}
                        className={`relative rounded-lg border transition-all flex flex-col justify-between ${
                          isPgm
                            ? 'bg-red-950/70 border-red-500 text-white'
                            : isPvw
                            ? 'bg-amber-950/60 border-amber-500 text-amber-100'
                            : 'bg-[#0A0D12] border-white/10 text-slate-200 hover:border-white/25'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            studioMode
                              ? selectPreviewScene(sc.id)
                              : switchToProgramScene(sc.id)
                          }
                          onDoubleClick={() => switchToProgramScene(sc.id)}
                          className="w-full min-h-[72px] p-2.5 text-left flex flex-col justify-between cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono pr-6">
                            <span className="truncate opacity-85">
                              {hasCamStream ? 'VIVO · ' : ''}
                              {sc.cameraLabel}
                            </span>
                            {isPgm && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-sm font-bold">
                                PGM
                              </span>
                            )}
                            {!isPgm && isPvw && (
                              <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded-sm font-bold">
                                PVW
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold leading-snug line-clamp-2 mt-1">
                            {sc.name}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingScene(sc);
                            setCameraModalOpen(true);
                          }}
                          aria-label={`Editar ${sc.name}`}
                          title="Editar cámara o fuente"
                          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Quick Live Text & Automation Card */}
              <section className="lg:col-span-4 bg-[#121720] border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold text-white">
                    Edición Rápida y Auto
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveView('templates')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Editar gráficas
                  </button>
                </div>

                {/* Inline quick Lower Third edit */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={overlays.lowerThirdTitle}
                    onChange={(e) =>
                      handleUpdateOverlays({ lowerThirdTitle: e.target.value })
                    }
                    placeholder="Título del zócalo en vivo"
                    className="w-full px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-xs text-white"
                  />
                  <input
                    type="text"
                    value={overlays.tickerText}
                    onChange={(e) =>
                      handleUpdateOverlays({ tickerText: e.target.value })
                    }
                    placeholder="Texto del cintillo inferior"
                    className="w-full px-2.5 py-1.5 bg-[#0A0D12] border border-white/12 rounded text-xs text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleToggleRundown}
                    className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      rundownRunning
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-[#0A0D12] border-white/10 text-slate-200 hover:border-white/25'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {rundownRunning
                        ? `Escaleta (${rundownRemainingSec}s)`
                        : 'Auto Escaleta'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!cycleRunning) setRundownRunning(false);
                      setCycleRemainingSec(cycleIntervalSec);
                      setCycleRunning((v) => !v);
                    }}
                    className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      cycleRunning
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-[#0A0D12] border-white/10 text-slate-200 hover:border-white/25'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>
                      {cycleRunning
                        ? `Rotación (${cycleRemainingSec}s)`
                        : 'Rotar Cámaras'}
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* Custom Touch Deck */}
            <TouchDeckPanel
              pads={touchPads}
              scenes={scenes}
              activeSceneId={programSceneId}
              onTriggerPad={handleTriggerPad}
              onUpdatePads={handleUpdateTouchPads}
              onResetPads={handleResetTouchPads}
            />

            {/* Studio Audio Mixer & TV Soundboard */}
            <AudioMixerBar
              channels={audioChannels}
              masterLevelDb={masterLevelDb}
              onChangeVolume={(id, vol) => {
                setAudioChannels((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, volumeDb: vol } : c))
                );
                broadcastAudio.setChannelGainDb(id, vol);
                const ch = audioChannels.find((c) => c.id === id);
                if (ch && obsConnected) {
                  obsClient.setInputVolumeDb(ch.obsInputName, vol);
                }
              }}
              onToggleMute={(id) => {
                const ch = audioChannels.find((c) => c.id === id);
                const nextMuted = ch ? !ch.muted : true;
                setAudioChannels((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, muted: nextMuted } : c))
                );
                broadcastAudio.setChannelMuted(id, nextMuted);
                if (ch && obsConnected) {
                  obsClient.setInputMute(ch.obsInputName, nextMuted);
                }
              }}
              onSelectDevice={(id, deviceId) => {
                setAudioChannels((prev) =>
                  prev.map((c) =>
                    c.id === id ? { ...c, audioDeviceId: deviceId } : c
                  )
                );
              }}
              onConnectMic={async (id, deviceId) => {
                const ch = audioChannels.find((c) => c.id === id);
                try {
                  await broadcastAudio.connectMicrophone(
                    id,
                    deviceId,
                    ch?.volumeDb ?? -3,
                    ch?.muted ?? false
                  );
                  setAudioChannels((prev) =>
                    prev.map((c) =>
                      c.id === id ? { ...c, micConnected: true } : c
                    )
                  );
                  showNotice(`Micrófono conectado en ${ch?.name || 'canal'}`);
                } catch {
                  showNotice('No se pudo conectar el micrófono (verificá permisos)');
                }
              }}
              onDisconnectMic={(id) => {
                broadcastAudio.disconnectMicrophone(id);
                setAudioChannels((prev) =>
                  prev.map((c) =>
                    c.id === id
                      ? { ...c, micConnected: false, monitoring: false, levelDb: -60 }
                      : c
                  )
                );
                showNotice('Micrófono desconectado del canal');
              }}
              onToggleMonitor={(id) => {
                const ch = audioChannels.find((c) => c.id === id);
                const next = !ch?.monitoring;
                broadcastAudio.setChannelMonitor(id, next);
                setAudioChannels((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, monitoring: next } : c))
                );
              }}
            />

            {/* Tabbed Live TV Production Modules (Invitados, Premios/Sorteos, Títulos TV, Comentarios, Auspiciantes) */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 bg-[#121720] border border-white/10 rounded-xl p-2">
                {(
                  [
                    {
                      id: 'guests',
                      label: 'Cartelitos Invitados',
                      icon: UserCheck,
                      activeOnAir: Boolean(overlays.activeGuestBadge),
                    },
                    {
                      id: 'giveaway',
                      label: 'Premios y Sorteos',
                      icon: Gift,
                      activeOnAir: Boolean(
                        overlays.giveaway && overlays.giveaway.stage !== 'hidden'
                      ),
                    },
                    {
                      id: 'titles',
                      label: 'Títulos y Zócalos TV',
                      icon: Type,
                      activeOnAir: Boolean(overlays.activeBannerTitle),
                    },
                    {
                      id: 'audience_closing',
                      label: 'Vistas y Cierre',
                      icon: Clapperboard,
                      activeOnAir: Boolean(overlays.closingSlate?.active),
                    },
                    {
                      id: 'comments',
                      label: `Comentarios (${comments.length})`,
                      icon: MessageSquare,
                      activeOnAir: false,
                    },
                    {
                      id: 'sponsors',
                      label: 'Auspiciantes',
                      icon: Megaphone,
                      activeOnAir: false,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = studioModuleTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudioModuleTab(tab.id)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-[#0A0D12] hover:bg-white/5 text-slate-300 border border-white/8'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.activeOnAir && (
                        <span
                          className={`w-1.5 h-1.5 ${
                            isSelected ? 'bg-white' : 'bg-emerald-400'
                          }`}
                          title="Activo al aire"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {studioModuleTab === 'guests' && (
                <GuestBadgesPanel
                  guests={guestBadges}
                  activeBadge={overlays.activeGuestBadge}
                  onUpdateGuests={setGuestBadges}
                  onShowBadge={(badge) => {
                    handleUpdateOverlays({ activeGuestBadge: badge });
                    showNotice(
                      `Cartelito "${badge.greeting} ${badge.name}" en pantalla`
                    );
                  }}
                  onClearBadge={() => {
                    handleUpdateOverlays({ activeGuestBadge: null });
                    showNotice('Cartelito de invitado retirado');
                  }}
                />
              )}

              {studioModuleTab === 'giveaway' && (
                <GiveawayPanel
                  giveaway={giveawayConfig}
                  comments={comments}
                  onChangeGiveaway={(next) => {
                    setGiveawayConfig(next);
                    handleUpdateOverlays({
                      giveaway: next.stage === 'hidden' ? null : next,
                    });
                  }}
                />
              )}

              {studioModuleTab === 'titles' && (
                <TvTitlesPanel
                  titles={tvTitles}
                  overlays={overlays}
                  onUpdateTitles={setTvTitles}
                  onTriggerTitle={(preset) => {
                    if (preset.style === 'lower_third') {
                      handleUpdateOverlays({
                        showLowerThird: true,
                        lowerThirdTitle: preset.title,
                        lowerThirdSubtitle: preset.subtitle,
                        activeBannerTitle: null,
                      });
                    } else {
                      handleUpdateOverlays({
                        activeBannerTitle: {
                          tag: preset.tag,
                          title: preset.title,
                          subtitle: preset.subtitle,
                          style: preset.style,
                        },
                      });
                    }
                    showNotice(`Título "${preset.title}" en pantalla`);
                  }}
                  onClearActiveTitle={() => {
                    handleUpdateOverlays({ activeBannerTitle: null });
                    showNotice('Titular retirado del aire');
                  }}
                />
              )}

              {studioModuleTab === 'audience_closing' && (
                <AudienceAndClosingPanel
                  programId={activeTemplateId}
                  programTitle={showName}
                  programLogoUrl={overlays.logoUrl}
                  realViewerCount={viewerCount}
                  displayedAudienceCount={audienceCount}
                  audienceMode={audienceMode}
                  inflatedCount={inflatedCount}
                  onApplyAudience={handleApplyAudience}
                  closingSlate={
                    overlays.closingSlate || {
                      ...DEFAULT_CLOSING_SLATE,
                      active: false,
                      programTitle: showName,
                      programLogoUrl: overlays.logoUrl,
                    }
                  }
                  onChangeClosingSlate={(nextClosing) =>
                    handleUpdateOverlays({ closingSlate: nextClosing })
                  }
                  onResetClosingSlate={() => {
                    handleUpdateOverlays({
                      closingSlate: {
                        ...DEFAULT_CLOSING_SLATE,
                        active: Boolean(overlays.closingSlate?.active),
                        programTitle: showName,
                        programLogoUrl: overlays.logoUrl,
                      },
                    });
                    showNotice('Créditos de cierre restaurados');
                  }}
                />
              )}

              {studioModuleTab === 'comments' && (
                <LiveCommentsPanel
                  comments={comments}
                  onPushToAir={(c) => {
                    handleUpdateOverlays({
                      showLowerThird: true,
                      lowerThirdTitle: `${c.author}${
                        c.location ? ` · ${c.location}` : ''
                      }`,
                      lowerThirdSubtitle: c.message,
                    });
                    showNotice(`Comentario de ${c.author} sacado al aire`);
                  }}
                  onDeleteComment={async (id) => {
                    try {
                      const res = await fetch(
                        `/api/broadcast/comments/${encodeURIComponent(
                          id
                        )}?programId=${encodeURIComponent(activeTemplateId)}`,
                        { method: 'DELETE' }
                      );
                      const data = await res.json();
                      if (Array.isArray(data.comments)) setComments(data.comments);
                    } catch {
                      // ignore
                    }
                  }}
                />
              )}

              {studioModuleTab === 'sponsors' && (
                <SponsorManagerPanel
                  programTitle={showName}
                  sponsors={sponsors}
                  onUpdateSponsors={setSponsors}
                  onPushSponsorToLowerThird={(sp) => {
                    handleUpdateOverlays({
                      showLowerThird: true,
                      lowerThirdTitle: sp.name,
                      lowerThirdSubtitle: sp.message,
                    });
                    showNotice(
                      `Auspiciante "${sp.name}" enviado al zócalo en vivo`
                    );
                  }}
                  onResetSponsors={() => {
                    setSponsors(DEFAULT_SPONSOR_BANNERS);
                    showNotice('Los 3 espacios publicitarios fueron restaurados');
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* VIEW 2: DEDICATED TOUCH DECK */}
        {activeView === 'deck' && programScene && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 space-y-4">
              <BroadcastMonitor
                role="PGM"
                scene={programScene}
                overlays={overlays}
                accentHex={accentHex}
                isLiveOnAir={isStreaming}
                transitionType={transitionType}
                liveStream={sceneStreams[programScene.id] || null}
                compact
              />
              <div className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Controles de Zócalo en Vivo
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveView('templates')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Editar texto</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  {overlays.lowerThirdTitle}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOverlays({
                        showLowerThird: !overlays.showLowerThird,
                      })
                    }
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      overlays.showLowerThird
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0A0D12] border border-white/10 text-slate-300'
                    }`}
                  >
                    {overlays.showLowerThird ? 'Ocultar Zócalo' : 'Mostrar Zócalo'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOverlays({ showTicker: !overlays.showTicker })
                    }
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      overlays.showTicker
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0A0D12] border border-white/10 text-slate-300'
                    }`}
                  >
                    {overlays.showTicker ? 'Ocultar Cintillo' : 'Mostrar Cintillo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <TouchDeckPanel
                pads={touchPads}
                scenes={scenes}
                activeSceneId={programSceneId}
                onTriggerPad={handleTriggerPad}
                onUpdatePads={handleUpdateTouchPads}
                onResetPads={handleResetTouchPads}
                fullScreenDeck
              />
            </div>
          </div>
        )}

        {/* VIEW 3: AUTOMATION ENGINE */}
        {activeView === 'automation' && programScene && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 space-y-4">
              <BroadcastMonitor
                role="PGM"
                scene={programScene}
                overlays={overlays}
                accentHex={accentHex}
                isLiveOnAir={isStreaming}
                transitionType={transitionType}
                liveStream={sceneStreams[programScene.id] || null}
                compact
              />
              <div className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-2 text-xs text-slate-400">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  <span>Sincronización Automática con OBS y Link Vivo</span>
                </p>
                <p className="leading-relaxed">
                  Cada cambio de escena disparado por la escaleta, rotación cíclica, detección de voz o horario se refleja al instante tanto en OBS Studio como en el enlace público en vivo.
                </p>
              </div>
            </div>

            <div className="lg:col-span-8">
              <AutomationPanel
                scenes={scenes}
                audioChannels={audioChannels}
                rundown={rundown}
                onUpdateRundown={setRundown}
                rundownRunning={rundownRunning}
                rundownLoop={rundownLoop}
                rundownIndex={rundownIndex}
                rundownRemainingSec={rundownRemainingSec}
                onToggleRundown={handleToggleRundown}
                onToggleRundownLoop={() => setRundownLoop((v) => !v)}
                onSkipRundownNext={handleSkipRundownNext}
                onJumpToRundownStep={handleJumpToRundownStep}
                cycleRunning={cycleRunning}
                cycleIntervalSec={cycleIntervalSec}
                cycleSceneIds={cycleSceneIds}
                cycleRemainingSec={cycleRemainingSec}
                onToggleCycle={() => {
                  if (!cycleRunning) setRundownRunning(false);
                  setCycleRemainingSec(cycleIntervalSec);
                  setCycleRunning((v) => !v);
                }}
                onChangeCycleInterval={(sec) => {
                  setCycleIntervalSec(sec);
                  setCycleRemainingSec(sec);
                }}
                onToggleCycleScene={(sceneId) => {
                  setCycleSceneIds((prev) =>
                    prev.includes(sceneId)
                      ? prev.filter((id) => id !== sceneId)
                      : [...prev, sceneId]
                  );
                }}
                afvEnabled={afvEnabled}
                afvThresholdDb={afvThresholdDb}
                afvHoldSec={afvHoldSec}
                micActive={micActive}
                micLevelDb={micLevelDb}
                onToggleAfv={() => setAfvEnabled((v) => !v)}
                onChangeAfvThreshold={setAfvThresholdDb}
                onChangeAfvHold={setAfvHoldSec}
                onToggleRealMic={handleToggleRealMic}
                onAssignChannelScene={(chId, sceneId) => {
                  setAudioChannels((prev) =>
                    prev.map((c) =>
                      c.id === chId
                        ? { ...c, linkedSceneId: sceneId || undefined }
                        : c
                    )
                  );
                }}
                schedules={schedules}
                onAddSchedule={(item) => setSchedules((prev) => [...prev, item])}
                onToggleSchedule={(id) =>
                  setSchedules((prev) =>
                    prev.map((s) =>
                      s.id === id ? { ...s, enabled: !s.enabled } : s
                    )
                  )
                }
                onDeleteSchedule={(id) =>
                  setSchedules((prev) => prev.filter((s) => s.id !== id))
                }
              />
            </div>
          </div>
        )}

        {/* VIEW 4: TV SHOW TEMPLATES & LIVE GRAPHICS EDITOR */}
        {activeView === 'templates' && programScene && (
          <div className="space-y-5">
            <div className="max-w-3xl mx-auto">
              <BroadcastMonitor
                role="PGM"
                scene={programScene}
                overlays={overlays}
                accentHex={accentHex}
                isLiveOnAir={isStreaming}
                transitionType={transitionType}
                liveStream={sceneStreams[programScene.id] || null}
                onRequestWebcam={() => connectDeviceToScene(programScene.id)}
                onRequestScreen={() => connectScreenToScene(programScene.id)}
                onStopCamera={() => disconnectSceneStream(programScene.id)}
                onEditScene={() => {
                  setEditingScene(programScene);
                  setCameraModalOpen(true);
                }}
              />
            </div>
            <TemplateStudioPanel
              templates={
                catalogPrograms.length > 0
                  ? catalogPrograms.map((p) =>
                      buildProgramStudioConfig(p.id, catalogPrograms)
                    )
                  : TV_SHOW_TEMPLATES
              }
              activeTemplateId={activeTemplateId}
              showName={showName}
              accentHex={accentHex}
              overlays={overlays}
              onSelectTemplate={(id) => handleSelectTemplate(id)}
              onUpdateShowMeta={handleUpdateShowMeta}
              onUpdateOverlays={handleUpdateOverlays}
              onSyncOverlaysToObs={syncOverlaysToObs}
              obsConnected={obsConnected}
            />
          </div>
        )}

        {/* VIEW 5: SPONSORS & ADVERTISING SPACE */}
        {activeView === 'sponsors' && (
          <div className="space-y-5">
            <SponsorManagerPanel
              programTitle={showName}
              sponsors={sponsors}
              onUpdateSponsors={setSponsors}
              onPushSponsorToLowerThird={(sp) => {
                handleUpdateOverlays({
                  showLowerThird: true,
                  lowerThirdTitle: sp.name,
                  lowerThirdSubtitle: sp.message,
                });
                showNotice(`Auspiciante "${sp.name}" enviado al zócalo en vivo`);
              }}
              onResetSponsors={() => {
                setSponsors(DEFAULT_SPONSOR_BANNERS);
                showNotice('Los 3 espacios publicitarios fueron restaurados');
              }}
            />
          </div>
        )}
      </main>

      {/* CAMERA / SCENE ADD & EDIT MODAL */}
      <CameraEditorModal
        isOpen={cameraModalOpen}
        scene={editingScene}
        hasActiveStream={Boolean(editingScene && sceneStreams[editingScene.id])}
        obsScenes={obsStatus.obsScenes}
        onClose={() => setCameraModalOpen(false)}
        onSave={handleSaveCameraScene}
        onDelete={editingScene ? handleDeleteCameraScene : undefined}
        onConnectDevice={connectDeviceToScene}
        onConnectScreen={connectScreenToScene}
      />

      {/* OBS & SHARE LINK MODAL */}
      <ObsConnectionModal
        isOpen={obsModalOpen}
        onClose={() => setObsModalOpen(false)}
        obsStatus={obsStatus}
        onConnect={async (url, pwd) => {
          await obsClient.connect(url, pwd);
          showNotice('Conectado exitosamente a OBS Studio');
        }}
        onDisconnect={() => {
          obsClient.disconnect();
          showNotice('Desconectado de OBS Studio');
        }}
      />

      {/* QUICK EDIT ACTIVE PROGRAM */}
      <ProgramQuickEditModal
        open={editProgramModalOpen}
        program={activeCatalogProgram}
        authToken={authToken}
        onClose={() => setEditProgramModalOpen(false)}
        onRequestAuth={onOpenAuth}
        onSaved={(updated, allPrograms) => {
          setCatalogPrograms(allPrograms);
          if (updated.id === activeTemplateId) {
            handleUpdateShowMeta({ showName: updated.title });
            if (updated.logoUrl) {
              handleUpdateOverlays({ logoUrl: updated.logoUrl });
            }
          }
          showNotice(`Programa "${updated.title}" actualizado`);
        }}
      />
    </div>
  );
}
