/* ==========================================================================
   Utilidades pequeñas que comparten las páginas.
   ========================================================================== */

/** Muestra un mensaje arriba de los resultados. Sin mensaje o sin tipo, lo borra. */
function mostrarEstado(mensaje, tipo) {
  const caja = document.getElementById('statusBox');
  caja.innerHTML = (mensaje && tipo) ? '<div class="status ' + tipo + '">' + mensaje + '</div>' : '';
}

/** Devuelve una versión de la función que espera a que pasen `milisegundos` sin llamadas. */
function conRetardo(funcion, milisegundos) {
  let temporizador = null;
  return function () {
    clearTimeout(temporizador);
    temporizador = setTimeout(funcion, milisegundos);
  };
}

/** Un campo vacío o con solo espacios cuenta como vacío. */
function estaVacio(texto) {
  return !texto || !String(texto).trim();
}

/** Un paso titulado de un procedimiento (se usa en interpolación). */
function pasoEnHtml(titulo, contenido) {
  return '<div class="paso"><div class="paso-titulo">' + titulo + '</div>' + contenido + '</div>';
}
