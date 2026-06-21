import { expect, test } from "@playwright/test";

const agent1Password = process.env.E2E_AGENT1_PASSWORD;
const agent2Password = process.env.E2E_AGENT2_PASSWORD;

test("dos agentes registran WSS y completan llamadas WebRTC de voz y video", async ({ browser }) => {
  test.skip(!agent1Password || !agent2Password, "Requires generated demo passwords");

  const firstContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ["camera", "microphone"],
  });
  const secondContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ["camera", "microphone"],
  });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  async function login(page: typeof first, username: string, password: string) {
    await page.goto("/");
    await page.getByLabel("Usuario").fill(username);
    await page.getByLabel("Contrasena").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("button", { name: "Conectar SIP" })).toBeVisible();
    await page.getByRole("button", { name: "Conectar SIP" }).click();
    await expect(page.locator(".availability.available")).toBeVisible({ timeout: 20_000 });
  }

  await login(first, "agente1", agent1Password!);
  await login(second, "agente2", agent2Password!);

  await first.getByLabel("Extension").fill("2002");
  await first.getByRole("button", { name: "Llamada de Voz" }).click();
  await expect(second.getByText("Llamada de voz")).toBeVisible({ timeout: 20_000 });
  await second.getByRole("button", { name: "Contestar" }).click();
  await expect(first.getByRole("button", { name: "Finalizar" })).toBeEnabled({ timeout: 20_000 });
  await expect(first.getByText("Established", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(second.getByText("Established", { exact: true })).toBeVisible({ timeout: 20_000 });
  await first.getByRole("button", { name: /Retener/ }).click();
  await expect(first.getByText("Llamada retenida")).toBeVisible();
  await first.getByRole("button", { name: /Reanudar/ }).click();
  await expect(first.getByText("Llamada reanudada")).toBeVisible();
  await first.getByRole("button", { name: /Teclado/ }).click();
  await first.getByRole("button", { name: "5" }).click();
  await expect(first.getByText("DTMF 5 enviado")).toBeVisible();
  await first.getByRole("button", { name: "Finalizar" }).click();
  await expect(first.getByText("Llamada finalizada")).toBeVisible();
  await expect(second.getByText("IDLE", { exact: true })).toBeVisible({ timeout: 10_000 });

  await first.getByRole("button", { name: "Llamada de Video" }).click();
  await expect(second.getByText("Llamada de video")).toBeVisible({ timeout: 20_000 });
  await second.getByRole("button", { name: "Contestar" }).click();
  await expect(first.getByText("Established", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(second.getByText("Established", { exact: true })).toBeVisible({ timeout: 20_000 });

  for (const page of [first, second]) {
    await expect.poll(async () => page.locator("video").first().evaluate((video) => {
      const stream = video.srcObject as MediaStream | null;
      return stream?.getVideoTracks().length ?? 0;
    })).toBeGreaterThan(0);
  }

  await first.getByRole("button", { name: "Finalizar" }).click();
  await expect(first.getByText("Llamada finalizada")).toBeVisible();
  await expect(second.getByText("IDLE", { exact: true })).toBeVisible({ timeout: 10_000 });

  await first.getByRole("button", { name: /Conferencia/ }).click();
  await expect(first.getByText("Established", { exact: true })).toBeVisible({ timeout: 20_000 });
  await first.getByRole("button", { name: "Finalizar" }).click();
  await expect(first.getByText("Llamada finalizada")).toBeVisible();

  await firstContext.close();
  await secondContext.close();
});
