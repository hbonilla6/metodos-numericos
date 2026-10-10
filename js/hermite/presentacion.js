/* ==========================================================================
   Procedimiento de Hermite tras la tabla: los puntos z, el polinomio en forma de
   Newton con los valores de la tabla, cada término expandido, el resultado final
   y la comprobación de que pasa por los puntos con la pendiente pedida.
   ========================================================================== */

/** Coeficiente listo para multiplicar: las fracciones y los negativos van entre paréntesis. */
function coeficienteEnProducto(coeficiente) {
  return coeficiente.n < 0n || coeficiente.d !== 1n ? '(' + fraccionEnHtml(coeficiente) + ')' : fraccionEnHtml(coeficiente);
}

/** La fórmula general: H(x) = f[z₀] + f[z₀,z₁](x − z₀) + f[z₀,z₁,z₂](x − z₀)(x − z₁) + … */
function formulaGeneralDeHermite(cantidadDeTerminos) {
  const terminos = [];
  for (let k = 0; k < cantidadDeTerminos; k++) {
    const factores = Array.from({ length: k }, (_, j) => '(x − z' + aSubindice(j) + ')').join('');
    terminos.push(nombreDeCelda(k, 0) + factores);
  }
  return 'H(x) = ' + terminos.join(' + ');
}

/** La misma fórmula con los números de la tabla: −12 + 22(x + 2) + (−5)(x + 2)(x + 2) + … */
function formulaConValores(terminos) {
  return 'H(x) = ' + terminos.map(termino => {
    const factores = termino.factores.map(factorConVariable).join('');
    return coeficienteEnProducto(termino.coeficiente) + factores;
  }).join(' + ');
}

function puntosZEnHtml() {
  return estado.puntos.map((punto, j) =>
    formulaHtml('z' + aSubindice(2 * j) + ' = z' + aSubindice(2 * j + 1) + ' = x' + aSubindice(j) + ' = ' + numeroConSigno(punto.x))).join('');
}

function esIgual(a, b) { return a.n === b.n && a.d === b.d; }

/** H(xⱼ) = f(xⱼ) y H'(xⱼ) = f'(xⱼ) para cada punto, calculado con fracciones exactas. */
function comprobacionEnHtml(polinomio) {
  const derivada = derivarPolinomio(polinomio);
  const marca = cumple => cumple ? '<span class="comprobacion-ok">✓</span>' : '<span class="comprobacion-mal">✗</span>';

  return estado.puntos.map(punto => {
    const valor = evaluarPolinomioExacto(polinomio, punto.x);
    const pendiente = evaluarPolinomioExacto(derivada, punto.x);
    const x = numeroConSigno(punto.x);
    return formulaHtml(
      'H(' + x + ') = ' + fraccionEnHtml(valor) + ' ' + marca(esIgual(valor, crearFraccion(punto.fx))) +
      ' &nbsp;&nbsp; H\'(' + x + ') = ' + fraccionEnHtml(pendiente) + ' ' + marca(esIgual(pendiente, crearFraccion(punto.dfx))));
  }).join('');
}

function procedimientoDeHermiteEnHtml(resultado) {
  const { terminos, total } = resultado;
  let html = pasoEnHtml('Los puntos z: cada x se repite dos veces', puntosZEnHtml());

  html += pasoEnHtml('Polinomio de Hermite con los valores de la tabla',
    formulaHtml(formulaGeneralDeHermite(terminos.length)) + formulaHtml(formulaConValores(terminos)));

  html += pasoEnHtml('Expandiendo cada término', terminos.map((termino, k) =>
    formulaHtml('Término ' + (k + 1) + ' = ' + polinomioEnHtml(termino.expandido))).join(''));

  html += pasoEnHtml('Sumando términos semejantes',
    formulaHtml('H(x) = ' + terminos.map(t => '(' + polinomioEnHtml(t.expandido) + ')').join(' + ')));

  html += '<div class="resultado">H(x) = ' + polinomioEnHtml(total) + '</div>';
  html += pasoEnHtml('Comprobación: pasa por cada punto con su pendiente', comprobacionEnHtml(total));
  return html;
}
