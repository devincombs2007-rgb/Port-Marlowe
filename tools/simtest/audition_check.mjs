// Browser verification for the portable Sound Booth. Generate it with
// python3 tools/sounds/audition_page.py --standalone, then run this from the repo root.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const html = path.join(root, "build/audition/THE_HOLLOW_Sound_Booth.html");
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOLLOW_CHROMIUM_EXECUTABLE || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errors = [];
const requests = [];
const assert = (v, message) => { if (!v) throw new Error(message); };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.goto(pathToFileURL(html).href);
  assert(await page.locator(".var").count() === 150, "all 150 recorded variants are listed");
  await page.locator(".play").first().click();
  await page.waitForFunction(() => audio.readyState >= 2 && audio.error === null);
  assert(await page.locator(".play").first().getAttribute("data-src").then((s) => s.startsWith("data:audio/mpeg;base64,")), "audio is embedded");
  await page.locator(".v[data-v='wrong']").first().click();
  await page.locator(".note").first().fill("Watcher footsteps need a softer ending.");
  await page.locator(".note").first().blur();
  await page.reload();
  assert(await page.locator(".v[data-v='wrong']").first().getAttribute("aria-pressed") === "true", "verdict survives reload");
  assert(await page.locator(".note").first().inputValue() === "Watcher footsteps need a softer ending.", "note survives reload");
  await page.locator("#f-flag").click();
  assert(await page.locator(".var:not(.hide)").count() === 1, "flagged filter works");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  const feedback = path.join(root, "build/audition/browser-feedback.json");
  await download.saveAs(feedback);
  const exported = JSON.parse(fs.readFileSync(feedback, "utf8"));
  assert(exported.format === "hollow-sound-reviews" && Object.values(exported.reviews).some((r) => r.verdict === "wrong" && r.note.includes("softer ending")), "export contains the actual review");
  await page.screenshot({ path: path.join(root, "build/audition/mobile-review.png") });
  const noStorage = await context.newPage();
  noStorage.on("pageerror", (e) => errors.push(e.message));
  await noStorage.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("storage disabled"); } }));
  await noStorage.goto(pathToFileURL(html).href);
  await noStorage.locator(".v[data-v='good']").first().click();
  assert((await noStorage.locator("#status").innerText()).includes("Export before closing"), "storage-disabled fallback is honest");
  assert(requests.length === 0, "standalone page makes no network requests");
  assert(errors.length === 0, `browser errors: ${errors.join(", ")}`);
  console.log("PASS Sound Booth: 150 embedded variants, MP3 decoding, saved notes, filters, export, mobile layout and storage-disabled fallback; no network requests.");
} finally {
  await browser.close();
}
