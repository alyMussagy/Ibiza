import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333",
  unconfirmed = "44444444-4444-4444-8444-444444444444";
let application: string, organization: string;
async function asUser(id: string) {
  await db.exec(
    `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false)`,
  );
}
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;`,
  );
  for (const file of [
    "0000_illegal_wallop.sql",
    "0001_security.sql",
    "0002_kind_energizer.sql",
    "0003_auth_partner_security.sql",
    "0004_profile_update.sql",
    "0005_listing_management.sql",
  ])
    await db.exec(
      readFileSync(
        new URL(`../../src/db/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    `INSERT INTO auth.users VALUES ('${alice}','{"display_name":"Alice","role":"super_admin"}',now()),('${bob}','{"display_name":"Bob"}',now()),('${admin}','{}',now()),('${unconfirmed}','{}',null); INSERT INTO public.platform_roles(profile_id,role) VALUES('${admin}','super_admin');`,
  );
});
afterAll(() => db.close());
it("cria perfis mas ignora papéis enviados nos metadados de registo", async () => {
  expect((await db.query("SELECT * FROM public.profiles")).rows).toHaveLength(
    4,
  );
  expect(
    (await db.query("SELECT * FROM public.platform_roles")).rows,
  ).toHaveLength(1);
});
it("exige email confirmado e valida argumentos mesmo via RPC directa", async () => {
  await asUser(unconfirmed);
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Confirmed email");
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.submit_partner_application(NULL,'estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Invalid application");
});
it("cria candidatura, organização, membro e auditoria atomicamente", async () => {
  await asUser(alice);
  const r = await db.query<{ id: string }>(
    "SELECT public.submit_partner_application('Casa Teste','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa') AS id",
  );
  application = r.rows[0].id;
  const a = await db.query<{ organization_id: string }>(
    "SELECT organization_id FROM public.partner_applications",
  );
  organization = a.rows[0].organization_id;
  expect(
    (await db.query("SELECT approval FROM public.organizations")).rows,
  ).toEqual([{ approval: "pending" }]);
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Outra Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Pending application");
});
it("isola dados empresariais entre parceiros e impede auto-aprovação", async () => {
  await asUser(bob);
  expect(
    (await db.query("SELECT * FROM public.partner_details")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT * FROM public.partner_applications")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT * FROM public.organizations")).rows,
  ).toHaveLength(0);
  await asUser(alice);
  await expect(
    db.query(
      `SELECT public.review_partner_application('${application}','approved','Sou eu mesmo')`,
    ),
  ).rejects.toThrow("Administrator required");
  await expect(
    db.exec("UPDATE public.organizations SET approval='approved'"),
  ).rejects.toThrow();
  await expect(
    db.exec(
      `INSERT INTO public.platform_roles(profile_id,role) VALUES('${alice}','super_admin')`,
    ),
  ).rejects.toThrow();
});
it("aprovação administrativa é única e auditada; contactos continuam privados", async () => {
  await asUser(admin);
  await db.query(
    `SELECT public.review_partner_application('${application}','approved','Informação verificada')`,
  );
  expect(
    (
      await db.query(
        "SELECT * FROM public.audit_logs WHERE action='partner.reviewed'",
      )
    ).rows,
  ).toHaveLength(1);
  await expect(
    db.query(
      `SELECT public.review_partner_application('${application}','rejected','Segunda decisão')`,
    ),
  ).rejects.toThrow("Application not pending");
  await asUser(bob);
  expect(
    (await db.query("SELECT * FROM public.partner_details")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT approval FROM public.organizations")).rows,
  ).toEqual([{ approval: "approved" }]);
});
it("administrador também não pode decidir sobre o próprio negócio", async () => {
  await asUser(admin);
  const r = await db.query<{ id: string }>(
    "SELECT public.submit_partner_application('Admin Casa','estadias','admin@example.test','+258 840000000','Tofo','Descrição suficientemente longa') AS id",
  );
  await expect(
    db.query(
      `SELECT public.review_partner_application('${r.rows[0].id}','approved','Não permitido')`,
    ),
  ).rejects.toThrow("Cannot review own");
});
it("auditoria rejeita alterações e dados anónimos são protegidos", async () => {
  await db.exec("RESET ROLE");
  await expect(
    db.exec("UPDATE public.audit_logs SET action='modified'"),
  ).rejects.toThrow("append-only");
  await db.exec("SET ROLE anon");
  await expect(
    db.query("SELECT * FROM public.partner_details"),
  ).rejects.toThrow();
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow();
});

it("edição de perfil só altera o próprio nome e mantém permissões intactas", async () => {
  await asUser(alice);
  await db.query("SELECT public.update_own_profile('  Alice Actualizada  ')");
  expect(
    (await db.query("SELECT display_name FROM public.profiles")).rows,
  ).toEqual([{ display_name: "Alice Actualizada" }]);
  await expect(
    db.query("SELECT public.update_own_profile(' ')"),
  ).rejects.toThrow("Invalid display name");
  await expect(
    db.query("SELECT public.update_own_profile(NULL)"),
  ).rejects.toThrow("Invalid display name");
  await expect(
    db.query("UPDATE public.profiles SET display_name='Intruso' WHERE id=$1", [
      bob,
    ]),
  ).rejects.toThrow();
  await expect(
    db.query(
      "INSERT INTO public.platform_roles(profile_id,role) VALUES($1,'super_admin')",
      [alice],
    ),
  ).rejects.toThrow();
  await asUser(bob);
  expect(
    (await db.query("SELECT display_name FROM public.profiles")).rows,
  ).toEqual([{ display_name: "Bob" }]);
  await asUser(unconfirmed);
  await expect(
    db.query("SELECT public.update_own_profile('Nome Novo')"),
  ).rejects.toThrow("Confirmed email");
  await db.exec("RESET ROLE; SET ROLE anon");
  await expect(
    db.query("SELECT public.update_own_profile('Nome Novo')"),
  ).rejects.toThrow();
});
let listingId: string;
it("anúncios exigem gestor aprovado e ficam privados antes da revisão", async () => {
  await asUser(bob);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,'Passeio na baía','Um passeio de barco com guia local e duração de duas horas.','experiencias','Tofo',150000,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Approved partner manager");
  await asUser(alice);
  const result = await db.query<{ id: string }>(
    "SELECT public.save_listing(NULL,$1,1,'Passeio na baía','Um passeio de barco com guia local e duração de duas horas.','experiencias','Tofo',150000,'pessoa',true) AS id",
    [organization],
  );
  listingId = result.rows[0].id;
  expect(
    (
      await db.query("SELECT review_status FROM public.listings WHERE id=$1", [
        listingId,
      ])
    ).rows,
  ).toEqual([{ review_status: "pending" }]);
  await expect(
    db.query("UPDATE public.listings SET status='published' WHERE id=$1", [
      listingId,
    ]),
  ).rejects.toThrow();
  await asUser(bob);
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
});
it("revisão verifica versão e publicação, edição retira a oferta do público", async () => {
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.review_listing($1,1,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Administrator required");
  await asUser(admin);
  await expect(
    db.query(
      "SELECT public.review_listing($1,2,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing changed");
  await db.query(
    "SELECT public.review_listing($1,1,'approved','Oferta validada')",
    [listingId],
  );
  await expect(
    db.query(
      "SELECT public.review_listing($1,1,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing not pending");
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(1);
  await asUser(alice);
  const query =
    "SELECT public.save_listing($1,$2,$3,'Passeio actualizado','Um passeio de barco com guia local e duração de três horas.','experiencias','Tofo',170000,'pessoa',true)";
  await expect(db.query(query, [listingId, organization, 1])).rejects.toThrow(
    "Listing changed",
  );
  await db.query(query, [listingId, organization, 2]);
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
  await asUser(admin);
  await expect(
    db.query(
      "SELECT public.review_listing($1,2,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing changed");
  await db.query(
    "SELECT public.review_listing($1,3,'rejected','Explicar melhor o percurso')",
    [listingId],
  );
  expect(
    (
      await db.query(
        "SELECT * FROM public.audit_logs WHERE action='listing.reviewed'",
      )
    ).rows,
  ).toHaveLength(2);
});
it("RPC de anúncio rejeita valores inválidos e publicação por parceiro suspenso", async () => {
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,NULL,'Descrição longa suficiente para validação de anúncio.','experiencias','Tofo',-1,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Invalid listing");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.organizations SET approval='suspended' WHERE id=$1",
    [organization],
  );
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,'Novo passeio','Descrição longa suficiente para validação de anúncio.','experiencias','Tofo',100,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Approved partner manager");
});
