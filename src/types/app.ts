/** Uygulama (ekran) durumu. Game.state'ten ayrıdır: Game.state oyun içi durumdur (play | clearing | draining | over | idle). */
export type AppState = 'menu' | 'playing' | 'paused' | 'over';
