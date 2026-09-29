import { Client, Events, GatewayIntentBits, MessageFlags, REST, Routes, type GuildMember } from "discord.js";
import { actions, defs, parseText, type Reply } from "./commands.ts";
import { cfg } from "./config.ts";
import { queues } from "./player.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

client.once(Events.ClientReady, async (c) => {
  // guild commands update instantly, so registering on every boot is fine
  const rest = new REST().setToken(cfg.token);
  await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body: defs });
  console.log(`logged in as ${c.user.tag}, ${defs.length} commands registered`);
});

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() || i.guildId !== cfg.guildId) return;

  const run = actions[i.commandName];
  if (!run) return;

  try {
    if (i.commandName === "play") await i.deferReply();
    const res = await run({
      guildId: i.guildId,
      member: i.member as GuildMember,
      channel: i.channel?.isSendable() ? i.channel : null,
      arg: i.options.getString("query") ?? "",
    });
    await (i.deferred ? i.editReply(res) : i.reply(res));
  } catch (err) {
    if (i.deferred || i.replied) await i.editReply(errText(err)).catch(() => {});
    else await i.reply({ content: errText(err), flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || msg.guildId !== cfg.guildId || !msg.member) return;

  const parsed = parseText(msg.content, cfg.prefix);
  if (!parsed) return;

  const channel = msg.channel.isSendable() ? msg.channel : null;
  const reply = (res: Reply) =>
    msg.reply({ ...(typeof res === "string" ? { content: res } : res), allowedMentions: { repliedUser: false } });

  try {
    if (parsed.cmd === "play") await channel?.sendTyping();
    await reply(await actions[parsed.cmd]({ guildId: msg.guildId, member: msg.member, channel, arg: parsed.arg }));
  } catch (err) {
    await reply(errText(err)).catch(() => {});
  }
});

client.on(Events.VoiceStateUpdate, (prev) => {
  const q = queues.get(prev.guild.id);
  if (q && q.alone()) q.leaveSoon();
});

client.login(cfg.token);
