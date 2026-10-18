/* =====================================================================
   GAME EVENTS -> view/audio/haptics/UI/analitik bağlantıları
   NS4-03: main.ts'ten taşındı. Olay adları, işleyici içerikleri ve aynı olay
   için kayıt sırası korunmuştur; yeni olay adı veya event-bus yoktur.
   ===================================================================== */
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';
import type { Sound } from '../audio/SoundManager';
import type { Lifecycle } from './lifecycle';
import { HAPTIC, type Buzz } from '../haptics/haptics';
import { track } from '../analytics/analytics';
import { toast, popup } from '../ui/notifications';
import { award } from '../ui/badges';

export interface WireDeps {
  game: Game;
  view: View;
  sound: Sound;
  buzz: Buzz;
  lifecycle: Pick<Lifecycle, 'handleGameOver'>;
}

export function wireGameEvents({ game, view, sound, buzz, lifecycle }: WireDeps) {
  game.on('move', () => sound.move());
  game.on('rotate', () => sound.rotate());
  game.on('hold', () => sound.hold());
  game.on('lock', (cells) => {
    view.onLock(cells);
    sound.lock();
    buzz(HAPTIC.lock);
  });
  game.on('harddrop', (d) => {
    view.onHard(d);
    sound.hard();
    buzz(HAPTIC.hard);
  });
  game.on('clearstart', (e) => {
    view.onClearStart(e);
    if (e.kind === 'cyc') {
      sound.cyc();
      buzz(HAPTIC.cyc);
      popup('Sıklamen özütü', 'Ozmotik drenaj başladı', 'cyc');
    } else if (e.kind === 'syn') {
      sound.syn();
      buzz(HAPTIC.syn);
    }
  });
  // NS4-03: powerup_use analitiği Game.useCyc/useSyn içinden buraya taşındı. Orijinalde track() emit('clearstart')
  // çağrısından hemen sonra çalışıyordu; bu işleyici yukarıdakinden sonra kaydedildiği için sıra ve payload aynıdır.
  game.on('clearstart', (e) => {
    if (e.kind === 'cyc')
      track('powerup_use', { kind: 'siklamen', level: game.level, congestion: +game.congestion().toFixed(2) });
    else if (e.kind === 'syn') track('powerup_use', { kind: 'sentetik', uses: game.synUses, level: game.level });
  });
  game.on('clearend', () => view.onClearEnd());
  game.on('scored', (e) => {
    view.onScored(e); // NS4-15: temizleme dili (Ozmotik / Nörorefleks); Game bunu clearstart'tan önce yayar
    sound.clear(e.n, e.tspin);
    if (e.n) buzz(HAPTIC.clear(e.n));
    const names = ['', 'Tek', 'Çift', 'Üçlü', 'TETRİS'];
    let big = '',
      sub = '',
      cls = '';
    if (e.tspin) {
      big = (e.tspin === 1 ? 'Mini ' : '') + 'T-spin' + (e.n ? ' ' + names[e.n].toLowerCase() : '');
      sub = 'Nörorefleks etki';
      cls = 'cyc';
    } else if (e.n === 4) {
      big = 'TETRİS';
      sub = 'Ozmotik etki: dört satır birden';
      cls = 'cyc';
    } else if (e.n >= 2) {
      big = names[e.n] + ' drenaj';
    }
    if (e.b2b) sub = 'Art arda · ' + sub;
    if (e.combo >= 2) {
      if (!big) big = `Kombo ×${e.combo}`;
      else sub = (sub ? sub + ' · ' : '') + `kombo ×${e.combo}`;
    }
    if (big) popup(big, sub, cls);
    if (e.n === 4) award('ozmotik');
    if (e.tspin && e.n) award('noro');
    if (e.combo >= 5) award('akis');
  });
  game.on('levelup', (lv) => {
    sound.level();
    popup(`Nefes seviyesi ${lv}`, 'Mukus daha hızlı birikiyor');
    track('level_up', { level: lv });
    if (lv >= 5 && game.synUses === 0) award('dogal');
  });
  game.on('powerdone', (e) => {
    if (e.kind === 'syn') {
      if (e.rebound) {
        view.onRebound();
        sound.warn();
        popup('Rebound', 'Sık kullanım tıkanıklığı geri getirdi', 'warn');
        // NS4-07: uyarı metni oyunda bir kez (rebound'un ilk başladığı 2. kullanımda); popup her seferinde
        if (game.synUses === 2)
          toast('Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.', 3600);
      } else {
        popup('3 satır açıldı', 'Tekrarlarsan geri tepebilir', 'warn');
      }
    }
  });
  game.on('garbage', () => {
    view.onGarbage(); // NS4-15: önceden yalnızca view.shake = 0.35
    sound.warn();
    buzz(30);
  });
  game.on('gameover', (reason) => lifecycle.handleGameOver(reason));
}
