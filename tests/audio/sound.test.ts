// NS4-17: SoundManager — AudioContext yalnızca unlock() ile, ayarlar, müzik oturumu (tek zamanlayıcı, düğüm
// temizliği), sekme gizleme, desteklenmeyen ortam ve sık tekrar seyreltmesi. Web Audio taklit edilir.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOVE_MIN_GAP, MUSIC_CHORD_MS, Sound } from '../../src/audio/SoundManager';
import { FakeAudioContext, installFakeAudio } from '../helpers/fakeAudio';

const settings = () => ({ sound: true, music: true });
let intervals: Set<unknown>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {});
  intervals = new Set();
  const si = globalThis.setInterval,
    ci = globalThis.clearInterval;
  vi.stubGlobal('setInterval', (fn: () => void, ms: number) => {
    const id = si(fn, ms);
    intervals.add(id);
    return id;
  });
  vi.stubGlobal('clearInterval', (id: ReturnType<typeof setInterval> | undefined) => {
    intervals.delete(id);
    ci(id);
  });
});
afterEach(() => {
  vi.useRealTimers();
});
const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('AudioContext yalnızca kullanıcı etkileşimiyle açılır', () => {
  it('oluşturmak, ses çalmak ve müzik istemek context açmaz; ilk unlock() açar, sonrakiler yenisini açmaz', () => {
    installFakeAudio();
    const s = new Sound(settings());
    s.setMusic(true);
    s.lock();
    s.clear(4, 0);
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(s.unlocked).toBe(false);
    s.unlock(); // kullanıcı etkileşimi (tıklama / tuş)
    s.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(s.unlocked).toBe(true);
  });
  it('suspended context etkileşimde sürdürülür; resume reddedilirse hata fırlamaz ve sonra yeniden denenir', async () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    await flush();
    expect(ctx()?.state).toBe('running');
    const c = ctx();
    c.state = 'suspended';
    c.rejectResume = true;
    // reddedilen resume yakalanmazsa Vitest "Unhandled Rejection" ile çalıştırmayı başarısız sayar
    s.unlock();
    await flush();
    expect(c.state).toBe('suspended');
    c.rejectResume = false;
    s.unlock();
    await flush();
    expect(c.state).toBe('running');
    expect(c.resumeCalls).toBe(3);
  });
  it.each(['none', 'throws'] as const)(
    'desteklenmeyen ortam (%s): oyun sessiz sürer, hiçbir çağrı hata vermez',
    (mode) => {
      installFakeAudio(mode);
      const s = new Sound(settings());
      expect(() => {
        s.unlock();
        s.unlock();
        s.setMusic(true);
        s.move();
        s.rotate();
        s.hold();
        s.lock();
        s.hard();
        s.clear(1, 0);
        s.clear(4, 0);
        s.clear(2, 2);
        s.cyc();
        s.syn();
        s.warn();
        s.garbage();
        s.level();
        s.over();
        s.setHidden(true);
        s.setHidden(false);
        s.setMusic(false);
      }).not.toThrow();
      expect(s.unsupported).toBe(true);
      expect(s.musicOn).toBe(false);
      expect(intervals.size).toBe(0);
    },
  );
});

describe('ses ve müzik ayarları', () => {
  it('ses kapalıyken efekt düğümü oluşturulmaz, sfx kazancı 0; açılınca çalar', () => {
    const { ctx } = installFakeAudio();
    const st = { sound: false, music: false };
    const s = new Sound(st);
    s.unlock();
    const before = ctx().sources().length;
    s.lock();
    s.clear(4, 0);
    s.cyc();
    expect(ctx().sources().length).toBe(before);
    st.sound = true;
    s.applySettings();
    s.lock();
    expect(ctx().sources().length).toBe(before + 1);
  });
  it('müzik yalnızca hem ayar hem uygulama isterse çalar; ayar değişimi anında uygulanır', () => {
    installFakeAudio();
    const st = { sound: true, music: false };
    const s = new Sound(st);
    s.unlock();
    s.setMusic(true);
    expect(s.musicOn).toBe(false);
    st.music = true;
    s.applySettings();
    expect(s.musicOn).toBe(true);
    st.music = false;
    s.applySettings();
    expect(s.musicOn).toBe(false);
    expect(intervals.size).toBe(0);
  });
});

describe('ortam müziği oturumu', () => {
  it('tek zamanlayıcı: art arda başlatma çift başlatmaz; hızlı aç/kapa sonrası en çok bir zamanlayıcı', () => {
    installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    s.setMusic(true);
    s.setMusic(true);
    s.startMusic();
    expect(intervals.size).toBe(1);
    for (let i = 0; i < 50; i++) s.setMusic(i % 2 === 0);
    expect(intervals.size).toBe(0); // son çağrı setMusic(false)
    s.setMusic(true);
    expect(intervals.size).toBe(1);
    s.setMusic(false);
    expect(intervals.size).toBe(0);
  });
  it('durunca bütün kaynaklar durdurulur ve veri yolu ayrılır; kapalıyken çalışan müzik düğümü kalmaz', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    s.setMusic(true);
    const c = ctx();
    vi.advanceTimersByTime(MUSIC_CHORD_MS * 2); // iki akor daha
    const musicSources = c.sources().filter((n) => n.started !== null);
    expect(musicSources.length).toBe(3 + 3 * 6); // gürültü + 2 LFO + 3 akor × 6 osilatör
    expect(s.musicSourceCount).toBeGreaterThan(0);
    s.setMusic(false);
    expect(s.musicSourceCount).toBe(0);
    expect(musicSources.every((n) => n.stopped !== null)).toBe(true);
    c.advance(10);
    expect(c.sources().filter((n) => n.running)).toHaveLength(0);
    vi.advanceTimersByTime(2000);
    const buses = c.nodes.filter((n) => n.kind === 'gain' && n.disconnected);
    expect(buses.length).toBeGreaterThan(0); // oturum veri yolu ve akor kazançları ayrıldı
    // yeni oturum yeni veri yolu kurar, eski akorlar yeniden kullanılmaz
    vi.advanceTimersByTime(MUSIC_CHORD_MS * 3);
    expect(c.sources().filter((n) => n.started !== null).length).toBe(musicSources.length);
  });
  it('büyük ses anlarında müzik kısa süre kısılır, sonra geri gelir', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    s.setMusic(true);
    // master'a bağlanan kazançlar: sfx, sonra müzik ana kanalı (unlock sırası)
    const master = ctx().nodes[1];
    const mus = ctx().nodes.filter((n) => n.kind === 'gain' && n.outputs.has(master))[1];
    expect(mus).toBeDefined();
    s.cyc();
    s.clear(4, 0);
    s.clear(2, 2);
    s.syn();
    // setTargetAtTime son değeri 1 (geri dönüş planlandı)
    const g = (mus as unknown as { gain: { value: number; calls: string[] } }).gain;
    expect(g.calls.filter((c) => c === 'target').length).toBeGreaterThanOrEqual(8);
    expect(g.value).toBe(1);
  });
});

describe('sekme gizlenmesi', () => {
  it('gizlenince çalışan context askıya alınır, görünür olunca sürer', async () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    await flush();
    const c = ctx();
    s.setHidden(true);
    expect(c.state).toBe('suspended');
    s.setHidden(false);
    await flush();
    expect(c.state).toBe('running');
  });
  it('kullanıcı etkileşimi olmadan açılmamış context görünürlükte açılmaz', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.setHidden(true);
    s.setHidden(false);
    expect(ctx()).toBeUndefined();
  });
});

describe('sık tekrar ve ayırt edicilik', () => {
  it('hareket/döndürme sesi sık tekrarda seyreltilir (DAS/ARR yorgunluğu)', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    const c = ctx();
    const n0 = c.sources().length;
    for (let i = 0; i < 10; i++) s.move(); // aynı anda 10 hareket
    expect(c.sources().length - n0).toBe(1);
    c.advance(MOVE_MIN_GAP + 0.001);
    s.move();
    expect(c.sources().length - n0).toBe(2);
    const n1 = c.sources().length;
    for (let i = 0; i < 6; i++) s.rotate();
    expect(c.sources().length - n1).toBe(1);
  });
  it('lock ve hard drop farklı: hard daha uzun, daha derin ve hava sesi içerir', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    const c = ctx();
    let n = c.sources().length;
    s.lock();
    const lock = c.sources().slice(n);
    n = c.sources().length;
    s.hard();
    const hard = c.sources().slice(n);
    expect(lock.map((x) => x.kind)).toEqual(['osc']);
    expect(hard.map((x) => x.kind)).toEqual(['osc', 'buffer']);
    expect(hard[0].stopped! - hard[0].started!).toBeGreaterThan(lock[0].stopped! - lock[0].started!);
  });
  it('sentetik kısa (≤ 0,2 sn), sıklamen en uzun ve yumuşak özel an', () => {
    const { ctx } = installFakeAudio();
    const s = new Sound(settings());
    s.unlock();
    const c = ctx();
    const span = (f: () => void) => {
      const n = c.sources().length;
      f();
      const xs = c.sources().slice(n);
      return Math.max(...xs.map((x) => x.stopped!)) - Math.min(...xs.map((x) => x.started!));
    };
    expect(span(() => s.syn())).toBeLessThanOrEqual(0.2);
    const cyc = span(() => s.cyc());
    expect(cyc).toBeGreaterThan(span(() => s.clear(4, 0)));
    expect(cyc).toBeGreaterThan(1.5);
    expect(span(() => s.garbage())).toBeLessThan(span(() => s.warn()));
  });
});
