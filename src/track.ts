import { EmbedBuilder } from "discord.js";

export type Track = {
  title: string;
  url?: string;
  // spotify tracks only carry a search query until they're about to play
  query?: string;
  duration?: number;
  thumb?: string;
  by: string;
};

export function fmt(sec?: number) {
  if (!sec) return "?:??";
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

export function card(t: Track, heading: string) {
  const e = new EmbedBuilder()
    .setAuthor({ name: heading })
    .setTitle(t.title.slice(0, 256))
    .setDescription(`${fmt(t.duration)} · asked by ${t.by}`);
  if (t.url) e.setURL(t.url);
  if (t.thumb) e.setThumbnail(t.thumb);
  return e;
}
