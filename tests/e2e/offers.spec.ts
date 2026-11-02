import {test,expect} from '@playwright/test';
test('catálogo real abre e detalhe inexistente não expõe dados',async({page})=>{
 await page.goto('/ofertas');await expect(page.getByRole('heading',{name:'Ofertas da nossa comunidade.'})).toBeVisible();
 await page.goto('/ofertas/nao-e-um-id');await expect(page.getByRole('heading',{name:/não|encontr|perdeu/i})).toBeVisible();
});
test('fotografia inexistente responde sem cache nem conteúdo sensível',async({request})=>{
 const response=await request.get('/media/11111111-1111-4111-8111-111111111111');expect(response.status()).toBe(404);expect(response.headers()['cache-control']).toBe('private, no-store');expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
