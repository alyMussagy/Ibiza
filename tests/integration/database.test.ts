import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const u1 = "11111111-1111-4111-8111-111111111111",
  u2 = "22222222-2222-4222-8222-222222222222";
const org = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;`,
  );
  for (const file of ["0000_illegal_wallop.sql", "0001_security.sql"])
    await db.exec(
      readFileSync(
        new URL(`../../src/db/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    `INSERT INTO auth.users VALUES ('${u1}'),('${u2}'); INSERT INTO public.profiles(id,display_name) VALUES ('${u1}','One'),('${u2}','Two'); INSERT INTO public.organizations(id,name,slug) VALUES ('${org}','Pending partner','pending');`,
  );
});
afterAll(async () => {
  await db.close();
});
describe("Migrations PostgreSQL e RLS (PGlite)", () => {
  it("impede publicação sem aprovação mesmo via SQL privilegiado", async () => {
    await expect(
      db.exec(
        `INSERT INTO public.listings(organization_id,slug,title,description,category,status) VALUES ('${org}','blocked','Blocked','Test','estadias','published')`,
      ),
    ).rejects.toThrow("Partner approval");
  });
  it("isola perfis por utilizador e bloqueia alterações de aprovação", async () => {
    await db.exec(
      `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${u1}',false);`,
    );
    try {
      const result = await db.query<{ id: string }>(
        "SELECT id FROM public.profiles",
      );
      expect(result.rows).toEqual([{ id: u1 }]);
      await expect(
        db.exec(`UPDATE public.organizations SET approval='approved'`),
      ).rejects.toThrow();
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("mostra apenas serviços publicados de parceiros aprovados e oculta suspensão", async () => {
    await db.exec(
      `UPDATE public.organizations SET approval='approved' WHERE id='${org}'; INSERT INTO public.listings(organization_id,slug,title,description,category,status) VALUES ('${org}','visible','Visible','Test','estadias','published'),('${org}','draft','Draft','Test','estadias','draft'); SET ROLE anon;`,
    );
    try {
      expect((await db.query("SELECT slug FROM public.listings")).rows).toEqual(
        [{ slug: "visible" }],
      );
      await expect(db.query("SELECT * FROM public.profiles")).rejects.toThrow();
    } finally {
      await db.exec("RESET ROLE");
    }
    await db.exec(
      `UPDATE public.organizations SET approval='suspended' WHERE id='${org}'; SET ROLE anon;`,
    );
    try {
      expect(
        (await db.query("SELECT * FROM public.listings")).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec("RESET ROLE");
    }
  });
});
