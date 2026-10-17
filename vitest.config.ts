import { defineConfig } from 'vitest/config';

// NS4-05: oyun motoru regresyon testleri. Motor (src/game) DOM bilmediği için
// testler Node ortamında, jsdom olmadan koşar. vite.config.ts'ten bağımsızdır;
// build ayarlarını etkilemez.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // vi.spyOn ile kurulan Math.random taklitleri her testten sonra özgün hâline döner.
    restoreMocks: true,
  },
});
