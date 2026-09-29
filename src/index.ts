import { Client, Events, GatewayIntentBits, MessageFlags, REST, Routes } from "discord.js";
import { defs, handlers } from "./commands.ts";
import { cfg } from "./config.ts";
import { queues } from "./player.ts";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once(Events.ClientReady, async (c) => {
  // guild commands update instantly, so registering on every boot is fine
  const rest = new REST().setToken(cfg.token);
  await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body: defs });
  console.log(`logged in as ${c.user.tag}, ${defs.length} commands registered`);
});

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() || i.guildId !== cfg.guildId) return;

  const run = handlers[i.commandName];
  if (!run) return;

  try {
    await run(i);
  } catch (err) {
    const content = err instanceof Error ? err.message : String(err);
    if (i.deferred || i.replied) await i.editReply(content).catch(() => {});
    else await i.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.on(Events.VoiceStateUpdate, (prev) => {
  const q = queues.get(prev.guild.id);
  if (q && q.alone()) q.leaveSoon();
});

client.login(cfg.token);
