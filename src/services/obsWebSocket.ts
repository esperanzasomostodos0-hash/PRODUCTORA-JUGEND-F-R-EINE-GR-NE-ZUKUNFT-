import { ObsStatusSnapshot } from '../types/broadcast';

type ObsEventCallback = (eventType: string, eventData: Record<string, unknown>) => void;
type ObsStateCallback = (snapshot: ObsStatusSnapshot) => void;

interface PendingRequest {
  resolve: (data: Record<string, unknown>) => void;
  reject: (err: Error) => void;
  timer: number;
}

async function sha256Base64(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class ObsWebSocketClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private reqCounter = 0;
  private pollTimer: number | null = null;
  private eventListeners = new Set<ObsEventCallback>();
  private stateListeners = new Set<ObsStateCallback>();

  private state: ObsStatusSnapshot = {
    connectionStatus: 'disconnected',
    url: 'ws://localhost:4455',
    lastError: null,
    obsVersion: null,
    isStreaming: false,
    isRecording: false,
    studioModeEnabled: true,
    streamTimecode: '00:00:00',
    recordTimecode: '00:00:00',
    streamBytes: 0,
    droppedFrames: 0,
    currentFps: 60,
    obsScenes: [],
    obsTransitions: ['Corte', 'Desvanecer', 'Barrido'],
    obsInputs: [],
  };

  getSnapshot(): ObsStatusSnapshot {
    return { ...this.state };
  }

  subscribeState(cb: ObsStateCallback): () => void {
    this.stateListeners.add(cb);
    cb(this.getSnapshot());
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  subscribeEvents(cb: ObsEventCallback): () => void {
    this.eventListeners.add(cb);
    return () => {
      this.eventListeners.delete(cb);
    };
  }

  private emitState(patch: Partial<ObsStatusSnapshot>) {
    this.state = { ...this.state, ...patch };
    const snap = this.getSnapshot();
    this.stateListeners.forEach((cb) => cb(snap));
  }

  async connect(url: string, password = ''): Promise<void> {
    this.disconnect();
    const cleanUrl = url.trim() || 'ws://localhost:4455';

    this.emitState({
      connectionStatus: 'connecting',
      url: cleanUrl,
      lastError: null,
    });

    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        const ws = new WebSocket(cleanUrl);
        this.ws = ws;

        const connectTimeout = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            this.disconnect();
            const err = new Error(
              'Tiempo agotado al conectar con OBS Studio. Verifica que el servidor WebSocket (puerto 4455) esté activo.'
            );
            this.emitState({
              connectionStatus: 'error',
              lastError: err.message,
            });
            reject(err);
          }
        }, 7000);

        ws.onmessage = async (msgEvent) => {
          try {
            const payload = JSON.parse(String(msgEvent.data)) as {
              op: number;
              d: Record<string, unknown>;
            };

            // Op 0: Hello
            if (payload.op === 0) {
              const d = payload.d;
              const authInfo = d.authentication as
                | { challenge: string; salt: string }
                | undefined;

              let authentication: string | undefined;
              if (authInfo && authInfo.challenge && authInfo.salt) {
                const secret = await sha256Base64(password + authInfo.salt);
                authentication = await sha256Base64(secret + authInfo.challenge);
              }

              ws.send(
                JSON.stringify({
                  op: 1,
                  d: {
                    rpcVersion: 1,
                    ...(authentication ? { authentication } : {}),
                    eventSubscriptions: 0b1111111111, // All general/scene/stream/input events
                  },
                })
              );
            }

            // Op 2: Identified
            else if (payload.op === 2) {
              window.clearTimeout(connectTimeout);
              if (!settled) {
                settled = true;
                this.emitState({
                  connectionStatus: 'connected',
                  lastError: null,
                });
                await this.syncInitialState();
                this.startStatusPolling();
                resolve();
              }
            }

            // Op 5: Event
            else if (payload.op === 5) {
              const eventType = String(payload.d.eventType || '');
              const eventData =
                (payload.d.eventData as Record<string, unknown>) || {};
              this.handleObsEvent(eventType, eventData);
              this.eventListeners.forEach((cb) => cb(eventType, eventData));
            }

            // Op 7: RequestResponse
            else if (payload.op === 7) {
              const requestId = String(payload.d.requestId || '');
              const pending = this.pending.get(requestId);
              if (pending) {
                window.clearTimeout(pending.timer);
                this.pending.delete(requestId);
                const status = payload.d.requestStatus as
                  | { result: boolean; code: number; comment?: string }
                  | undefined;
                if (status && status.result) {
                  pending.resolve(
                    (payload.d.responseData as Record<string, unknown>) || {}
                  );
                } else {
                  pending.reject(
                    new Error(status?.comment || `Error OBS (${status?.code ?? 'desconocido'})`)
                  );
                }
              }
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          window.clearTimeout(connectTimeout);
          const isHttpsPage =
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:' &&
            cleanUrl.startsWith('ws://') &&
            !cleanUrl.includes('localhost') &&
            !cleanUrl.includes('127.0.0.1');

          const errMsg = isHttpsPage
            ? 'El navegador bloqueó ws:// desde HTTPS. Usa un túnel wss:// o abre la consola en localhost.'
            : 'No se pudo conectar con OBS Studio en ' +
              cleanUrl +
              '. Verifica que OBS esté abierto y WebSocket Server habilitado en Herramientas.';

          if (!settled) {
            settled = true;
            this.emitState({
              connectionStatus: 'error',
              lastError: errMsg,
            });
            reject(new Error(errMsg));
          } else {
            this.emitState({
              connectionStatus: 'error',
              lastError: errMsg,
            });
          }
        };

        ws.onclose = (ev) => {
          window.clearTimeout(connectTimeout);
          this.stopStatusPolling();
          if (ev.code === 4009) {
            const authErr = 'Contraseña de OBS WebSocket incorrecta.';
            this.emitState({
              connectionStatus: 'error',
              lastError: authErr,
            });
            if (!settled) {
              settled = true;
              reject(new Error(authErr));
            }
            return;
          }
          if (this.state.connectionStatus === 'connected') {
            this.emitState({
              connectionStatus: 'disconnected',
              lastError: null,
            });
          }
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'URL de WebSocket inválida (usa ws://ip:4455)';
        this.emitState({
          connectionStatus: 'error',
          lastError: message,
        });
        reject(new Error(message));
      }
    });
  }

  disconnect() {
    this.stopStatusPolling();
    this.pending.forEach((p) => {
      window.clearTimeout(p.timer);
      p.reject(new Error('Conexión OBS cerrada'));
    });
    this.pending.clear();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.emitState({
      connectionStatus: 'disconnected',
      lastError: null,
    });
  }

  async call(
    requestType: string,
    requestData: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('No conectado a OBS Studio');
    }

    const requestId = `req_${++this.reqCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Tiempo agotado en comando OBS: ${requestType}`));
      }, 5000);

      this.pending.set(requestId, { resolve, reject, timer });

      this.ws!.send(
        JSON.stringify({
          op: 6,
          d: {
            requestType,
            requestId,
            requestData,
          },
        })
      );
    });
  }

  private async syncInitialState() {
    try {
      const [ver, scenes, stream, record, studio, transitions, inputs] =
        await Promise.allSettled([
          this.call('GetVersion'),
          this.call('GetSceneList'),
          this.call('GetStreamStatus'),
          this.call('GetRecordStatus'),
          this.call('GetStudioModeEnabled'),
          this.call('GetSceneTransitionList'),
          this.call('GetInputList'),
        ]);

      const patch: Partial<ObsStatusSnapshot> = {};

      if (ver.status === 'fulfilled') {
        patch.obsVersion = String(ver.value.obsVersion || '');
      }
      if (scenes.status === 'fulfilled') {
        const list = (scenes.value.scenes as Array<{ sceneName: string }>) || [];
        patch.obsScenes = list.map((s) => s.sceneName).reverse();
      }
      if (stream.status === 'fulfilled') {
        patch.isStreaming = Boolean(stream.value.outputActive);
        patch.streamTimecode = String(
          stream.value.outputTimecode || '00:00:00'
        ).slice(0, 8);
        patch.streamBytes = Number(stream.value.outputBytes || 0);
      }
      if (record.status === 'fulfilled') {
        patch.isRecording = Boolean(record.value.outputActive);
        patch.recordTimecode = String(
          record.value.outputTimecode || '00:00:00'
        ).slice(0, 8);
      }
      if (studio.status === 'fulfilled') {
        patch.studioModeEnabled = Boolean(studio.value.studioModeEnabled);
      }
      if (transitions.status === 'fulfilled') {
        const list =
          (transitions.value.transitions as Array<{ transitionName: string }>) ||
          [];
        if (list.length > 0) {
          patch.obsTransitions = list.map((t) => t.transitionName);
        }
      }
      if (inputs.status === 'fulfilled') {
        const list = (inputs.value.inputs as Array<{ inputName: string }>) || [];
        patch.obsInputs = list.map((i) => i.inputName);
      }

      this.emitState(patch);
    } catch {
      // ignore partial sync failures
    }
  }

  private startStatusPolling() {
    this.stopStatusPolling();
    this.pollTimer = window.setInterval(async () => {
      if (this.state.connectionStatus !== 'connected') return;
      try {
        const [stream, record, stats] = await Promise.allSettled([
          this.call('GetStreamStatus'),
          this.call('GetRecordStatus'),
          this.call('GetStats'),
        ]);
        const patch: Partial<ObsStatusSnapshot> = {};
        if (stream.status === 'fulfilled') {
          patch.isStreaming = Boolean(stream.value.outputActive);
          patch.streamTimecode = String(
            stream.value.outputTimecode || '00:00:00'
          ).slice(0, 8);
          patch.streamBytes = Number(stream.value.outputBytes || 0);
          patch.droppedFrames = Number(stream.value.outputSkippedFrames || 0);
        }
        if (record.status === 'fulfilled') {
          patch.isRecording = Boolean(record.value.outputActive);
          patch.recordTimecode = String(
            record.value.outputTimecode || '00:00:00'
          ).slice(0, 8);
        }
        if (stats.status === 'fulfilled') {
          patch.currentFps = Math.round(Number(stats.value.activeFps || 60));
        }
        this.emitState(patch);
      } catch {
        // ignore transient poll errors
      }
    }, 1000);
  }

  private stopStatusPolling() {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private handleObsEvent(eventType: string, data: Record<string, unknown>) {
    if (eventType === 'StreamStateChanged') {
      this.emitState({ isStreaming: Boolean(data.outputActive) });
    } else if (eventType === 'RecordStateChanged') {
      this.emitState({ isRecording: Boolean(data.outputActive) });
    } else if (eventType === 'StudioModeStateChanged') {
      this.emitState({ studioModeEnabled: Boolean(data.studioModeEnabled) });
    } else if (eventType === 'SceneListChanged') {
      const list = (data.scenes as Array<{ sceneName: string }>) || [];
      this.emitState({ obsScenes: list.map((s) => s.sceneName).reverse() });
    }
  }

  // High-level OBS actions (safe no-op when disconnected)
  async setProgramScene(sceneName: string): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call('SetCurrentProgramScene', { sceneName });
      return true;
    } catch {
      return false;
    }
  }

  async setPreviewScene(sceneName: string): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call('SetCurrentPreviewScene', { sceneName });
      return true;
    } catch {
      return false;
    }
  }

  async triggerTransition(): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call('TriggerStudioModeTransition');
      return true;
    } catch {
      return false;
    }
  }

  async setStudioMode(enabled: boolean): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call('SetStudioModeEnabled', { studioModeEnabled: enabled });
      return true;
    } catch {
      return false;
    }
  }

  async toggleStream(shouldStream: boolean): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call(shouldStream ? 'StartStream' : 'StopStream');
      return true;
    } catch {
      return false;
    }
  }

  async toggleRecord(shouldRecord: boolean): Promise<boolean> {
    if (this.state.connectionStatus !== 'connected') return false;
    try {
      await this.call(shouldRecord ? 'StartRecord' : 'StopRecord');
      return true;
    } catch {
      return false;
    }
  }

  async setInputVolumeDb(inputName: string, inputVolumeDb: number): Promise<void> {
    if (this.state.connectionStatus !== 'connected') return;
    try {
      await this.call('SetInputVolume', { inputName, inputVolumeDb });
    } catch {
      // Input might not exist in user's OBS profile
    }
  }

  async setInputMute(inputName: string, inputMuted: boolean): Promise<void> {
    if (this.state.connectionStatus !== 'connected') return;
    try {
      await this.call('SetInputMute', { inputName, inputMuted });
    } catch {
      // ignore if input missing
    }
  }

  async setTextSource(inputName: string, text: string): Promise<void> {
    if (this.state.connectionStatus !== 'connected') return;
    try {
      await this.call('SetInputSettings', {
        inputName,
        inputSettings: { text },
      });
    } catch {
      // ignore if text source doesn't exist
    }
  }
}

export const obsClient = new ObsWebSocketClient();
