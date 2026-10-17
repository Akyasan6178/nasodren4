// localStorage şemaları. Alan adları fn_settings / fn_meta JSON'unun parçasıdır; değiştirilmemelidir.

/** fn_settings */
export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  ghost: boolean;
  fps: boolean;
  /** Basılı tutunca kayma gecikmesi (ms, 50..300). */
  das: number;
  /** Kayma tekrar hızı (ms, 0..100; 0 = anında duvara). */
  arr: number;
}

export type BooleanSettingKey = 'sound' | 'music' | 'haptics' | 'ghost' | 'fps';
export type NumericSettingKey = 'das' | 'arr';

/**
 * fn_meta: yalnızca cihazdaki yerel ilerleme (yerel rekor, toplam drenaj, rozetler).
 * `badges` saklanan ham dizedir (doğrulanmaz); yeni rozetler yalnızca BadgeId olarak eklenir.
 */
export interface Meta {
  best: number;
  totalLines: number;
  badges: string[];
}
