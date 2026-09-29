import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { Queue, queues } from "./player.ts";
import { resolve } from "./sources/resolve.ts";
import { fmt } from "./track.ts";

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

export const handlers: Record<string, Handler> = {
  async play(i) {
    const voice = (i.member as GuildMember).voice.channel;
    if (!voice) return i.reply({ content: "Join a voice channel first.", flags: MessageFlags.Ephemeral });
    if (!i.channel?.isSendable()) return i.reply({ content: "I can't post in this channel.", flags: MessageFlags.Ephemeral });

    await i.deferReply();
    const tracks = await resolve(i.options.getString("query", true), i.user.displayName);
    if (!tracks.length) return i.editReply("Found nothing for that.");

    const q = queues.get(i.guildId!) ?? (await Queue.join(voice, i.channel));
    const started = q.add(tracks);

    const first = tracks[0];
    if (tracks.length > 1) {
      const lead = started ? `Playing **${first.title}**` : "Queued";
      return i.editReply(`${lead}, ${tracks.length} tracks added.`);
    }
    return i.editReply(started ? `Playing **${first.title}**` : `Queued **${first.title}** at #${q.tracks.length}`);
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

    const lines = [`Now **${q.current.title}** (${fmt(q.current.duration)})`];
    q.tracks.slice(0, 10).forEach((t, n) => lines.push(`${n + 1}. ${t.title} (${fmt(t.duration)}) by ${t.by}`));
    if (q.tracks.length > 10) lines.push(`and ${q.tracks.length - 10} more`);
    return i.reply(lines.join("\n"));
  },

  async nowplaying(i) {
    const t = queueOf(i).current;
    if (!t) return i.reply("Nothing is playing.");
    return i.reply(`**${t.title}** (${fmt(t.duration)}), asked by ${t.by}${t.url ? `\n<${t.url}>` : ""}`);
  },
};
