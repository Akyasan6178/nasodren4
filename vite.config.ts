import { defineConfig } from 'vite';

export default defineConfig({
  // base: './' (NS4-02 kararı)
  // Nihai hosting hedefi henüz belli değil. Göreli base, production çıktısındaki
  // JS/CSS/favicon bağlantılarını index.html'e göre göreli tutar; böylece dist/
  // klasörü alan adı kökünde de bir alt dizinde (ör. GitHub Pages /<repo>/) de açılır.
  // Hosting seçildiğinde (GitHub Pages alt yolu, özel domain kökü, Cloudflare Pages,
  // Netlify vb.) bu değer yeniden doğrulanmalı; mutlak bir yol gerekirse burada
  // değiştirilmelidir.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
