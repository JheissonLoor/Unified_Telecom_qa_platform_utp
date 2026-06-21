import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => route.fulfill({
    json: {
      access_token: "synthetic-e2e-token",
      token_type: "bearer",
      expires_in: 900,
      user: { username: "agente1", display_name: "Agente 2001", role: "AgenteCallCenter", active: true, extension: "2001" },
    },
  }));
  const calls = [
    { id: 1, calldate: "2026-06-19T15:30:00Z", src: "2001", dst: "2002", duration: 135, billsec: 128, disposition: "ANSWERED", uniqueid: "e2e-1", direction: "outgoing", media: "audio", mos: 4.3, recording_available: true },
    { id: 2, calldate: "2026-06-19T15:12:00Z", src: "2002", dst: "2001", duration: 64, billsec: 58, disposition: "ANSWERED", uniqueid: "e2e-2", direction: "incoming", media: "video", mos: 4.1, recording_available: false },
    { id: 3, calldate: "2026-06-19T14:50:00Z", src: "2001", dst: "1001", duration: 30, billsec: 0, disposition: "NO ANSWER", uniqueid: "e2e-3", direction: "outgoing", media: "audio", mos: null, recording_available: false },
    { id: 4, calldate: "2026-06-19T14:31:00Z", src: "1002", dst: "2001", duration: 220, billsec: 210, disposition: "ANSWERED", uniqueid: "e2e-4", direction: "incoming", media: "audio", mos: 3.8, recording_available: true },
  ];
  await page.route("**/api/calls/page?**", async (route) => route.fulfill({ json: { items: calls, total: calls.length, limit: 5, offset: 0 } }));
  await page.route("**/api/services/status", async (route) => route.fulfill({ json: { api: "ok", database: "ok", pbx: "ok", recording: "ok", ivr: "ok", network: "ok" } }));
});

test("login y panel de agente", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Usuario").fill("agente1");
  await page.getByLabel("Contrasena").fill("SyntheticPassword123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Agente 2001")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marcar / Destino" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "2002" }).first()).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await expect(page.getByText("Llamada Saliente").first()).toBeVisible();
  }
  await page.screenshot({
    path: `../reports/screenshots/agent-dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
