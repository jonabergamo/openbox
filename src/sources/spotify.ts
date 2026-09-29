import type { Track } from "../track.ts";

type Item = { title: string; subtitle: string; duration: number };

// The Web API only returns playlist contents for playlists you own since the
// February 2026 changes, so we read the public embed page instead.
export function parseEmbed(html: string, type: string): Item[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s);
  if (!m) throw new Error("couldn't read that Spotify page");

  const e = JSON.parse(m[1]).props?.pageProps?.state?.data?.entity;
  if (!e) throw new Error("Spotify didn't return anything for that link");

  if (type === "track") {
    const artists = (e.artists ?? []).map((a: { name: string }) => a.name).join(", ");
    return [{ title: e.title, subtitle: artists, duration: e.duration }];
  }
  return e.trackList ?? [];
}

export async function spotifyTracks(type: string, id: string, by: string): Promise<Track[]> {
  const res = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Spotify answered ${res.status}`);

  return parseEmbed(await res.text(), type).map((t) => {
    const name = t.subtitle ? `${t.subtitle} - ${t.title}` : t.title;
    return { title: name, query: name, duration: Math.round(t.duration / 1000), by };
  });
}
