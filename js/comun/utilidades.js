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

/** Una fórmula en su propia línea (clase extra opcional). */
function formulaEnHtml(contenido, claseExtra) {
  return '<div class="formula' + (claseExtra ? ' ' + claseExtra : '') + '">' + contenido + '</div>';
}

/** Tabla de resultados: encabezados en HTML y filas como listas de celdas en HTML. */
function tablaDeResultados(encabezados, filas) {
  const celdas = (etiqueta, contenidos) => contenidos.map(contenido => '<' + etiqueta + '>' + contenido + '</' + etiqueta + '>').join('');
  return '<div class="table-scroll"><table class="tabla-resultado"><thead><tr>' + celdas('th', encabezados) + '</tr></thead><tbody>' +
    filas.map(fila => '<tr>' + celdas('td', fila) + '</tr>').join('') + '</tbody></table></div>';
}
