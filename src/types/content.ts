// İçerik tipleri. Metinler content/ altındadır ve değiştirilmemelidir.
import type { StageRules } from './game';

/** Sağlık ipucu: [başlık, gövde]. */
export type HealthTip = readonly [title: string, body: string];

/** Rozet kimliği; fn_meta.badges içinde bu dizeler saklanır. */
export type BadgeId = 'ozmotik' | 'noro' | 'akis' | 'dogal' | 'derin';

export interface BadgeDefinition {
  readonly id: BadgeId;
  readonly name: string;
  readonly desc: string;
}

/** NS4-09: dört paranazal sinüs (sinüs haritası). */
export type SinusId = 'maksiller' | 'frontal' | 'etmoid' | 'sfenoid';

/** NS4-09: bilgi kartı kimliği; fn_meta.cards içinde saklanır. */
export type CardId =
  | 'maksiller'
  | 'frontal'
  | 'etmoid'
  | 'sfenoid'
  | 'mukus'
  | 'gorev'
  | 'virus'
  | 'hekim'
  | 'siklamen'
  | 'rebound'
  | 'koku'
  | 'su'
  | 'belirti';

export interface InfoCard {
  readonly id: CardId;
  readonly title: string;
  readonly body: string;
  /** Kartın simgesi (ui/cards.ts içindeki çizimlerden biri). */
  readonly icon: 'sinus' | 'cilia' | 'virus' | 'doctor' | 'flower' | 'spray' | 'nose' | 'water' | 'skull';
  /** Kaynak adı ve adresi (kartta gösterilir). */
  readonly source: string;
  readonly url: string;
  /** 'approved': onaylı ipucu metni (content/tips.ts); 'review': tıbbi/editoryal onay bekliyor. */
  readonly status: 'approved' | 'review';
}

/** NS4-09: sinüs haritasındaki bir bölüm. */
export interface StageDef {
  readonly sinus: SinusId;
  readonly part: 1 | 2;
  /** Bölüm bitince açılan bilgi kartı. */
  readonly card: CardId;
  /** Bölüm başında Sıklamen'in söylediği cümle. */
  readonly intro: string;
  readonly rules: StageRules;
}
