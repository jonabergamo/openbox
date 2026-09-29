import type { ChildProcess } from "node:child_process";
import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type VoiceConnection,
} from "@discordjs/voice";
import type { SendableChannels, VoiceBasedChannel } from "discord.js";
import { stream } from "./sources/youtube.ts";
import type { Track } from "./track.ts";

const IDLE_MS = 2 * 60_000;

export const queues = new Map<string, Queue>();

export class Queue {
  tracks: Track[] = [];
  current?: Track;
  player = createAudioPlayer();

  private proc?: ChildProcess;
  private idle?: NodeJS.Timeout;
  private dead = false;

  constructor(
    public voice: VoiceBasedChannel,
    public text: SendableChannels,
    private conn: VoiceConnection,
  ) {
    conn.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => this.next(true));
    this.player.on("error", (err) => console.error(`player: ${err.message}`));

    conn.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // moved to another channel or a brief drop, discord reconnects on its own
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  static async join(voice: VoiceBasedChannel, text: SendableChannels) {
    const conn = joinVoiceChannel({
      channelId: voice.id,
      guildId: voice.guild.id,
      adapterCreator: voice.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 20_000);
    } catch (err) {
      conn.destroy();
      throw err;
    }

    const q = new Queue(voice, text, conn);
    queues.set(voice.guild.id, q);
    return q;
  }

  // returns true when the first added track started right away
  add(tracks: Track[]) {
    this.tracks.push(...tracks);
    if (this.current) return false;
    this.next(false);
    return true;
  }

  skip() {
    this.player.stop(true);
  }

  stop() {
    this.tracks = [];
    this.player.stop(true);
  }

  alone() {
    return !this.voice.members.some((m) => !m.user.bot);
  }

  leaveSoon() {
    clearTimeout(this.idle);
    this.idle = setTimeout(() => {
      if (!this.current || this.alone()) this.destroy();
    }, IDLE_MS);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    clearTimeout(this.idle);
    this.proc?.kill();
    this.tracks = [];
    this.player.stop(true);
    if (this.conn.state.status !== VoiceConnectionStatus.Destroyed) this.conn.destroy();
    queues.delete(this.voice.guild.id);
  }

  private next(announce: boolean) {
    if (this.dead) return;
    this.proc?.kill();
    this.proc = undefined;

    const t = this.tracks.shift();
    this.current = t;
    if (!t) return this.leaveSoon();

    const proc = stream(t.url ?? `ytsearch1:${t.query}`);
    this.proc = proc;

    let err = "";
    proc.stderr?.on("data", (d) => (err += d));
    proc.on("close", (code) => {
      // killed by skip/stop gives a null code, anything else is a real failure
      if (!code) return;
      const reason = err.trim().split("\n").pop() ?? `exit ${code}`;
      console.error(`yt-dlp failed on ${t.title}: ${reason}`);
      this.text.send(`Couldn't play **${t.title}**, skipping.`).catch(() => {});
    });

    this.player.play(createAudioResource(proc.stdout!, { inputType: StreamType.Arbitrary }));
    if (announce) this.text.send(`Now playing **${t.title}**`).catch(() => {});
  }
}
