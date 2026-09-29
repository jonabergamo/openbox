import type { Track } from "../track.ts";
import { spotifyTracks } from "./spotify.ts";
import { lookup } from "./youtube.ts";

export type Source =
  | { kind: "youtube"; url: string; playlist: boolean }
  | { kind: "spotify"; type: "track" | "album" | "playlist"; id: string }
  | { kind: "search"; query: string };

const ytHosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"];

export function classify(input: string): Source {
  const s = input.trim();
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return { kind: "search", query: s };
  }

  if (ytHosts.includes(url.hostname)) {
    const playlist = url.pathname === "/playlist" && url.searchParams.has("list");
    return { kind: "youtube", url: s, playlist };
  }

  if (url.hostname === "open.spotify.com") {
    const m = url.pathname.match(/^(?:\/intl-[\w-]+)?\/(track|album|playlist)\/(\w+)/);
    if (m) return { kind: "spotify", type: m[1] as "track" | "album" | "playlist", id: m[2] };
  }

  return { kind: "search", query: s };
}

export async function resolve(input: string, by: string): Promise<Track[]> {
  const src = classify(input);
  switch (src.kind) {
    case "youtube":
      return lookup(src.url, by, src.playlist);
    case "spotify":
      return spotifyTracks(src.type, src.id, by);
    case "search":
      return lookup(`ytsearch1:${src.query}`, by, true);
  }
}
