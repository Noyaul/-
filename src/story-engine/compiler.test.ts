import { describe, it, expect } from "vitest";
import example from "../../tests/fixtures/story-example/story.json";
import { compileStory } from "./compiler";
import { testStory } from "./testStory";
const copy = () => structuredClone(example);
describe("AI story compiler", () => {
  it("compiles stable IDs deterministically and preserves optional catalog", () => {
    const a = compileStory(copy()),
      b = compileStory(copy());
    expect(a.work).toEqual(b.work);
    expect(a.work.apps).toHaveLength(49);
    expect(a.work.apps.filter((a) => a.installed)).toHaveLength(13);
    expect(a.work.data.wechat[0].sender).toBe("小林");
  });
  it("both actual engine paths pass with password, hidden content and delayed call", () => {
    const { story, work } = compileStory(copy());
    expect(testStory(story, work)).toEqual([]);
  });
  it("rejects dangling node and content references", () => {
    const s = copy();
    s.events[0].next = ["missing"];
    expect(() => compileStory(s)).toThrow("不存在的节点");
    const t = copy();
    t.events[1].actions![0].key = "missing";
    expect(() => compileStory(t)).toThrow("不存在的内容");
  });
  it("rejects duplicate IDs and absent participants", () => {
    const s = copy();
    s.chats[0].messages[0].id = "wx-password";
    expect(() => compileStory(s)).toThrow("重复 ID");
    const t = copy();
    t.chats[0].participants.push("missing");
    expect(() => compileStory(t)).toThrow("联系人不存在");
  });
  it("does not allow a test to bypass hidden content or wrong passwords", () => {
    const { story, work } = compileStory(copy());
    story.tests[0].steps[2].password = "wrong";
    expect(testStory(story, work).join()).toContain("密码不正确");
    story.tests[0].steps.unshift({ event: "read", target: "photo-hidden" });
    expect(testStory(story, work).join()).toContain("不可读");
  });
  it("rejects runtime scripts, arbitrary HTML rich text and remote media", () => {
    const s = copy();
    Object.assign(s, { scripts: ["alert(1)"] });
    expect(() => compileStory(s)).toThrow();
    const t = copy();
    Object.assign(t.content.notes[0], {
      richText: "<script>alert(1)</script>",
    });
    expect(() => compileStory(t)).toThrow("不能导入 HTML");
    const v = copy();
    Object.assign(v.content.photos[0], { media: "javascript:alert(1)" });
    expect(() => compileStory(v)).toThrow("不允许脚本");
  });
  it("requires proof of every ending path", () => {
    const { story, work } = compileStory(copy());
    story.tests.pop();
    expect(testStory(story, work).join()).toContain("没有可通过的测试路径");
  });
});

it("blank default has no story and needs no ending test", () => {
  const { story, work } = compileStory({
    scriptVersion: 1,
    id: "blank-test",
    title: "捡手机",
    phone: { owner: "机主" },
  });
  expect(work.nodes).toEqual([]);
  expect(Object.values(work.data).flat()).toEqual([]);
  expect(work.mode).toBe("explore");
  expect(testStory(story, work)).toEqual([]);
});


describe("six-route narrative structure", () => {
  const blankNarrative = () => ({
    characters: ["lead-1", "lead-2", "lead-3", "lead-4", "lead-5", "lead-6"].map((id) => ({ id })),
    sharedChapters: [{ id: "shared-intro", order: 1 }],
    routes: ["route-1", "route-2", "route-3", "route-4", "route-5", "route-6"].map((id, index) => ({
      id,
      characterId: `lead-${index + 1}`,
      chapters: [{ id: `chapter-${index + 1}`, order: 1, prerequisites: ["shared-intro"] }],
    })),
  });

  it("keeps legacy scripts compatible when narrative data is absent", () => {
    const { work } = compileStory(copy());
    expect(work.narrative).toBeUndefined();
  });

  it("compiles six fixed character slots and six independent route tracks", () => {
    const source = copy();
    Object.assign(source, { narrative: blankNarrative() });
    const { story, work } = compileStory(source);
    expect(story.narrative?.characters).toHaveLength(6);
    expect(work.narrative?.routes).toHaveLength(6);
    expect(work.narrative?.routes[5].chapters[0].prerequisites).toEqual(["shared-intro"]);
  });

  it("rejects duplicate slots, mismatched routes and cross-route prerequisites", () => {
    const duplicate = copy();
    const invalidSlots = blankNarrative();
    invalidSlots.characters[1].id = "lead-1";
    Object.assign(duplicate, { narrative: invalidSlots });
    expect(() => compileStory(duplicate)).toThrow();

    const crossRoute = copy();
    const invalidPrerequisite = blankNarrative();
    invalidPrerequisite.routes[0].chapters[0].prerequisites = ["chapter-2"];
    Object.assign(crossRoute, { narrative: invalidPrerequisite });
    expect(() => compileStory(crossRoute)).toThrow("属于其他路线");
  });

  it("requires reveal chapters to belong to the shared story", () => {
    const source = copy();
    const narrative = blankNarrative();
    Object.assign(narrative.characters[0], { revealAtChapterId: "chapter-1" });
    Object.assign(source, { narrative });
    expect(() => compileStory(source)).toThrow("角色揭示章节必须属于公共主线");
  });
});
