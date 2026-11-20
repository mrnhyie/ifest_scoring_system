import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3101;
const ORIGIN = `http://localhost:${PORT}`;
const DB_DIR = `/tmp/scoreboard-e2e-${Date.now()}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const NEXT = path.join(ROOT, "node_modules/next/dist/bin/next");

const server = spawn(process.execPath, [NEXT, "dev", "-p", String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, PGLITE_DIR: DB_DIR, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d.toString()));
server.stderr.on("data", (d) => (serverLog += d.toString()));
server.on("exit", (code, signal) => console.log(`[server] exited code=${code} signal=${signal}`));

const started = Date.now();
let currentStep = "boot";
setTimeout(() => {
  console.error(`WATCHDOG: stuck in "${currentStep}" after ${((Date.now() - started) / 1000).toFixed(0)}s`);
  console.error("--- server log ---");
  console.error(serverLog.split("\n").slice(-30).join("\n"));
  cleanup(1);
  process.exit(1);
}, 8 * 60_000).unref();

let closed = false;
function cleanup(code) {
  if (closed) return;
  closed = true;
  try {
    server.kill("SIGTERM");
  } catch {}
  try {
    rmSync(DB_DIR, { recursive: true, force: true });
  } catch {}
  process.exitCode = code;
}
process.on("SIGINT", () => cleanup(130));

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ORIGIN}/api/auth`);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error("Server did not start in time");
}

const shown = (target, selector) =>
  target
    .$eval(selector, (el) => {
      if (el.hasAttribute("hidden")) return false;
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    })
    .catch(() => false);

const text = (target, selector) => target.$eval(selector, (el) => el.textContent.trim());

const imageLoaded = (target, selector) =>
  target.waitForFunction(
    (sel) => {
      const img = document.querySelector(sel);
      return !!img && img.complete && img.naturalWidth > 0;
    },
    { polling: 100, timeout: 20_000 },
    selector
  );

async function setInput(target, selector, value) {
  await target.$eval(selector, (el) => {
    el.focus();
    el.select();
  });
  await target.keyboard.press("Backspace");
  if (value) await target.type(selector, value);
}

let browser;

async function main() {
  await waitForServer();

  writeFileSync(
    "/tmp/next-avatar-a.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1F1E5E"/><stop offset="1" stop-color="#2B2A78"/></linearGradient></defs>
      <rect width="480" height="480" fill="url(#g)"/>
      <circle cx="240" cy="196" r="74" fill="#33D6A3" opacity=".88"/>
      <rect x="120" y="296" width="240" height="150" rx="70" fill="#33D6A3" opacity=".88"/>
      <text x="240" y="222" text-anchor="middle" font-family="Arial" font-size="64" font-weight="700" fill="#1F1E5E">KM</text>
    </svg>`
  );
  writeFileSync(
    "/tmp/next-avatar-b.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#38D9A5"/><stop offset="1" stop-color="#1F9C79"/></linearGradient></defs>
      <rect width="480" height="480" fill="url(#g)"/>
      <circle cx="240" cy="196" r="74" fill="#FCFBF5" opacity=".92"/>
      <rect x="120" y="296" width="240" height="150" rx="70" fill="#FCFBF5" opacity=".92"/>
      <text x="240" y="222" text-anchor="middle" font-family="Arial" font-size="64" font-weight="700" fill="#1F9C79">AO</text>
    </svg>`
  );

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: `/tmp/scoreboard-chrome-${Date.now()}`,
    args: ["--hide-scrollbars", "--no-first-run"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  // 1. First-run gate
  await page.goto(ORIGIN + "/", { waitUntil: "networkidle0" });
  await page.waitForSelector("#gateView", { timeout: 60_000 });
  assert(await shown(page, "#setupPane"), "setup pane shown on first run");
  assert(!(await shown(page, ".app")), "app hidden behind the gate");
  await page.screenshot({ path: "/tmp/next-gate-setup.png" });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await sleep(400);
  await page.screenshot({ path: "/tmp/next-gate-mobile.png" });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await sleep(250);
  console.log("✓ first-run gate");

  // 2. Public viewer needs no account
  currentStep = "2 public viewer";
  const ctx = await browser.createBrowserContext();
  const publicPage = await ctx.newPage();
  await publicPage.goto(ORIGIN + "/view", { waitUntil: "networkidle0" });
  await publicPage.waitForSelector("#waitingView", { timeout: 30_000 });
  assert(!(await shown(publicPage, "#gateView")), "viewer is not gated");
  await publicPage.screenshot({ path: "/tmp/next-public-viewer.png" });
  await publicPage.close();
  await ctx.close();
  await page.bringToFront();
  console.log("✓ public viewer without login");

  // 3. Password mismatch, then set admin password key
  currentStep = "3 set password key";
  await page.type("#newPass", "scoreboard123");
  await page.type("#newPass2", "scoreboard124");
  await page.click("#setupPane button[type=submit]");
  await page.waitForFunction(() => !document.getElementById("setupError").hidden, { timeout: 10_000 });
  assert((await text(page, "#setupError")).includes("match"), "mismatch message");

  await setInput(page, "#newPass2", "scoreboard123");
  await page.click("#setupPane button[type=submit]");
  await page.waitForSelector("#setupView", { timeout: 30_000 });
  assert(!(await shown(page, "#gateView")), "gate closed after key creation");
  assert(await page.$("#signOutBtn"), "sign out visible for admin");
  console.log("✓ admin key creation");

  // 4. Setup stage with photos
  currentStep = "4 setup + photos";
  await page.type("#inputA", "Kofi Mensah");
  await page.type("#inputB", "Ama Owusu");
  await (await page.$("#fileA")).uploadFile("/tmp/next-avatar-a.svg");
  await imageLoaded(page, '#setupView img[src^="/api/photo/0"]');
  await (await page.$("#fileB")).uploadFile("/tmp/next-avatar-b.svg");
  await imageLoaded(page, '#setupView img[src^="/api/photo/1"]');
  await page.screenshot({ path: "/tmp/next-admin-setup.png" });
  console.log("✓ photos uploaded");

  // 5. Start with Enter, then score
  currentStep = "5 start + score";
  await page.click("#inputB");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#arenaView", { timeout: 20_000 });
  assert.strictEqual(await text(page, "#nameTextA"), "Kofi Mensah");
  assert.strictEqual(await text(page, "#nameTextB"), "Ama Owusu");
  assert.strictEqual(await text(page, "#statusText"), "LIVE · SESSION 01");
  assert.strictEqual(await text(page, "#scoreA"), "0");
  assert.strictEqual(await text(page, "#scoreB"), "0");
  assert(await page.$eval("#undoBtn", (el) => el.disabled), "undo disabled at start");

  await page.click('#sideA .ctl[data-delta="1"]');
  await page.click('#sideB .ctl[data-delta="2"]');
  await page.click('#sideA .ctl[data-delta="3"]');
  await page.waitForFunction(
    () => document.getElementById("scoreA").textContent === "4" && document.getElementById("scoreB").textContent === "2",
    { timeout: 10_000 }
  );
  assert.strictEqual(await page.title(), "4 — 2 · Kofi Mensah vs Ama Owusu");
  assert(!(await page.$eval("#undoBtn", (el) => el.disabled)), "undo enabled after scoring");
  console.log("✓ clicks score");

  // 6. Keyboard shortcuts and undo
  await page.keyboard.press("a");
  await page.waitForFunction(() => document.getElementById("scoreA").textContent === "5", { timeout: 10_000 });
  await page.keyboard.press("z");
  await page.waitForFunction(() => document.getElementById("scoreA").textContent === "4", { timeout: 10_000 });
  await page.click("#undoBtn");
  await page.waitForFunction(
    () => document.getElementById("scoreA").textContent === "1" && document.getElementById("scoreB").textContent === "2",
    { timeout: 10_000 }
  );
  await page.click('#sideA .ctl[data-delta="3"]');
  await page.waitForFunction(() => document.getElementById("scoreA").textContent === "4", { timeout: 10_000 });
  await imageLoaded(page, '#arenaView img[src^="/api/photo/0"]');
  await page.screenshot({ path: "/tmp/next-admin-live.png" });
  console.log("✓ keyboard shortcuts and undo");

  // 7. Rename inline
  currentStep = "7 rename";
  await page.click("#nameElA");
  await page.waitForSelector("#editA");
  assert.strictEqual(await page.evaluate(() => document.activeElement?.id), "editA");
  await page.$eval("#editA", (el) => el.select());
  await page.type("#editA", "Ada L.");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("nameTextA").textContent === "Ada L.", { timeout: 10_000 });
  console.log("✓ inline rename");

  // 8. Reload persistence
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#arenaView", { timeout: 20_000 });
  await page.waitForFunction(() => document.getElementById("scoreA").textContent === "4", { timeout: 10_000 });
  assert.strictEqual(await text(page, "#nameTextA"), "Ada L.");
  assert(!(await shown(page, "#gateView")), "session survives reload");
  console.log("✓ reload persistence");

  // 9. End dialog
  currentStep = "9 end session";
  await page.click("#endBtn");
  await page.waitForFunction(() => document.getElementById("endDialog").open, { timeout: 10_000 });
  assert.strictEqual(await text(page, "#dlgNameA"), "Ada L.");
  assert.strictEqual(await text(page, "#dlgScoreA"), "4");
  assert.strictEqual(await text(page, "#dlgScoreB"), "2");
  await page.screenshot({ path: "/tmp/next-dialog.png" });

  await page.click("#cancelEnd");
  await page.waitForFunction(() => !document.getElementById("endDialog").open, { timeout: 10_000 });
  assert(await shown(page, "#arenaView"), "still live after cancel");

  await page.click("#endBtn");
  await page.waitForFunction(() => document.getElementById("endDialog").open, { timeout: 10_000 });
  await page.click("#confirmEnd");
  await page.waitForSelector("#setupView", { timeout: 20_000 });
  assert.strictEqual(await text(page, "#statusText"), "NEW SESSION");
  assert.strictEqual(await page.$eval("#inputA", (el) => el.value), "Ada L.");
  assert.strictEqual(await page.$$eval("#pastList li", (els) => els.length), 1, "one archived result");
  const row = await page.$eval("#pastList li", (el) => el.textContent.replace(/\s+/g, " ").trim());
  assert(row.includes("Ada L.") && row.includes("4") && row.includes("2"), "result row: " + row);
  await page.screenshot({ path: "/tmp/next-ended.png" });
  console.log("✓ end session and history");

  // 10. Sign out, wrong password, sign in
  await page.click("#signOutBtn");
  await page.waitForSelector("#loginPane", { timeout: 10_000 });
  assert(!(await shown(page, ".app")), "app hidden when signed out");
  await page.screenshot({ path: "/tmp/next-gate-login.png" });

  await page.type("#loginPass", "wrongpassword");
  await page.click("#loginPane button[type=submit]");
  await page.waitForFunction(() => !document.getElementById("loginError").hidden, { timeout: 15_000 });
  assert((await text(page, "#loginError")).toLowerCase().includes("wrong"), "wrong password rejected");
  assert.strictEqual(await page.$eval("#loginPass", (el) => el.value), "", "password cleared after failure");

  await page.type("#loginPass", "scoreboard123");
  await page.click("#loginPane button[type=submit]");
  await page.waitForSelector("#setupView", { timeout: 20_000 });
  assert.strictEqual(await text(page, "#statusText"), "NEW SESSION");
  assert.strictEqual(await page.$$eval("#pastList li", (els) => els.length), 1, "history intact after login");
  console.log("✓ sign out and sign in");

  // 11. Second session for the viewer
  await setInput(page, "#inputA", "Kofi Mensah");
  await setInput(page, "#inputB", "Ama Owusu");
  await page.click("#startBtn");
  await page.waitForSelector("#arenaView", { timeout: 20_000 });
  assert.strictEqual(await text(page, "#statusText"), "LIVE · SESSION 02");
  assert(await page.$('#arenaView img[src^="/api/photo/0"]'), "photo persists across sessions");
  assert(await page.$('#arenaView img[src^="/api/photo/1"]'), "both photos persist");
  await page.click('#sideA .ctl[data-delta="2"]');
  await page.click('#sideB .ctl[data-delta="1"]');
  await page.waitForFunction(
    () => document.getElementById("scoreA").textContent === "2" && document.getElementById("scoreB").textContent === "1",
    { timeout: 10_000 }
  );

  // mobile admin
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await sleep(500);
  await page.screenshot({ path: "/tmp/next-mobile-live.png" });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await sleep(250);

  // 12. Viewer mirrors the live session
  currentStep = "12 viewer mirror";
  const viewer = await browser.newPage();
  await viewer.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await viewer.goto(ORIGIN + "/view", { waitUntil: "networkidle0" });
  await viewer.waitForSelector("#arenaView", { timeout: 30_000 });
  await sleep(600);
  assert(!(await shown(viewer, "#gateView")), "viewer not gated");
  assert.strictEqual(await text(viewer, "#nameTextA"), "Kofi Mensah");
  assert.strictEqual(await text(viewer, "#scoreA"), "2");
  assert.strictEqual(await text(viewer, "#scoreB"), "1");
  assert.strictEqual(await text(viewer, "#statusText"), "LIVE · SESSION 02");
  assert.strictEqual(await viewer.$$eval(".controls", (els) => els.length), 0, "viewer has no controls");
  assert.strictEqual(await viewer.$("#undoBtn"), null, "viewer has no undo");
  assert.strictEqual(await viewer.$("#endBtn"), null, "viewer has no end button");
  assert.strictEqual(await viewer.$("#signOutBtn"), null, "viewer has no sign out");
  assert.strictEqual(await viewer.$("#viewerBtn"), null, "viewer has no viewer link");
  assert(await viewer.$eval(".avatar", (el) => el.disabled), "viewer avatars disabled");
  assert(await viewer.$eval("body", (el) => el.classList.contains("is-viewer")), "viewer layout class");
  assert(await viewer.$('#arenaView img[src^="/api/photo/1"]'), "viewer shows photos");
  await imageLoaded(viewer, '#arenaView img[src^="/api/photo/1"]');
  await viewer.screenshot({ path: "/tmp/next-viewer.png" });

  await page.bringToFront();
  await page.click('#sideA .ctl[data-delta="1"]');
  await viewer.waitForFunction(() => document.getElementById("scoreA").textContent === "3", {
    polling: 400,
    timeout: 10_000,
  });
  console.log("✓ viewer live sync");

  await viewer.bringToFront();
  await viewer.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await sleep(500);
  await viewer.screenshot({ path: "/tmp/next-viewer-mobile.png" });
  await viewer.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 13. End session -> viewer waiting
  await page.bringToFront();
  await page.click("#endBtn");
  await page.waitForFunction(() => document.getElementById("endDialog").open, { timeout: 10_000 });
  await page.click("#confirmEnd");
  await page.waitForSelector("#setupView", { timeout: 20_000 });
  await viewer.waitForSelector("#waitingView", { polling: 500, timeout: 10_000 });
  assert.strictEqual(await text(viewer, "#statusText"), "WAITING");
  await viewer.screenshot({ path: "/tmp/next-viewer-wait.png" });
  assert.strictEqual(await page.$$eval("#pastList li", (els) => els.length), 2, "two archived results");

  // 14. Blank names fall back to Player 1 / Player 2
  currentStep = "14 default names";
  await setInput(page, "#inputA", "");
  await setInput(page, "#inputB", "");
  await page.click("#startBtn");
  await page.waitForSelector("#arenaView", { timeout: 20_000 });
  assert.strictEqual(await text(page, "#nameTextA"), "Player 1");
  assert.strictEqual(await text(page, "#nameTextB"), "Player 2");
  await page.waitForFunction(() => document.getElementById("statusText").textContent === "LIVE · SESSION 03", {
    timeout: 10_000,
  });
  console.log("✓ default names");

  await page.click("#endBtn");
  await page.waitForFunction(() => document.getElementById("endDialog").open, { timeout: 10_000 });
  await page.click("#confirmEnd");
  await page.waitForSelector("#setupView", { timeout: 20_000 });
  await viewer.waitForSelector("#waitingView", { polling: 500, timeout: 10_000 });

  // 15. Viewer keeps working without an admin session
  currentStep = "15 public after signout";
  await page.click("#signOutBtn");
  await page.waitForSelector("#loginPane", { timeout: 10_000 });
  await viewer.reload({ waitUntil: "networkidle0" });
  await viewer.waitForSelector("#waitingView", { timeout: 20_000 });
  assert(!(await shown(viewer, "#gateView")), "viewer still public after sign out");
  console.log("✓ viewer waiting state and public access");

  console.log("Browser errors:", errors.length ? errors : "none");
  await browser.close();
}

try {
  await main();
  console.log("ALL ASSERTIONS PASSED");
  cleanup(0);
} catch (err) {
  console.error("TEST FAILED:", err);
  console.error("--- server log ---");
  console.error(serverLog.split("\n").slice(-40).join("\n"));
  try {
    await browser?.close();
  } catch {}
  cleanup(1);
}
