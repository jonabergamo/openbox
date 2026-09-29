# Openbox

A Discord music bot you host yourself. Give it a YouTube link, a Spotify track, album or playlist, or just a few words to search, and it joins your voice channel and plays it.

I built it because every public music bot my friend and I used either got shut down or started asking for a subscription. A bot for one server doesn't need any of that. It runs in a single Docker container on whatever machine you leave on, needs no database and no Spotify account, and only answers on your server.

## Commands

| command | what it does |
| --- | --- |
| `/play <query>` | plays or queues a YouTube video or playlist, a Spotify track, album or playlist, or the first YouTube result for a search |
| `/skip` | skips the current track |
| `/pause` and `/resume` | pause and resume |
| `/stop` | stops and clears the queue |
| `/queue` | shows the next ten tracks |
| `/nowplaying` | shows a card with the current track, its link and who asked for it |

Every command also works as a normal chat message starting with `.`, which is quicker than picking the slash command from the menu. `.play daft punk` or just `.p daft punk`, and `.s`, `.q` and `.np` for skip, queue and now playing. Set `PREFIX` in `.env` to use something else, like `!` or `-`.

The bot leaves the channel after two minutes with nothing to play or nobody listening. It only answers on the server set in `GUILD_ID`, so each server runs its own copy.

## Running it

You need Docker and a machine that stays on. Create an application at https://discord.com/developers/applications, add a bot to it and copy its token. On the same Bot page turn on Message Content Intent, since the text commands need to read messages. The application ID is on the General Information page. Invite it with this link, replacing the ID.

```
https://discord.com/oauth2/authorize?client_id=<APP_ID>&scope=bot+applications.commands&permissions=3148800
```

Then fill in `.env` and start it.

```bash
git clone https://github.com/jonabergamo/openbox.git && cd openbox
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

The slash commands are registered on the server every time the bot starts, so they show up right away. To hack on it without Docker you need Node 22, pnpm, ffmpeg and yt-dlp on the path, then `pnpm install` and `pnpm dev`. `pnpm test` runs the tests.

## How it works

Everything plays from YouTube through yt-dlp. The audio is piped straight into ffmpeg and sent to Discord, nothing is saved to disk.

Spotify doesn't let apps stream its audio, so a Spotify link only gives me names. And since the February 2026 API changes a developer app can only read the contents of playlists its owner made. So instead of the API the bot reads the public embed page Spotify serves for every track, album and playlist, takes artist and title for each song and looks it up once it reaches the front of the queue. A 50 song playlist queues instantly and no Spotify account is needed. The lookup searches the songs tab of YouTube Music, which returns the label's own audio upload, the same studio master Spotify plays, rather than a music video with an intro. If that finds nothing it falls back to a normal YouTube search.

The container updates yt-dlp every time it starts, because YouTube changes things often enough that an old copy stops working within weeks.

## If YouTube starts blocking it

YouTube sometimes answers with "sign in to confirm you're not a bot", mostly on server IPs. Running at home avoids most of it. If it happens anyway, export your YouTube cookies to a `cookies.txt` file with a browser extension, mount it in `compose.yaml` and point `YTDLP_COOKIES` at it.

```yaml
    volumes:
      - ./cookies.txt:/app/cookies.txt:ro
```

## What's missing

No shuffle, loop, volume or buttons yet. Very long Spotify playlists may come in cut short, since the embed page doesn't always list every song. Pull requests are welcome.

## A note on YouTube

Streaming from YouTube this way goes against YouTube's terms of service. Openbox is meant for your own server and your own friends. Don't run it as a public bot.

## License

MIT
