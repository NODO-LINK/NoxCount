package app.noxcount;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Widget de pantalla de inicio: saldo total e ingresos/egresos del mes. Toca para abrir NoxCount. */
public class NoxWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "noxcount_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, NoxWidgetProvider.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    private static RemoteViews build(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.nox_widget);
        v.setTextViewText(R.id.w_balance, p.getString("balance", "NoxCount"));
        v.setTextViewText(R.id.w_income, "▲ " + p.getString("income", "—"));
        v.setTextViewText(R.id.w_expense, "▼ " + p.getString("expense", "—"));
        v.setTextViewText(R.id.w_month, p.getString("month", ""));
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }
}
