import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";

type PlayerProfile = {
  nickname: string;
  birthday: "09-04";
};


function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    fetch(
      new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : new URLSearchParams(location.search).get("template") === "blank"
          ? "./blank-work.json"
          : "./work.json",
      { signal: abort.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error("缺少作品文件，请运行 npm run story:build");
        return r.json();
      })
      .then((x) => {
        const parsed = validateWork(x);
        // The public game always starts without a device PIN. Keep the authoring
        // work untouched and remove any legacy PIN from the runtime copy.
        const w: Work = { ...parsed, phone: { ...parsed.phone, passcode: "", wallpaper: "custom-pair" } };
        document.title =
          w.title === "捡手机" ? "捡手机" : w.title + " · 捡手机";
        setWork(w);
        // Player identity is session-only: a full page refresh asks for the nickname again.
        setProfile(null);
        setNickname("");
        setProfileReady(true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setFormError("请输入你的昵称后继续。");
      return;
    }
    if (!work) return;
    const next: PlayerProfile = { nickname: cleanNickname, birthday: "09-04" };
    setFormError("");
    setProfile(next);
  };

  const playerWork = work && profile
    ? (() => {
        const year = work.phone.date?.slice(0, 4) || "2026";
        const birthdayEvent = {
          id: `player-birthday-${work.id}`,
          title: `${profile.nickname}的生日`,
          body: `今天是${profile.nickname}的生日！`,
          richText: "",
          meta: { birthday: "true", annual: "true" },
          time: `${year}-09-04 00:00`,
          sender: profile.nickname,
          avatar: "",
          kind: "event" as const,
          media: "",
          hidden: false,
          unlock: "",
          password: "",
          folder: "生日",
          favorite: false,
          outgoing: false,
          read: false,
          likes: 0,
          comments: [],
        };
        const calendar = (work.data.calendar ?? []).filter(
          (item) => item.id !== birthdayEvent.id,
        );
        return {
          ...work,
          phone: { ...work.phone, owner: profile.nickname },
          data: { ...work.data, calendar: [...calendar, birthdayEvent] },
        };
      })()
    : work;

  return (
    <main className="story-runtime">
      {work ? (
        <>
          <Phone
            key={`${work.id}-${profile ? "unlocked" : "locked"}`}
            work={playerWork ?? work}
            initiallyUnlocked={!!profile}
          />
          {profileReady && !profile && (
            <div className="player-profile-overlay">
              <form className="player-profile-card" onSubmit={submitProfile}>
                <div className="player-profile-mark" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="player-profile-eyebrow">A STORY ABOUT YOU</p>
                <h1>在故事开始之前</h1>
                <p className="player-profile-description">
                  留下你希望使用的昵称，让这段故事从你开始。
                </p>

                <label htmlFor="player-nickname">你的昵称</label>
                <input
                  id="player-nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  maxLength={24}
                  placeholder="输入你希望被称呼的名字"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                  autoFocus
                />

                {formError && (
                  <p className="player-profile-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="player-profile-submit" type="submit">
                  确认并解锁手机
                  <span aria-hidden="true">↗</span>
                </button>
                <p className="player-profile-footnote">
                  刷新页面后需要重新填写昵称
                </p>
              </form>
            </div>
          )}
        </>
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StoryPlayer />);
