/* ==========================================================================
   Punto fijo automático: aísla un término de f(x) = 0 para formar g(x).

   Técnica estándar: aₙ·xⁿ + resto = 0  →  xⁿ = −resto ÷ aₙ  →  x = (−resto ÷ aₙ)^(1 ÷ n)
   Solo funciona con polinomios sencillos (sumas de c·xᵏ). Los coeficientes y los grados
   son Decimal, y el exponente 1 ÷ n se guarda como cociente exacto: así g(x) no pierde precisión.
   ========================================================================== */

/** Si el nodo es un monomio c·xᵏ devuelve { coeficiente, grado } (Decimal); si no, null. */
function monomioDe(nodo) {
  if (nodo.tipo === 'numero') return { coeficiente: new Decimal(nodo.valor), grado: new Decimal(0) };
  if (nodo.tipo === 'variable') return { coeficiente: new Decimal(1), grado: new Decimal(1) };

  if (nodo.tipo === 'binario' && nodo.op === '^' && nodo.izquierda.tipo === 'variable' && nodo.derecha.tipo === 'numero') {
    return { coeficiente: new Decimal(1), grado: new Decimal(nodo.derecha.valor) };
  }
  if (nodo.tipo === 'binario' && nodo.op === '*') {
    const izquierda = monomioDe(nodo.izquierda);
    const derecha = monomioDe(nodo.derecha);
    if (!izquierda || !derecha) return null;
    return { coeficiente: izquierda.coeficiente.times(derecha.coeficiente), grado: izquierda.grado.plus(derecha.grado) };
  }
  if (nodo.tipo === 'negativo') {
    const interior = monomioDe(nodo.argumento);
    return interior ? { coeficiente: interior.coeficiente.negated(), grado: interior.grado } : null;
  }
  return null;
}

/** Árbol del monomio c·xᵏ para un coeficiente positivo. */
function arbolDeMonomio(coeficienteAbsoluto, grado) {
  if (grado.isZero()) return nodoDesdeDecimal(coeficienteAbsoluto);
  const potencia = grado.equals(1) ? nodoVariable() : nodoBinario('^', nodoVariable(), nodoDesdeDecimal(grado));
  if (coeficienteAbsoluto.equals(1)) return potencia;
  return nodoBinario('*', nodoDesdeDecimal(coeficienteAbsoluto), potencia);
}

/** Todas las g(x) posibles de f(x) = 0, del mayor grado al menor (el de mayor grado es el que se enseña primero). */
function candidatosDePuntoFijo(arbolF) {
  const crudos = [];
  terminosDeSuma(arbolF, 1, crudos);

  const terminos = crudos.map(({ signo, nodo }) => {
    const monomio = monomioDe(nodo);
    if (!monomio) throw new Error('NO_ES_POLINOMIO_SIMPLE');
    return { coeficiente: monomio.coeficiente.times(signo), grado: monomio.grado };
  });

  const candidatos = [];
  terminos.forEach((lider, posicionDelLider) => {
    if (lider.grado.lessThan(1)) return; // el término que se aísla debe contener x

    let resto = nodoDesdeNumero(0);
    terminos.forEach((termino, posicion) => {
      if (posicion === posicionDelLider) return;
      const monomio = arbolDeMonomio(termino.coeficiente.abs(), termino.grado);
      resto = simplificar(nodoBinario('+', resto, termino.coeficiente.isNegative() ? nodoNegativo(monomio) : monomio));
    });

    const menosResto = simplificar(nodoNegativo(resto));
    const dividido = simplificar(nodoBinario('/', menosResto, nodoDesdeDecimal(lider.coeficiente)));
    // x = dividido^(1 ÷ grado); el exponente queda como cociente exacto (no se redondea)
    const arbolG = lider.grado.equals(1)
      ? dividido
      : nodoBinario('^', dividido, nodoBinario('/', nodoNumero('1'), nodoDesdeDecimal(lider.grado)));
    candidatos.push({
      arbolG, grado: lider.grado.toNumber(), coeficienteLider: lider.coeficiente.toNumber(), menosResto, dividido,
    });
  });

  if (candidatos.length === 0) throw new Error('SIN_TERMINO_CON_X');
  candidatos.sort((a, b) => b.grado - a.grado);
  return candidatos;
}

/**
 * Prueba cada g(x) desde x0 y se queda con la primera que converge.
 * Si ninguna converge, devuelve el primer intento (el más natural) para poder explicar por qué.
 * Devuelve { g, filas, convergio, grado, coeficienteLider, menosResto, dividido }.
 */
function elegirPuntoFijoConvergente(f, x0, tolerancia, maxIteraciones) {
  let primerIntento = null;

  for (const candidato of candidatosDePuntoFijo(f.arbol)) {
    const g = funcionDesdeArbol(candidato.arbolG);
    let filas;
    try {
      filas = correrPuntoFijo(g, x0, tolerancia, maxIteraciones);
    } catch (e) {
      continue;
    }
    const intento = {
      g, filas,
      convergio: llegoALaTolerancia(filas, tolerancia),
      grado: candidato.grado,
      coeficienteLider: candidato.coeficienteLider,
      menosResto: candidato.menosResto,
      dividido: candidato.dividido,
    };
    if (!primerIntento) primerIntento = intento;
    if (intento.convergio) return intento;
  }
  return primerIntento;
}
