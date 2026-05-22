const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    await page.goto('http://localhost:3002/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const passwordInput = page.locator('#password');
    const toggleButton = page.getByRole('button', { name: 'Show password' });

    await page.waitForLoadState('networkidle');
    await toggleButton.click();
    await passwordInput.waitFor({ state: 'visible' });
    await page.waitForFunction(
      () => document.querySelector('#password')?.getAttribute('type') === 'text'
    );
    await page.getByRole('button', { name: 'Hide password' }).click();
    await page.waitForFunction(
      () => document.querySelector('#password')?.getAttribute('type') === 'password'
    );

    await page.locator('#email').fill('admin@bakaloo.com');
    await passwordInput.fill('Admin@123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 30000 });
    await page.getByText('Overview of your store performance').waitFor({
      state: 'visible',
      timeout: 30000,
    });

    await page.screenshot({
      path: '/tmp/dashboard-login-success.png',
      fullPage: true,
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          url: page.url(),
          screenshot: '/tmp/dashboard-login-success.png',
        },
        null,
        2
      )
    );
  } catch (error) {
    await page
      .screenshot({
        path: '/tmp/dashboard-login-failure.png',
        fullPage: true,
      })
      .catch(() => {});

    console.error(error);
    console.log(
      JSON.stringify(
        {
          ok: false,
          url: page.url(),
          screenshot: '/tmp/dashboard-login-failure.png',
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
