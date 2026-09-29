import { SlashCommandBuilder, type EmbedBuilder, type GuildMember, type SendableChannels } from "discord.js";
import { Queue, queues } from "./player.ts";
import { resolve } from "./sources/resolve.ts";
import { card, fmt, type Track } from "./track.ts";

// what a command needs, whether it came from a slash command or a chat message
export type Ctx = {
  guildId: string;
  member: GuildMember;
  channel: SendableChannels | null;
  arg: string;
};

export type Reply = string | { content?: string; embeds: EmbedBuilder[] };

export const defs = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a YouTube or Spotify link, or search YouTube")
    .addStringOption((o) => o.setName("query").setDescription("Link or search").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Skip the current track"),
  new SlashCommandBuilder().setName("pause").setDescription("Pause"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume"),
  new SlashCommandBuilder().setName("stop").setDescription("Stop and clear the queue"),
  new SlashCommandBuilder().setName("queue").setDescription("Show what's coming up"),
  new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current track"),
].map((c) => c.toJSON());

function queueOf(c: Ctx) {
  const q = queues.get(c.guildId);
  if (!q) throw new Error("Nothing is playing.");
  return q;
}

// angle brackets keep discord from unfurling every link in the list
const link = (t: Track) => (t.url ? `[${t.title}](<${t.url}>)` : t.title);

export const actions: Record<string, (c: Ctx) => Promise<Reply>> = {
  async play(c) {
    if (!c.arg) throw new Error("Tell me what to play.");
    const voice = c.member.voice.channel;
    if (!voice) throw new Error("Join a voice channel first.");
    if (!c.channel) throw new Error("I can't post in this channel.");

    const tracks = await resolve(c.arg, c.member.displayName);
    if (!tracks.length) return "Found nothing for that.";

    const q = queues.get(c.guildId) ?? (await Queue.join(voice, c.channel));
    const started = await q.add(tracks);
    const now = started ? q.current : undefined;

    if (tracks.length > 1) {
      const content = `${tracks.length} tracks added.`;
      return now ? { content, embeds: [card(now, "Now playing")] } : content;
    }
    if (started && !now) return `Couldn't play **${tracks[0].title}**.`;
    return { embeds: [now ? card(now, "Now playing") : card(tracks[0], `Queued #${q.tracks.length}`)] };
  },

  async skip(c) {
    const q = queueOf(c);
    const t = q.current;
    q.skip();
    return t ? `Skipped **${t.title}**` : "Nothing to skip.";
  },

  async pause(c) {
    queueOf(c).player.pause();
    return "Paused.";
  },

  async resume(c) {
    queueOf(c).player.unpause();
    return "Resumed.";
  },

  async stop(c) {
    queueOf(c).stop();
    return "Stopped and cleared the queue.";
  },

  async queue(c) {
    const q = queueOf(c);
    if (!q.current) return "The queue is empty.";

    const lines = [`Now **${link(q.current)}** (${fmt(q.current.duration)})`];
    q.tracks.slice(0, 10).forEach((t, n) => lines.push(`${n + 1}. ${link(t)} (${fmt(t.duration)}) by ${t.by}`));
    if (q.tracks.length > 10) lines.push(`and ${q.tracks.length - 10} more`);
    return lines.join("\n");
  },

  async nowplaying(c) {
    const t = queueOf(c).current;
    if (!t) return "Nothing is playing.";
    return { embeds: [card(t, "Now playing")] };
  },
};

const aliases: Record<string, string> = { p: "play", s: "skip", q: "queue", np: "nowplaying" };

// ".play x" or ".p x" typed as a normal message
export function parseText(content: string, prefix: string) {
  const s = content.trim();
  if (!s.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const m = s.slice(prefix.length).match(/^(\w+)(?:\s+(.*))?$/s);
  if (!m) return;
  const name = m[1].toLowerCase();
  const cmd = aliases[name] ?? name;
  if (!Object.hasOwn(actions, cmd)) return;
  return { cmd, arg: m[2]?.trim() ?? "" };
}
