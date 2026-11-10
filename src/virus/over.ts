// NS4-44: Virüs Avı oyun sonu: klasik #scr-over ekranı virüs moduna göre doldurulur (#app[data-mode='virus'] altında
// klasik satır etiketi, rozetler ve global gönderim formu CSS ile gizlenir). Elif: süre/tahta → oops, final → alkış.
import { $ } from '../ui/dom';
import { renderBadges } from '../ui/badges';
import { setTip, show } from '../ui/screens';
import { VIRUS_TEXT } from './copy';
import { NARRATOR } from './elif';
import type { VirusOverReason } from './VirusGame';

export interface VirusOverView {
  readonly score: number;
  readonly level: number;
  readonly viruses: number;
  readonly best: number;
  readonly isBest: boolean;
  readonly reason: VirusOverReason;
}

const fmt = (n: number) => n.toLocaleString('tr-TR');

export function virusOverTitle(reason: VirusOverReason): string {
  if (reason === 'complete') return VIRUS_TEXT.finalTitle;
  return reason === 'time' ? VIRUS_TEXT.overTime : VIRUS_TEXT.overBlock;
}

export function renderVirusOver(r: VirusOverView): void {
  $('o-title').textContent = virusOverTitle(r.reason);
  $('o-score').textContent = fmt(r.score);
  $('o-lines').textContent = String(r.viruses);
  $('o-level').textContent = String(r.level);
  $('o-best').textContent = fmt(r.best);
  $('newbest').style.display = r.isBest ? 'block' : 'none';
  $('over-elif').innerHTML = NARRATOR.svg(r.reason === 'complete' ? 'alkis' : 'oops');
  renderBadges($('o-badges'));
  setTip('tip-over');
  show('scr-over');
}
