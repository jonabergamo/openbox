import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { Queue, queues } from "./player.ts";
import { resolve } from "./sources/resolve.ts";
import { card, fmt, type Track } from "./track.ts";

type Handler = (i: ChatInputCommandInteraction) => Promise<unknown>;

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

function queueOf(i: ChatInputCommandInteraction) {
  const q = queues.get(i.guildId!);
  if (!q) throw new Error("Nothing is playing.");
  return q;
}

// angle brackets keep discord from unfurling every link in the list
const link = (t: Track) => (t.url ? `[${t.title}](<${t.url}>)` : t.title);

export const handlers: Record<string, Handler> = {
  async play(i) {
    const voice = (i.member as GuildMember).voice.channel;
    if (!voice) return i.reply({ content: "Join a voice channel first.", flags: MessageFlags.Ephemeral });
    if (!i.channel?.isSendable()) return i.reply({ content: "I can't post in this channel.", flags: MessageFlags.Ephemeral });

    await i.deferReply();
    const tracks = await resolve(i.options.getString("query", true), i.user.displayName);
    if (!tracks.length) return i.editReply("Found nothing for that.");

    const q = queues.get(i.guildId!) ?? (await Queue.join(voice, i.channel));
    const started = await q.add(tracks);
    const now = started ? q.current : undefined;

    if (tracks.length > 1) {
      const content = `${tracks.length} tracks added.`;
      return i.editReply(now ? { content, embeds: [card(now, "Now playing")] } : content);
    }
    if (started && !now) return i.editReply(`Couldn't play **${tracks[0].title}**.`);
    return i.editReply({ embeds: [now ? card(now, "Now playing") : card(tracks[0], `Queued #${q.tracks.length}`)] });
  },

  async skip(i) {
    const q = queueOf(i);
    const t = q.current;
    q.skip();
    return i.reply(t ? `Skipped **${t.title}**` : "Nothing to skip.");
  },

  async pause(i) {
    queueOf(i).player.pause();
    return i.reply("Paused.");
  },

  async resume(i) {
    queueOf(i).player.unpause();
    return i.reply("Resumed.");
  },

  async stop(i) {
    queueOf(i).stop();
    return i.reply("Stopped and cleared the queue.");
  },

  async queue(i) {
    const q = queueOf(i);
    if (!q.current) return i.reply("The queue is empty.");

    const lines = [`Now **${link(q.current)}** (${fmt(q.current.duration)})`];
    q.tracks.slice(0, 10).forEach((t, n) => lines.push(`${n + 1}. ${link(t)} (${fmt(t.duration)}) by ${t.by}`));
    if (q.tracks.length > 10) lines.push(`and ${q.tracks.length - 10} more`);
    return i.reply(lines.join("\n"));
  },

  async nowplaying(i) {
    const t = queueOf(i).current;
    if (!t) return i.reply("Nothing is playing.");
    return i.reply({ embeds: [card(t, "Now playing")] });
  },
};
