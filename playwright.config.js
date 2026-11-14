const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://127.0.0.1:8082',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'mvn spring-boot:run -Dspring-boot.run.profiles=test -Dspring-boot.run.arguments=--server.port=8082',
    url: 'http://127.0.0.1:8082',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
