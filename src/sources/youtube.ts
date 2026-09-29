import { spawn } from "node:child_process";
import type { Track } from "../track.ts";

const base = ["--no-warnings", "--js-runtimes", "node"];
if (process.env.YTDLP_COOKIES) base.push("--cookies", process.env.YTDLP_COOKIES);

function run(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn("yt-dlp", [...base, ...args]);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) return resolve(out);
      const last = err.trim().split("\n").pop();
      reject(new Error(last || `yt-dlp exited with ${code}`));
    });
  });
}

export type Info = {
  _type?: string;
  id: string;
  title: string;
  duration?: number;
  entries?: Info[];
};

export function toTracks(info: Info, by: string): Track[] {
  return (info.entries ?? [info])
    .filter((e) => e.title && e.title !== "[Private video]" && e.title !== "[Deleted video]")
    .map((e) => ({
      title: e.title,
      // music.youtube.com links don't stream reliably, the plain watch url always does
      url: `https://www.youtube.com/watch?v=${e.id}`,
      duration: e.duration,
      thumb: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
      by,
    }));
}

export async function lookup(target: string, by: string, playlist = false, limit?: number) {
  const args = ["-J", playlist ? "--flat-playlist" : "--no-playlist", target];
  if (limit) args.unshift("-I", `1:${limit}`);
  return toTracks(JSON.parse(await run(args)), by);
}

// YouTube Music's songs tab returns the label's own audio upload, the same
// master Spotify plays, instead of a music video with an intro
export async function findSong(query: string, by: string) {
  const url = `https://music.youtube.com/search?q=${encodeURIComponent(query)}#songs`;
  const [song] = await lookup(url, by, true, 1).catch(() => []);
  if (song) return song;

  const [video] = await lookup(`ytsearch1:${query}`, by, true);
  return video;
}

export function stream(target: string) {
  return spawn("yt-dlp", [...base, "-q", "--no-playlist", "-f", "bestaudio/best", "-o", "-", target], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}
