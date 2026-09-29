import { describe, expect, it } from "vitest";
import { parseEmbed } from "../src/sources/spotify.ts";

const page = (entity: unknown) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { state: { data: { entity } } } },
  })}</script></html>`;

describe("parseEmbed", () => {
  it("reads a single track", () => {
    const html = page({ title: "Never Gonna Give You Up", artists: [{ name: "Rick Astley" }], duration: 213573 });
    expect(parseEmbed(html, "track")).toEqual([
      { title: "Never Gonna Give You Up", subtitle: "Rick Astley", duration: 213573 },
    ]);
  });

  it("reads a track list", () => {
    const list = [
      { title: "One", subtitle: "A", duration: 1000 },
      { title: "Two", subtitle: "B, C", duration: 2000 },
    ];
    expect(parseEmbed(page({ trackList: list }), "playlist")).toEqual(list);
  });

  it("fails loudly on pages it doesn't understand", () => {
    expect(() => parseEmbed("<html></html>", "album")).toThrow();
  });
});
