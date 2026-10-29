/* ==========================================================================
   Cómo se muestra el procedimiento de Lagrange: fórmulas con fracciones,
   términos expandidos y simplificados, y polinomio final.
   ========================================================================== */

/** El factor (a − b) escrito sin calcular. */
function factorConstante(a, b) {
  return '(' + a + (b >= 0 ? ' − ' + b : ' + ' + (-b)) + ')';
}

function procedimientoEnHtml(resultado, puntos) {
  const { total } = resultado;

  // Orden de los términos: lineal f1, f0; parabólica y superiores f0, f1, f2…
  const orden = puntos.length === 2 ? [1, 0] : puntos.map((p, i) => i);
  const terminos = orden.map(i => resultado.terminos[i]);

  // Paso 1: la fórmula con los puntos sustituidos, sin operar
  const terminosSustituidos = orden.map(i => {
    const numerador = puntos.map((p, j) => j === i ? null : factorConVariable(p[0])).filter(Boolean).join('');
    const denominador = puntos.map((p, j) => j === i ? null : factorConstante(puntos[i][0], p[0])).filter(Boolean).join('');
    return fraccion(numerador, denominador) + '·(' + puntos[i][1] + ')';
  });
  let html = pasoEnHtml('Fórmula de Lagrange con tus puntos',
    '<div class="formula">P(x) = ' + terminosSustituidos.join(' + ') + '</div>');

  // Paso 2: cada término expandido y, en la misma línea, ya simplificado
  html += pasoEnHtml('Cada término, expandido y simplificado', terminos.map((termino, i) =>
    '<div class="formula termino-fila"><span>Término ' + (i + 1) + ':</span> ' +
    '<span class="expandido">' + fraccion(polinomioEnHtml(termino.numerador), fraccionATexto(termino.denominador)) +
    ' · (' + fraccionEnHtml(termino.fi) + ')</span> = ' +
    '<span class="simplificado">' + polinomioEnHtml(termino.terminoFinal) + '</span></div>').join(''));

  // Paso 3: suma de términos semejantes
  if (terminos.length > 1) {
    html += pasoEnHtml('Sumando términos semejantes',
      '<div class="formula">P(x) = ' + terminos.map(t => '(' + polinomioEnHtml(t.terminoFinal) + ')').join(' + ') + '</div>');
  }

  return html + '<div class="resultado">P(x) = ' + polinomioEnHtml(total) + '</div>';
}
