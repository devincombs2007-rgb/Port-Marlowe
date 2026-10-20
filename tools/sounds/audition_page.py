"""Build the sound audition page (build/audition/): every HOLLOW sound with play buttons and
per-sound verdicts that save to the published page's database, so feedback can drive a retune.

Run after tools/sounds/sourced.py. Audio is transcoded to MP3 because iPhone Safari does not
reliably play Ogg Vorbis. Publish build/audition/index.html with the a/** files as supporting files.
"""
import base64
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, BUILD, ensure  # noqa: E402

OUT = os.path.join(BUILD, "audition")
GROUPS = [
    ("watcher", "The Watcher", "Forest at dusk and night. Bark, creaks, one lunge."),
    ("amb.forest", "Forest ambience", "Script ambience outdoors: distant calls, branches, wind, the hush before the Watcher."),
    ("amb.cave", "Cave ambience", "Underground ambience: drips, shifting stone, breathing in the dark."),
    ("amb.swamp", "Swamp ambience", "Swamp and shore ambience."),
    ("hollowed", "The Hollowed", "Blind cave predator: echolocation clicks, claws on stone."),
    ("borrowed", "The Borrowed", "The disguised bleats are Minecraft's own sheep sounds (not included here)."),
    ("knocker", "The Knocker", "Night visitor at your door. The knock is the most important sound in the add-on."),
    ("amb.bedtime", "Bedtime knock", "Rare, harmless knocking heard from bed."),
    ("mirebound", "The Mirebound", "Swamp ambusher: bubbles, gurgles, the grab."),
    ("heart", "The Heart Below", "Boss fight: heartbeat, roots, pulse ring, phases."),
    ("chime", "Blocks and items", "Chime, ward, lens, journal, Heartseeker, altar."),
    ("stinger", "Stingers", "Short musical accents when something is noticed (Comfort setting: Encounter accents)."),
    ("music", "Music", "Played rarely, per player: night, cave, shrine, boss fight, dawn after a hard night."),
]
ITEM_PREFIXES = ("chime", "ward", "lens", "journal", "heartseeker", "altar")


def group_of(event):
    if event.startswith(ITEM_PREFIXES):
        return "chime"
    for key, _, _ in GROUPS:
        if event.startswith(key):
            return key
    return "chime"


def transcode(src, dst, music):
    ensure(os.path.dirname(dst))
    if os.path.isfile(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return
    args = ["-ac", "2", "-b:a", "112k"] if music else ["-ac", "1", "-b:a", "80k"]
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-c:a", "libmp3lame", *args, dst], check=True)


def main():
    standalone = "--standalone" in sys.argv
    cat = json.load(open(os.path.join(os.path.dirname(__file__), "catalog_generated.json")))
    events = cat["events"]
    data = []
    files = {}
    for key, title, blurb in GROUPS:
        items = []
        for ev, e in events.items():
            if group_of(ev) != key:
                continue
            vs = []
            for i, v in enumerate(e["variants"]):
                rel = v["file"].replace("sounds/hollow/", "")
                pub = f"a/{rel}.mp3"
                transcode(os.path.join(RP, v["file"] + ".ogg"), os.path.join(OUT, pub), ev.startswith("music"))
                files[pub] = os.path.join(OUT, pub)
                src = pub
                if standalone:
                    with open(os.path.join(OUT, pub), "rb") as audio_file:
                        src = "data:audio/mpeg;base64," + base64.b64encode(audio_file.read()).decode("ascii")
                vs.append({"id": rel.replace("/", "__"), "src": src, "n": i + 1,
                           "sources": [s.split("/", 1)[1] for s in v["sources"]]})
            items.append({"event": ev, "subtitle": e["subtitle"], "vanilla": e.get("vanilla", []), "variants": vs})
        data.append({"key": key, "title": title, "blurb": blurb, "events": items})
    total = sum(len(i["variants"]) for g in data for i in g["events"])
    page = TEMPLATE.replace("__DATA__", json.dumps(data, separators=(",", ":"))).replace("__TOTAL__", str(total))
    if standalone:
        page = "\n".join(line for line in page.splitlines() if "fonts.googleapis.com" not in line)
    with open(os.path.join(OUT, "index.html"), "w") as f:
        f.write(page)
    with open(os.path.join(OUT, "files.json"), "w") as f:
        json.dump(files, f, indent=0)
    if standalone:
        with open(os.path.join(OUT, "THE_HOLLOW_Sound_Booth.html"), "w") as f:
            f.write(page)
    print(f"audition page: {total} sounds, {len(files)} audio files -> {os.path.relpath(OUT)}")


TEMPLATE = r"""<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>Hollow Sound Booth</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a ranger's listening log - one column of creature sections, each sound a row you can play and judge. */
:root {
  --bg: #0e1311; --panel: #151c19; --line: #25302b; --fg: #dde1d6; --muted: #8b968d; --accent: #e4924f;
  --good: #8cc08f; --loud: #e3705f; --quiet: #84a9d8; --wrong: #cfa64c;
  --display: "IM Fell English", "Iowan Old Style", Georgia, serif;
  --body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  color-scheme: dark;
}
body { background: var(--bg); color: var(--fg); font-family: var(--body); line-height: 1.5; }
.wrap { max-width: 860px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1 { font-family: var(--display); font-weight: 400; font-size: clamp(2rem, 5vw, 2.8rem); margin: 0 0 6px; text-wrap: balance; letter-spacing: .01em; }
h2 { font-family: var(--display); font-weight: 400; font-size: 1.6rem; margin: 0; }
.lede { color: var(--muted); max-width: 64ch; margin: 0 0 18px; }
.lede b { color: var(--fg); font-weight: 500; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); padding-block: 10px; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
.progress { font-variant-numeric: tabular-nums; font-size: .9rem; color: var(--muted); }
.progress b { color: var(--fg); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { font: inherit; font-size: .85rem; background: transparent; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
.chip[aria-pressed="true"] { color: var(--bg); background: var(--fg); border-color: var(--fg); }
.status { font-size: .8rem; color: var(--muted); margin-left: auto; }
section { margin-top: 34px; }
.sec-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
.sec-head p { margin: 0; color: var(--muted); font-size: .9rem; flex: 1 1 260px; min-width: 0; }
.event { padding: 14px 0; border-bottom: 1px dashed var(--line); }
.ev-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.ev-name { font-family: var(--mono); font-size: .85rem; color: var(--accent); }
.ev-sub { color: var(--muted); font-size: .9rem; font-style: italic; }
.vanilla { color: var(--muted); font-size: .85rem; margin: 6px 0 0; }
.var { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; margin-top: 10px; }
.play { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--panel); color: var(--fg); cursor: pointer; font-size: 1rem; display: grid; place-items: center; }
.play[data-on="1"] { border-color: var(--accent); color: var(--accent); }
.play:focus-visible, .chip:focus-visible, .v:focus-visible, .note:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-width: 0; }
.vn { font-family: var(--mono); font-size: .8rem; color: var(--muted); min-width: 2.2em; }
.v { font: inherit; font-size: .8rem; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); background: transparent; color: var(--muted); cursor: pointer; }
.v[aria-pressed="true"][data-v="good"] { color: var(--bg); background: var(--good); border-color: var(--good); }
.v[aria-pressed="true"][data-v="loud"] { color: var(--bg); background: var(--loud); border-color: var(--loud); }
.v[aria-pressed="true"][data-v="quiet"] { color: var(--bg); background: var(--quiet); border-color: var(--quiet); }
.v[aria-pressed="true"][data-v="wrong"] { color: var(--bg); background: var(--wrong); border-color: var(--wrong); }
.note { grid-column: 2; font: inherit; font-size: .85rem; width: 100%; box-sizing: border-box; background: var(--panel); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; }
.src { grid-column: 2; font-family: var(--mono); font-size: .72rem; color: var(--muted); overflow-wrap: anywhere; }
.hide { display: none; }
@media (prefers-reduced-motion: no-preference) { .play { transition: border-color .15s, color .15s; } }
</style>

<div class="wrap">
  <h1>Hollow Sound Booth</h1>
  <p class="lede">Listen to <b>THE HOLLOW</b>'s sounds and music, built from credited CC0 recordings. Mark anything too loud, too quiet or wrong for the scene, then <b>export your feedback</b> to share it for the next tuning pass. Reviews are stored in this browser when available; they are not automatically sent to ChatGPT.</p>
  <div class="bar">
    <span class="progress" id="progress">Reviewed <b>0</b> of __TOTAL__</span>
    <div class="chips" role="group" aria-label="Show">
      <button class="chip" id="f-all" aria-pressed="true">All</button>
      <button class="chip" id="f-todo" aria-pressed="false">Not reviewed</button>
      <button class="chip" id="f-flag" aria-pressed="false">Flagged</button>
      <button class="chip" id="export">Export feedback</button>
    </div>
    <span class="status" id="status" role="status" aria-live="polite">Loading reviews…</span>
  </div>
  <div id="list"></div>
</div>

<script>
const DATA = __DATA__;
const VERDICTS = [["good", "Good"], ["loud", "Too loud"], ["quiet", "Too quiet"], ["wrong", "Wrong feel"]];
const reviews = new Map();   // variant id -> {verdict, note}
const STORAGE_KEY = "hollow.sound-reviews.v1";
const variantIds = new Set(DATA.flatMap((g) => g.events.flatMap((e) => e.variants.map((v) => v.id))));
try {
  for (const [id, r] of Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"))) {
    if (variantIds.has(id) && r && typeof r === "object") reviews.set(id, {
      verdict: VERDICTS.some(([v]) => v === r.verdict) ? r.verdict : "",
      note: typeof r.note === "string" ? r.note.slice(0, 2000) : "",
      event: typeof r.event === "string" ? r.event : "",
    });
  }
} catch { /* browsing environment may disable persistent storage */ }
let filter = "all", db = null, canWrite = true, current = null;
const audio = new Audio();
audio.preload = "none";

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === "text" ? (e.textContent = v) : e.setAttribute(k, v);
  for (const k of kids) e.append(k);
  return e;
}

function render() {
  const list = document.getElementById("list");
  list.replaceChildren();
  for (const g of DATA) {
    const sec = el("section", { id: g.key.replace(/\./g, "-") });
    sec.append(el("div", { class: "sec-head" }, el("h2", { text: g.title }), el("p", { text: g.blurb })));
    for (const ev of g.events) {
      const box = el("div", { class: "event", "data-event": ev.event });
      box.append(el("div", { class: "ev-head" }, el("span", { class: "ev-name", text: ev.event }), el("span", { class: "ev-sub", text: "Subtitle: " + ev.subtitle })));
      if (ev.vanilla.length) box.append(el("p", { class: "vanilla", text: "Uses Minecraft's own sound files: " + ev.vanilla.join(", ") + ". Listen in game." }));
      for (const v of ev.variants) {
        const play = el("button", { class: "play", "aria-label": `Play ${ev.event} variant ${v.n}`, "data-src": v.src, text: "▶" });
        play.addEventListener("click", () => toggle(play));
        const row = el("div", { class: "row" }, el("span", { class: "vn", text: "#" + v.n }));
        for (const [key, label] of VERDICTS) {
          const b = el("button", { class: "v", "data-v": key, "data-id": v.id, "aria-pressed": "false", text: label });
          b.addEventListener("click", () => setVerdict(v.id, ev.event, key));
          row.append(b);
        }
        const note = el("input", { class: "note", id: "note-" + v.id, placeholder: "Note (optional): what is wrong, what it should feel like", "aria-label": `Note for ${ev.event} variant ${v.n}` });
        note.addEventListener("change", () => setNote(v.id, ev.event, note.value));
        const wrap = el("div", { class: "var", "data-id": v.id }, play, row, note, el("div", { class: "src", text: "Sources: " + v.sources.join(" · ") }));
        box.append(wrap);
      }
      sec.append(box);
    }
    list.append(sec);
  }
  paint();
}

function paint() {
  let done = 0, total = 0;
  for (const wrap of document.querySelectorAll(".var")) {
    const id = wrap.dataset.id, r = reviews.get(id);
    total++;
    if (r?.verdict) done++;
    for (const b of wrap.querySelectorAll(".v")) b.setAttribute("aria-pressed", String(r?.verdict === b.dataset.v));
    const note = wrap.querySelector(".note");
    if (document.activeElement !== note) note.value = r?.note ?? "";
    const flagged = r && r.verdict && r.verdict !== "good";
    wrap.classList.toggle("hide", (filter === "todo" && r?.verdict) || (filter === "flag" && !flagged));
  }
  for (const box of document.querySelectorAll(".event")) box.classList.toggle("hide", !box.querySelector(".var:not(.hide)") && box.querySelector(".var"));
  const counts = { good: 0, loud: 0, quiet: 0, wrong: 0 };
  for (const r of reviews.values()) if (r.verdict) counts[r.verdict]++;
  document.getElementById("progress").innerHTML =
    `Reviewed <b>${done}</b> of ${total} · good ${counts.good} · loud ${counts.loud} · quiet ${counts.quiet} · wrong feel ${counts.wrong}`;
}

function toggle(btn) {
  if (current === btn && !audio.paused) { audio.pause(); return; }
  if (current) { current.dataset.on = "0"; current.textContent = "▶"; }
  current = btn;
  audio.src = btn.dataset.src;
  audio.play().then(() => { btn.dataset.on = "1"; btn.textContent = "■"; }).catch(() => setStatus("This browser could not play that file."));
}
audio.addEventListener("ended", () => { if (current) { current.dataset.on = "0"; current.textContent = "▶"; } });
audio.addEventListener("pause", () => { if (current) { current.dataset.on = "0"; current.textContent = "▶"; } });

function setStatus(t) { document.getElementById("status").textContent = t; }

function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(reviews))); return true; }
  catch { return false; }
}

document.getElementById("export").addEventListener("click", () => {
  const result = { format: "hollow-sound-reviews", version: 1, exportedAt: new Date().toISOString(), reviews: Object.fromEntries(reviews) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "THE_HOLLOW_sound_feedback.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function save(id, event, patch) {
  const prev = reviews.get(id) ?? {};
  const next = { ...prev, ...patch, event, at: new Date().toISOString() };
  reviews.set(id, next);
  paint();
  const local = saveLocal();
  if (!db || !canWrite) { setStatus(local ? "Saved in this browser. Export to share feedback." : "Kept on this screen only. Export before closing."); return; }
  try {
    await db.collection("reviews").doc(id).set({ file: id, event, verdict: next.verdict ?? "", note: next.note ?? "", at: next.at });
    setStatus("Saved");
  } catch (e) {
    if (e && e.code === "invalid_argument") { canWrite = false; setStatus("View only: your marks are not saved."); }
    else setStatus("Could not save just now. Try again in a moment.");
  }
}
function setVerdict(id, event, v) { const cur = reviews.get(id)?.verdict; save(id, event, { verdict: cur === v ? "" : v }); }
function setNote(id, event, note) { save(id, event, { note: note.trim() }); }

for (const [id, f] of [["f-all", "all"], ["f-todo", "todo"], ["f-flag", "flag"]]) {
  document.getElementById(id).addEventListener("click", () => {
    filter = f;
    for (const c of document.querySelectorAll(".chip")) c.setAttribute("aria-pressed", String(c.id === id));
    paint();
  });
}

render();
setStatus("Local reviews loaded. Export to share feedback.");

(async () => {
  const claude = window.claude;
  if (!claude?.use) return;
  db = await claude.use("db");
  const user = await claude.use("user");
  if (!db) return;
  const w = user ? await user.can("data.write") : null;
  if (w === false) { canWrite = false; setStatus("View only: you can listen, but marks are not saved."); }
  db.collection("reviews").onSnapshot((snap) => {
    for (const d of snap.docs) {
      const b = d.data();
      if (b) reviews.set(d.id, { verdict: b.verdict || "", note: b.note || "", event: b.event });
    }
    if (canWrite) setStatus(snap.metadata.fromCache ? "Loading saved reviews…" : "Saved reviews loaded");
    paint();
  }, () => setStatus("Saved reviews are unavailable right now."));
})().catch(() => setStatus("Cloud reviews unavailable. You can still save locally and export."));
</script>
</html>
"""

if __name__ == "__main__":
    main()
