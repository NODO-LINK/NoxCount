const D = {
  es: {
    home: 'Inicio', moves: 'Movimientos', reports: 'Reportes', plan: 'Plan', more: 'Más',
    balance: 'Saldo total', income: 'Ingresos', expense: 'Egresos', transfer: 'Transferencia',
    thisMonth: 'Este mes', budgets: 'Presupuestos', goals: 'Metas de ahorro', upcoming: 'Próximos pagos',
    weekly: 'Resumen semanal', weeklyText: 'Últimos 7 días: gastaste {a} ({d} vs. los 7 anteriores).',
    weeklyShort: 'Resumen semanal: gastaste {a} en los últimos 7 días.',
    search: 'Buscar texto, monto o #etiqueta', undo: 'Deshacer', deleted: 'Movimiento eliminado', currency: 'Moneda', baseCur: 'Moneda base', rates: 'Tipos de cambio',
    rateHelp: '1 {c} = ? {b}', toAmount: 'Monto recibido ({c})', byTag: 'Gastos por etiqueta', byAcc: 'Por cuenta', projection: 'Proyección de fin de mes',
    projText: 'Al ritmo actual cerrarías el mes con {a} de egresos.', dailyAvg: 'Gasto diario promedio (30 días)', daysLeft: 'Días que te alcanza el saldo', days: 'días',
    annual: 'Anual', monthly: 'Mensual', year: 'Año', net: 'Ahorro', topExp: 'Mayores gastos del mes', favorites: 'Favoritos', favAdd: 'Nuevo favorito', favRegistered: 'Registrado: {n}',
    favHint: 'Toca un favorito en Inicio para registrarlo hoy.', calcHint: 'Puedes escribir operaciones: 12.5*3', voice: 'Dictar', voiceNo: 'Tu navegador no soporta voz.', voiceHeard: 'Entendí: {s}', voiceFail: 'No entendí. Prueba: "gasté 20 en comida".',
    remind: 'Recordatorio diario', remindAt: 'Hora del recordatorio', remindText: 'No olvides registrar tus gastos de hoy 📝', hide: 'Ocultar saldos',
    bio: 'Huella / Face ID', bioSet: 'Activar huella / Face ID', bioRemove: 'Quitar huella / Face ID', bioFail: 'No se pudo usar la huella.', bioUse: 'Usar huella / Face ID',
    encrypt: 'Cifrar datos en el dispositivo', encOn: 'Activar cifrado', encOff: 'Desactivar cifrado', encWarn: 'Si olvidas tu PIN, los datos cifrados NO se pueden recuperar. Con el cifrado activo, el PIN es obligatorio y la huella se desactiva.', needPin: 'Primero define un PIN.', encActive: 'Cifrado activo ✅', encLocked: 'Con cifrado activo no se puede cambiar el PIN: desactiva el cifrado primero.', widgetNote: 'Widget de Android disponible en la app nativa.', tag: 'Etiqueta', all: 'Todo',
    nothing: 'Nada por aquí todavía.', add: 'Agregar', save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
    amount: 'Monto', date: 'Fecha', account: 'Cuenta', toAccount: 'Cuenta destino', category: 'Categoría', note: 'Nota',
    tags: 'Etiquetas (separadas por coma)', receipt: 'Foto del recibo', newMove: 'Nuevo movimiento', editMove: 'Editar movimiento',
    from: 'Desde', to: 'Hasta', accounts: 'Cuentas', debts: 'Deudas y préstamos', recurring: 'Recurrentes', categories: 'Categorías', settings: 'Ajustes',
    cash: 'Efectivo', bank: 'Cuenta bancaria', wallet: 'Billetera digital', name: 'Nombre', type: 'Tipo', initial: 'Saldo inicial',
    iOwe: 'Yo debo', theyOwe: 'Me deben', who: 'Persona / entidad', due: 'Vence', paid: 'Pagado', markPaid: 'Marcar pagado', pending: 'Pendiente',
    freq: 'Frecuencia', weeklyF: 'Semanal', monthlyF: 'Mensual', yearlyF: 'Anual', next: 'Próxima fecha', auto: 'Registrar automáticamente', confirm: 'Confirmar',
    budget: 'Presupuesto', spent: 'Gastado', of: 'de', target: 'Meta', saved: 'Ahorrado', contribute: 'Aportar', goalName: 'Nombre de la meta',
    byCategory: 'Gastos por categoría', byMonth: 'Ingresos vs. egresos (6 meses)', trend: 'Evolución del saldo', compare: 'Comparar con el mes anterior',
    print: 'Exportar PDF', language: 'Idioma', pin: 'PIN de bloqueo', setPin: 'Definir PIN', removePin: 'Quitar PIN', enterPin: 'Ingresa tu PIN', wrongPin: 'PIN incorrecto',
    notifs: 'Notificaciones', nDue: 'Pagos próximos', nBudget: 'Presupuesto excedido', nSummary: 'Resumen semanal/mensual',
    cloud: 'Nube y cuenta', signIn: 'Iniciar sesión', signUp: 'Crear cuenta', signOut: 'Cerrar sesión', google: 'Continuar con Google', email: 'Correo', password: 'Contraseña',
    skip: 'Continuar sin cuenta', cloudOff: 'La sincronización en la nube no está configurada (ver README).', synced: 'Sincronizado', syncing: 'Sincronizando…', offline: 'Sin conexión: se sincroniza al volver.',
    reset: 'Borrar todos los datos', resetConfirm: '¿Borrar TODOS los datos de este dispositivo? No se puede deshacer.', deleteConfirm: '¿Eliminar?',
    overBudget: 'Te pasaste del presupuesto de {c}', dueSoon: 'Vence pronto: {n}', inUse: 'No se puede eliminar: está en uso.', icon: 'Ícono (emoji)',
    total: 'Total', vs: 'vs. mes anterior', noPin: 'Sin PIN', pinNew: 'Nuevo PIN (4-6 dígitos)', month: 'Mes', allDay: 'Hoy',
    c_food: 'Comida', c_transport: 'Transporte', c_rent: 'Renta / Hogar', c_services: 'Servicios', c_leisure: 'Ocio', c_health: 'Salud', c_edu: 'Educación', c_shop: 'Compras', c_other: 'Otros',
    i_salary: 'Sueldo', i_freelance: 'Freelance / ventas', i_invest: 'Rentas / inversiones', i_other: 'Otros ingresos',
    a_cash: 'Efectivo', a_bank: 'Banco',
  },
  en: {
    home: 'Home', moves: 'Transactions', reports: 'Reports', plan: 'Plan', more: 'More',
    balance: 'Total balance', income: 'Income', expense: 'Expenses', transfer: 'Transfer',
    thisMonth: 'This month', budgets: 'Budgets', goals: 'Savings goals', upcoming: 'Upcoming payments',
    weekly: 'Weekly summary', weeklyText: 'Last 7 days: you spent {a} ({d} vs. the previous 7).',
    weeklyShort: 'Weekly summary: you spent {a} in the last 7 days.',
    search: 'Search text, amount or #tag', undo: 'Undo', deleted: 'Transaction deleted', currency: 'Currency', baseCur: 'Base currency', rates: 'Exchange rates',
    rateHelp: '1 {c} = ? {b}', toAmount: 'Amount received ({c})', byTag: 'Spending by tag', byAcc: 'By account', projection: 'End-of-month projection',
    projText: 'At the current pace you would end the month with {a} in expenses.', dailyAvg: 'Average daily spending (30 days)', daysLeft: 'Days your balance lasts', days: 'days',
    annual: 'Yearly', monthly: 'Monthly', year: 'Year', net: 'Savings', topExp: 'Biggest expenses this month', favorites: 'Favorites', favAdd: 'New favorite', favRegistered: 'Recorded: {n}',
    favHint: 'Tap a favorite on Home to record it today.', calcHint: 'You can type operations: 12.5*3', voice: 'Dictate', voiceNo: 'Your browser does not support voice.', voiceHeard: 'Heard: {s}', voiceFail: 'Could not understand. Try: "spent 20 on food".',
    remind: 'Daily reminder', remindAt: 'Reminder time', remindText: "Don't forget to log today's expenses 📝", hide: 'Hide balances',
    bio: 'Fingerprint / Face ID', bioSet: 'Enable fingerprint / Face ID', bioRemove: 'Remove fingerprint / Face ID', bioFail: 'Could not use biometrics.', bioUse: 'Use fingerprint / Face ID',
    encrypt: 'Encrypt data on this device', encOn: 'Enable encryption', encOff: 'Disable encryption', encWarn: 'If you forget your PIN, encrypted data CANNOT be recovered. With encryption on, the PIN is mandatory and biometrics are disabled.', needPin: 'Set a PIN first.', encActive: 'Encryption active ✅', encLocked: 'You cannot change the PIN while encryption is on: disable encryption first.', widgetNote: 'Android widget available in the native app.', tag: 'Tag', all: 'All',
    nothing: 'Nothing here yet.', add: 'Add', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    amount: 'Amount', date: 'Date', account: 'Account', toAccount: 'To account', category: 'Category', note: 'Note',
    tags: 'Tags (comma separated)', receipt: 'Receipt photo', newMove: 'New transaction', editMove: 'Edit transaction',
    from: 'From', to: 'To', accounts: 'Accounts', debts: 'Debts & loans', recurring: 'Recurring', categories: 'Categories', settings: 'Settings',
    cash: 'Cash', bank: 'Bank account', wallet: 'Digital wallet', name: 'Name', type: 'Type', initial: 'Initial balance',
    iOwe: 'I owe', theyOwe: 'Owed to me', who: 'Person / entity', due: 'Due', paid: 'Paid', markPaid: 'Mark paid', pending: 'Pending',
    freq: 'Frequency', weeklyF: 'Weekly', monthlyF: 'Monthly', yearlyF: 'Yearly', next: 'Next date', auto: 'Record automatically', confirm: 'Confirm',
    budget: 'Budget', spent: 'Spent', of: 'of', target: 'Target', saved: 'Saved', contribute: 'Contribute', goalName: 'Goal name',
    byCategory: 'Spending by category', byMonth: 'Income vs. expenses (6 months)', trend: 'Balance trend', compare: 'Compare with previous month',
    print: 'Export PDF', language: 'Language', pin: 'Lock PIN', setPin: 'Set PIN', removePin: 'Remove PIN', enterPin: 'Enter your PIN', wrongPin: 'Wrong PIN',
    notifs: 'Notifications', nDue: 'Upcoming payments', nBudget: 'Budget exceeded', nSummary: 'Weekly/monthly summary',
    cloud: 'Cloud & account', signIn: 'Sign in', signUp: 'Create account', signOut: 'Sign out', google: 'Continue with Google', email: 'Email', password: 'Password',
    skip: 'Continue without account', cloudOff: 'Cloud sync is not configured (see README).', synced: 'Synced', syncing: 'Syncing…', offline: 'Offline: will sync when back online.',
    reset: 'Erase all data', resetConfirm: 'Erase ALL data on this device? This cannot be undone.', deleteConfirm: 'Delete?',
    overBudget: 'You went over the {c} budget', dueSoon: 'Due soon: {n}', inUse: 'Cannot delete: in use.', icon: 'Icon (emoji)',
    total: 'Total', vs: 'vs. previous month', noPin: 'No PIN', pinNew: 'New PIN (4-6 digits)', month: 'Month', allDay: 'Today',
    c_food: 'Food', c_transport: 'Transport', c_rent: 'Rent / Home', c_services: 'Utilities', c_leisure: 'Leisure', c_health: 'Health', c_edu: 'Education', c_shop: 'Shopping', c_other: 'Other',
    i_salary: 'Salary', i_freelance: 'Freelance / sales', i_invest: 'Rent / investments', i_other: 'Other income',
    a_cash: 'Cash', a_bank: 'Bank',
  },
};
let lang = 'es';
export const setLang = (l) => { lang = D[l] ? l : 'es'; document.documentElement.lang = lang; };
export const getLang = () => lang;
export const t = (k, v) => {
  let s = (D[lang] && D[lang][k]) || D.es[k] || k;
  if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]);
  return s;
};
export const money = (n, cur = "USD") => { try { return new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", { style: "currency", currency: cur }).format(n || 0); } catch { return (n || 0).toFixed(2) + " " + cur; } };
export const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};
export const dayName = (d) => new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d + 'T00:00:00'));
