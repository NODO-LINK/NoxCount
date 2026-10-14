const D = {
  es: {
    home: 'Inicio', moves: 'Movimientos', reports: 'Reportes', plan: 'Plan', more: 'Más',
    balance: 'Saldo total', income: 'Ingresos', expense: 'Egresos', transfer: 'Transferencia',
    thisMonth: 'Este mes', budgets: 'Presupuestos', goals: 'Metas de ahorro', upcoming: 'Próximos pagos',
    weekly: 'Resumen semanal', weeklyText: 'Últimos 7 días: gastaste {a} ({d} vs. los 7 anteriores).',
    weeklyShort: 'Resumen semanal: gastaste {a} en los últimos 7 días.',
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
export const money = (n) => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
export const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};
export const dayName = (d) => new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d + 'T00:00:00'));
