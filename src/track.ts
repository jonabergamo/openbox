export type Track = {
  title: string;
  url?: string;
  // spotify tracks only carry a search query until they're about to play
  query?: string;
  duration?: number;
  by: string;
};

export function fmt(sec?: number) {
  if (!sec) return "?:??";
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}
