// NS4-17: Web Audio taklidi. Ses üretilmez; oluşturulan düğümler, bağlantılar, start/stop ve context durum
// geçişleri kaydedilir. `currentTime` testten ilerletilir.
import { vi } from 'vitest';

export class FakeParam {
  value = 0;
  readonly calls: string[] = [];
  setValueAtTime(v: number) {
    this.calls.push('set');
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number) {
    this.calls.push('lin');
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number) {
    if (v <= 0) throw new RangeError('exponential ramp to non-positive value');
    this.calls.push('exp');
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number) {
    this.calls.push('target');
    this.value = v;
    return this;
  }
  cancelScheduledValues() {
    this.calls.push('cancel');
    return this;
  }
}

export class FakeNode {
  readonly outputs = new Set<FakeNode | FakeParam>();
  disconnected = false;
  constructor(
    readonly ctx: FakeAudioContext,
    readonly kind: string,
  ) {
    ctx.nodes.push(this);
  }
  connect(to: FakeNode | FakeParam) {
    this.outputs.add(to);
    return to;
  }
  disconnect() {
    this.outputs.clear();
    this.disconnected = true;
  }
}
export class FakeSource extends FakeNode {
  started: number | null = null;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0) {
    if (this.started !== null) throw new Error('start twice');
    this.started = t;
  }
  stop(t = 0) {
    if (this.started === null) throw new Error('stop before start');
    this.stopped = t;
  }
  /** Zaman `stopped` noktasını geçince onended çağrılır (FakeAudioContext.advance). */
  get running() {
    return this.started !== null && (this.stopped === null || this.stopped > this.ctx.currentTime);
  }
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  readonly nodes: FakeNode[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 0;
  readonly sampleRate = 8000;
  readonly destination: FakeNode;
  resumeCalls = 0;
  suspendCalls = 0;
  /** true ise resume() reddedilir (tarayıcı politikası taklidi). */
  rejectResume = false;
  constructor() {
    FakeAudioContext.instances.push(this);
    this.destination = new FakeNode(this, 'destination');
  }
  resume() {
    this.resumeCalls++;
    if (this.rejectResume) return Promise.reject(new Error('NotAllowedError'));
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.suspendCalls++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  createGain() {
    return Object.assign(new FakeNode(this, 'gain'), { gain: new FakeParam() });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(this, 'biquad'), {
      type: 'lowpass',
      frequency: new FakeParam(),
      Q: new FakeParam(),
    });
  }
  createOscillator() {
    return Object.assign(new FakeSource(this, 'osc'), {
      type: 'sine',
      frequency: new FakeParam(),
      detune: new FakeParam(),
    });
  }
  createBufferSource() {
    return Object.assign(new FakeSource(this, 'buffer'), { buffer: null, loop: false });
  }
  createBuffer(_ch: number, len: number) {
    const data = new Float32Array(len);
    return { getChannelData: () => data };
  }
  /** Zamanı ilerletir; durma zamanı geçen kaynakların onended'ini çağırır. */
  advance(sec: number) {
    this.currentTime += sec;
    for (const n of this.nodes)
      if (n instanceof FakeSource && n.stopped !== null && n.stopped <= this.currentTime && n.onended) {
        const f = n.onended;
        n.onended = null;
        f();
      }
  }
  sources(kind?: string) {
    return this.nodes.filter((n): n is FakeSource => n instanceof FakeSource && (!kind || n.kind === kind));
  }
}

/** window.AudioContext taklidini kurar (yoksa `null` ile desteklenmeyen ortam). */
export function installFakeAudio(mode: 'ok' | 'none' | 'throws' = 'ok') {
  FakeAudioContext.instances = [];
  const AC =
    mode === 'ok'
      ? FakeAudioContext
      : mode === 'throws'
        ? class {
            constructor() {
              throw new Error('NotSupportedError');
            }
          }
        : undefined;
  // sahte DOM'un window nesnesi varsa onun üzerine yazılır (dinleyici yöntemleri korunur)
  const w = (globalThis as { window?: object }).window;
  if (w) Object.assign(w, { AudioContext: AC, webkitAudioContext: undefined });
  else vi.stubGlobal('window', { AudioContext: AC, webkitAudioContext: undefined });
  return { ctx: () => FakeAudioContext.instances[0] };
}
