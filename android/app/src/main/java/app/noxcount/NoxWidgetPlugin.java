package app.noxcount;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Recibe saldo/ingresos/egresos desde la app web y actualiza el widget. */
@CapacitorPlugin(name = "NoxWidget")
public class NoxWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences.Editor ed = ctx.getSharedPreferences(NoxWidgetProvider.PREFS, Context.MODE_PRIVATE).edit();
        ed.putString("balance", call.getString("balance", "—"));
        ed.putString("income", call.getString("income", "—"));
        ed.putString("expense", call.getString("expense", "—"));
        ed.putString("month", call.getString("month", ""));
        ed.apply();
        NoxWidgetProvider.refreshAll(ctx);
        call.resolve(new JSObject());
    }
}
