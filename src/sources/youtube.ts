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

type Info = {
  _type?: string;
  id: string;
  title: string;
  url?: string;
  webpage_url?: string;
  duration?: number;
  entries?: Info[];
};

export async function lookup(target: string, by: string, playlist = false): Promise<Track[]> {
  const args = ["-J", playlist ? "--flat-playlist" : "--no-playlist", target];
  const info: Info = JSON.parse(await run(args));
  const items = info.entries ?? [info];

  return items
    .filter((e) => e.title && e.title !== "[Private video]" && e.title !== "[Deleted video]")
    .map((e) => ({
      title: e.title,
      url: e.webpage_url ?? e.url ?? `https://www.youtube.com/watch?v=${e.id}`,
      duration: e.duration,
      by,
    }));
}

export function stream(target: string) {
  return spawn("yt-dlp", [...base, "-q", "--no-playlist", "-f", "bestaudio/best", "-o", "-", target], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}
