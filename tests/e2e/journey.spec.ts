import { test, expect } from "@playwright/test";

test("mostrar palavra-passe preserva o valor sem enviar o formulário", async ({
  page,
}) => {
  for (const path of ["/login", "/registo"]) {
    await page.goto(path);
    const password = page.getByLabel("Palavra-passe", { exact: true });
    await password.fill("apenas-teste-visual");
    await expect(password).toHaveAttribute("type", "password");
    await page
      .getByRole("button", { name: "Mostrar palavra-passe", exact: true })
      .click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("apenas-teste-visual");
    await expect(page).toHaveURL(path);
    await page
      .getByRole("button", { name: "Ocultar palavra-passe", exact: true })
      .click();
    await expect(password).toHaveAttribute("type", "password");
  }
});

test("percurso de descoberta preserva escolhas e filtra o catálogo", async ({
  page,
}) => {
  await page.goto("/comecar");
  await expect(
    page.getByRole("button", { name: "Escolher destino" }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: /Destinos/ }).check();
  await page.getByRole("button", { name: "Escolher destino" }).click();
  await page.getByRole("radio", { name: /Tofo/ }).check();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Destinos/ })).toBeChecked();
  await page.getByRole("button", { name: "Escolher destino" }).click();
  await expect(page.getByRole("radio", { name: /Tofo/ })).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ver opções" }).click();
  await expect(page).toHaveURL(/categoria=destinos/);
  await expect(page).toHaveURL(/local=Tofo/);
  await expect(
    page.getByRole("heading", { name: "Ofertas da nossa comunidade." }),
  ).toBeVisible();
});
