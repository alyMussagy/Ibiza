import { test, expect } from "@playwright/test";
test("contas têm formulários acessíveis e links de recuperação", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Que bom ter-te de volta." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Esqueceste a palavra-passe?" }).click();
  await expect(page).toHaveURL("/recuperar-conta");
  await expect(
    page.getByRole("heading", { name: "Vamos recuperar o acesso." }),
  ).toBeVisible();
  await page.goto("/registo");
  await expect(page.getByLabel("O teu nome")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("visitantes não acedem a perfil, parceiros ou administração", async ({
  page,
}) => {
  for (const path of [
    "/perfil",
    "/business/painel",
    "/business/candidatura",
    "/admin/parceiros",
    "/actualizar-palavra-passe",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(
      page.getByRole("heading", { name: "Que bom ter-te de volta." }),
    ).toBeVisible();
  }
});
test("logótipo oficial aparece e business orienta para candidatura", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("img", { name: "IBIZA", exact: true }),
  ).toBeVisible();
  await page.goto("/business");
  await page.getByRole("link", { name: "Apresentar o meu negócio" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
});
