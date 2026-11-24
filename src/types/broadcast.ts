export type TransitionType = 'cut' | 'fade' | 'wipe';

export type CameraSourceType =
  | 'studio'
  | 'webcam'
  | 'screen'
  | 'media'
  | 'slate';

export type PadColor = 'crimson' | 'amber' | 'emerald' | 'blue' | 'slate';

export type PadActionType =
  | 'scene'
  | 'overlay'
  | 'transition'
  | 'macro'
  | 'audio_stinger'
  | 'stream';

export type TvTitleStyle = 'lower_third' | 'headline_banner' | 'full_title';

export interface TvTitlePreset {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  style: TvTitleStyle;
}

export interface ActiveTvTitle {
  tag: string;
  title: string;
  subtitle: string;
  style: TvTitleStyle;
}

export interface ViewerComment {
  id: string;
  author: string;
  location?: string;
  message: string;
  createdAt: number;
}

export interface GuestBadgeItem {
  id: string;
  greeting: string;
  name: string;
  role: string;
}

export type GiveawayStage = 'hidden' | 'promo' | 'rolling' | 'winner';

export interface GiveawayState {
  stage: GiveawayStage;
  title: string;
  prize: string;
  promptText: string;
  participants: string[];
  rollingName?: string;
  winnerName?: string;
  winnerNote?: string;
}

export interface BroadcastScene {
  id: string;
  name: string;
  obsSceneName: string;
  cameraLabel: string;
  backdropUrl: string;
  cameraType: CameraSourceType;
  deviceId?: string;
  mediaUrl?: string;
  mediaKind?: 'image' | 'video';
  layoutMode: 'full' | 'pip' | 'split';
  slateColor?: string;
  slateHeadline?: string;
  description: string;
}

export interface ClosingCreditEntry {
  area: string;
  names: string;
}

export interface ClosingSlateConfig {
  active: boolean;
  headline: string;
  programTitle?: string;
  programLogoUrl?: string;
  radioName: string;
  radioLogoUrl?: string;
  producerName: string;
  producerLogoUrl?: string;
  ownerCredit: string;
  credits: ClosingCreditEntry[];
}

export interface OverlayState {
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
  activeBannerTitle?: ActiveTvTitle | null;
  activeGuestBadge?: GuestBadgeItem | null;
  giveaway?: GiveawayState | null;
  closingSlate?: ClosingSlateConfig | null;
  fadeToBlack?: boolean;
}

export interface SponsorBanner {
  id: string;
  slotLabel: string;
  name: string;
  message: string;
  logoUrl?: string;
  badgeText?: string;
  ctaText?: string;
  isOccupied: boolean;
}

export interface TouchPadItem {
  id: string;
  label: string;
  sublabel: string;
  color: PadColor;
  actionType: PadActionType;
  targetValue: string;
  category: 'escenas' | 'graficas' | 'macros';
}

export interface RundownStep {
  id: string;
  title: string;
  sceneId: string;
  durationSec: number;
  transitionType: TransitionType;
  autoLowerThird: boolean;
  lowerThirdTitle?: string;
  lowerThirdSubtitle?: string;
}

export interface AudioChannel {
  id: string;
  name: string;
  obsInputName: string;
  volumeDb: number; // -60 to 0
  muted: boolean;
  levelDb: number; // live RMS/peak meter -60 to 0
  linkedSceneId?: string;
  audioDeviceId?: string;
  micConnected?: boolean;
  monitoring?: boolean;
}

export interface ScheduledTrigger {
  id: string;
  timeHHMM: string;
  label: string;
  action: 'scene' | 'start_stream' | 'stop_stream';
  sceneId?: string;
  enabled: boolean;
  lastTriggeredDate?: string;
}

export interface ShowTemplate {
  id: string;
  name: string;
  formatLabel: string;
  description: string;
  accentHex: string;
  logoUrl?: string;
  previewImageUrl: string;
  scenes: BroadcastScene[];
  defaultOverlays: OverlayState;
  touchPads: TouchPadItem[];
  rundown: RundownStep[];
  audioChannels: AudioChannel[];
}

export type ObsConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ObsStatusSnapshot {
  connectionStatus: ObsConnectionStatus;
  url: string;
  lastError: string | null;
  obsVersion: string | null;
  isStreaming: boolean;
  isRecording: boolean;
  studioModeEnabled: boolean;
  streamTimecode: string;
  recordTimecode: string;
  streamBytes: number;
  droppedFrames: number;
  currentFps: number;
  obsScenes: string[];
  obsTransitions: string[];
  obsInputs: string[];
}
