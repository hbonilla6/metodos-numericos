/* ==========================================================================
   Veredicto sobre el método (converge, converge lento, diverge) y respuesta final.
   ========================================================================== */

function nombreDelMetodo(metodo) {
  return metodo === 'jacobi' ? 'Jacobi' : 'Gauss-Seidel';
}

function cajaDeVeredicto(clase, titulo, texto) {
  return '<div class="veredicto ' + clase + '"><strong>' + titulo + '</strong> — ' + texto + '</div>';
}

/** Texto de "x ≈ 1, y ≈ 2, z ≈ 3" con la solución redondeada a 6 decimales. */
function solucionEnHtml(ultimaFila) {
  return NOMBRES_VARIABLES
    .map((nombre, j) => nombre + ' ≈ <strong>' + formatear(ultimaFila.x[j].toDecimalPlaces(6)) + '</strong>')
    .join(',&nbsp;&nbsp;');
}

function veredictoDelMetodo(resultado, nombre, ultimaFila) {
  if (resultado.estado === ESTADO.CONVERGIO) {
    const iteraciones = estado.filas.length - 1;
    const nota = iteraciones > MOSTRAR_TODO_HASTA
      ? ' Se muestran las primeras ' + ITERACION_DE_CONTROL + '; puedes expandir para ver el resto.'
      : '';
    return cajaDeVeredicto('converge', 'Converge', nombre + ' llegó a la tolerancia en ' + iteraciones + ' iteraciones.' + nota);
  }

  if (resultado.estado === ESTADO.DIVERGE) {
    const motivo = resultado.sinAcercarse
      ? 'en la iteración ' + resultado.iteracionDeControl + ' los valores no se acercan a la solución (el error no baja, es ' + formatear(ultimaFila.error) + ')'
      : 'los valores crecen sin control (se detuvo en la iteración ' + ultimaFila.iteracion + ')';
    return cajaDeVeredicto('diverge', 'Diverge', 'con ' + nombre + ' ' + motivo + '. Nos damos por vencidos aquí.');
  }

  return cajaDeVeredicto('lento', 'Converge, pero muy lento',
    'tras ' + MAX_ITERACIONES + ' iteraciones ' + nombre + ' sigue acercándose pero aún no llega a la tolerancia (error ' + formatear(ultimaFila.error) + ').');
}

/** Aviso sobre el orden de ecuaciones: ofrecer el alternativo si el de clase falla, o volver al de clase. */
function avisoDeOrden(resolucion) {
  const textoDeOrden = orden => '(' + orden.map(ecuacion => ecuacion + 1).join(', ') + ')';

  if (resolucion.esAlternativo) {
    return '<div class="veredicto lento">Estás viendo un orden distinto al de clase: ecuaciones ' + textoDeOrden(resolucion.orden) + '. ' +
      '<button type="button" class="secundario" data-accion="alternar-orden">Volver al orden de clase ' + textoDeOrden(resolucion.ordenDeClase) + '</button></div>';
  }
  if (resolucion.alternativo) {
    return '<div class="veredicto lento">Con otro orden de las ecuaciones ' + textoDeOrden(resolucion.alternativo.orden) + ' sí se llega a la solución. ' +
      '<button type="button" data-accion="alternar-orden">Probar ese orden</button></div>';
  }
  return '';
}

function mostrarVeredicto(resultado, resolucion) {
  const nombre = nombreDelMetodo(estado.metodo);
  const ultimaFila = estado.filas[estado.filas.length - 1];

  document.getElementById('veredicto').innerHTML =
    veredictoDelMetodo(resultado, nombre, ultimaFila) + avisoDeOrden(resolucion);

  if (resultado.estado === ESTADO.CONVERGIO) {
    document.getElementById('finalAnswerBox').innerHTML = '<div class="final-answer">' + solucionEnHtml(ultimaFila) + '</div>';
  }
}
