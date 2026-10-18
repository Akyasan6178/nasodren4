// NS4-12: ilk oyun öğreticisi durum makinesi. Gerçek Game eylemleriyle ilerler; görünüm ve kayıt taklit edilir.
import { describe, expect, it, vi } from 'vitest';
import { Tutorial, type TutorialStore, type TutorialView } from '../../src/tutorial/Tutorial';
import { ROTATE_O_NOTE, STEP_COPY, TUTORIAL_STEPS, type InputMode, type TutorialStep } from '../../src/tutorial/steps';
import { clearBoard, createGame, dropVerticalI, placePiece, setupWell } from '../helpers/gameHelpers';
import { PIECE } from '../../src/game/pieces';

function setup(opts: { done?: boolean; mode?: InputMode } = {}) {
  const g = createGame(1);
  const shown: { step: TutorialStep; index: number; total: number; mode: InputMode; note?: string }[] = [];
  let visible = false;
  const view: TutorialView = {
    show: (step, index, total, mode, note) => {
      shown.push(note ? { step, index, total, mode, note } : { step, index, total, mode });
      visible = true;
    },
    hide: () => {
      visible = false;
    },
  };
  let done = opts.done ?? false;
  const markDone = vi.fn(() => void (done = true));
  const store: TutorialStore = { isDone: () => done, markDone };
  const onComplete = vi.fn();
  const t = new Tutorial(g, view, store, { mode: opts.mode ?? 'keyboard', onComplete });
  /** Aktif parçayı boş bir alana koyar (eylemlerin her zaman mümkün olması için). */
  const fresh = () => {
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
  };
  return { g, t, shown, markDone, onComplete, isVisible: () => visible, isDone: () => done, fresh };
}

describe('otomatik açılma', () => {
  it('ilk oyunda açılır ve ilk adımı (1/6) gösterir', () => {
    const { t, shown, isVisible } = setup();
    t.onGameStart();
    expect(t.step).toBe('move');
    expect(isVisible()).toBe(true);
    expect(shown.at(-1)).toEqual({ step: 'move', index: 0, total: 6, mode: 'keyboard' });
  });

  it('tamamlanmışsa sonraki oyunda otomatik açılmaz', () => {
    const { t, isVisible } = setup({ done: true });
    t.onGameStart();
    expect(t.step).toBeNull();
    expect(isVisible()).toBe(false);
  });
});

describe('adımlar doğru eylemle ilerler', () => {
  it('kaydır → döndür → yavaş indir → anında bırak → beklet → drenaj', () => {
    const { g, t, shown, isDone, onComplete, fresh } = setup();
    t.onGameStart();
    fresh();
    g.move(1);
    expect(t.step).toBe('rotate');
    g.rotate(1);
    expect(t.step).toBe('soft');
    t.softDrop();
    expect(t.step).toBe('hard');
    g.hardDrop();
    expect(t.step).toBe('hold');
    g.doHold();
    expect(t.step).toBe('clear');
    expect(isDone()).toBe(false);
    setupWell(g, 1);
    dropVerticalI(g); // tam satır
    expect(t.step).toBeNull();
    expect(isDone()).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(shown.map((s) => s.step)).toEqual([...TUTORIAL_STEPS]);
  });

  it('yanlış eylem adımı ilerletmez', () => {
    const { g, t, fresh } = setup();
    t.onGameStart();
    fresh();
    g.rotate(1);
    t.softDrop();
    g.doHold();
    expect(t.step).toBe('move');
    g.move(-1);
    expect(t.step).toBe('rotate');
    g.move(1); // tekrar kaydırma döndürme adımını geçmez
    g.hardDrop();
    expect(t.step).toBe('rotate');
  });

  it('döndürme adımında kare blok: not gösterilir, ilerleme sonraki blokla olur', () => {
    const { g, t, shown, fresh } = setup();
    t.onGameStart();
    fresh();
    g.move(1);
    expect(shown.at(-1)).toEqual({ step: 'rotate', index: 1, total: 6, mode: 'keyboard' });
    clearBoard(g);
    g.spawn(PIECE.O);
    expect(shown.at(-1)?.note).toBe(ROTATE_O_NOTE);
    expect(g.rotate(1)).toBe(false);
    expect(t.step).toBe('rotate');
    g.spawn(PIECE.T);
    expect(shown.at(-1)?.note).toBeUndefined();
    g.rotate(1);
    expect(t.step).toBe('soft');
  });

  it('başarısız hareket (duvara dayalı) ilerletmez', () => {
    const { g, t } = setup();
    t.onGameStart();
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 0, 5);
    expect(g.move(-1)).toBe(false);
    expect(t.step).toBe('move');
  });

  it('son adımda satır temizlemeden “Tamam” ile bitirilebilir; diğer adımlarda “Tamam” etkisiz', () => {
    const { g, t, isDone, fresh } = setup();
    t.onGameStart();
    t.acknowledge();
    expect(t.step).toBe('move');
    fresh();
    g.move(1);
    g.rotate(1);
    t.softDrop();
    g.hardDrop();
    g.doHold();
    t.acknowledge();
    expect(t.step).toBeNull();
    expect(isDone()).toBe(true);
  });
});

describe('kullanıcı kontrolü', () => {
  it('Atla: kapanır, kaydedilir, sonraki oyunda açılmaz', () => {
    const { t, markDone, isVisible, onComplete } = setup();
    t.onGameStart();
    t.skip();
    expect(isVisible()).toBe(false);
    expect(markDone).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    t.onGameStart();
    expect(t.step).toBeNull();
  });

  it('yeniden başlatma: tamamlanmış olsa da sonraki oyunda baştan açılır, bir kez', () => {
    const { t } = setup({ done: true });
    t.restart();
    t.onGameStart();
    expect(t.step).toBe('move');
    t.onSessionEnd();
    t.onGameStart();
    expect(t.step).toBeNull(); // istek tek seferlik; kayıt hâlâ tamamlanmış
  });

  it('giriş tipi değişince anlatım güncellenir (klavye ↔ dokunmatik)', () => {
    const { t, shown } = setup({ mode: 'keyboard' });
    t.onGameStart();
    t.setMode('touch');
    expect(shown.at(-1)).toMatchObject({ step: 'move', mode: 'touch' });
    expect(t.inputMode).toBe('touch');
  });
});

describe('oturum davranışı', () => {
  it('pause sırasında gizlenir, resume sonrası aynı adımdan sürer', () => {
    const { g, t, isVisible, shown, fresh } = setup();
    t.onGameStart();
    fresh();
    g.move(1);
    t.onPause();
    expect(isVisible()).toBe(false);
    t.onResume();
    expect(isVisible()).toBe(true);
    expect(shown.at(-1)?.step).toBe('rotate');
  });

  it('ana menüye dönüş tamamlanmış saymaz; yeni oyunda kaldığı adımdan sürer', () => {
    const { g, t, isDone, isVisible, fresh } = setup();
    t.onGameStart();
    fresh();
    g.move(1);
    g.rotate(1);
    t.onSessionEnd();
    expect(isVisible()).toBe(false);
    expect(isDone()).toBe(false);
    g.move(1); // menüde/oyun dışında olaylar adımı ilerletmez
    t.onGameStart();
    expect(t.step).toBe('soft');
  });

  it('game-over öğreticiyi gizler ve bozuk durumda bırakmaz', () => {
    const { g, t, isVisible, isDone } = setup();
    t.onGameStart();
    g.gameOver('blockout');
    t.onSessionEnd();
    expect([isVisible(), isDone(), t.step]).toEqual([false, false, null]);
    g.reset();
    t.onGameStart();
    expect(t.step).toBe('move');
  });
});

describe('metinler', () => {
  it('her adımın klavye ve dokunmatik anlatımı var; güçlendiriciler öğretilmez', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(STEP_COPY[s].title.length).toBeGreaterThan(0);
      expect(STEP_COPY[s].keyboard.length).toBeGreaterThan(0);
      expect(STEP_COPY[s].touch.length).toBeGreaterThan(0);
      expect(JSON.stringify(STEP_COPY[s])).not.toMatch(/Sıklamen|Sentetik/i);
    }
    expect(STEP_COPY.move.keyboard).toMatch(/←|→/);
    expect(STEP_COPY.move.touch).toMatch(/sürükle/);
    expect(STEP_COPY.hard.keyboard).toMatch(/Boşluk/);
    expect(STEP_COPY.hard.touch).toMatch(/fırlat/);
  });
});
