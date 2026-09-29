import { describe, expect, it } from "vitest";
import { classify } from "../src/sources/resolve.ts";

describe("classify", () => {
  it("treats plain text as a search", () => {
    expect(classify("  daft punk around the world ")).toEqual({ kind: "search", query: "daft punk around the world" });
  });

  it("reads youtube videos and playlists", () => {
    expect(classify("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ kind: "youtube", playlist: false });
    expect(classify("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123")).toMatchObject({ playlist: false });
    expect(classify("https://music.youtube.com/playlist?list=PL123")).toMatchObject({ kind: "youtube", playlist: true });
  });

  it("reads spotify links, with or without the intl prefix", () => {
    expect(classify("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc")).toEqual({
      kind: "spotify",
      type: "track",
      id: "4cOdK2wGLETKBW3PvgPWqT",
    });
    expect(classify("https://open.spotify.com/intl-pt/playlist/37i9dQZF1DXcBWIGoYBM5M")).toMatchObject({
      type: "playlist",
      id: "37i9dQZF1DXcBWIGoYBM5M",
    });
  });

  it("falls back to search for other urls", () => {
    expect(classify("https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt").kind).toBe("search");
    expect(classify("https://soundcloud.com/foo").kind).toBe("search");
  });
});
