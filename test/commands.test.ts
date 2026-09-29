import { describe, expect, it } from "vitest";
import { parseText } from "../src/commands.ts";

describe("parseText", () => {
  it("reads commands with the prefix", () => {
    expect(parseText(".play never gonna give you up", ".")).toEqual({ cmd: "play", arg: "never gonna give you up" });
    expect(parseText("  .Skip ", ".")).toEqual({ cmd: "skip", arg: "" });
  });

  it("expands short names", () => {
    expect(parseText(".p https://youtu.be/x", ".")).toEqual({ cmd: "play", arg: "https://youtu.be/x" });
    expect(parseText(".np", ".")).toEqual({ cmd: "nowplaying", arg: "" });
    expect(parseText(".q", ".")).toEqual({ cmd: "queue", arg: "" });
  });

  it("works with longer prefixes", () => {
    expect(parseText("P!p song", "p!")).toEqual({ cmd: "play", arg: "song" });
    expect(parseText(".p song", "p!")).toBeUndefined();
  });

  it("ignores normal chat and unknown commands", () => {
    expect(parseText("play something", ".")).toBeUndefined();
    expect(parseText("...", ".")).toBeUndefined();
    expect(parseText(". p song", ".")).toBeUndefined();
    expect(parseText(".dance", ".")).toBeUndefined();
    expect(parseText(".toString", ".")).toBeUndefined();
    expect(parseText("hey .play", ".")).toBeUndefined();
  });
});
