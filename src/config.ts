function need(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`missing ${key} in env`);
  return v;
}

export const cfg = {
  token: need("DISCORD_TOKEN"),
  clientId: need("DISCORD_CLIENT_ID"),
  guildId: need("GUILD_ID"),
};
