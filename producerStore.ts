import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PRODUCER_ROLES,
  type ProducerInquiry,
  type ProducerProgram,
  type ProducerRole,
  type ProgramArchiveVideo,
  type ProgramCreationRequest,
  type ProgramRequestStatus,
  type SiteContentConfig,
  type StaffUserPublic,
} from './src/types/producer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_DATA_DIR = fs.existsSync(path.resolve(__dirname, 'data'))
  ? path.resolve(__dirname, 'data')
  : path.resolve(process.cwd(), 'data');
const SEED_DB_FILE = path.resolve(BUNDLE_DATA_DIR, 'producer-db.json');

const IS_SERVERLESS_RUNTIME = Boolean(
  process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME
);

function resolveWritableDataDir(): string {
  const configured = process.env.PRODUCER_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  if (!IS_SERVERLESS_RUNTIME) {
    try {
      fs.mkdirSync(BUNDLE_DATA_DIR, { recursive: true });
      fs.accessSync(BUNDLE_DATA_DIR, fs.constants.W_OK);
      return BUNDLE_DATA_DIR;
    } catch {
      // Fall back to OS temp directory if bundle directory is read-only
    }
  }
  return path.join(os.tmpdir(), 'jugend-producer-data');
}

const DATA_DIR = resolveWritableDataDir();
export const VIDEOS_DIR = path.resolve(DATA_DIR, 'videos');
const DB_FILE = path.resolve(DATA_DIR, 'producer-db.json');

export function isServerlessEphemeralStorage(): boolean {
  return IS_SERVERLESS_RUNTIME && !process.env.PRODUCER_DATA_DIR?.trim();
}

interface StoredUserRecord extends StaffUserPublic {
  passwordHash: string;
  salt: string;
}

interface ProducerDatabase {
  adminAccount: StoredUserRecord | null;
  users: StoredUserRecord[];
  siteContent: SiteContentConfig;
  programs: ProducerProgram[];
  programRequests: ProgramCreationRequest[];
  inquiries: ProducerInquiry[];
  videos: ProgramArchiveVideo[];
}

export const DEFAULT_SITE_CONTENT: SiteContentConfig = {
  brandName: 'JUGEND FÜR EINE GRÜNE ZUKUNFT',
  ownerName: 'ALMADA EDUARDO THOMAS',
  foundingDateText: '20 de noviembre de 2026',
  locationText: 'Puerto Esperanza, Misiones',
  mottoText: 'Licht, Kamera, Action!',
  logoUrl: '/assets/aistudio/jz-logo-transparent.png',
  heroImageUrl: '/src/assets/images/hero_production_set_1795376282591.jpg',
  heroHeadline:
    'Productora audiovisual de programas con identidad propia y dirección en vivo',
  heroDescription:
    'JUGEND FÜR EINE GRÜNE ZUKUNFT nace el 20 de noviembre de 2026, creada por ALMADA EDUARDO THOMAS, para concebir, dirigir y emitir formatos propios de televisión digital, radio visual y documentales con estética cinematográfica y operación en directo en alta definición.',
  heroPrimaryCta: 'Explorar Programas',
  heroSecondaryCta: 'Ver Emisiones en Vivo',
  emblemTagline: 'Juventud por un Futuro Verde',
  emblemCategory: 'CASA PRODUCTORA',
  dossierMetrics: [
    { label: 'Dueño y Creador', value: 'ALMADA EDUARDO THOMAS' },
    { label: 'Fecha de nacimiento', value: '20/11/2026' },
    { label: 'Ingeniería de emisión', value: '1280×720 HD · 30 FPS' },
    { label: 'Frecuencia aliada', value: 'Radioactiva 88.5 FM', accent: true },
  ],
  manifestoEyebrow: '01. MANIFIESTO FUNDACIONAL · 20 DE NOVIEMBRE DE 2026',
  manifestoTitle:
    'Una productora creada para que los programas jóvenes tengan altura televisiva',
  manifestoBody:
    'El 20 de noviembre de 2026, bajo la dirección y creación de ALMADA EDUARDO THOMAS, formalizamos una casa productora digital y multiplataforma: reunir dirección audiovisual, mesa de control en vivo y una agenda comprometida con el ambiente y la comunidad sin depender de infraestructura física fija.',
  manifestoImageUrl: '/src/assets/images/service_cinema_rig_1795376283166.jpg',
  manifestoPillars: [
    {
      title: '01. Estética y rigor',
      description:
        'Cada emisión se piensa como una pieza de pantalla grande: encuadres cuidados, audio limpio, iluminación cuidada y gráfica televisiva profesional.',
    },
    {
      title: '02. Tecnología propia',
      description:
        'No dependemos de terceros para salir al aire: desarrollamos nuestra consola digital MesaControl TV integrada con OBS, WebRTC HD y participación interactiva.',
    },
    {
      title: '03. Futuro verde con voz',
      description:
        'Jugend für eine grüne Zukunft significa Juventud por un Futuro Verde: producimos contenidos que abren debate, dan lugar al talento local y multiplican causas reales.',
    },
  ],
  programsEyebrow: '02. CARTELERA Y FORMATOS ORIGINALES',
  programsTitle: 'Programas en el aire y nuevos ciclos de la productora',
  programsSubtitle:
    'Nuestra casa productora produce ciclos propios de televisión digital, radio visual y documentales, y recibe propuestas para crear nuevos programas originales.',
  servicesEyebrow: '03. CAPACIDADES DE PRODUCCIÓN E INGENIERÍA PROPIA',
  servicesTitle: 'Del guion al aire en un ecosistema integrado',
  controlRoomImageUrl: '/src/assets/images/service_control_room_1795376283734.jpg',
  controlRoomEyebrow: 'CONSOLA INTEGRADA MESACONTROL TV',
  controlRoomTitle: 'Operación en vivo',
  controlRoomBody:
    'Nuestra productora cuenta con consola digital propia para operar cámaras, micrófonos en tiempo real, escaletas automáticas, cortinas sonoras de TV y placas gráficas sin necesidad de contar con un estudio físico propio.',
  capabilities: [
    {
      index: '01',
      title: 'Creación y Dirección de Programas',
      description:
        'Diseñamos la estructura editorial, escaleta minuto a minuto y dirección artística de programas semanales de TV digital, radio visual y streaming.',
      deliverable: 'Biblia de formato, escaleta y operación completa',
    },
    {
      index: '02',
      title: 'Realización Multicámara y Sincronización Digital',
      description:
        'Operamos con consola propia MesaControl TV sincronizada con OBS: conmutación automática, escenas PIP, deck táctil e integración directa de cámaras y audio.',
      deliverable: 'Señal 1280×720 HD a 30 FPS con latencia mínima',
    },
    {
      index: '03',
      title: 'Gráfica Televisiva y Comercial en Tiempo Real',
      description:
        'Zócalos dinámicos, titulares de último momento, placas de bienvenida para invitados, sorteos interactivos en vivo y banners de auspiciantes listos para pautar.',
      deliverable: 'Paquete gráfico dinámico y gestión de pauta comercial',
    },
    {
      index: '04',
      title: 'Cobertura de Eventos y Cápsulas Documentales',
      description:
        'Registro audiovisual en exteriores para instituciones, festivales, proyectos educativos y marcas que buscan comunicar con lenguaje cinematográfico real.',
      deliverable: 'Pieza master 16:9 + adaptaciones verticales',
    },
  ],
  alliancesEyebrow: '04. ALIANAS COMERCIALES Y COPRODUCCIONES',
  alliancesTitle: 'Espacio real para marcas, comercios e instituciones',
  alliancesSubtitle:
    'Cada programa emitido por JUGEND FÜR EINE GRÜNE ZUKUNFT conecta anunciantes locales directamente con la audiencia mediante banners en pantalla, menciones en vivo y acceso inmediato por WhatsApp.',
  partnershipModels: [
    {
      index: '01',
      name: 'Auspicio en Programación Viva',
      detail:
        'Presencia visual en los banners debajo de nuestras transmisiones oficiales, mención en vivo y acceso directo al WhatsApp comercial de tu comercio.',
      actionLabel: 'Solicitar pauta comercial',
      topic: 'Auspicio Comercial',
    },
    {
      index: '02',
      name: 'Producción de Programa Propio',
      detail:
        'Ponemos dirección digital, consola MesaControl TV, gráfica televisiva y plataforma de streaming multiplataforma para que tu organización o equipo lance su propio ciclo semanal.',
      actionLabel: 'Cotizar programa propio',
      topic: 'Producción de programa propio',
    },
    {
      index: '03',
      name: 'Coproducción Cultural y Ambiental',
      detail:
        'Alianzas con escuelas, colectivos juveniles e instituciones para documentar iniciativas ambientales, festivales y campañas educativas.',
      actionLabel: 'Proponer alianza',
      topic: 'Coproducción cultural o ambiental',
    },
  ],
  contactEyebrow: '05. MESA DE PRODUCCIÓN Y CONTACTO',
  contactTitle: 'Pongamos tu próximo programa en marcha',
  contactBody:
    'Escribinos para pautar en nuestros ciclos vigentes, producir un formato audiovisual nuevo o coordinar una reunión de producción con nuestro equipo.',
  whatsappDisplay: '+54 9 3757 30-0369',
  whatsappNumber: '5493757300369',
  contactEmail: 'produccion@jugendgruenezukunft.com',
  footerSubline:
    'Licht, Kamera, Action! · Fundada el 20/11/2026 · Puerto Esperanza, Misiones · Dueño y Creador: ALMADA EDUARDO THOMAS',
};

export const DEFAULT_PROGRAMS: ProducerProgram[] = [
  {
    id: 'sin-filtro',
    title: '#SinFiltro',
    statusKey: 'airing',
    statusLabel: 'En emisión',
    format: 'TV en Vivo + Radio Visual',
    schedule: 'Sábados 17:00 a 19:00 · Radioactiva 88.5 FM',
    duration: '120 min · Semanal',
    summary:
      'Programa semanal de debate actual, agenda de Puerto Esperanza, invitados en vivo, música y trivias con premios en directo.',
    fullSynopsis:
      '#SinFiltro combina radio FM tradicional en Radioactiva 88.5 con realización televisiva multicámara en 1280×720 HD. Cada sábado reúne a jóvenes, referentes comunitarios y emprendedores locales con participación directa de la audiencia mediante comentarios en vivo, WhatsApp y sorteos instantáneos en pantalla.',
    technicalSpecs: [
      'Realización a 3 cámaras con conmutación en tiempo real',
      'Zócalos, titulares televisivos y placas de invitados en vivo',
      'Emisión simultánea en Radioactiva 88.5 y señal web HD',
      'Espacios publicitarios integrados con enlace directo comercial',
    ],
    imageUrl: '/src/assets/images/program_sinfiltro_desk_1795376283057.jpg',
    logoUrl: '/assets/aistudio/sin-filtro-logoo2_2e0a15d3.png',
    featured: true,
    hostTeam: 'Mesa de Conducción JZ · Dir. ALMADA EDUARDO THOMAS',
    channelOrSignal: 'Radioactiva 88.5 FM + Web HD',
    createdAt: 1795132800000,
  },
  {
    id: 'cronicas-selva',
    title: 'Crónicas de Selva y Juventud',
    statusKey: 'preproduction',
    statusLabel: 'En preproducción · 2027',
    format: 'Serie Documental Territorial',
    schedule: 'Primera Temporada · 6 episodios',
    duration: '28 min por episodio',
    summary:
      'Retratos cinematográficos sobre iniciativas ambientales, cultura joven y oficios sustentables en el norte misionero.',
    fullSynopsis:
      'Serie documental rodada con óptica cinematográfica y sonido directo en exteriores. Documenta proyectos liderados por jóvenes que transforman la relación con la selva paranaense, las escuelas técnicas y los espacios culturales de la región.',
    technicalSpecs: [
      'Rodaje en exteriores con cámara de cine digital 4K y audio directo',
      'Corrección de color cinematográfica y banda sonora original',
      'Estreno previsto para el primer semestre de 2027',
    ],
    imageUrl: '/src/assets/images/service_cinema_rig_1795376283166.jpg',
    hostTeam: 'Equipo Documental JZ',
    channelOrSignal: 'Streaming Oficial JZ',
    createdAt: 1795132801000,
  },
  {
    id: 'sesiones-verdes',
    title: 'Sesiones Verdes 88.5',
    statusKey: 'development',
    statusLabel: 'En desarrollo · 2027',
    format: 'Ciclo Musical y Entrevistas',
    schedule: 'Edición mensual · Locaciones y espacios culturales',
    duration: '45 min por entrega',
    summary:
      'Bandas, solistas y artistas emergentes interpretando sets acústicos en locaciones especiales con entrevista íntima.',
    fullSynopsis:
      'Un formato pensado para darle visibilidad audiovisual de primer nivel a músicos regionales. Grabado en vivo en locaciones culturales y emisiones especiales con múltiples pistas de audio y estética esmeralda.',
    technicalSpecs: [
      'Captura multipista de micrófonos e instrumentos',
      'Iluminación escénica portátil controlada por escenas',
      'Masterización estéreo para streaming y radio',
    ],
    imageUrl: '/src/assets/images/studio_podcast_desk_1795296509941.jpg',
    hostTeam: 'Producción Musical JZ',
    channelOrSignal: 'Radioactiva 88.5 FM + Web HD',
    createdAt: 1795132802000,
  },
  {
    id: 'mesa-abierta',
    title: 'Mesa Abierta: Agenda Comunitaria',
    statusKey: 'development',
    statusLabel: 'Especiales Mensuales',
    format: 'Foro Televisivo Participativo',
    schedule: 'Último jueves de cada mes · En vivo',
    duration: '90 min · Especial',
    summary:
      'Encuentros temáticos en vivo con estudiantes, docentes y referentes locales para conversar proyectos de ciudad y medioambiente.',
    fullSynopsis:
      'Formato ágil de conversación pública moderada en vivo. Integra gráficos de participación, placas informativas y seguimiento de propuestas presentadas por la comunidad.',
    technicalSpecs: [
      'Panel de hasta 4 micrófonos con auto-switch por voz',
      'Placa de trivias y consignas en tiempo real',
      'Archivo completo en video HD al finalizar cada emisión',
    ],
    imageUrl: '/src/assets/images/studio_talk_show_1795296510184.jpg',
    hostTeam: 'Mesa Editorial JZ',
    channelOrSignal: 'Streaming Web HD',
    createdAt: 1795132803000,
  },
];

function migrateLegacySiteContent(
  parsedSite?: Partial<SiteContentConfig>
): SiteContentConfig {
  const merged: SiteContentConfig = {
    ...DEFAULT_SITE_CONTENT,
    ...(parsedSite || {}),
  };

  if (!merged.ownerName || !merged.ownerName.trim()) {
    merged.ownerName = DEFAULT_SITE_CONTENT.ownerName;
  }

  if (
    merged.controlRoomTitle === 'Operación en vivo con OBS y WebRTC HD' ||
    merged.controlRoomTitle?.toLowerCase().includes('obs y webrtc')
  ) {
    merged.controlRoomTitle = 'Operación en vivo';
  }

  if (merged.controlRoomEyebrow === 'ESTUDIO INTEGRADO MESACONTROL TV') {
    merged.controlRoomEyebrow = DEFAULT_SITE_CONTENT.controlRoomEyebrow;
  }

  if (merged.controlRoomBody?.includes('cámaras USB/IP')) {
    merged.controlRoomBody = DEFAULT_SITE_CONTENT.controlRoomBody;
  }

  if (merged.manifestoBody?.includes('en el estudio')) {
    merged.manifestoBody = DEFAULT_SITE_CONTENT.manifestoBody;
  }

  if (merged.heroDescription?.includes('televisión, radio visual') && !merged.heroDescription.includes('ALMADA EDUARDO THOMAS')) {
    merged.heroDescription = DEFAULT_SITE_CONTENT.heroDescription;
  }

  if (merged.contactBody?.includes('reunión en estudio')) {
    merged.contactBody = DEFAULT_SITE_CONTENT.contactBody;
  }

  if (merged.footerSubline && !merged.footerSubline.includes('ALMADA EDUARDO THOMAS')) {
    merged.footerSubline = DEFAULT_SITE_CONTENT.footerSubline;
  }

  if (
    Array.isArray(merged.dossierMetrics) &&
    !merged.dossierMetrics.some((m) =>
      String(m.value || '').toUpperCase().includes('ALMADA EDUARDO THOMAS')
    )
  ) {
    merged.dossierMetrics = DEFAULT_SITE_CONTENT.dossierMetrics.map((m) => ({ ...m }));
  }

  if (Array.isArray(merged.partnershipModels)) {
    merged.partnershipModels = merged.partnershipModels.map((pm) =>
      pm.detail?.includes('Ponemos estudio')
        ? { ...pm, detail: DEFAULT_SITE_CONTENT.partnershipModels[1].detail }
        : pm
    );
  }

  return merged;
}

function migrateLegacyPrograms(list: ProducerProgram[]): ProducerProgram[] {
  return list.map((p) => {
    if (p.id === 'sin-filtro') {
      return {
        ...p,
        summary: p.summary.replace(/invitados en estudio/gi, 'invitados en vivo'),
        hostTeam:
          p.hostTeam && p.hostTeam.includes('ALMADA EDUARDO THOMAS')
            ? p.hostTeam
            : 'Mesa de Conducción JZ · Dir. ALMADA EDUARDO THOMAS',
      };
    }
    if (p.id === 'sesiones-verdes') {
      return {
        ...p,
        schedule: p.schedule.replace(/Grabado en Estudio A/gi, 'Locaciones y espacios culturales'),
        summary: p.summary.replace(/en nuestro estudio/gi, 'en locaciones especiales'),
        channelOrSignal: p.channelOrSignal?.replace(/Estudio A \+ /gi, '') || 'Radioactiva 88.5 FM + Web HD',
      };
    }
    return p;
  });
}

function parseDatabaseFile(filePath: string): ProducerDatabase | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ProducerDatabase>;
    return {
      adminAccount: parsed.adminAccount || null,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      siteContent: migrateLegacySiteContent(parsed.siteContent),
      programs:
        Array.isArray(parsed.programs) && parsed.programs.length > 0
          ? migrateLegacyPrograms(parsed.programs)
          : DEFAULT_PROGRAMS,
      programRequests: Array.isArray(parsed.programRequests)
        ? parsed.programRequests
        : [],
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    };
  } catch (err) {
    console.warn(`Error loading ${filePath}, checking fallback defaults:`, err);
    return null;
  }
}

function loadDatabase(): ProducerDatabase {
  const fromWritable = parseDatabaseFile(DB_FILE);
  if (fromWritable) return fromWritable;

  if (SEED_DB_FILE !== DB_FILE) {
    const fromSeed = parseDatabaseFile(SEED_DB_FILE);
    if (fromSeed) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(fromSeed, null, 2), 'utf8');
      } catch {
        // ignore ephemeral copy error
      }
      return fromSeed;
    }
  }

  return {
    adminAccount: null,
    users: [],
    siteContent: { ...DEFAULT_SITE_CONTENT },
    programs: [...DEFAULT_PROGRAMS],
    programRequests: [],
    inquiries: [],
    videos: [],
  };
}

let db: ProducerDatabase = loadDatabase();

function resolveSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret) return envSecret;

  if (IS_SERVERLESS_RUNTIME) {
    const seed = [
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
      process.env.VERCEL_GIT_COMMIT_SHA,
      process.env.ADMIN_USERNAME,
      db.adminAccount?.passwordHash,
      'jugend-gruene-zukunft-session-fallback',
    ]
      .filter(Boolean)
      .join(':');
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  const secretFile = path.join(DATA_DIR, '.session-secret');
  try {
    if (fs.existsSync(secretFile)) {
      const saved = fs.readFileSync(secretFile, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = resolveSessionSecret();

function saveDatabase() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed saving producer-db.json:', err);
  }
}

export function sanitizeSafeUrl(
  rawUrl: unknown,
  fallback = ''
): string {
  const value = String(rawUrl || '').trim();
  if (!value) return fallback;
  if (value.startsWith('/assets/') || value.startsWith('/src/assets/')) {
    return value;
  }
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value)) {
    return value.slice(0, 2_000_000);
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // invalid URL
  }
  return fallback;
}

function hashPassword(password: string, salt?: string): {
  hash: string;
  salt: string;
} {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(storedHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function toPublicUser(u: StoredUserRecord): StaffUserPublic {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  };
}

export function hasEnvAdminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD?.trim()
  );
}

export function needsInitialAdminSetup(): boolean {
  if (hasEnvAdminConfigured()) return false;
  return db.adminAccount === null;
}

export function claimInitialAdmin(params: {
  username: string;
  password: string;
  fullName?: string;
}): { ok: true; user: StaffUserPublic } | { ok: false; status: number; error: string } {
  if (!needsInitialAdminSetup()) {
    return {
      ok: false,
      status: 409,
      error: 'La cuenta de Administrador Total ya fue activada.',
    };
  }
  const username = params.username.trim().slice(0, 48);
  const password = params.password;
  const fullName =
    (params.fullName || 'Administrador Total').trim().slice(0, 80) ||
    'Administrador Total';

  if (username.length < 3 || password.length < 4) {
    return {
      ok: false,
      status: 400,
      error: 'Usuario (mín. 3 caracteres) y contraseña (mín. 4 caracteres) obligatorios.',
    };
  }

  const { hash, salt } = hashPassword(password);
  const record: StoredUserRecord = {
    id: 'admin-root',
    username,
    fullName,
    role: 'admin_total',
    active: true,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
  };
  db.adminAccount = record;
  saveDatabase();
  return { ok: true, user: toPublicUser(record) };
}

export function authenticateStaffUser(
  usernameInput: string,
  passwordInput: string
): StaffUserPublic | null {
  const username = usernameInput.trim();
  if (!username || !passwordInput) return null;

  // Configured env admin always takes precedence
  if (hasEnvAdminConfigured()) {
    const envUser = process.env.ADMIN_USERNAME!.trim();
    const envPass = process.env.ADMIN_PASSWORD!.trim();
    if (
      safeEqualStrings(username, envUser) &&
      safeEqualStrings(passwordInput, envPass)
    ) {
      return {
        id: 'admin-env',
        username: envUser,
        fullName: 'Administrador Total',
        role: 'admin_total',
        active: true,
        createdAt: 0,
      };
    }
  }

  // Claimed root admin
  if (
    db.adminAccount &&
    db.adminAccount.active &&
    safeEqualStrings(username, db.adminAccount.username) &&
    verifyPassword(passwordInput, db.adminAccount.passwordHash, db.adminAccount.salt)
  ) {
    return toPublicUser(db.adminAccount);
  }

  // Staff accounts created by Admin
  const found = db.users.find(
    (u) => u.active && safeEqualStrings(username.toLowerCase(), u.username.toLowerCase())
  );
  if (found && verifyPassword(passwordInput, found.passwordHash, found.salt)) {
    return toPublicUser(found);
  }

  return null;
}

interface TokenPayload {
  uid: string;
  username: string;
  role: ProducerRole;
  exp: number;
}

export function signSessionToken(user: StaffUserPublic): string {
  const payload: TokenPayload = {
    uid: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): StaffUserPublic | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (!safeEqualStrings(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;

    if (payload.uid === 'admin-env' && hasEnvAdminConfigured()) {
      return {
        id: 'admin-env',
        username: process.env.ADMIN_USERNAME!.trim(),
        fullName: 'Administrador Total',
        role: 'admin_total',
        active: true,
        createdAt: 0,
      };
    }

    if (db.adminAccount && payload.uid === db.adminAccount.id && db.adminAccount.active) {
      return toPublicUser(db.adminAccount);
    }

    const staff = db.users.find((u) => u.id === payload.uid && u.active);
    return staff ? toPublicUser(staff) : null;
  } catch {
    return null;
  }
}

export function listStaffUsers(): StaffUserPublic[] {
  const list: StaffUserPublic[] = [];
  if (hasEnvAdminConfigured()) {
    list.push({
      id: 'admin-env',
      username: process.env.ADMIN_USERNAME!.trim(),
      fullName: 'Administrador Total (Único)',
      role: 'admin_total',
      active: true,
      createdAt: 0,
    });
  } else if (db.adminAccount) {
    list.push(toPublicUser(db.adminAccount));
  }
  return [...list, ...db.users.map(toPublicUser)];
}

export function createStaffUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: ProducerRole;
}): { ok: true; user: StaffUserPublic } | { ok: false; status: number; error: string } {
  const username = input.username.trim().slice(0, 48);
  const fullName = input.fullName.trim().slice(0, 80);
  const password = input.password;
  const role = input.role;

  if (!username || username.length < 3) {
    return { ok: false, status: 400, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
  }
  if (!fullName) {
    return { ok: false, status: 400, error: 'Ingresá el nombre completo del integrante.' };
  }
  if (!password || password.length < 4) {
    return { ok: false, status: 400, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }
  if (!PRODUCER_ROLES[role] || role === 'admin_total') {
    return {
      ok: false,
      status: 400,
      error: 'Seleccioná un rol válido de la productora (el Administrador Total es único).',
    };
  }

  const lower = username.toLowerCase();
  const conflictEnv =
    hasEnvAdminConfigured() &&
    process.env.ADMIN_USERNAME!.trim().toLowerCase() === lower;
  const conflictAdmin =
    db.adminAccount && db.adminAccount.username.toLowerCase() === lower;
  const conflictUser = db.users.some((u) => u.username.toLowerCase() === lower);

  if (conflictEnv || conflictAdmin || conflictUser) {
    return { ok: false, status: 409, error: 'Ese nombre de usuario ya existe.' };
  }

  const { hash, salt } = hashPassword(password);
  const created: StoredUserRecord = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username,
    fullName,
    role,
    active: true,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
  };
  db.users.unshift(created);
  saveDatabase();
  return { ok: true, user: toPublicUser(created) };
}

export function updateStaffUser(
  id: string,
  patch: {
    fullName?: string;
    role?: ProducerRole;
    active?: boolean;
    password?: string;
  }
): { ok: true; user: StaffUserPublic } | { ok: false; status: number; error: string } {
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return { ok: false, status: 404, error: 'Usuario no encontrado o protegido.' };
  }
  if (typeof patch.fullName === 'string' && patch.fullName.trim()) {
    user.fullName = patch.fullName.trim().slice(0, 80);
  }
  if (patch.role && PRODUCER_ROLES[patch.role] && patch.role !== 'admin_total') {
    user.role = patch.role;
  }
  if (typeof patch.active === 'boolean') {
    user.active = patch.active;
  }
  if (typeof patch.password === 'string' && patch.password.length >= 4) {
    const { hash, salt } = hashPassword(patch.password);
    user.passwordHash = hash;
    user.salt = salt;
  }
  saveDatabase();
  return { ok: true, user: toPublicUser(user) };
}

export function deleteStaffUser(
  id: string
): { ok: true } | { ok: false; status: number; error: string } {
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return { ok: false, status: 404, error: 'Usuario no encontrado o protegido.' };
  }
  db.users.splice(idx, 1);
  saveDatabase();
  return { ok: true };
}

export function getSiteContent(): SiteContentConfig {
  return db.siteContent;
}

export function updateSiteContent(
  incoming: Partial<SiteContentConfig>
): SiteContentConfig {
  const curr = db.siteContent;
  const cleanStr = (v: unknown, fb: string, max = 500) =>
    typeof v === 'string' ? v.trim().slice(0, max) || fb : fb;

  const next: SiteContentConfig = {
    brandName: cleanStr(incoming.brandName, curr.brandName, 80),
    ownerName: cleanStr(incoming.ownerName, curr.ownerName || 'ALMADA EDUARDO THOMAS', 80),
    foundingDateText: cleanStr(incoming.foundingDateText, curr.foundingDateText, 80),
    locationText: cleanStr(incoming.locationText, curr.locationText, 80),
    mottoText: cleanStr(incoming.mottoText, curr.mottoText, 80),
    logoUrl: sanitizeSafeUrl(incoming.logoUrl, curr.logoUrl),
    heroImageUrl: sanitizeSafeUrl(incoming.heroImageUrl, curr.heroImageUrl),
    heroHeadline: cleanStr(incoming.heroHeadline, curr.heroHeadline, 180),
    heroDescription: cleanStr(incoming.heroDescription, curr.heroDescription, 600),
    heroPrimaryCta: cleanStr(incoming.heroPrimaryCta, curr.heroPrimaryCta, 60),
    heroSecondaryCta: cleanStr(incoming.heroSecondaryCta, curr.heroSecondaryCta, 60),
    emblemTagline: cleanStr(incoming.emblemTagline, curr.emblemTagline, 100),
    emblemCategory: cleanStr(incoming.emblemCategory, curr.emblemCategory, 60),
    dossierMetrics: Array.isArray(incoming.dossierMetrics)
      ? incoming.dossierMetrics.slice(0, 4).map((m, idx) => ({
          label: cleanStr(m?.label, curr.dossierMetrics[idx]?.label || 'Dato', 60),
          value: cleanStr(m?.value, curr.dossierMetrics[idx]?.value || '-', 80),
          accent: Boolean(m?.accent),
        }))
      : curr.dossierMetrics,
    manifestoEyebrow: cleanStr(incoming.manifestoEyebrow, curr.manifestoEyebrow, 100),
    manifestoTitle: cleanStr(incoming.manifestoTitle, curr.manifestoTitle, 180),
    manifestoBody: cleanStr(incoming.manifestoBody, curr.manifestoBody, 700),
    manifestoImageUrl: sanitizeSafeUrl(incoming.manifestoImageUrl, curr.manifestoImageUrl),
    manifestoPillars: Array.isArray(incoming.manifestoPillars)
      ? incoming.manifestoPillars.slice(0, 6).map((p, idx) => ({
          title: cleanStr(
            p?.title,
            curr.manifestoPillars[idx]?.title || `0${idx + 1}. Pilar`,
            80
          ),
          description: cleanStr(
            p?.description,
            curr.manifestoPillars[idx]?.description || '',
            350
          ),
        }))
      : curr.manifestoPillars,
    programsEyebrow: cleanStr(incoming.programsEyebrow, curr.programsEyebrow, 100),
    programsTitle: cleanStr(incoming.programsTitle, curr.programsTitle, 160),
    programsSubtitle: cleanStr(incoming.programsSubtitle, curr.programsSubtitle, 400),
    servicesEyebrow: cleanStr(incoming.servicesEyebrow, curr.servicesEyebrow, 100),
    servicesTitle: cleanStr(incoming.servicesTitle, curr.servicesTitle, 160),
    controlRoomImageUrl: sanitizeSafeUrl(
      incoming.controlRoomImageUrl,
      curr.controlRoomImageUrl
    ),
    controlRoomEyebrow: cleanStr(
      incoming.controlRoomEyebrow,
      curr.controlRoomEyebrow,
      100
    ),
    controlRoomTitle: cleanStr(incoming.controlRoomTitle, curr.controlRoomTitle, 160),
    controlRoomBody: cleanStr(incoming.controlRoomBody, curr.controlRoomBody, 500),
    capabilities: Array.isArray(incoming.capabilities)
      ? incoming.capabilities.slice(0, 6).map((c, idx) => ({
          index: cleanStr(c?.index, String(idx + 1).padStart(2, '0'), 6),
          title: cleanStr(c?.title, 'Servicio', 90),
          description: cleanStr(c?.description, '', 360),
          deliverable: cleanStr(c?.deliverable, '', 120),
        }))
      : curr.capabilities,
    alliancesEyebrow: cleanStr(incoming.alliancesEyebrow, curr.alliancesEyebrow, 100),
    alliancesTitle: cleanStr(incoming.alliancesTitle, curr.alliancesTitle, 160),
    alliancesSubtitle: cleanStr(
      incoming.alliancesSubtitle,
      curr.alliancesSubtitle,
      450
    ),
    partnershipModels: Array.isArray(incoming.partnershipModels)
      ? incoming.partnershipModels.slice(0, 6).map((pm, idx) => ({
          index: cleanStr(pm?.index, String(idx + 1).padStart(2, '0'), 6),
          name: cleanStr(pm?.name, 'Modalidad', 90),
          detail: cleanStr(pm?.detail, '', 360),
          actionLabel: cleanStr(pm?.actionLabel, 'Consultar', 60),
          topic: cleanStr(pm?.topic, 'Alianza comercial', 90),
        }))
      : curr.partnershipModels,
    contactEyebrow: cleanStr(incoming.contactEyebrow, curr.contactEyebrow, 100),
    contactTitle: cleanStr(incoming.contactTitle, curr.contactTitle, 160),
    contactBody: cleanStr(incoming.contactBody, curr.contactBody, 450),
    whatsappDisplay: cleanStr(incoming.whatsappDisplay, curr.whatsappDisplay, 40),
    whatsappNumber: cleanStr(incoming.whatsappNumber, curr.whatsappNumber, 24).replace(
      /[^\d]/g,
      ''
    ) || curr.whatsappNumber,
    contactEmail: cleanStr(incoming.contactEmail, curr.contactEmail, 100),
    footerSubline: cleanStr(incoming.footerSubline, curr.footerSubline, 180),
  };

  db.siteContent = next;
  saveDatabase();
  return db.siteContent;
}

export function resetSiteContentToDefaults(): SiteContentConfig {
  db.siteContent = { ...DEFAULT_SITE_CONTENT };
  saveDatabase();
  return db.siteContent;
}

export function listPrograms(): ProducerProgram[] {
  return db.programs;
}

export function createProgram(
  input: Partial<ProducerProgram>
): { ok: true; program: ProducerProgram } | { ok: false; error: string } {
  const title = String(input.title || '').trim().slice(0, 100);
  if (!title) {
    return { ok: false, error: 'El nombre del programa es obligatorio.' };
  }
  const statusKey =
    input.statusKey === 'airing' ||
    input.statusKey === 'preproduction' ||
    input.statusKey === 'development'
      ? input.statusKey
      : 'airing';
  const defaultStatusLabel =
    statusKey === 'airing'
      ? 'En emisión'
      : statusKey === 'preproduction'
      ? 'En preproducción'
      : 'En desarrollo';

  const item: ProducerProgram = {
    id: `prog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    title,
    statusKey,
    statusLabel: String(input.statusLabel || defaultStatusLabel).trim().slice(0, 60),
    format: String(input.format || 'TV en Vivo + Streaming HD').trim().slice(0, 80),
    schedule: String(input.schedule || 'Horario a confirmar').trim().slice(0, 120),
    duration: String(input.duration || '60 min · Semanal').trim().slice(0, 60),
    summary: String(input.summary || '').trim().slice(0, 400) || `Programa original producido por JUGEND FÜR EINE GRÜNE ZUKUNFT.`,
    fullSynopsis:
      String(input.fullSynopsis || input.summary || '').trim().slice(0, 1200) ||
      `Producción audiovisual multiplataforma realizada por JUGEND FÜR EINE GRÜNE ZUKUNFT.`,
    technicalSpecs: Array.isArray(input.technicalSpecs)
      ? input.technicalSpecs
          .map((s) => String(s).trim().slice(0, 140))
          .filter(Boolean)
          .slice(0, 8)
      : ['Realización multicámara HD', 'Operación desde MesaControl TV'],
    imageUrl: sanitizeSafeUrl(
      input.imageUrl,
      '/src/assets/images/hero_production_set_1795376282591.jpg'
    ),
    logoUrl: input.logoUrl ? sanitizeSafeUrl(input.logoUrl, '') : undefined,
    featured: Boolean(input.featured),
    hostTeam: String(input.hostTeam || '').trim().slice(0, 80) || undefined,
    channelOrSignal:
      String(input.channelOrSignal || '').trim().slice(0, 80) || undefined,
    createdAt: Date.now(),
  };

  db.programs.unshift(item);
  saveDatabase();
  return { ok: true, program: item };
}

export function updateProgram(
  id: string,
  input: Partial<ProducerProgram>
): { ok: true; program: ProducerProgram } | { ok: false; error: string } {
  const idx = db.programs.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: 'Programa no encontrado.' };
  const curr = db.programs[idx];
  const updated: ProducerProgram = {
    ...curr,
    title:
      typeof input.title === 'string' && input.title.trim()
        ? input.title.trim().slice(0, 100)
        : curr.title,
    statusKey:
      input.statusKey === 'airing' ||
      input.statusKey === 'preproduction' ||
      input.statusKey === 'development'
        ? input.statusKey
        : curr.statusKey,
    statusLabel:
      typeof input.statusLabel === 'string' && input.statusLabel.trim()
        ? input.statusLabel.trim().slice(0, 60)
        : curr.statusLabel,
    format:
      typeof input.format === 'string' && input.format.trim()
        ? input.format.trim().slice(0, 80)
        : curr.format,
    schedule:
      typeof input.schedule === 'string' && input.schedule.trim()
        ? input.schedule.trim().slice(0, 120)
        : curr.schedule,
    duration:
      typeof input.duration === 'string' && input.duration.trim()
        ? input.duration.trim().slice(0, 60)
        : curr.duration,
    summary:
      typeof input.summary === 'string' && input.summary.trim()
        ? input.summary.trim().slice(0, 400)
        : curr.summary,
    fullSynopsis:
      typeof input.fullSynopsis === 'string' && input.fullSynopsis.trim()
        ? input.fullSynopsis.trim().slice(0, 1200)
        : curr.fullSynopsis,
    technicalSpecs: Array.isArray(input.technicalSpecs)
      ? input.technicalSpecs
          .map((s) => String(s).trim().slice(0, 140))
          .filter(Boolean)
          .slice(0, 8)
      : curr.technicalSpecs,
    imageUrl:
      typeof input.imageUrl === 'string'
        ? sanitizeSafeUrl(input.imageUrl, curr.imageUrl || '')
        : curr.imageUrl,
    logoUrl:
      typeof input.logoUrl === 'string'
        ? sanitizeSafeUrl(input.logoUrl, '') || undefined
        : curr.logoUrl,
    featured:
      typeof input.featured === 'boolean' ? input.featured : curr.featured,
    hostTeam:
      typeof input.hostTeam === 'string'
        ? input.hostTeam.trim().slice(0, 80) || undefined
        : curr.hostTeam,
    channelOrSignal:
      typeof input.channelOrSignal === 'string'
        ? input.channelOrSignal.trim().slice(0, 80) || undefined
        : curr.channelOrSignal,
  };
  db.programs[idx] = updated;
  saveDatabase();
  return { ok: true, program: updated };
}

export function deleteProgram(id: string): boolean {
  const idx = db.programs.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.programs.splice(idx, 1);
  saveDatabase();
  return true;
}

export function listProgramRequests(): ProgramCreationRequest[] {
  return db.programRequests;
}

export function createProgramRequest(input: {
  requesterName: string;
  organization?: string;
  contact: string;
  proposedTitle: string;
  format?: string;
  targetSchedule?: string;
  teamInfo?: string;
  equipmentNeeds?: string;
  synopsis: string;
}):
  | { ok: true; request: ProgramCreationRequest }
  | { ok: false; error: string } {
  const requesterName = input.requesterName.trim().slice(0, 80);
  const contact = input.contact.trim().slice(0, 100);
  const proposedTitle = input.proposedTitle.trim().slice(0, 100);
  const synopsis = input.synopsis.trim().slice(0, 1000);

  if (!requesterName || !contact || !proposedTitle || !synopsis) {
    return {
      ok: false,
      error:
        'Completá tu nombre, contacto, título tentativo del programa y sinopsis.',
    };
  }

  const reqItem: ProgramCreationRequest = {
    id: `REQ-${Date.now().toString(36).toUpperCase()}`,
    requesterName,
    organization: String(input.organization || '').trim().slice(0, 80),
    contact,
    proposedTitle,
    format: String(input.format || 'TV en Vivo + Radio Visual')
      .trim()
      .slice(0, 80),
    targetSchedule: String(input.targetSchedule || 'A definir con producción')
      .trim()
      .slice(0, 100),
    teamInfo: String(input.teamInfo || '').trim().slice(0, 200),
    equipmentNeeds: String(input.equipmentNeeds || '').trim().slice(0, 200),
    synopsis,
    status: 'pendiente',
    createdAt: Date.now(),
  };

  db.programRequests.unshift(reqItem);
  if (db.programRequests.length > 200) db.programRequests.length = 200;
  saveDatabase();
  return { ok: true, request: reqItem };
}

export function updateProgramRequestStatus(
  id: string,
  params: {
    status: ProgramRequestStatus;
    reviewNote?: string;
    createProgramInCatalog?: boolean;
  }
):
  | { ok: true; request: ProgramCreationRequest; createdProgram?: ProducerProgram }
  | { ok: false; error: string } {
  const item = db.programRequests.find((r) => r.id === id);
  if (!item) return { ok: false, error: 'Solicitud no encontrada.' };

  item.status = params.status;
  if (typeof params.reviewNote === 'string') {
    item.reviewNote = params.reviewNote.trim().slice(0, 300);
  }

  let createdProgram: ProducerProgram | undefined;
  if (params.createProgramInCatalog && !item.createdProgramId) {
    const res = createProgram({
      title: item.proposedTitle,
      statusKey: 'preproduction',
      statusLabel: 'Aprobado · En preproducción',
      format: item.format,
      schedule: item.targetSchedule || 'Horario a definir',
      duration: '60 min · Semanal',
      summary: item.synopsis.slice(0, 240),
      fullSynopsis: item.synopsis,
      hostTeam: item.teamInfo || item.requesterName,
      technicalSpecs: [
        `Propuesto por: ${item.requesterName}${
          item.organization ? ` (${item.organization})` : ''
        }`,
        item.equipmentNeeds
          ? `Requerimientos: ${item.equipmentNeeds}`
          : 'Producción digital multiplataforma JUGEND FÜR EINE GRÜNE ZUKUNFT',
      ],
    });
    if (res.ok) {
      createdProgram = res.program;
      item.createdProgramId = res.program.id;
    }
  }

  saveDatabase();
  return { ok: true, request: item, createdProgram };
}

export function listInquiries(): ProducerInquiry[] {
  return db.inquiries;
}

export function addInquiry(input: {
  name: string;
  organization?: string;
  contact: string;
  projectType?: string;
  message: string;
}): { ok: true; inquiry: ProducerInquiry } | { ok: false; error: string } {
  const name = input.name.trim().slice(0, 80);
  const contact = input.contact.trim().slice(0, 100);
  const message = input.message.trim().slice(0, 800);
  if (!name || !contact || !message) {
    return {
      ok: false,
      error: 'Completá tu nombre, un medio de contacto y el detalle del proyecto.',
    };
  }
  const entry: ProducerInquiry = {
    id: `JGFZ-${Date.now().toString(36).toUpperCase()}`,
    name,
    organization: String(input.organization || '').trim().slice(0, 80),
    contact,
    projectType: String(input.projectType || 'Producción de Programa')
      .trim()
      .slice(0, 60),
    message,
    createdAt: Date.now(),
  };
  db.inquiries.unshift(entry);
  if (db.inquiries.length > 200) db.inquiries.length = 200;
  saveDatabase();
  return { ok: true, inquiry: entry };
}

export function resolveSafeVideoPath(fileName: string): string | null {
  const base = path.basename(String(fileName || '').trim());
  if (!base || base !== fileName || base.includes('..')) return null;
  const resolved = path.resolve(VIDEOS_DIR, base);
  if (!resolved.startsWith(VIDEOS_DIR + path.sep)) return null;
  return resolved;
}

export function listProgramVideos(programId?: string): ProgramArchiveVideo[] {
  if (!programId) return db.videos;
  return db.videos.filter((v) => v.programId === programId);
}

export function addProgramVideo(input: {
  programId: string;
  title: string;
  episodeLabel?: string;
  description?: string;
  durationLabel?: string;
  videoUrl: string;
  isUploadedFile: boolean;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  uploadedBy: string;
}):
  | { ok: true; video: ProgramArchiveVideo }
  | { ok: false; error: string } {
  const title = input.title.trim().slice(0, 120);
  if (!title) {
    return { ok: false, error: 'El título del episodio es obligatorio.' };
  }
  const safeUrl = input.isUploadedFile
    ? input.videoUrl
    : sanitizeSafeUrl(input.videoUrl, '');
  if (!safeUrl) {
    return { ok: false, error: 'La URL o archivo de video no es válido.' };
  }

  const video: ProgramArchiveVideo = {
    id: `vid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    programId: input.programId,
    title,
    episodeLabel:
      String(input.episodeLabel || '').trim().slice(0, 60) ||
      new Date().toLocaleDateString('es-AR'),
    description: String(input.description || '').trim().slice(0, 500),
    durationLabel: String(input.durationLabel || '').trim().slice(0, 30) || 'HD',
    videoUrl: safeUrl,
    isUploadedFile: input.isUploadedFile,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    uploadedBy: input.uploadedBy,
    createdAt: Date.now(),
  };

  db.videos.unshift(video);
  saveDatabase();
  return { ok: true, video };
}

export function updateProgramVideo(
  videoId: string,
  patch: {
    title?: string;
    episodeLabel?: string;
    description?: string;
    durationLabel?: string;
  }
): { ok: true; video: ProgramArchiveVideo } | { ok: false; error: string } {
  const vid = db.videos.find((v) => v.id === videoId);
  if (!vid) return { ok: false, error: 'Video no encontrado.' };
  if (typeof patch.title === 'string' && patch.title.trim()) {
    vid.title = patch.title.trim().slice(0, 120);
  }
  if (typeof patch.episodeLabel === 'string') {
    vid.episodeLabel = patch.episodeLabel.trim().slice(0, 60);
  }
  if (typeof patch.description === 'string') {
    vid.description = patch.description.trim().slice(0, 500);
  }
  if (typeof patch.durationLabel === 'string') {
    vid.durationLabel = patch.durationLabel.trim().slice(0, 30);
  }
  saveDatabase();
  return { ok: true, video: vid };
}

export function deleteProgramVideo(videoId: string): boolean {
  const idx = db.videos.findIndex((v) => v.id === videoId);
  if (idx === -1) return false;
  const [removed] = db.videos.splice(idx, 1);
  if (removed.isUploadedFile && removed.fileName) {
    const safePath = resolveSafeVideoPath(removed.fileName);
    if (safePath && fs.existsSync(safePath)) {
      try {
        fs.unlinkSync(safePath);
      } catch {
        // ignore disk unlink error
      }
    }
  }
  saveDatabase();
  return true;
}

