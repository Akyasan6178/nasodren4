/* =====================================================================
   GAME EVENTS -> view/audio/haptics/UI/analitik bağlantıları
   NS4-03: main.ts'ten taşındı. Olay adları, işleyici içerikleri ve aynı olay
   için kayıt sırası korunmuştur; yeni olay adı veya event-bus yoktur.
   NS4-09: Sıklamen karakterinin tepkileri ve konuşmaları, mikrop temizleme,
   şarjlı sıklamen gücü, oyun içi bilgi kartı açılışları ve bölüm sonu.
   Metinler oyun mekaniğini anlatır; sağlık iddiası içermez.
   ===================================================================== */
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';
import type { Sound } from '../audio/SoundManager';
import type { Lifecycle } from './lifecycle';
import type { CardId } from '../types/content';
import { CARDS, ENDLESS_CARDS } from '../content/cards';
import { HAPTIC, type Buzz } from '../haptics/haptics';
import { track } from '../analytics/analytics';
import { toast, popup } from '../ui/notifications';
import { award } from '../ui/badges';
import { unlockCard } from '../ui/cards';
import { react, say } from '../ui/hero';

export interface WireDeps {
  game: Game;
  view: View;
  sound: Sound;
  buzz: Buzz;
  lifecycle: Pick<Lifecycle, 'handleGameOver' | 'handleStageComplete' | 'noteCard'>;
}

export function wireGameEvents({ game, view, sound, buzz, lifecycle }: WireDeps) {
  /**
   * Oyun içinde kart açılır: oyunu bölmeden kısa bildirim; kart oyun sonunda ve albümde görünür.
   * `quiet`: aynı anda gösterilen başka bir uyarıyı (ör. onaylı rebound metni) ezmemek için bildirimsiz.
   */
  const cardFound = (id: CardId, quiet = false) => {
    if (!unlockCard(id)) return;
    lifecycle.noteCard(id);
    if (!quiet) toast(`Yeni bilgi kartı: ${CARDS[id].title}`, 3000);
  };

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
      view.onSpray();
      react('spray', 1600);
      popup('Sıklamen gücü', 'Alt sıralar eriyor', 'cyc');
    } else if (e.kind === 'syn') {
      sound.syn();
      buzz(HAPTIC.syn);
    }
  });
  // NS4-03: powerup_use analitiği Game.useCyc/useSyn içinden buraya taşındı (kayıt sırası korunur).
  game.on('clearstart', (e) => {
    if (e.kind === 'cyc')
      track('powerup_use', { kind: 'siklamen', level: game.level, congestion: +game.congestion().toFixed(2) });
    else if (e.kind === 'syn') track('powerup_use', { kind: 'sentetik', uses: game.synUses, level: game.level });
  });
  game.on('clearend', () => view.onClearEnd());
  game.on('scored', (e) => {
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
    if (e.n) react(e.n >= 3 || e.tspin ? 'cheer' : 'happy', e.n >= 3 ? 1800 : 1000);
    if (e.n === 4) award('ozmotik');
    if (e.tspin && e.n) award('noro');
    if (e.combo >= 5) award('akis');
    // serbest oyunda toplam satıra bağlı kartlar
    if (!game.stage) for (const [lines, id] of ENDLESS_CARDS) if (game.lines >= lines) cardFound(id);
  });
  game.on('germs', (n) => {
    sound.germ();
    popup(n > 1 ? `${n} mikrop temizlendi!` : 'Mikrop temizlendi!', `+${100 * n * game.level}`, 'germ');
    react('cheer', 1400);
  });
  game.on('cycready', () => {
    sound.chirp();
    react('ready', 1200);
    say('Gücüm doldu! Bana dokun, en alttaki sıraları eriteyim.', 3200);
  });
  game.on('levelup', (lv) => {
    sound.level();
    popup(`Nefes seviyesi ${lv}`, 'Mukus daha hızlı birikiyor');
    track('level_up', { level: lv });
    if (lv >= 5 && game.synUses === 0) award('dogal');
  });
  game.on('powerdone', (e) => {
    if (e.kind === 'cyc') {
      if (game.cycUses === 1) cardFound('siklamen');
      return;
    }
    if (e.rebound) {
      sound.warn();
      popup('Rebound', 'Sık kullanım tıkanıklığı geri getirdi', 'warn');
      react('worried', 2600);
      say('Eyvah, geri tepti! Bu yüzden sık kullanmamak gerek.', 3200);
      // NS4-07: uyarı metni oyunda bir kez (rebound'un ilk başladığı 2. kullanımda); popup her seferinde
      if (game.synUses === 2) {
        toast('Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.', 3600);
        cardFound('rebound', true);
      }
    } else {
      popup('3 satır açıldı', 'Tekrarlarsan geri tepebilir', 'warn');
    }
  });
  game.on('garbage', () => {
    view.shake = 0.35;
    sound.warn();
    buzz(30);
    react('worried', 1200);
  });
  game.on('stagecomplete', (r) => lifecycle.handleStageComplete(r));
  game.on('gameover', (reason) => lifecycle.handleGameOver(reason));
}
