import crypto from 'crypto';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  VIDEOS_DIR,
  addInquiry,
  addProgramVideo,
  authenticateStaffUser,
  claimInitialAdmin,
  createProgram,
  createProgramRequest,
  createStaffUser,
  deleteProgram,
  deleteProgramVideo,
  deleteStaffUser,
  getSiteContent,
  isServerlessEphemeralStorage,
  listInquiries,
  listProgramRequests,
  listProgramVideos,
  listPrograms,
  listStaffUsers,
  needsInitialAdminSetup,
  resetSiteContentToDefaults,
  resolveSafeVideoPath,
  signSessionToken,
  updateProgram,
  updateProgramRequestStatus,
  updateProgramVideo,
  updateSiteContent,
  updateStaffUser,
  verifySessionToken,
} from './producerStore.ts';
import {
  PRODUCER_ROLES,
  type ProducerRole,
  type ProgramRequestStatus,
  type StaffUserPublic,
} from './src/types/producer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const OFFICIAL_LOGO_URL = '/assets/aistudio/sin-filtro-logoo2_2e0a15d3.png';

interface ActiveTvTitlePayload {
  tag: string;
  title: string;
  subtitle: string;
  style: string;
}

interface GuestBadgePayload {
  id: string;
  greeting: string;
  name: string;
  role: string;
}

interface GiveawayPayload {
  stage: 'hidden' | 'promo' | 'rolling' | 'winner';
  title: string;
  prize: string;
  promptText: string;
  participants: string[];
  rollingName?: string;
  winnerName?: string;
  winnerNote?: string;
}

interface ClosingCreditPayload {
  area: string;
  names: string;
}

interface ClosingSlatePayload {
  active: boolean;
  headline: string;
  programTitle?: string;
  programLogoUrl?: string;
  radioName: string;
  radioLogoUrl?: string;
  producerName: string;
  producerLogoUrl?: string;
  ownerCredit: string;
  credits: ClosingCreditPayload[];
}

interface OverlayPayload {
  showLowerThird: boolean;
  lowerThirdTitle: string;
  lowerThirdSubtitle: string;
  showTicker: boolean;
  tickerText: string;
  showBug: boolean;
  channelName: string;
  logoUrl?: string;
  showClock: boolean;
  showLiveBadge: boolean;
  showScoreboard: boolean;
  scoreHomeName: string;
  scoreHome: number;
  scoreAwayName: string;
  scoreAway: number;
  matchClock: string;
  activeBannerTitle?: ActiveTvTitlePayload | null;
  activeGuestBadge?: GuestBadgePayload | null;
  giveaway?: GiveawayPayload | null;
  closingSlate?: ClosingSlatePayload | null;
  fadeToBlack?: boolean;
}

interface BroadcastScenePayload {
  id: string;
  name: string;
  cameraLabel: string;
  cameraType: string;
  layoutMode: string;
  slateColor?: string;
  slateHeadline?: string;
  description?: string;
}

interface SponsorBannerPayload {
  id: string;
  slotLabel: string;
  name: string;
  message: string;
  logoUrl?: string;
  badgeText?: string;
  ctaText?: string;
  isOccupied: boolean;
}

interface ViewerCommentPayload {
  id: string;
  author: string;
  location?: string;
  message: string;
  createdAt: number;
}

interface LiveBroadcastState {
  programId: string;
  isLive: boolean;
  startedAt: number | null;
  showName: string;
  accentHex: string;
  activeScene: BroadcastScenePayload;
  overlays: OverlayPayload;
  sponsors: SponsorBannerPayload[];
  updatedAt: number;
}

interface SseClient {
  id: string;
  role: 'broadcaster' | 'viewer';
  res: Response;
}

interface BroadcastRoom {
  programId: string;
  currentState: LiveBroadcastState;
  latestFrameDataUrl: string | null;
  latestFrameUpdatedAt: number;
  latestFrameSeq: number;
  audienceMode: 'real' | 'inflated';
  inflatedCount: number;
  commentsStore: ViewerCommentPayload[];
  clients: Map<string, SseClient>;
}

const PRODUCER_LOGO_URL = '/assets/aistudio/jz-logo-transparent.png';

function buildDefaultClosingSlate(
  programTitle: string,
  programLogoUrl?: string
): ClosingSlatePayload {
  return {
    active: false,
    headline: 'GRACIAS POR ACOMPAÑARNOS',
    programTitle,
    programLogoUrl: programLogoUrl || OFFICIAL_LOGO_URL,
    radioName: 'Radioactiva 88.5 FM',
    radioLogoUrl: '',
    producerName: 'JUGEND FÜR EINE GRÜNE ZUKUNFT',
    producerLogoUrl: PRODUCER_LOGO_URL,
    ownerCredit: 'Dueño y Creador: ALMADA EDUARDO THOMAS',
    credits: [
      {
        area: 'Dirección General y Creación',
        names: 'ALMADA EDUARDO THOMAS',
      },
      {
        area: 'Producción General',
        names: 'ALMADA EDUARDO THOMAS',
      },
      {
        area: 'Conducción',
        names: 'Equipo de Conducción JZ',
      },
      {
        area: 'Operación Técnica y Transmisión',
        names: 'MesaControl TV · JZ',
      },
      {
        area: 'Gráfica y Redes',
        names: 'Equipo Digital JZ',
      },
    ],
  };
}

const DEFAULT_SPONSORS: SponsorBannerPayload[] = [
  {
    id: 'sponsor-1',
    slotLabel: 'BANNER 1',
    name: 'Auspiciante 1',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Pedir espacio por WhatsApp',
    isOccupied: false,
  },
  {
    id: 'sponsor-2',
    slotLabel: 'BANNER 2',
    name: 'Auspiciante 2',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Pedir espacio por WhatsApp',
    isOccupied: false,
  },
  {
    id: 'sponsor-3',
    slotLabel: 'BANNER 3',
    name: 'Auspiciante 3',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Pedir espacio por WhatsApp',
    isOccupied: false,
  },
];

const broadcastRooms = new Map<string, BroadcastRoom>();

function normalizeProgramId(raw?: unknown): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
  return cleaned || 'sin-filtro';
}

function buildDefaultStateForProgram(programId: string): LiveBroadcastState {
  if (programId === 'sin-filtro') {
    return {
      programId: 'sin-filtro',
      isLive: false,
      startedAt: null,
      showName: '#SinFiltro',
      accentHex: '#16A34A',
      activeScene: {
        id: 'sf-estudio',
        name: 'Cámara Principal #SinFiltro',
        cameraLabel: 'CAM 1 · GENERAL',
        cameraType: 'studio',
        layoutMode: 'full',
        description: 'Cámara principal en vivo de #SinFiltro.',
      },
      overlays: {
        showLowerThird: true,
        lowerThirdTitle: '#SinFiltro en Vivo',
        lowerThirdSubtitle:
          'Sábados de 17:00 a 19:00 · Radioactiva 88.5 Puerto Esperanza',
        showTicker: true,
        tickerText:
          'ESTÁS VIENDO #SinFiltro EN VIVO · Radioactiva 88.5 Puerto Esperanza · Participá con tu comentario',
        showBug: true,
        channelName: '#SinFiltro',
        logoUrl: OFFICIAL_LOGO_URL,
        showClock: true,
        showLiveBadge: true,
        showScoreboard: false,
        scoreHomeName: 'LOC',
        scoreHome: 0,
        scoreAwayName: 'VIS',
        scoreAway: 0,
        matchClock: '00:00',
        activeBannerTitle: null,
        activeGuestBadge: null,
        giveaway: null,
        closingSlate: buildDefaultClosingSlate('#SinFiltro', OFFICIAL_LOGO_URL),
        fadeToBlack: false,
      },
      sponsors: DEFAULT_SPONSORS.map((s) => ({ ...s })),
      updatedAt: Date.now(),
    };
  }

  const prog = listPrograms().find((p) => p.id === programId);
  const title = prog?.title || programId;
  const schedule = prog?.schedule || prog?.format || 'Señal HD Oficial';
  const hostTeam = prog?.hostTeam || 'JUGEND FÜR EINE GRÜNE ZUKUNFT';
  const channelLabel = prog?.channelOrSignal || 'Streaming HD JZ';
  const siteLogo = getSiteContent().logoUrl || OFFICIAL_LOGO_URL;
  const progLogo = prog?.logoUrl || siteLogo;

  return {
    programId,
    isLive: false,
    startedAt: null,
    showName: title,
    accentHex: '#16A34A',
    activeScene: {
      id: `${programId}-cam1`,
      name: `Cámara Principal ${title}`,
      cameraLabel: 'CAM 1 · GENERAL',
      cameraType: 'studio',
      layoutMode: 'full',
      description: prog?.summary || `Señal principal de ${title}.`,
    },
    overlays: {
      showLowerThird: true,
      lowerThirdTitle: `${title} en Vivo`,
      lowerThirdSubtitle: `${schedule}${hostTeam ? ` · ${hostTeam}` : ''}`,
      showTicker: true,
      tickerText: `ESTÁS VIENDO ${title} EN VIVO · ${hostTeam} · ${channelLabel}`,
      showBug: true,
      channelName: title,
      logoUrl: progLogo,
      showClock: true,
      showLiveBadge: true,
      showScoreboard: false,
      scoreHomeName: 'LOC',
      scoreHome: 0,
      scoreAwayName: 'VIS',
      scoreAway: 0,
      matchClock: '00:00',
      activeBannerTitle: null,
      activeGuestBadge: null,
      giveaway: null,
      closingSlate: buildDefaultClosingSlate(title, progLogo),
      fadeToBlack: false,
    },
    sponsors: DEFAULT_SPONSORS.map((s) => ({ ...s })),
    updatedAt: Date.now(),
  };
}

function buildInitialCommentsForProgram(programId: string): ViewerCommentPayload[] {
  if (programId === 'sin-filtro') {
    return [
      {
        id: 'c-init-1',
        author: 'Lucía Benítez',
        location: 'Puerto Esperanza',
        message:
          '¡Excelente programa equipo de #SinFiltro! Escuchando firme por Radioactiva 88.5.',
        createdAt: Date.now() - 240_000,
      },
      {
        id: 'c-init-2',
        author: 'Mateo Acosta',
        location: 'Barrio Centro',
        message:
          '¡Saludos a toda la mesa de #SinFiltro! Queremos participar en la trivia.',
        createdAt: Date.now() - 90_000,
      },
    ];
  }
  const prog = listPrograms().find((p) => p.id === programId);
  const title = prog?.title || programId;
  return [
    {
      id: `c-init-${programId}-1`,
      author: 'Comunidad JZ',
      location: 'Puerto Esperanza',
      message: `¡Esperando la emisión en vivo de ${title} por JUGEND FÜR EINE GRÜNE ZUKUNFT!`,
      createdAt: Date.now() - 120_000,
    },
  ];
}

function getOrCreateRoom(rawProgramId?: unknown): BroadcastRoom {
  const programId = normalizeProgramId(rawProgramId);
  const existing = broadcastRooms.get(programId);
  if (existing) return existing;

  const room: BroadcastRoom = {
    programId,
    currentState: buildDefaultStateForProgram(programId),
    latestFrameDataUrl: null,
    latestFrameUpdatedAt: 0,
    latestFrameSeq: 0,
    audienceMode: 'real',
    inflatedCount: 0,
    commentsStore: buildInitialCommentsForProgram(programId),
    clients: new Map<string, SseClient>(),
  };
  broadcastRooms.set(programId, room);
  return room;
}

function getViewerCount(room: BroadcastRoom): number {
  let count = 0;
  room.clients.forEach((c) => {
    if (c.role === 'viewer') count += 1;
  });
  return count;
}

function getBroadcasterOnline(room: BroadcastRoom): boolean {
  let found = false;
  room.clients.forEach((c) => {
    if (c.role === 'broadcaster') found = true;
  });
  return found;
}

function getAudienceDisplayCount(room: BroadcastRoom): number {
  const realViewers = getViewerCount(room);
  if (room.audienceMode === 'inflated') {
    return Math.max(0, Math.round(room.inflatedCount)) + realViewers;
  }
  return realViewers;
}

function sendSse(res: Response, event: string, data: unknown) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // ignore closed socket write
  }
}

function broadcastAll(
  room: BroadcastRoom,
  event: string,
  data: unknown,
  filterRole?: 'broadcaster' | 'viewer'
) {
  room.clients.forEach((client) => {
    if (!filterRole || client.role === filterRole) {
      sendSse(client.res, event, data);
    }
  });
}

function broadcastPresence(room: BroadcastRoom) {
  const payload = {
    programId: room.programId,
    viewerCount: getViewerCount(room),
    audienceCount: getAudienceDisplayCount(room),
    audienceMode: room.audienceMode,
    inflatedCount: room.inflatedCount,
    broadcasterOnline: getBroadcasterOnline(room),
  };
  broadcastAll(room, 'presence', payload);
}

function notifyBroadcasterOfWaitingViewers(room: BroadcastRoom) {
  room.clients.forEach((c) => {
    if (c.role === 'viewer') {
      broadcastAll(room, 'viewer-joined', { viewerId: c.id }, 'broadcaster');
    }
  });
}

const MAX_VIDEO_UPLOAD_BYTES = 250 * 1024 * 1024; // 250 MB

const VIDEO_EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/ogg': 'ogv',
};

const MIME_BY_VIDEO_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
};

function decodeSafeHeader(val: unknown, fallback = '', maxLen = 400): string {
  if (typeof val !== 'string' || !val) return fallback;
  try {
    return decodeURIComponent(val).trim().slice(0, maxLen) || fallback;
  } catch {
    return val.trim().slice(0, maxLen) || fallback;
  }
}

export function createApiApp(): Express {
  const app = express();

  // Ensure default catalog rooms exist on boot
  listPrograms().forEach((p) => getOrCreateRoom(p.id));

  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      serverless: isServerlessEphemeralStorage(),
      timestamp: Date.now(),
    });
  });

  // Summary of all broadcast rooms (live status + preview frame per program)
  app.get('/api/broadcast/rooms', (_req: Request, res: Response) => {
    const programs = listPrograms();
    programs.forEach((p) => getOrCreateRoom(p.id));
    const rooms = Array.from(broadcastRooms.values()).map((room) => ({
      programId: room.programId,
      isLive: room.currentState.isLive,
      showName: room.currentState.showName,
      startedAt: room.currentState.startedAt,
      updatedAt: room.currentState.updatedAt,
      viewerCount: getViewerCount(room),
      audienceCount: getAudienceDisplayCount(room),
      audienceMode: room.audienceMode,
      inflatedCount: room.inflatedCount,
      broadcasterOnline: getBroadcasterOnline(room),
      previewFrame: room.currentState.isLive ? room.latestFrameDataUrl : null,
    }));
    res.json({ ok: true, rooms });
  });

  // Current broadcast state & latest frame snapshot scoped by programId
  app.get('/api/broadcast/state', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId);
    res.json({
      programId: room.programId,
      state: room.currentState,
      frame: room.latestFrameDataUrl,
      frameUpdatedAt: room.latestFrameUpdatedAt,
      viewerCount: getViewerCount(room),
      audienceCount: getAudienceDisplayCount(room),
      audienceMode: room.audienceMode,
      inflatedCount: room.inflatedCount,
      broadcasterOnline: getBroadcasterOnline(room),
      comments: room.commentsStore,
    });
  });

  // MesaControl TV audience control (100% real views vs manual inflated value)
  app.post('/api/broadcast/audience', (req: Request, res: Response) => {
    const body = req.body as {
      programId?: string;
      mode?: 'real' | 'inflated';
      inflatedCount?: number;
    };
    const room = getOrCreateRoom(req.query.programId || body.programId);
    if (body.mode === 'real' || body.mode === 'inflated') {
      room.audienceMode = body.mode;
    }
    if (typeof body.inflatedCount === 'number' && Number.isFinite(body.inflatedCount)) {
      room.inflatedCount = Math.max(0, Math.min(1_000_000, Math.round(body.inflatedCount)));
    }
    broadcastPresence(room);
    res.json({
      ok: true,
      programId: room.programId,
      viewerCount: getViewerCount(room),
      audienceCount: getAudienceDisplayCount(room),
      audienceMode: room.audienceMode,
      inflatedCount: room.inflatedCount,
    });
  });

  // Comments endpoints scoped by programId
  app.get('/api/broadcast/comments', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId);
    res.json({ programId: room.programId, comments: room.commentsStore });
  });

  app.post('/api/broadcast/comments', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId || req.body?.programId);
    const { author, location, message } = req.body as {
      author?: string;
      location?: string;
      message?: string;
    };
    const cleanAuthor = String(author || '').trim().slice(0, 60);
    const cleanMessage = String(message || '').trim().slice(0, 400);
    const cleanLocation = String(location || '').trim().slice(0, 60);

    if (!cleanAuthor || !cleanMessage) {
      res.status(400).json({ ok: false, error: 'Nombre y comentario obligatorios' });
      return;
    }

    const item: ViewerCommentPayload = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: cleanAuthor,
      location: cleanLocation || undefined,
      message: cleanMessage,
      createdAt: Date.now(),
    };
    room.commentsStore.unshift(item);
    if (room.commentsStore.length > 100) room.commentsStore.length = 100;

    broadcastAll(room, 'comments', {
      programId: room.programId,
      comments: room.commentsStore,
    });
    res.json({ ok: true, comment: item, comments: room.commentsStore });
  });

  app.delete('/api/broadcast/comments/:id', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId);
    const targetId = req.params.id;
    const idx = room.commentsStore.findIndex((c) => c.id === targetId);
    if (idx !== -1) {
      room.commentsStore.splice(idx, 1);
      broadcastAll(room, 'comments', {
        programId: room.programId,
        comments: room.commentsStore,
      });
    }
    res.json({ ok: true, comments: room.commentsStore });
  });

  // SSE stream for live viewers and broadcaster WebRTC signaling scoped by programId
  app.get('/api/broadcast/events', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId);
    const roleParam = req.query.role === 'broadcaster' ? 'broadcaster' : 'viewer';
    const clientId =
      typeof req.query.clientId === 'string' && req.query.clientId
        ? req.query.clientId
        : `${roleParam}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.socket?.setNoDelay?.(true);
    res.flushHeaders?.();

    room.clients.set(clientId, { id: clientId, role: roleParam, res });

    sendSse(res, 'init', {
      programId: room.programId,
      clientId,
      state: room.currentState,
      frame: room.latestFrameDataUrl,
      viewerCount: getViewerCount(room),
      audienceCount: getAudienceDisplayCount(room),
      audienceMode: room.audienceMode,
      inflatedCount: room.inflatedCount,
      broadcasterOnline: getBroadcasterOnline(room),
      comments: room.commentsStore,
    });

    broadcastPresence(room);

    if (roleParam === 'viewer' && room.currentState.isLive) {
      broadcastAll(room, 'viewer-joined', { viewerId: clientId }, 'broadcaster');
    }

    if (roleParam === 'broadcaster' && room.currentState.isLive) {
      notifyBroadcasterOfWaitingViewers(room);
    }

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        // ignore
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      room.clients.delete(clientId);
      if (roleParam === 'viewer') {
        broadcastAll(room, 'viewer-left', { viewerId: clientId }, 'broadcaster');
      }
      broadcastPresence(room);
    });
  });

  // Broadcaster updates live program state scoped by programId
  app.post('/api/broadcast/state', (req: Request, res: Response) => {
    const body = req.body as Partial<LiveBroadcastState>;
    const room = getOrCreateRoom(req.query.programId || body.programId);
    const wasLive = room.currentState.isLive;
    const nextIsLive =
      typeof body.isLive === 'boolean' ? body.isLive : room.currentState.isLive;

    room.currentState = {
      ...room.currentState,
      ...body,
      programId: room.programId,
      sponsors: Array.isArray(body.sponsors)
        ? body.sponsors
        : room.currentState.sponsors,
      isLive: nextIsLive,
      startedAt:
        nextIsLive && !wasLive
          ? Date.now()
          : !nextIsLive
          ? null
          : room.currentState.startedAt,
      updatedAt: Date.now(),
    };

    if (!nextIsLive) {
      room.latestFrameDataUrl = null;
      room.latestFrameSeq = 0;
    }

    broadcastAll(room, 'state', room.currentState);
    broadcastPresence(room);

    if (nextIsLive && !wasLive) {
      notifyBroadcasterOfWaitingViewers(room);
    }

    res.json({ ok: true, programId: room.programId, state: room.currentState });
  });

  // Broadcaster pushes live composited video frame (binary WebP/JPEG or JSON data URL)
  app.post(
    '/api/broadcast/frame',
    express.raw({ type: 'image/*', limit: '2mb' }),
    (req: Request, res: Response) => {
      const room = getOrCreateRoom(req.query.programId);
      if (!room.currentState.isLive) {
        res.json({ ok: true });
        return;
      }
      const seqParam = Number(req.query.seq);
      if (Number.isFinite(seqParam) && seqParam > 0) {
        if (seqParam <= room.latestFrameSeq) {
          res.json({ ok: true, skipped: true });
          return;
        }
        room.latestFrameSeq = seqParam;
      }
      let frame: string | undefined;
      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        const mime = req.headers['content-type']?.split(';')[0] || 'image/webp';
        frame = `data:${mime};base64,${req.body.toString('base64')}`;
      } else if (req.body && typeof (req.body as { frame?: string }).frame === 'string') {
        const candidate = (req.body as { frame: string }).frame;
        if (candidate.startsWith('data:image/')) {
          frame = candidate;
        }
      }
      if (frame) {
        room.latestFrameDataUrl = frame;
        room.latestFrameUpdatedAt = Date.now();
        if (getViewerCount(room) > 0) {
          broadcastAll(
            room,
            'frame',
            { frame, ts: room.latestFrameUpdatedAt },
            'viewer'
          );
        }
      }
      res.json({ ok: true });
    }
  );

  // Broadcaster pushes live mixed audio chunks (PCM16 base64)
  app.post('/api/broadcast/audio', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId || req.body?.programId);
    const { pcm16, sampleRate } = req.body as {
      pcm16?: string;
      sampleRate?: number;
    };
    if (
      room.currentState.isLive &&
      typeof pcm16 === 'string' &&
      pcm16.length > 0 &&
      typeof sampleRate === 'number'
    ) {
      broadcastAll(
        room,
        'audio',
        { pcm16, sampleRate, ts: Date.now() },
        'viewer'
      );
    }
    res.json({ ok: true });
  });

  // WebRTC Signaling Relay scoped by programId
  app.post('/api/rtc/signal', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.query.programId || req.body?.programId);
    const { targetId, fromId, type, payload } = req.body as {
      targetId?: string;
      fromId?: string;
      type?: string;
      payload?: unknown;
    };
    if (targetId && room.clients.has(targetId)) {
      const target = room.clients.get(targetId)!;
      sendSse(target.res, 'rtc-signal', { fromId, type, payload });
      res.json({ ok: true });
      return;
    }
    if (targetId === 'broadcaster') {
      broadcastAll(
        room,
        'rtc-signal',
        { fromId, type, payload },
        'broadcaster'
      );
      res.json({ ok: true });
      return;
    }
    res.status(404).json({ ok: false, error: 'Destinatario no conectado' });
  });

  // Auth & RBAC Middleware (Authorization: Bearer token held in memory)
  interface AuthenticatedRequest extends Request {
    staffUser?: StaffUserPublic;
  }

  function extractStaffUser(req: Request): StaffUserPublic | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return verifySessionToken(token);
  }

  function requireStaff(
    permission?: (role: (typeof PRODUCER_ROLES)[ProducerRole]) => boolean
  ) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const user = extractStaffUser(req);
      if (!user) {
        res.status(401).json({
          ok: false,
          error: 'Sesión requerida. Iniciá sesión con tu usuario y contraseña.',
        });
        return;
      }
      if (permission && !permission(PRODUCER_ROLES[user.role])) {
        res.status(403).json({
          ok: false,
          error: 'Tu rol actual no tiene permisos para esta acción.',
        });
        return;
      }
      req.staffUser = user;
      next();
    };
  }

  // Auth Endpoints
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const user = extractStaffUser(req);
    res.json({
      ok: true,
      needsAdminSetup: needsInitialAdminSetup(),
      authenticated: Boolean(user),
      user,
    });
  });

  app.post('/api/auth/claim-admin', (req: Request, res: Response) => {
    const body = req.body as {
      username?: string;
      password?: string;
      fullName?: string;
    };
    const result = claimInitialAdmin({
      username: String(body.username || ''),
      password: String(body.password || ''),
      fullName: body.fullName,
    });
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    const token = signSessionToken(result.user);
    res.json({ ok: true, token, user: result.user });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (needsInitialAdminSetup()) {
      res.status(409).json({
        ok: false,
        needsAdminSetup: true,
        error:
          'Primero activá la cuenta de Administrador Total en el formulario inicial.',
      });
      return;
    }
    const body = req.body as { username?: string; password?: string };
    const user = authenticateStaffUser(
      String(body.username || ''),
      String(body.password || '')
    );
    if (!user) {
      res.status(401).json({
        ok: false,
        error: 'Usuario o contraseña incorrectos.',
      });
      return;
    }
    const token = signSessionToken(user);
    res.json({ ok: true, token, user });
  });

  // Admin-Only Staff & Role Management
  app.get(
    '/api/producer/users',
    requireStaff((r) => r.canManageUsers),
    (_req: Request, res: Response) => {
      res.json({ ok: true, users: listStaffUsers() });
    }
  );

  app.post(
    '/api/producer/users',
    requireStaff((r) => r.canManageUsers),
    (req: Request, res: Response) => {
      const body = req.body as {
        username?: string;
        password?: string;
        fullName?: string;
        role?: ProducerRole;
      };
      const result = createStaffUser({
        username: String(body.username || ''),
        password: String(body.password || ''),
        fullName: String(body.fullName || ''),
        role: body.role as ProducerRole,
      });
      if (!result.ok) {
        res.status(result.status).json({ ok: false, error: result.error });
        return;
      }
      res.json({ ok: true, user: result.user, users: listStaffUsers() });
    }
  );

  app.patch(
    '/api/producer/users/:id',
    requireStaff((r) => r.canManageUsers),
    (req: Request, res: Response) => {
      const body = req.body as {
        fullName?: string;
        role?: ProducerRole;
        active?: boolean;
        password?: string;
      };
      const result = updateStaffUser(req.params.id, body);
      if (!result.ok) {
        res.status(result.status).json({ ok: false, error: result.error });
        return;
      }
      res.json({ ok: true, user: result.user, users: listStaffUsers() });
    }
  );

  app.delete(
    '/api/producer/users/:id',
    requireStaff((r) => r.canManageUsers),
    (req: Request, res: Response) => {
      const result = deleteStaffUser(req.params.id);
      if (!result.ok) {
        res.status(result.status).json({ ok: false, error: result.error });
        return;
      }
      res.json({ ok: true, users: listStaffUsers() });
    }
  );

  // Full Editable Site Content
  app.get('/api/producer/site', (_req: Request, res: Response) => {
    res.json({ ok: true, siteContent: getSiteContent() });
  });

  app.put(
    '/api/producer/site',
    requireStaff((r) => r.canEditSite),
    (req: Request, res: Response) => {
      const updated = updateSiteContent(req.body || {});
      res.json({ ok: true, siteContent: updated });
    }
  );

  app.post(
    '/api/producer/site/reset',
    requireStaff((r) => r.canManageUsers),
    (_req: Request, res: Response) => {
      const reset = resetSiteContentToDefaults();
      res.json({ ok: true, siteContent: reset });
    }
  );

  // Dynamic Programs Catalog (Multi-Show Support)
  app.get('/api/producer/programs', (_req: Request, res: Response) => {
    res.json({ ok: true, programs: listPrograms() });
  });

  app.post(
    '/api/producer/programs',
    requireStaff((r) => r.canCreatePrograms),
    (req: Request, res: Response) => {
      const result = createProgram(req.body || {});
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }
      getOrCreateRoom(result.program.id);
      res.json({ ok: true, program: result.program, programs: listPrograms() });
    }
  );

  app.put(
    '/api/producer/programs/:id',
    requireStaff((r) => r.canCreatePrograms || r.canOperateStudio || r.canEditSite),
    (req: Request, res: Response) => {
      const result = updateProgram(req.params.id, req.body || {});
      if (!result.ok) {
        res.status(404).json({ ok: false, error: result.error });
        return;
      }
      const existingRoom = broadcastRooms.get(req.params.id);
      if (existingRoom) {
        existingRoom.currentState.showName = result.program.title;
        existingRoom.currentState.overlays.channelName = result.program.title;
        if (result.program.schedule) {
          existingRoom.currentState.overlays.lowerThirdSubtitle = `${result.program.schedule}${
            result.program.hostTeam ? ` · ${result.program.hostTeam}` : ''
          }`;
        }
        if (result.program.logoUrl) {
          existingRoom.currentState.overlays.logoUrl = result.program.logoUrl;
        }
        broadcastAll(existingRoom, 'state', existingRoom.currentState);
      }
      res.json({ ok: true, program: result.program, programs: listPrograms() });
    }
  );

  app.delete(
    '/api/producer/programs/:id',
    requireStaff((r) => r.canCreatePrograms),
    (req: Request, res: Response) => {
      const deleted = deleteProgram(req.params.id);
      if (!deleted) {
        res.status(404).json({ ok: false, error: 'Programa no encontrado.' });
        return;
      }
      broadcastRooms.delete(req.params.id);
      res.json({ ok: true, programs: listPrograms() });
    }
  );

  // Past Episodes Video Archive Endpoints (Per Program)
  app.get('/api/producer/programs/:id/videos', (req: Request, res: Response) => {
    const programId = normalizeProgramId(req.params.id);
    res.json({
      ok: true,
      programId,
      videos: listProgramVideos(programId),
    });
  });

  app.post(
    '/api/producer/programs/:id/videos/upload',
    requireStaff((r) => r.canCreatePrograms || r.canOperateStudio || r.canEditSite),
    (req: AuthenticatedRequest, res: Response) => {
      const programId = normalizeProgramId(req.params.id);
      const programExists = listPrograms().some((p) => p.id === programId);
      if (!programExists) {
        res.status(404).json({ ok: false, error: 'Programa no encontrado.' });
        return;
      }

      const contentType = String(req.headers['content-type'] || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const origName = decodeSafeHeader(
        req.headers['x-video-filename'],
        'episodio.mp4',
        120
      );
      const origExt = path.extname(origName).replace('.', '').toLowerCase();

      let ext = VIDEO_EXT_BY_MIME[contentType] || '';
      if (!ext && (contentType === 'application/octet-stream' || !contentType)) {
        if (MIME_BY_VIDEO_EXT[origExt]) {
          ext = origExt;
        }
      }
      if (!ext || !MIME_BY_VIDEO_EXT[ext]) {
        res.status(400).json({
          ok: false,
          error:
            'Formato de video no permitido. Subí archivos MP4, WebM, MOV, MKV u OGV.',
        });
        return;
      }

      const contentLength = Number(req.headers['content-length'] || 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_UPLOAD_BYTES) {
        res.status(413).json({
          ok: false,
          error: 'El video supera el máximo permitido de 250 MB.',
        });
        return;
      }

      try {
        fs.mkdirSync(VIDEOS_DIR, { recursive: true });
      } catch {
        res.status(500).json({
          ok: false,
          error: 'No se pudo preparar el directorio de videos en el servidor.',
        });
        return;
      }
      const safeFileName = `vid-${Date.now()}-${crypto
        .randomBytes(6)
        .toString('hex')}.${ext}`;
      const targetPath = resolveSafeVideoPath(safeFileName);
      if (!targetPath) {
        res.status(500).json({ ok: false, error: 'Ruta de guardado inválida.' });
        return;
      }

      let writeStream: fs.WriteStream;
      try {
        writeStream = fs.createWriteStream(targetPath);
      } catch {
        res.status(500).json({
          ok: false,
          error: 'No se pudo escribir el archivo de video en el servidor.',
        });
        return;
      }
      let receivedBytes = 0;
      let aborted = false;

      const cleanupPartial = () => {
        try {
          writeStream.destroy();
        } catch {
          // ignore
        }
        if (fs.existsSync(targetPath)) {
          try {
            fs.unlinkSync(targetPath);
          } catch {
            // ignore
          }
        }
      };

      req.on('data', (chunk: Buffer) => {
        if (aborted) return;
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_VIDEO_UPLOAD_BYTES) {
          aborted = true;
          cleanupPartial();
          if (!res.headersSent) {
            res.status(413).json({
              ok: false,
              error: 'El video supera el máximo permitido de 250 MB.',
            });
          }
          req.destroy();
          return;
        }
        if (!writeStream.write(chunk)) {
          req.pause();
          writeStream.once('drain', () => {
            if (!aborted) req.resume();
          });
        }
      });

      req.on('end', () => {
        if (aborted) return;
        if (receivedBytes === 0) {
          cleanupPartial();
          res.status(400).json({ ok: false, error: 'El archivo de video está vacío.' });
          return;
        }
        writeStream.end(() => {
          const title = decodeSafeHeader(
            req.headers['x-video-title'],
            origName.replace(/\.[^.]+$/, '') || 'Emisión anterior',
            120
          );
          const episodeLabel = decodeSafeHeader(
            req.headers['x-video-episode'],
            new Date().toLocaleDateString('es-AR'),
            60
          );
          const description = decodeSafeHeader(
            req.headers['x-video-description'],
            '',
            500
          );
          const durationLabel = decodeSafeHeader(
            req.headers['x-video-duration'],
            'HD',
            30
          );

          const saved = addProgramVideo({
            programId,
            title,
            episodeLabel,
            description,
            durationLabel,
            videoUrl: `/api/videos/${safeFileName}`,
            isUploadedFile: true,
            fileName: safeFileName,
            mimeType: MIME_BY_VIDEO_EXT[ext],
            fileSizeBytes: receivedBytes,
            uploadedBy: req.staffUser?.username || 'staff',
          });

          if (!saved.ok) {
            cleanupPartial();
            res.status(400).json({ ok: false, error: saved.error });
            return;
          }

          res.json({
            ok: true,
            video: saved.video,
            videos: listProgramVideos(programId),
          });
        });
      });

      req.on('error', () => {
        if (!aborted) {
          aborted = true;
          cleanupPartial();
          if (!res.headersSent) {
            res.status(500).json({ ok: false, error: 'Error al recibir el video.' });
          }
        }
      });
    }
  );

  app.post(
    '/api/producer/programs/:id/videos',
    requireStaff((r) => r.canCreatePrograms || r.canOperateStudio || r.canEditSite),
    (req: AuthenticatedRequest, res: Response) => {
      const programId = normalizeProgramId(req.params.id);
      const programExists = listPrograms().some((p) => p.id === programId);
      if (!programExists) {
        res.status(404).json({ ok: false, error: 'Programa no encontrado.' });
        return;
      }

      const body = req.body as {
        title?: string;
        episodeLabel?: string;
        description?: string;
        durationLabel?: string;
        videoUrl?: string;
      };

      const saved = addProgramVideo({
        programId,
        title: String(body.title || ''),
        episodeLabel: body.episodeLabel,
        description: body.description,
        durationLabel: body.durationLabel,
        videoUrl: String(body.videoUrl || ''),
        isUploadedFile: false,
        uploadedBy: req.staffUser?.username || 'staff',
      });

      if (!saved.ok) {
        res.status(400).json({ ok: false, error: saved.error });
        return;
      }

      res.json({
        ok: true,
        video: saved.video,
        videos: listProgramVideos(programId),
      });
    }
  );

  app.patch(
    '/api/producer/programs/:id/videos/:videoId',
    requireStaff((r) => r.canCreatePrograms || r.canOperateStudio || r.canEditSite),
    (req: Request, res: Response) => {
      const programId = normalizeProgramId(req.params.id);
      const result = updateProgramVideo(req.params.videoId, req.body || {});
      if (!result.ok) {
        res.status(404).json({ ok: false, error: result.error });
        return;
      }
      res.json({
        ok: true,
        video: result.video,
        videos: listProgramVideos(programId),
      });
    }
  );

  app.delete(
    '/api/producer/programs/:id/videos/:videoId',
    requireStaff((r) => r.canCreatePrograms || r.canOperateStudio || r.canEditSite),
    (req: Request, res: Response) => {
      const programId = normalizeProgramId(req.params.id);
      const ok = deleteProgramVideo(req.params.videoId);
      if (!ok) {
        res.status(404).json({ ok: false, error: 'Video no encontrado.' });
        return;
      }
      res.json({ ok: true, videos: listProgramVideos(programId) });
    }
  );

  // HTTP Range Video Streaming for Uploaded Archive Episodes
  app.get('/api/videos/:filename', (req: Request, res: Response) => {
    const safePath = resolveSafeVideoPath(req.params.filename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ ok: false, error: 'Video no encontrado.' });
      return;
    }

    const stat = fs.statSync(safePath);
    const totalSize = stat.size;
    const ext = path.extname(safePath).replace('.', '').toLowerCase();
    const contentType = MIME_BY_VIDEO_EXT[ext] || 'video/mp4';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end >= totalSize ||
        start > end
      ) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(safePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    fs.createReadStream(safePath).pipe(res);
  });

  // Program Creation Requests ("Pedir para crear programas")
  app.post('/api/producer/program-requests', (req: Request, res: Response) => {
    const result = createProgramRequest({
      requesterName: String(req.body?.requesterName || ''),
      organization: req.body?.organization,
      contact: String(req.body?.contact || ''),
      proposedTitle: String(req.body?.proposedTitle || ''),
      format: req.body?.format,
      targetSchedule: req.body?.targetSchedule,
      teamInfo: req.body?.teamInfo,
      equipmentNeeds: req.body?.equipmentNeeds,
      synopsis: String(req.body?.synopsis || ''),
    });
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, request: result.request });
  });

  app.get(
    '/api/producer/program-requests',
    requireStaff(),
    (_req: Request, res: Response) => {
      res.json({ ok: true, requests: listProgramRequests() });
    }
  );

  app.patch(
    '/api/producer/program-requests/:id',
    requireStaff((r) => r.canReviewRequests),
    (req: Request, res: Response) => {
      const status = req.body?.status as ProgramRequestStatus;
      if (
        status !== 'pendiente' &&
        status !== 'en_revision' &&
        status !== 'aprobado' &&
        status !== 'rechazado'
      ) {
        res.status(400).json({ ok: false, error: 'Estado inválido.' });
        return;
      }
      const result = updateProgramRequestStatus(req.params.id, {
        status,
        reviewNote: req.body?.reviewNote,
        createProgramInCatalog: Boolean(req.body?.createProgramInCatalog),
      });
      if (!result.ok) {
        res.status(404).json({ ok: false, error: result.error });
        return;
      }
      if (result.createdProgram) {
        getOrCreateRoom(result.createdProgram.id);
      }
      res.json({
        ok: true,
        request: result.request,
        createdProgram: result.createdProgram,
        requests: listProgramRequests(),
        programs: listPrograms(),
      });
    }
  );

  // Production Company Commercial / General Inquiries
  app.get(
    '/api/producer/inquiries',
    requireStaff(),
    (_req: Request, res: Response) => {
      const items = listInquiries();
      res.json({ ok: true, count: items.length, inquiries: items });
    }
  );

  app.post('/api/producer/inquiries', (req: Request, res: Response) => {
    const result = addInquiry({
      name: String(req.body?.name || ''),
      organization: req.body?.organization,
      contact: String(req.body?.contact || ''),
      projectType: req.body?.projectType,
      message: String(req.body?.message || ''),
    });
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, inquiry: result.inquiry });
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ ok: false, error: 'Ruta API no encontrada.' });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
      ? path.resolve(__dirname, 'dist')
      : path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/{*splat}', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MesaControl TV server listening on http://0.0.0.0:${port}`);
  });
}

const isVercelRuntime = Boolean(
  process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const entryArg = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectServerRun =
  entryArg === __filename ||
  entryArg.endsWith(`${path.sep}server.ts`) ||
  entryArg.endsWith(`${path.sep}server.js`);

if (!isVercelRuntime && isDirectServerRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
