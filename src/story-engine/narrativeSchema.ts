import { z } from "zod";

const stableId = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/, "需要稳定的英文 ID");

export const characterSlotIds = [
  "lead-1",
  "lead-2",
  "lead-3",
  "lead-4",
  "lead-5",
  "lead-6",
] as const;

export const routeIds = [
  "route-1",
  "route-2",
  "route-3",
  "route-4",
  "route-5",
  "route-6",
] as const;

export const narrativeChapterSchema = z.object({
  id: stableId,
  title: z.string().default(""),
  summary: z.string().default(""),
  order: z.number().int().positive(),
  prerequisites: z.array(stableId).default([]),
}).strict();

export const narrativeCharacterSchema = z.object({
  id: z.enum(characterSlotIds),
  name: z.string().default(""),
  avatar: z.string().default(""),
  bio: z.string().default(""),
  revealAtChapterId: stableId.optional(),
}).strict();

export const narrativeRouteSchema = z.object({
  id: z.enum(routeIds),
  characterId: z.enum(characterSlotIds),
  title: z.string().default(""),
  chapters: z.array(narrativeChapterSchema).default([]),
}).strict();

export const narrativeSchema = z.object({
  characters: z.array(narrativeCharacterSchema).length(6),
  sharedChapters: z.array(narrativeChapterSchema).default([]),
  routes: z.array(narrativeRouteSchema).length(6),
}).strict();

export type NarrativeChapter = z.infer<typeof narrativeChapterSchema>;
export type NarrativeCharacter = z.infer<typeof narrativeCharacterSchema>;
export type NarrativeRoute = z.infer<typeof narrativeRouteSchema>;
export type Narrative = z.infer<typeof narrativeSchema>;

export function validateNarrativeReferences(narrative: Narrative): string[] {
  const errors: string[] = [];
  const characterIds = new Set(narrative.characters.map((c) => c.id));
  const sharedIds = new Set(narrative.sharedChapters.map((c) => c.id));
  const allChapterIds = new Set<string>();
  const addChapter = (chapter: NarrativeChapter, path: string) => {
    if (allChapterIds.has(chapter.id)) errors.push(path + ".id: 重复章节 ID " + chapter.id);
    allChapterIds.add(chapter.id);
  };

  narrative.sharedChapters.forEach((chapter, index) =>
    addChapter(chapter, `sharedChapters.${index}`),
  );
  narrative.routes.forEach((route, routeIndex) => {
    if (!characterIds.has(route.characterId))
      errors.push(`routes.${routeIndex}.characterId: 角色槽位不存在`);
    const routeChapterIds = new Set(route.chapters.map((chapter) => chapter.id));
    route.chapters.forEach((chapter, chapterIndex) => {
      const path = `routes.${routeIndex}.chapters.${chapterIndex}`;
      addChapter(chapter, path);
      chapter.prerequisites.forEach((requiredId, prerequisiteIndex) => {
        if (!sharedIds.has(requiredId) && !routeChapterIds.has(requiredId))
          errors.push(`${path}.prerequisites.${prerequisiteIndex}: 前置章节不存在或属于其他路线`);
      });
    });
  });

  narrative.sharedChapters.forEach((chapter, index) => {
    chapter.prerequisites.forEach((requiredId, prerequisiteIndex) => {
      if (!sharedIds.has(requiredId))
        errors.push(`sharedChapters.${index}.prerequisites.${prerequisiteIndex}: 公共前置章节不存在`);
    });
  });

  narrative.characters.forEach((character, index) => {
    if (character.revealAtChapterId && !sharedIds.has(character.revealAtChapterId))
      errors.push(`characters.${index}.revealAtChapterId: 角色揭示章节必须属于公共主线`);
  });

  const expected = characterSlotIds.map((id) => id);
  const actualCharacters = narrative.characters.map((c) => c.id);
  const actualRoutes = narrative.routes.map((r) => r.id);
  if (new Set(actualCharacters).size !== 6)
    errors.push("characters: 六个角色槽位不能重复");
  if (new Set(actualRoutes).size !== 6)
    errors.push("routes: 六条路线 ID 不能重复");
  for (let i = 0; i < 6; i++) {
    if (actualCharacters[i] !== expected[i])
      errors.push("characters: 必须按 lead-1 至 lead-6 的固定顺序配置");
    if (actualRoutes[i] !== routeIds[i] || narrative.routes[i].characterId !== characterSlotIds[i])
      errors.push("routes: route-1 至 route-6 必须分别对应 lead-1 至 lead-6");
  }
  return errors;
}
