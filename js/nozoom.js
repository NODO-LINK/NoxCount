// Sin zoom: ni pellizco, ni doble toque, ni Ctrl+rueda / Ctrl +/- (la app ya está pensada para el tamaño del dispositivo).
(function () {
  var stop = function (e) { e.preventDefault(); };
  // iOS Safari: gestos de pellizco
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) { document.addEventListener(t, stop, { passive: false }); });
  // dos o más dedos sobre la pantalla
  document.addEventListener('touchmove', function (e) { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  // escritorio: Ctrl/Cmd + rueda y Ctrl/Cmd + (+ - 0)
  document.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '_', '0'].indexOf(e.key) !== -1) e.preventDefault(); });
})();
