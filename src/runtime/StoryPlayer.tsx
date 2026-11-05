import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";

type PlayerProfile = {
  nickname: string;
  birthday: string;
};

function profileKey(workId: string) {
  return `foundphone-player-profile-v2:${workId}`;
}

function readProfile(workId: string): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(profileKey(workId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PlayerProfile>;
    if (
      typeof value.nickname === "string" &&
      value.nickname.trim() &&
      typeof value.birthday === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.birthday)
    ) {
      return { nickname: value.nickname.trim(), birthday: value.birthday };
    }
  } catch {
    // Ignore invalid or unavailable local profile data and ask the player again.
  }
  return null;
}

function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
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
        setProfile(readProfile(w.id));
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
    if (!cleanNickname || !birthday) {
      setFormError("请填写昵称和生日后继续。");
      return;
    }
    if (birthday > new Date().toISOString().slice(0, 10)) {
      setFormError("生日不能晚于今天。");
      return;
    }
    if (!work) return;
    const next = { nickname: cleanNickname, birthday };
    try {
      localStorage.setItem(profileKey(work.id), JSON.stringify(next));
    } catch {
      setFormError("无法保存玩家资料，请检查浏览器的本地存储设置。");
      return;
    }
    setFormError("");
    setProfile(next);
  };

  return (
    <main className="story-runtime">
      {work ? (
        <>
          <Phone
            key={`${work.id}-${profile ? "unlocked" : "locked"}`}
            work={work}
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
                  留下你的名字和生日，让这段故事从你开始。
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

                <label htmlFor="player-birthday">你的生日</label>
                <input
                  id="player-birthday"
                  name="birthday"
                  type="date"
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  required
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
                  资料仅保存在当前浏览器中
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
