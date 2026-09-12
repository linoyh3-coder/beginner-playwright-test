import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.google.com/search?q=youtube&oq=youtube&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDU3NzdqMGoyqAIAsAIB&sourceid=chrome&ie=UTF-8');
  await page.goto('https://www.google.com/sorry/index?continue=https://www.google.com/search%3Fq%3Dyoutube%26oq%3Dyoutube%26gs_lcrp%3DEgZjaHJvbWUyBggAEEUYOdIBCDU3NzdqMGoyqAIAsAIB%26sourceid%3Dchrome%26ie%3DUTF-8%26sei%3DIsqlarS4OaqVxc8PwJH2gA0&q=EhAqAKBB5sOTAEXBpaycVX11GKOUl9UGIjDhH1ANi1RdcuC-3-RPQpLpcSeDzATkVCHUYXXKAYCx69_rG-8csIfuB72mOvcpL8IyAVJaAUM');
  await page.getByRole('link', { name: 'Why did this happen?' }).click();
  await page.getByRole('link', { name: 'Terms of Service' }).click();
  await page.getByRole('link', { name: 'Your relationship with Google' }).click();
  await page.getByRole('link', { name: 'Technologies' }).click();
  await page.locator('#gb').getByRole('link', { name: 'FAQ' }).click();
  await expect(page.locator('#main-content')).toContainText('How does Google protect my privacy and keep my information secure?');
});