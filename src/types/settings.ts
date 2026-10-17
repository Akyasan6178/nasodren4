// localStorage şemaları. Alan adları fn_settings / fn_meta JSON'unun parçasıdır; değiştirilmemelidir.

/** fn_settings */
export interface Settings {
  sound: boolean; music: boolean; haptics: boolean; ghost: boolean; fps: boolean;
  das: number; arr: number;
}

/** fn_meta: yalnızca cihazdaki yerel ilerleme (yerel rekor, toplam drenaj, rozetler). */
export interface Meta {
  best: number; totalLines: number; badges: string[];
}
