import { describe, expect, it } from "vitest";
import { narrativeSchema } from "./narrativeSchema";
import {
  completeRouteChapter,
  completeSharedChapter,
  getRouteChapterStatus,
  getSharedChapterStatus,
  initialNarrativeProgress,
} from "./narrativeProgress";

const narrative = narrativeSchema.parse({
  characters: ["lead-1", "lead-2", "lead-3", "lead-4", "lead-5", "lead-6"].map((id) => ({
    id,
    ...(id === "lead-1" ? { revealAtChapterId: "shared-1" } : {}),
  })),
  sharedChapters: [
    { id: "shared-1", order: 1 },
    { id: "shared-2", order: 2 },
  ],
  routes: ["route-1", "route-2", "route-3", "route-4", "route-5", "route-6"].map((id, index) => ({
    id,
    characterId: `lead-${index + 1}`,
    chapters: [
      { id: `route-${index + 1}-chapter-1`, order: 1, prerequisites: ["shared-1"] },
      { id: `route-${index + 1}-chapter-2`, order: 2 },
    ],
  })),
});

describe("narrative chapter progression", () => {
  it("starts with the first shared chapter available and later chapters locked", () => {
    const progress = initialNarrativeProgress(narrative)!;
    expect(getSharedChapterStatus(narrative, progress, "shared-1")).toBe("available");
    expect(getSharedChapterStatus(narrative, progress, "shared-2")).toBe("locked");
  });

  it("unlocks shared chapters in order and reveals a character at its configured chapter", () => {
    let progress = initialNarrativeProgress(narrative)!;
    progress = completeSharedChapter(narrative, progress, "shared-1");
    expect(progress.completedSharedChapters).toEqual(["shared-1"]);
    expect(progress.discoveredCharacterIds).toEqual(["lead-1"]);
    expect(getSharedChapterStatus(narrative, progress, "shared-2")).toBe("available");
    expect(completeSharedChapter(narrative, progress, "shared-1")).toBe(progress);
  });

  it("keeps all six route tracks independent and requires shared prerequisites", () => {
    let progress = initialNarrativeProgress(narrative)!;
    expect(getRouteChapterStatus(narrative, progress, "route-1", "route-1-chapter-1")).toBe("locked");
    progress = completeSharedChapter(narrative, progress, "shared-1");
    expect(getRouteChapterStatus(narrative, progress, "route-1", "route-1-chapter-1")).toBe("available");
    progress = completeRouteChapter(narrative, progress, "route-1", "route-1-chapter-1");
    expect(getRouteChapterStatus(narrative, progress, "route-1", "route-1-chapter-2")).toBe("available");
    expect(getRouteChapterStatus(narrative, progress, "route-2", "route-2-chapter-1")).toBe("available");
    expect(progress.completedRouteChapters["route-1"]).toEqual(["route-1-chapter-1"]);
    expect(progress.completedRouteChapters["route-2"]).toEqual([]);
  });

  it("does not complete locked chapters or leak one route's progress into another", () => {
    const progress = initialNarrativeProgress(narrative)!;
    const unchanged = completeRouteChapter(narrative, progress, "route-1", "route-1-chapter-1");
    expect(unchanged).toBe(progress);
    expect(progress.completedRouteChapters["route-1"]).toEqual([]);
    expect(progress.completedRouteChapters["route-6"]).toEqual([]);
  });
});
