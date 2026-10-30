import { test, expect } from "@playwright/test";
test("homepage, pesquisa e detalhe editorial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Há lugares",
  );
  await page.getByLabel("Para onde vamos?").fill("Tofo");
  await page.getByRole("button", { name: "Explorar", exact: true }).click();
  await expect(page).toHaveURL(/q=Tofo/);
  await expect(page.getByText("2 resultados de demonstração")).toBeVisible();
  await page.getByRole("link", { name: /Tofo, ao ritmo/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tofo, ao ritmo do oceano",
  );
  await expect(
    page.getByRole("button", { name: "Partilhar inspiração" }),
  ).toBeVisible();
});
test("filtros, estado vazio e recuperação", async ({ page }) => {
  await page.goto("/explorar?q=zzz");
  await expect(
    page.getByRole("heading", { name: "Ainda não encontrámos esse lugar." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Limpar pesquisa" }).click();
  await expect(page).toHaveURL("/explorar");
  await expect(page.getByLabel("Para onde vamos?")).toHaveValue("");
  await page.getByLabel("O que queres descobrir?").selectOption("eventos");
  await page.getByRole("button", { name: "Explorar", exact: true }).click();
  await expect(page.getByText("1 resultados de demonstração")).toBeVisible();
});
test("categorias e navegação sem overflow", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("navigation", { name: "Navegação móvel" })
      .getByRole("link", { name: "Alojamentos" })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Alojamentos" })
      .click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alojamentos",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const route of [
    "destinos",
    "eventos",
    "restaurantes",
    "experiencias",
    "business",
    "sobre",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/pagina-inexistente");
  await expect(
    page.getByRole("heading", { name: "Este caminho ainda não existe." }),
  ).toBeVisible();
});
