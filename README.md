# 🌙 NoxCount

App web instalable (PWA) para controlar tus **ingresos y egresos**. Funciona sin internet, con tema oscuro, en español e inglés, y sincroniza con la nube si configuras Firebase.

## Funciones
- Movimientos: ingresos, egresos y transferencias entre cuentas, con nota, etiquetas, foto del recibo y método de pago (cuenta).
- Cuentas: efectivo, banco y billeteras digitales, con saldo inicial. Moneda: USD.
- Categorías predefinidas y editables (ingresos: sueldo, freelance/ventas, rentas/inversiones, otros).
- Recurrentes (semanal/mensual/anual): se registran solos o con confirmación.
- Presupuestos por categoría con alerta al excederlos, metas de ahorro, deudas y préstamos, pagos próximos.
- Reportes: pastel por categoría, barras por mes, evolución del saldo, comparación con el mes anterior y **exportar a PDF** (botón → "Guardar como PDF").
- Filtro por fecha, PIN de bloqueo, notificaciones (pagos próximos, presupuesto excedido, resumen semanal).
- Login (correo/contraseña o Google) y sincronización con Firebase; offline-first.

## Diseño y calculadora de presupuesto (v3)
- Íconos vectoriales SVG (`js/icons.js`) en lugar de emojis; las categorías propias eligen su ícono de una cuadrícula. Los datos antiguos con emojis se migran solos.
- Fondo con shader WebGL (`js/shader.js`): brillo amarillo muy sutil sobre negro, a baja resolución y ~30 fps. Se pausa con la pestaña oculta y respeta "reducir movimiento" (queda un cuadro fijo).
- Animaciones leves: entrada escalonada de tarjetas, barras y gráficos que se dibujan, saldo que "corre" al nuevo valor, hoja deslizante. Transiciones de **elemento compartido** (View Transitions): el botón "+" y las filas se transforman en el formulario.
- **Calculadora de presupuesto** (pestaña *Plan*): escribe (o dicta) cuánto cobras al mes y reparte tu dinero en Necesidades / Deseos / Ahorro (50/30/20, 60/20/20, 40/30/30 o porcentajes propios), con el monto por categoría. "Aplicar" crea los presupuestos, una meta de ahorro anual y, si quieres, tu sueldo como ingreso mensual. Inicio muestra cuánto te queda por gastar y cuánto puedes gastar por día.

## Funciones añadidas (v2)
- Búsqueda por texto, monto y #etiqueta · "Deshacer" al borrar · favoritos de un toque en Inicio.
- Calculadora en el monto (`12.5*3`) · registro por voz 🎤 (navegadores con reconocimiento de voz, p. ej. Chrome).
- Varias monedas: cada cuenta tiene su moneda, tipos de cambio manuales en Ajustes y totales en tu moneda base. Transferencias entre monedas piden el monto recibido.
- Reportes: por etiqueta, por cuenta, mayores gastos, **reporte anual**, gráficos interactivos (toca una barra, rebanada o punto).
- Inicio: proyección de fin de mes, gasto diario promedio y días que te alcanza el saldo.
- Ocultar saldos 👁️ · recordatorio diario · PIN, huella/Face ID y **cifrado de datos** (AES-GCM, clave derivada del PIN).
  - Con cifrado activo el PIN es obligatorio en cada apertura y la huella se desactiva (la huella no puede entregar la clave). **Si olvidas el PIN, no hay forma de recuperar los datos.** La copia en la nube (Firebase) no está cifrada.

## App Android con widget
El widget (saldo total e ingresos/egresos del mes, toca para abrir) es nativo de Android, así que la app se empaqueta con Capacitor (`android/`).
```bash
npm install
npm run android:sync     # copia la web a www/ y sincroniza con Android
npm run android:open     # abre Android Studio  (o:  npm run android:apk)
```
Requiere Android Studio / JDK 17 + Android SDK. En GitHub, el workflow `Android APK` compila un APK de depuración en cada push (descárgalo de *Actions → Artifacts*). Para agregar el widget: mantén presionada la pantalla de inicio → Widgets → NoxCount.
- El widget se actualiza cada vez que abres o cambias datos en la app (y cada 30 min como mínimo). Con saldos ocultos o cifrado activo muestra `••••••`.
- Limitaciones dentro del WebView de Android: el botón de voz y la huella (WebAuthn) pueden no estar disponibles, y el login con Google (popup) no funciona; usa correo/contraseña.
- No hay widget para iPhone (requeriría una app nativa de iOS en Swift).

## Ejecutar
No requiere compilar:
```bash
python3 -m http.server 8080   # o: npx serve .
```
Abre http://localhost:8080. En el celular, "Agregar a pantalla de inicio" para instalarla. Para publicarla, sube la carpeta a cualquier hosting estático con HTTPS (Firebase Hosting, Netlify, GitHub Pages…).

## Activar login y nube (Firebase)
1. Crea un proyecto en https://console.firebase.google.com y agrega una app **Web**.
2. Activa **Authentication** (Correo/contraseña y Google) y **Firestore**.
3. Pega la configuración (`firebaseConfig`) **dentro de la app**: Inicio → *Modo local* (o Más → Ajustes → Nube y cuenta) → pegar → *Guardar y activar*. Queda guardada en ese dispositivo. Alternativa para que valga para todos los usuarios del sitio: ponla en `firebase-config.js` (`window.NOX_FIREBASE = {...}`) y vuelve a publicar.
4. Reglas de Firestore: copia el contenido de [`firestore.rules`](firestore.rules) en Firestore → Reglas → Publicar (cada usuario solo puede leer y escribir `users/{su uid}`, con validación de formato y tamaño).
5. Agrega tu dominio en Authentication → Configuración → Dominios autorizados.

## Notas
- Los datos viven en el dispositivo (`localStorage`) y se sincronizan completos con Firestore (gana el cambio más reciente).
- Las **fotos de recibos solo se guardan en el dispositivo** (no se sincronizan, por el límite de 1 MB por documento).
- Las notificaciones se muestran al abrir la app (no hay servidor de push).
- PIN, idioma y notificaciones son ajustes del dispositivo.
