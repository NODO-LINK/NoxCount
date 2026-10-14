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

## Ejecutar
No requiere compilar:
```bash
python3 -m http.server 8080   # o: npx serve .
```
Abre http://localhost:8080. En el celular, "Agregar a pantalla de inicio" para instalarla. Para publicarla, sube la carpeta a cualquier hosting estático con HTTPS (Firebase Hosting, Netlify, GitHub Pages…).

## Activar login y nube (Firebase)
1. Crea un proyecto en https://console.firebase.google.com y agrega una app **Web**.
2. Activa **Authentication** (Correo/contraseña y Google) y **Firestore**.
3. Pega la configuración en `firebase-config.js` (`window.NOX_FIREBASE = {...}`).
4. Reglas de Firestore para que cada usuario solo vea sus datos:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
  }
}
```
5. Agrega tu dominio en Authentication → Configuración → Dominios autorizados.

## Notas
- Los datos viven en el dispositivo (`localStorage`) y se sincronizan completos con Firestore (gana el cambio más reciente).
- Las **fotos de recibos solo se guardan en el dispositivo** (no se sincronizan, por el límite de 1 MB por documento).
- Las notificaciones se muestran al abrir la app (no hay servidor de push).
- PIN, idioma y notificaciones son ajustes del dispositivo.
