import './styles.css';
import { bootstrap } from './app/bootstrap';

// Başlatma senkron çalışır. Hata yutulmaz; bağlamıyla konsola yazılır.
try {
  bootstrap();
} catch (err) {
  console.error('[Ferah Nefes] başlatma hatası:', err);
}
