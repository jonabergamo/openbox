import { describe, expect, it } from "vitest";
import { parseText } from "../src/commands.ts";

describe("parseText", () => {
  it("reads commands with the p! prefix", () => {
    expect(parseText("p!play never gonna give you up")).toEqual({ cmd: "play", arg: "never gonna give you up" });
    expect(parseText("  P!Skip ")).toEqual({ cmd: "skip", arg: "" });
  });

  it("expands short names", () => {
    expect(parseText("p!p https://youtu.be/x")).toEqual({ cmd: "play", arg: "https://youtu.be/x" });
    expect(parseText("p!np")).toEqual({ cmd: "nowplaying", arg: "" });
    expect(parseText("p!q")).toEqual({ cmd: "queue", arg: "" });
  });

  it("ignores normal chat and unknown commands", () => {
    expect(parseText("play something")).toBeUndefined();
    expect(parseText("!play something")).toBeUndefined();
    expect(parseText("p!dance")).toBeUndefined();
    expect(parseText("p!toString")).toBeUndefined();
    expect(parseText("hey p!play")).toBeUndefined();
  });
});
