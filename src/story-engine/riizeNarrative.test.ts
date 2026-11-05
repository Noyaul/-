import { describe, expect, it } from "vitest";
import narrativeSource from "../../stories/riize-romance/narrative.json";
import activeStorySource from "../../stories/template/story.json";
import {
  narrativeSchema,
  validateNarrativeReferences,
} from "./narrativeSchema";

describe("RIIZE romance narrative source", () => {
  const narrative = narrativeSchema.parse(narrativeSource);

  it("keeps the dedicated narrative source synchronized with the active phone story", () => {
    expect(activeStorySource.narrative).toEqual(narrativeSource);
  });

  it("keeps the six character slots and routes in the agreed order", () => {
    expect(narrative.characters.map((character) => character.name)).toEqual([
      "SHOTARO",
      "EUNSEOK",
      "SUNGCHAN",
      "WONBIN",
      "SOHEE",
      "ANTON",
    ]);
    expect(narrative.routes.map((route) => route.characterId)).toEqual([
      "lead-1",
      "lead-2",
      "lead-3",
      "lead-4",
      "lead-5",
      "lead-6",
    ]);
  });

  it("contains six ordered shared chapters and all six individual route outlines", () => {
    expect(narrative.sharedChapters.map((chapter) => chapter.order)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(narrative.routes.map((route) => route.chapters.length)).toEqual([
      6, 6, 6, 8, 7, 7,
    ]);
    expect(validateNarrativeReferences(narrative)).toEqual([]);
  });

  it("does not reveal Wonbin before the second shared chapter", () => {
    const wonbin = narrative.characters.find((character) => character.id === "lead-4");
    expect(wonbin?.revealAtChapterId).toBe("shared-2");
  });

  it("keeps Eunseok's dog-owner side story as a private two-person chat", () => {
    const eunseok = narrative.characters.find((character) => character.id === "lead-2");
    expect(eunseok?.bio).toContain("双人私人聊天");
    expect(eunseok?.bio).toContain("不设置群聊");
  });
});
