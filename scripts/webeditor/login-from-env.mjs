import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaywright, saveSession } from "p5-webeditor-sync";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loginFile = path.join(root, ".env", "p5login.txt");
const EDITOR_ORIGIN = "https://editor.p5js.org";

function parseLoginFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing login file: ${filePath}`);
  }

  const text = fs.readFileSync(filePath, "utf8");
  const login = text.match(/^login:\s*(.+)$/im)?.[1]?.trim();
  const password = text.match(/^password:\s*(.+)$/im)?.[1]?.trim();

  if (!login || !password) {
    throw new Error(
      `${filePath} must contain:\nlogin: your-username\npassword: your-password`,
    );
  }

  return { login, password };
}

async function submitLoginForm(page, { login, password }) {
  await page.goto(`${EDITOR_ORIGIN}/login`, { waitUntil: "domcontentloaded" });

  const usernameField = page
    .locator('input[name="username"], input#username, input[type="text"]')
    .first();
  const passwordField = page
    .locator('input[name="password"], input#password, input[type="password"]')
    .first();

  await usernameField.waitFor({ state: "visible", timeout: 30_000 });
  await usernameField.fill(login);
  await passwordField.fill(password);

  const submitButton = page
    .locator(
      'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Login")',
    )
    .first();
  await submitButton.click();
}

export async function loginFromEnv({ timeoutMs = 120_000, headless = true } = {}) {
  const credentials = parseLoginFile(loginFile);
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await submitLoginForm(page, credentials);

    const deadline = Date.now() + timeoutMs;
    let username = null;

    while (Date.now() < deadline) {
      await page.waitForTimeout(1500);
      try {
        const response = await page.request.get(`${EDITOR_ORIGIN}/editor/session`);
        if (response.ok()) {
          const data = await response.json();
          username = data.username || data.user?.username || data.id;
          if (username) break;
        }
      } catch {
        // keep polling until login completes
      }
    }

    if (!username) {
      throw new Error("Login timed out. Check .env/p5login.txt credentials.");
    }

    const storageState = await context.storageState();
    const cookies = storageState.cookies.filter((cookie) =>
      cookie.domain.includes("p5js.org"),
    );
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    const sessionPath = saveSession({
      username,
      cookies,
      cookieHeader,
      savedAt: new Date().toISOString(),
      source: "env-login",
    });

    console.log(`Session saved for ${username} → ${sessionPath}`);
    return { username, sessionPath };
  } finally {
    await browser.close();
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loginFromEnv().catch((error) => {
    console.error(error.message);
    process.exit(2);
  });
}
