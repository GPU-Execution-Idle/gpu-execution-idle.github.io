// Where the QR code on the paper poster points. Set VITE_POSTER_URL at build time to change it.
export const WEB_POSTER_URL: string =
  import.meta.env.VITE_POSTER_URL ?? 'https://gpu-execution-idle.github.io/hotnets26-notebook/';

// The interactive game, linked from the full paper poster. Set VITE_GAME_URL at build time to change it.
export const GAME_URL: string =
  import.meta.env.VITE_GAME_URL ?? 'https://gpu-execution-idle.github.io/hotnets26-game/';
