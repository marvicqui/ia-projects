import { expect, test } from "@playwright/test";

test("module happy paths render", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "JVP Document Intelligence" })).toBeVisible();

  await page.goto("/cfdi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Conciliacion CFDI" })).toBeVisible();

  await page.goto("/laboral", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Cumplimiento laboral" })).toBeVisible();

  await page.goto("/contratos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Analisis de contratos" })).toBeVisible();
});
