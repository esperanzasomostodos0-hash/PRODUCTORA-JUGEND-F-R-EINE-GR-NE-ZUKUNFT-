import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  addInquiry,
  authenticateStaffUser,
  claimInitialAdmin,
  createProgram,
  createProgramRequest,
  createStaffUser,
  deleteProgram,
  deleteStaffUser,
  getSiteContent,
  listInquiries,
  listProgramRequests,
  listPrograms,
  listStaffUsers,
  needsInitialAdminSetup,
  resetSiteContentToDefaults,
  signSessionToken,
  updateProgram,
  updateProgramRequestStatus,
  updateSiteContent,
  updateStaffUser,
  verifySessionToken,
} from './producerStore.ts';
import {
  PRODUCER_ROLES,
  ProducerRole,
  ProgramRequestStatus,
  StaffUserPublic,
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

const DEFAULT_SPONSORS: SponsorBannerPayload[] = [
  {
    id: 'sponsor-1',
    slotLabel: 'BANNER 1',
    name: 'Auspiciante 1',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Contactar para anunciar',
    isOccupied: false,
  },
  {
    id: 'sponsor-2',
    slotLabel: 'BANNER 2',
    name: 'Auspiciante 2',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Contactar para anunciar',
    isOccupied: false,
  },
  {
    id: 'sponsor-3',
    slotLabel: 'BANNER 3',
    name: 'Auspiciante 3',
    message: 'Espacio reservado para comercio o anunciante local.',
    badgeText: 'Espacio publicitario disponible',
    ctaText: 'Contactar para anunciar',
    isOccupied: false,
  },
];

const DEFAULT_STATE: LiveBroadcastState = {
  isLive: false,
  startedAt: null,
  showName: '#SinFiltro',
  accentHex: '#16A34A',
  activeScene: {
    id: 'sf-estudio',
    name: 'Estudio #SinFiltro',
    cameraLabel: 'CAM 1 · GENERAL',
    cameraType: 'studio',
    layoutMode: 'full',
    description: 'Cámara principal de estudio #SinFiltro.',
  },
  overlays: {
    showLowerThird: true,
    lowerThirdTitle: '#SinFiltro en Vivo',
    lowerThirdSubtitle:
      'Sábados de 17:00 a 19:00 · Radioactiva 88.5 Puerto Esperanza',
    showTicker: true,
    tickerText:
      'ESTÁS VIENDO #SinFiltro EN VIVO · Jóvenes de Huella Verde · Radioactiva 88.5 Puerto Esperanza',
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
    fadeToBlack: false,
  },
  sponsors: DEFAULT_SPONSORS,
  updatedAt: Date.now(),
};

let currentState: LiveBroadcastState = { ...DEFAULT_STATE };
let latestFrameDataUrl: string | null = null;
let latestFrameUpdatedAt = 0;
let latestFrameSeq = 0;

// Realistic Organic Audience Counter:
// Offline -> around 36 (fluctuates gently +/- 1 or 2 every 6-10s)
// Live -> starts just above 2567 and fluctuates naturally (+/- 1 to 3) with gentle drift, never climbing unrealistically fast
let simulatedAudience = 36;
let offlineTick = 0;
let liveTick = 0;

const OFFLINE_DELTAS = [1, -1, 0, 2, -1, -1, 1, 0, -2, 1];
const LIVE_DELTAS = [2, -1, 1, 0, -2, 3, -1, 1, -2, 2, 0, -1];

const commentsStore: ViewerCommentPayload[] = [
  {
    id: 'c-init-1',
    author: 'Lucía Benítez',
    location: 'Puerto Esperanza',
    message: '¡Excelente programa chicos de Huella Verde! Escuchando firme por Radioactiva 88.5.',
    createdAt: Date.now() - 240_000,
  },
  {
    id: 'c-init-2',
    author: 'Mateo Acosta',
    location: 'Barrio Centro',
    message: '¡Saludos a toda la mesa de #SinFiltro! Queremos participar en la trivia.',
    createdAt: Date.now() - 90_000,
  },
];

const clients = new Map<string, SseClient>();

function getViewerCount(): number {
  let count = 0;
  clients.forEach((c) => {
    if (c.role === 'viewer') count += 1;
  });
  return count;
}

function getBroadcasterOnline(): boolean {
  let found = false;
  clients.forEach((c) => {
    if (c.role === 'broadcaster') found = true;
  });
  return found;
}

function getAudienceDisplayCount(): number {
  const realViewers = getViewerCount();
  if (currentState.isLive) {
    return Math.max(2567, simulatedAudience + realViewers);
  }
  return Math.max(24, simulatedAudience);
}

function sendSse(res: Response, event: string, data: unknown) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // ignore closed socket write
  }
}

function broadcastAll(
  event: string,
  data: unknown,
  filterRole?: 'broadcaster' | 'viewer'
) {
  clients.forEach((client) => {
    if (!filterRole || client.role === filterRole) {
      sendSse(client.res, event, data);
    }
  });
}

function broadcastPresence() {
  const payload = {
    viewerCount: getViewerCount(),
    audienceCount: getAudienceDisplayCount(),
    broadcasterOnline: getBroadcasterOnline(),
  };
  broadcastAll('presence', payload);
}

function notifyBroadcasterOfWaitingViewers() {
  clients.forEach((c) => {
    if (c.role === 'viewer') {
      broadcastAll('viewer-joined', { viewerId: c.id }, 'broadcaster');
    }
  });
}

// Update synchronized audience count on an organic randomized cadence (6.5s - 10.5s)
function scheduleAudienceTick() {
  const delayMs = 6500 + Math.floor(Math.random() * 4000);
  setTimeout(() => {
    if (currentState.isLive) {
      let delta = LIVE_DELTAS[liveTick % LIVE_DELTAS.length];
      liveTick += 1;
      // Mean-reversion so it stays organic around 2570-2635 without racing upward
      if (simulatedAudience > 2625 && delta > 0) {
        delta = -1;
      }
      simulatedAudience = Math.max(2567, simulatedAudience + delta);
    } else {
      const delta = OFFLINE_DELTAS[offlineTick % OFFLINE_DELTAS.length];
      offlineTick += 1;
      const next = simulatedAudience + delta;
      simulatedAudience = Math.max(31, Math.min(42, next));
    }
    broadcastPresence();
    scheduleAudienceTick();
  }, delayMs);
}
scheduleAudienceTick();

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '8mb' }));

  // Current broadcast state & latest frame snapshot
  app.get('/api/broadcast/state', (_req: Request, res: Response) => {
    res.json({
      state: currentState,
      frame: latestFrameDataUrl,
      frameUpdatedAt: latestFrameUpdatedAt,
      viewerCount: getViewerCount(),
      audienceCount: getAudienceDisplayCount(),
      broadcasterOnline: getBroadcasterOnline(),
      comments: commentsStore,
    });
  });

  // Comments endpoints
  app.get('/api/broadcast/comments', (_req: Request, res: Response) => {
    res.json({ comments: commentsStore });
  });

  app.post('/api/broadcast/comments', (req: Request, res: Response) => {
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
    commentsStore.unshift(item);
    if (commentsStore.length > 100) commentsStore.length = 100;

    broadcastAll('comments', { comments: commentsStore });
    res.json({ ok: true, comment: item, comments: commentsStore });
  });

  app.delete('/api/broadcast/comments/:id', (req: Request, res: Response) => {
    const targetId = req.params.id;
    const idx = commentsStore.findIndex((c) => c.id === targetId);
    if (idx !== -1) {
      commentsStore.splice(idx, 1);
      broadcastAll('comments', { comments: commentsStore });
    }
    res.json({ ok: true, comments: commentsStore });
  });

  // SSE stream for live viewers and broadcaster WebRTC signaling
  app.get('/api/broadcast/events', (req: Request, res: Response) => {
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

    clients.set(clientId, { id: clientId, role: roleParam, res });

    sendSse(res, 'init', {
      clientId,
      state: currentState,
      frame: latestFrameDataUrl,
      viewerCount: getViewerCount(),
      audienceCount: getAudienceDisplayCount(),
      broadcasterOnline: getBroadcasterOnline(),
      comments: commentsStore,
    });

    broadcastPresence();

    if (roleParam === 'viewer' && currentState.isLive) {
      broadcastAll('viewer-joined', { viewerId: clientId }, 'broadcaster');
    }

    if (roleParam === 'broadcaster' && currentState.isLive) {
      notifyBroadcasterOfWaitingViewers();
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
      clients.delete(clientId);
      if (roleParam === 'viewer') {
        broadcastAll('viewer-left', { viewerId: clientId }, 'broadcaster');
      }
      broadcastPresence();
    });
  });

  // Broadcaster updates live program state
  app.post('/api/broadcast/state', (req: Request, res: Response) => {
    const body = req.body as Partial<LiveBroadcastState>;
    const wasLive = currentState.isLive;
    const nextIsLive =
      typeof body.isLive === 'boolean' ? body.isLive : currentState.isLive;

    if (nextIsLive && !wasLive) {
      simulatedAudience = 2569; // Natural start right above 2567
      liveTick = 0;
    } else if (!nextIsLive && wasLive) {
      simulatedAudience = 36;
      offlineTick = 0;
    }

    currentState = {
      ...currentState,
      ...body,
      sponsors: Array.isArray(body.sponsors)
        ? body.sponsors
        : currentState.sponsors,
      isLive: nextIsLive,
      startedAt:
        nextIsLive && !wasLive
          ? Date.now()
          : !nextIsLive
          ? null
          : currentState.startedAt,
      updatedAt: Date.now(),
    };

    if (!nextIsLive) {
      latestFrameDataUrl = null;
      latestFrameSeq = 0;
    }

    broadcastAll('state', currentState);
    broadcastPresence();

    if (nextIsLive && !wasLive) {
      notifyBroadcasterOfWaitingViewers();
    }

    res.json({ ok: true, state: currentState });
  });

  // Broadcaster pushes live composited video frame (binary WebP/JPEG or JSON data URL)
  app.post(
    '/api/broadcast/frame',
    express.raw({ type: 'image/*', limit: '2mb' }),
    (req: Request, res: Response) => {
      if (!currentState.isLive) {
        res.json({ ok: true });
        return;
      }
      const seqParam = Number(req.query.seq);
      if (Number.isFinite(seqParam) && seqParam > 0) {
        if (seqParam <= latestFrameSeq) {
          res.json({ ok: true, skipped: true });
          return;
        }
        latestFrameSeq = seqParam;
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
        latestFrameDataUrl = frame;
        latestFrameUpdatedAt = Date.now();
        if (getViewerCount() > 0) {
          broadcastAll('frame', { frame, ts: latestFrameUpdatedAt }, 'viewer');
        }
      }
      res.json({ ok: true });
    }
  );

  // Broadcaster pushes live mixed audio chunks (PCM16 base64)
  app.post('/api/broadcast/audio', (req: Request, res: Response) => {
    const { pcm16, sampleRate } = req.body as {
      pcm16?: string;
      sampleRate?: number;
    };
    if (
      currentState.isLive &&
      typeof pcm16 === 'string' &&
      pcm16.length > 0 &&
      typeof sampleRate === 'number'
    ) {
      broadcastAll('audio', { pcm16, sampleRate, ts: Date.now() }, 'viewer');
    }
    res.json({ ok: true });
  });

  // WebRTC Signaling Relay
  app.post('/api/rtc/signal', (req: Request, res: Response) => {
    const { targetId, fromId, type, payload } = req.body as {
      targetId?: string;
      fromId?: string;
      type?: string;
      payload?: unknown;
    };
    if (targetId && clients.has(targetId)) {
      const target = clients.get(targetId)!;
      sendSse(target.res, 'rtc-signal', { fromId, type, payload });
      res.json({ ok: true });
      return;
    }
    if (targetId === 'broadcaster') {
      broadcastAll('rtc-signal', { fromId, type, payload }, 'broadcaster');
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
      res.json({ ok: true, program: result.program, programs: listPrograms() });
    }
  );

  app.put(
    '/api/producer/programs/:id',
    requireStaff((r) => r.canCreatePrograms),
    (req: Request, res: Response) => {
      const result = updateProgram(req.params.id, req.body || {});
      if (!result.ok) {
        res.status(404).json({ ok: false, error: result.error });
        return;
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
      res.json({ ok: true, programs: listPrograms() });
    }
  );

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

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
