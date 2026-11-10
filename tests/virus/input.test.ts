// NS4-44: InputController ortak kontrol arayüzü (Controls): aktif mod Virüs Avı iken tuşlar VirusGame'e gider.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { createGame } from '../helpers/gameHelpers';
import { VirusGame } from '../../src/virus/VirusGame';

let dom: FakeDom;
beforeEach(() => {
  dom = installFakeDom();
});

async function load(target: { mode: 'classic' | 'virus' }) {
  vi.resetModules();
  const { InputController } = await import('../../src/input/InputController');
  const classic = createGame(1);
  const virus = new VirusGame();
  virus.reset({ seed: 1 });
  const spy = {
    classicMove: vi.spyOn(classic, 'move'),
    classicHold: vi.spyOn(classic, 'doHold'),
    classicCyc: vi.spyOn(classic, 'useCyc'),
    classicSneeze: vi.spyOn(classic, 'useSneeze'),
    classicSpray: vi.spyOn(classic, 'useSpray'),
    classicHard: vi.spyOn(classic, 'hardDrop'),
    virusMove: vi.spyOn(virus, 'move'),
    virusRotate: vi.spyOn(virus, 'rotate'),
    virusHard: vi.spyOn(virus, 'hardDrop'),
  };
  const input = new InputController({
    game: classic,
    getControls: () => (target.mode === 'virus' ? virus : classic),
    canvas: dom.canvas as unknown as HTMLCanvasElement,
    settings: { das: 100, arr: 20 },
    getState: () => 'playing',
    getCell: () => 30,
    pause: () => {},
    resume: () => {},
    closeSub: () => false,
    unlockAudio: () => {},
  });
  const key = (k: string) => dom.window.dispatch('keydown', { key: k });
  return { input, classic, virus, spy, key };
}

describe('Controls yönlendirme', () => {
  it('Virüs Avı modunda ok/x/boşluk VirusGame metotlarına gider; klasik güç tuşları çağrılmaz', async () => {
    const { spy, key } = await load({ mode: 'virus' });
    key('ArrowLeft');
    key('x');
    key(' ');
    for (const k of ['c', '1', '2', '3']) key(k);
    expect(spy.virusMove).toHaveBeenCalledWith(-1);
    expect(spy.virusRotate).toHaveBeenCalledWith(1);
    expect(spy.virusHard).toHaveBeenCalledTimes(1);
    expect(spy.classicMove).not.toHaveBeenCalled();
    expect(spy.classicHard).not.toHaveBeenCalled();
    expect(spy.classicHold).not.toHaveBeenCalled();
    expect(spy.classicCyc).not.toHaveBeenCalled();
    expect(spy.classicSneeze).not.toHaveBeenCalled();
    expect(spy.classicSpray).not.toHaveBeenCalled();
  });

  it('mod değişince sonraki tuş yeni hedefe gider', async () => {
    const target = { mode: 'virus' as 'classic' | 'virus' };
    const { spy, key } = await load(target);
    key('ArrowRight');
    target.mode = 'classic';
    key('ArrowRight');
    expect(spy.virusMove).toHaveBeenCalledTimes(1);
    expect(spy.classicMove).toHaveBeenCalledTimes(1);
  });

  it('DAS/ARR Virüs Avı motorunda da çalışır', async () => {
    const { input, virus, key } = await load({ mode: 'virus' });
    const x0 = virus.cap!.x;
    key('ArrowLeft');
    expect(virus.cap!.x).toBe(x0 - 1);
    input.update(99);
    expect(virus.cap!.x).toBe(x0 - 1);
    input.update(1);
    input.update(20);
    expect(virus.cap!.x).toBe(x0 - 2);
  });

  it('↓ yavaş indirme bayrağı aktif motora yazılır', async () => {
    const { virus, classic, key } = await load({ mode: 'virus' });
    key('ArrowDown');
    expect(virus.softDrop).toBe(true);
    expect(classic.softDrop).toBe(false);
  });
});
