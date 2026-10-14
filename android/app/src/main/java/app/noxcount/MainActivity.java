package app.noxcount;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NoxWidgetPlugin.class); // puente JS -> widget
        super.onCreate(savedInstanceState);
    }
}
