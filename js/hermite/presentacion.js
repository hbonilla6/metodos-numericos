/* ==========================================================================
   Procedimiento de Hermite tras la tabla: el cálculo de las diferencias divididas,
   el polinomio en forma de Newton con los valores de la tabla, su desarrollo
   algebraico, el resultado final y la comprobación de que pasa por los puntos
   con la pendiente pedida.
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

/** (x − z) sin simplificar: (x − (−2)) si z es negativo. */
function factorSinSimplificar(z) {
  return '(x − ' + (z < 0 ? '(' + numeroConSigno(z) + ')' : z) + ')';
}

/** La fórmula con los números de la tabla; con simplificar = false los factores quedan como (x − (−2)). */
function formulaConValores(terminos, simplificar) {
  return 'H(x) = ' + terminos.map((termino, k) => {
    const factores = termino.factores.map(simplificar ? factorConVariable : factorSinSimplificar).join('');
    const coeficiente = k === 0 ? fraccionEnHtml(termino.coeficiente) : coeficienteEnProducto(termino.coeficiente);
    return coeficiente + factores;
  }).join(' + ');
}

/** Cada coeficiente multiplicado por el producto de sus factores ya desarrollado: −12 + 22(x + 2) + … */
function formulaConProductos(terminos) {
  return 'H(x) = ' + terminos.map((termino, k) => {
    if (k === 0) return fraccionEnHtml(termino.coeficiente);
    const producto = polinomioEnHtml(termino.base);
    return coeficienteEnProducto(termino.coeficiente) + '(' + producto + ')';
  }).join(' + ');
}

/** Cada coeficiente distribuido sobre los términos de su producto: −12 + 22x + 44 − 5x² … */
function formulaDistribuida(terminos) {
  const monomios = terminos.flatMap(termino => monomiosDePolinomio(termino.base, termino.coeficiente));
  return 'H(x) = ' + monomiosEnHtml(monomios);
}

/** Desarrollo del producto de los factores de un término: (x + 2)(x + 2) = x² + 2x + 2x + 4 = x² + 4x + 4 */
function productosDeUnTermino(termino, k) {
  const lineas = [];
  let producto = factorLineal(crearFraccion(termino.factores[0]));
  for (let j = 1; j < termino.factores.length; j++) {
    const z = termino.factores[j];
    const siguiente = multiplicarPolinomios(producto, factorLineal(crearFraccion(z)));
    const sinJuntar = monomiosEnHtml(productoPorBinomioSinSimplificar(producto, crearFraccion(z)));
    const simplificado = polinomioEnHtml(siguiente);
    lineas.push(formulaHtml('Término ' + (k + 1) + ': (' + polinomioEnHtml(producto) + ')' + factorConVariable(z) + ' = ' +
      (sinJuntar === simplificado ? '' : sinJuntar + ' = ') + simplificado));
    producto = siguiente;
  }
  return lineas.join('');
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

/** a − b escrito sin paréntesis: 9 − (−12) pasa a 9 + 12. */
function restaConSignosResueltos(a, b) {
  return fraccionEnHtml(a) + (b.n < 0n ? ' + ' + fraccionEnHtml(negar(b)) : ' − ' + fraccionEnHtml(b));
}

/** Cálculo de una diferencia dividida: fórmula, valores, signos resueltos y resultado. */
function calculoDeDiferencia(columna, fila) {
  const { z, columnas } = estado;
  const nombre = nombreConParentesis(columna, fila);
  const zFinal = fila + columna;
  const abajo = columnas[columna - 1][fila + 1];
  const arriba = columnas[columna - 1][fila];
  const diferenciaDeZ = z[zFinal] - z[fila];
  const zInicial = crearFraccion(z[fila]);
  const zUltima = crearFraccion(z[zFinal]);

  const simbolica = fraccion(
    nombreConParentesis(columna - 1, fila + 1) + ' − ' + nombreConParentesis(columna - 1, fila),
    'z' + aSubindice(zFinal) + ' − z' + aSubindice(fila));
  const conValores = fraccion(
    conParentesis(abajo) + ' − ' + conParentesis(arriba),
    conParentesis(zUltima) + ' − ' + conParentesis(zInicial));
  const sinParentesis = fraccion(restaConSignosResueltos(abajo, arriba), restaConSignosResueltos(zUltima, zInicial));
  const resuelta = fraccion(fraccionEnHtml(restar(abajo, arriba)), numeroConSigno(diferenciaDeZ));

  const pasos = [simbolica, conValores];
  if (sinParentesis !== conValores) pasos.push(sinParentesis);
  pasos.push(resuelta, fraccionEnHtml(columnas[columna][fila]));
  return formulaHtml(nombre + ' = ' + pasos.join(' = '));
}

/** Las diferencias divididas que se calculan, columna por columna (las de la derivada ya son datos). */
function calculoDeLaTabla() {
  let html = '';
  estado.columnas.forEach((celdas, columna) => {
    if (columna === 0) return;
    celdas.forEach((valor, fila) => {
      if (!usaDerivada(estado.z, columna, fila)) html += calculoDeDiferencia(columna, fila);
    });
  });
  return html;
}

function procedimientoDeHermiteEnHtml(resultado) {
  const { terminos, total } = resultado;
  let html = pasoEnHtml('Cálculo de las diferencias divididas', calculoDeLaTabla());
  html += pasoEnHtml('Polinomio de Hermite', formulaHtml(formulaGeneralDeHermite(terminos.length)));
  html += pasoEnHtml('Sustituyendo los valores de la tabla', formulaHtml(formulaConValores(terminos, false)));
  html += pasoEnHtml('Simplificando los signos de los factores', formulaHtml(formulaConValores(terminos, true)));

  const productos = terminos.map((termino, k) => termino.factores.length > 1 ? productosDeUnTermino(termino, k) : '').join('');
  if (productos) html += pasoEnHtml('Multiplicando los factores de cada término', productos);

  html += pasoEnHtml('Cada coeficiente por su producto', formulaHtml(formulaConProductos(terminos)));
  html += pasoEnHtml('Repartiendo cada coeficiente', formulaHtml(formulaDistribuida(terminos)));
  html += pasoEnHtml('Sumando términos semejantes', formulaHtml('H(x) = ' + polinomioEnHtml(total)));

  html += '<div class="resultado">H(x) = ' + polinomioEnHtml(total) + '</div>';
  html += pasoEnHtml('Comprobación: pasa por cada punto con su pendiente', comprobacionEnHtml(total));
  return html;
}
