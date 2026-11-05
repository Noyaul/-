import type { Narrative, NarrativeChapter, NarrativeRoute } from "./narrativeSchema";
import { characterSlotIds, routeIds } from "./narrativeSchema";

export type ChapterStatus = "locked" | "available" | "completed";

export type NarrativeProgress = {
  completedSharedChapters: string[];
  completedRouteChapters: Record<(typeof routeIds)[number], string[]>;
  discoveredCharacterIds: string[];
};

export function initialNarrativeProgress(narrative?: Narrative): NarrativeProgress | undefined {
  if (!narrative) return undefined;
  return {
    completedSharedChapters: [],
    completedRouteChapters: Object.fromEntries(routeIds.map((id) => [id, []])) as NarrativeProgress["completedRouteChapters"],
    discoveredCharacterIds: [],
  };
}

function completedForRoute(progress: NarrativeProgress, routeId: NarrativeRoute["id"]) {
  return progress.completedRouteChapters[routeId] ?? [];
}

function effectivePrerequisites(chapters: NarrativeChapter[], chapter: NarrativeChapter) {
  const previous = chapters
    .filter((candidate) => candidate.order < chapter.order)
    .sort((a, b) => b.order - a.order)[0];
  return [...new Set([...chapter.prerequisites, ...(previous ? [previous.id] : [])])];
}

export function getSharedChapterStatus(
  narrative: Narrative,
  progress: NarrativeProgress,
  chapterId: string,
): ChapterStatus {
  const chapter = narrative.sharedChapters.find((item) => item.id === chapterId);
  if (!chapter) return "locked";
  if (progress.completedSharedChapters.includes(chapterId)) return "completed";
  const completed = new Set(progress.completedSharedChapters);
  const ready = effectivePrerequisites(narrative.sharedChapters, chapter).every((id) => completed.has(id));
  return ready ? "available" : "locked";
}

export function getRouteChapterStatus(
  narrative: Narrative,
  progress: NarrativeProgress,
  routeId: NarrativeRoute["id"],
  chapterId: string,
): ChapterStatus {
  const route = narrative.routes.find((item) => item.id === routeId);
  const chapter = route?.chapters.find((item) => item.id === chapterId);
  if (!route || !chapter) return "locked";
  const completedRoute = completedForRoute(progress, routeId);
  if (completedRoute.includes(chapterId)) return "completed";
  const completed = new Set([...progress.completedSharedChapters, ...completedRoute]);
  const ready = effectivePrerequisites(route.chapters, chapter).every((id) => completed.has(id));
  return ready ? "available" : "locked";
}

export function completeSharedChapter(
  narrative: Narrative,
  previous: NarrativeProgress,
  chapterId: string,
): NarrativeProgress {
  if (getSharedChapterStatus(narrative, previous, chapterId) !== "available") return previous;
  const next: NarrativeProgress = {
    ...previous,
    completedSharedChapters: [...previous.completedSharedChapters, chapterId],
    completedRouteChapters: { ...previous.completedRouteChapters },
    discoveredCharacterIds: [...previous.discoveredCharacterIds],
  };
  narrative.characters.forEach((character) => {
    if (character.revealAtChapterId === chapterId && !next.discoveredCharacterIds.includes(character.id)) {
      next.discoveredCharacterIds.push(character.id);
    }
  });
  return next;
}

export function completeRouteChapter(
  narrative: Narrative,
  previous: NarrativeProgress,
  routeId: NarrativeRoute["id"],
  chapterId: string,
): NarrativeProgress {
  if (getRouteChapterStatus(narrative, previous, routeId, chapterId) !== "available") return previous;
  return {
    ...previous,
    completedSharedChapters: [...previous.completedSharedChapters],
    completedRouteChapters: {
      ...previous.completedRouteChapters,
      [routeId]: [...completedForRoute(previous, routeId), chapterId],
    },
    discoveredCharacterIds: [...previous.discoveredCharacterIds],
  };
}

export function discoverCharacter(
  previous: NarrativeProgress,
  characterId: (typeof characterSlotIds)[number],
): NarrativeProgress {
  if (previous.discoveredCharacterIds.includes(characterId)) return previous;
  return { ...previous, discoveredCharacterIds: [...previous.discoveredCharacterIds, characterId] };
}
