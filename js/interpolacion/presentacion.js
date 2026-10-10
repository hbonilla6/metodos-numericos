/* ==========================================================================
   Cómo se muestra el procedimiento de Lagrange: fórmulas con fracciones,
   términos expandidos y polinomio final.
   ========================================================================== */

/** (a − b) tal cual, sin calcular todavía, como se ve primero en el pizarrón. */
function factorConstante(a, b) {
  return '(' + a + (b >= 0 ? ' − ' + b : ' + ' + (-b)) + ')';
}

function procedimientoEnHtml(resultado, puntos) {
  const { terminos, total } = resultado;

  // Paso 1: la fórmula con los puntos sustituidos tal cual, antes de calcular nada
  const terminosSustituidos = terminos.map((termino, i) => {
    const numerador = puntos.map((p, j) => j === i ? null : factorConVariable(p[0])).filter(Boolean).join('');
    const denominador = puntos.map((p, j) => j === i ? null : factorConstante(puntos[i][0], p[0])).filter(Boolean).join('');
    return fraccion(numerador, denominador) + '·(' + puntos[i][1] + ')';
  });
  let html = pasoEnHtml('Fórmula de Lagrange con tus puntos',
    '<div class="formula">P(x) = ' + terminosSustituidos.join(' + ') + '</div>');

  // Paso 2: cada término con el numerador expandido y el denominador como número
  html += pasoEnHtml('Expandiendo cada término', terminos.map((termino, i) =>
    '<div class="formula">Término ' + (i + 1) + ': ' +
    fraccion(polinomioEnHtml(termino.numerador), fraccionATexto(termino.denominador)) +
    ' · (' + fraccionEnHtml(termino.fi) + ')</div>').join(''));

  // Paso 3: cada término ya multiplicado y dividido
  html += pasoEnHtml('Cada término simplificado', terminos.map((termino, i) =>
    '<div class="formula">Término ' + (i + 1) + ' = ' + polinomioEnHtml(termino.terminoFinal) + '</div>').join(''));

  // Paso 4: suma de términos semejantes
  if (terminos.length > 1) {
    html += pasoEnHtml('Sumando términos semejantes',
      '<div class="formula">P(x) = ' + terminos.map(t => '(' + polinomioEnHtml(t.terminoFinal) + ')').join(' + ') + '</div>');
  }

  return html + '<div class="resultado">P(x) = ' + polinomioEnHtml(total) + '</div>';
}
