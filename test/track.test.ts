import { describe, expect, it } from "vitest";
import { toTracks } from "../src/sources/youtube.ts";
import { card } from "../src/track.ts";

describe("card", () => {
  it("links the title and shows duration and requester", () => {
    const e = card(
      { title: "Song", url: "https://youtu.be/x", thumb: "https://i.ytimg.com/vi/x/hqdefault.jpg", duration: 214, by: "jonathan" },
      "Now playing",
    ).toJSON();

    expect(e.author?.name).toBe("Now playing");
    expect(e.url).toBe("https://youtu.be/x");
    expect(e.thumbnail?.url).toBe("https://i.ytimg.com/vi/x/hqdefault.jpg");
    expect(e.description).toBe("3:34 · asked by jonathan");
  });

  it("works for a spotify track that has no link yet", () => {
    const e = card({ title: "A - B", query: "A - B", by: "me" }, "Queued #2").toJSON();
    expect(e.url).toBeUndefined();
    expect(e.thumbnail).toBeUndefined();
  });
});

describe("toTracks", () => {
  it("builds urls and thumbnails from flat playlist entries", () => {
    const tracks = toTracks(
      {
        _type: "playlist",
        id: "PL1",
        title: "mix",
        entries: [
          { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", duration: 214 },
          { id: "zzz", title: "[Deleted video]" },
        ],
      },
      "me",
    );

    expect(tracks).toEqual([
      {
        title: "Never Gonna Give You Up",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 214,
        thumb: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        by: "me",
      },
    ]);
  });
});
