// Copia los archivos estáticos de la PWA a www/ (carpeta que usa Capacitor).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const f of ['index.html', 'styles.css', 'firebase-config.js', 'manifest.webmanifest', 'sw.js', 'js', 'icons']) cpSync(f, `www/${f}`, { recursive: true });
console.log('www/ listo');
