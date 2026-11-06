/* ==========================================================================
   Integración numérica compuesta: punto medio, trapecio y Simpson.
   Matemática pura: reciben datos y devuelven datos, sin tocar la pantalla.
   Todos los cálculos se hacen con Decimal (40 dígitos).

   Cada método devuelve { h, filas, ... , integral }, donde cada fila describe
   una fila de la tabla del procedimiento (i, xᵢ y lo que ese método calcula).
   ========================================================================== */

const MAXIMO_DE_SUBINTERVALOS = 200;
const DECIMALES_DEL_RESULTADO = 30;

/** Quita el ruido de redondeo de la división entre 2 o 6 (7.5000…001 pasa a 7.5). */
const sinRuido = valor => valor.toDecimalPlaces(DECIMALES_DEL_RESULTADO);

/** Paso h = (b − a)/n y los nodos x₀ = a, x₁ = a + h, …, xₙ = b. */
function particionUniforme(a, b, n) {
  const h = b.minus(a).dividedBy(n);
  const nodos = [];
  for (let i = 0; i <= n; i++) nodos.push(i === n ? b : a.plus(h.times(i)));
  return { h, nodos };
}

const puntoMedioDe = (izquierda, derecha) => izquierda.plus(derecha).dividedBy(2);

/** Evalúa f y avisa en qué x no está definida (raíz de un negativo, división entre cero…). */
function evaluarEn(f, x) {
  const valor = f(x);
  if (!valor.isFinite()) throw new Error('f(x) no está definida en x = ' + formatear(x));
  return valor;
}

/** Punto medio compuesto: h · Σ f(x̄ᵢ), con x̄ᵢ = (xᵢ₋₁ + xᵢ)/2. */
function puntoMedioCompuesto(f, a, b, n) {
  const { h, nodos } = particionUniforme(a, b, n);
  const filas = nodos.map((x, i) => {
    if (i === 0) return { i, x, medio: null, fMedio: null };
    const medio = puntoMedioDe(nodos[i - 1], x);
    return { i, x, medio, fMedio: evaluarEn(f, medio) };
  });
  const suma = filas.reduce((total, fila) => (fila.fMedio === null ? total : total.plus(fila.fMedio)), new Decimal(0));
  return { h, filas, suma, integral: sinRuido(h.times(suma)) };
}

/** Trapecio compuesto: h/2 · [f(a) + 2·Σ f(xᵢ) + f(b)]. */
function trapecioCompuesto(f, a, b, n) {
  const { h, nodos } = particionUniforme(a, b, n);
  const filas = nodos.map((x, i) => {
    const fx = evaluarEn(f, x);
    const coeficiente = i === 0 || i === n ? 1 : 2;
    return { i, x, fx, coeficiente, ponderado: fx.times(coeficiente) };
  });
  const suma = filas.reduce((total, fila) => total.plus(fila.ponderado), new Decimal(0));
  return { h, filas, suma, integral: sinRuido(h.dividedBy(2).times(suma)) };
}

/**
 * Simpson compuesto: h/6 · [f(a) + 4·Σ₂ + 2·Σ₁ + f(b)], donde Σ₁ suma los f(xᵢ) interiores
 * (sin f(a) ni f(b)) y Σ₂ suma los f de los puntos medios de cada subintervalo.
 */
function simpsonCompuesto(f, a, b, n) {
  const { h, nodos } = particionUniforme(a, b, n);
  const filas = nodos.map((x, i) => {
    const medio = i === 0 ? null : puntoMedioDe(nodos[i - 1], x);
    return { i, x, fx: evaluarEn(f, x), medio, fMedio: medio === null ? null : evaluarEn(f, medio) };
  });
  const sumar = valores => valores.reduce((total, valor) => total.plus(valor), new Decimal(0));
  const extremos = filas[0].fx.plus(filas[n].fx);
  const sigma1 = sumar(filas.slice(1, n).map(fila => fila.fx));
  const sigma2 = sumar(filas.slice(1).map(fila => fila.fMedio));
  const corchete = extremos.plus(sigma2.times(4)).plus(sigma1.times(2));
  return { h, filas, extremos, sigma1, sigma2, corchete, integral: sinRuido(h.dividedBy(6).times(corchete)) };
}

// ---------- Valor exacto, cuando la integral se puede resolver con la regla de la potencia ----------

/** El árbol como c·xᵖ ({ c, p } con Decimal), o null si no tiene esa forma. */
function comoMonomio(nodo) {
  switch (nodo.tipo) {
    case 'numero': return { c: new Decimal(nodo.valor), p: new Decimal(0) };
    case 'constante': return { c: evaluarConstante(nodo.nombre), p: new Decimal(0) };
    case 'variable': return nombreDeVariable(nodo) === 'x' ? { c: new Decimal(1), p: new Decimal(1) } : null;
    case 'negativo': {
      const monomio = comoMonomio(nodo.argumento);
      return monomio && { c: monomio.c.negated(), p: monomio.p };
    }
    case 'funcion': {
      const monomio = nodo.nombre === 'sqrt' ? comoMonomio(nodo.argumento) : null;
      return monomio && monomio.c.greaterThan(0) ? { c: monomio.c.sqrt(), p: monomio.p.dividedBy(2) } : null;
    }
    case 'binario': return comoMonomioBinario(nodo);
  }
  return null;
}

function comoMonomioBinario({ op, izquierda, derecha }) {
  if (op === '^') {
    const base = comoMonomio(izquierda);
    const exponente = valorDeExponente(derecha);
    if (!base || exponente === null) return null;
    const esEntero = exponente.isInteger();
    if (!esEntero && !base.c.equals(1)) return null;
    return { c: base.c.pow(exponente), p: base.p.times(exponente) };
  }
  if (op !== '*' && op !== '/') return null;
  const primero = comoMonomio(izquierda);
  const segundo = comoMonomio(derecha);
  if (!primero || !segundo) return null;
  if (op === '*') return { c: primero.c.times(segundo.c), p: primero.p.plus(segundo.p) };
  return segundo.c.isZero() ? null : { c: primero.c.dividedBy(segundo.c), p: primero.p.minus(segundo.p) };
}

/**
 * ∫ₐᵇ f(x) dx con la primitiva, si f es una suma de términos c·xᵖ (polinomios, raíces, potencias negativas).
 * Devuelve un Decimal, o null si no se puede (otras funciones, p = −1, o una singularidad dentro de [a, b]).
 */
function integralExacta(arbol, a, b) {
  const terminos = [];
  terminosDeSuma(arbol, 1, terminos);

  let total = new Decimal(0);
  for (const { signo, nodo } of terminos) {
    const monomio = comoMonomio(nodo);
    if (!monomio) return null;
    const nuevoExponente = monomio.p.plus(1);
    if (nuevoExponente.isZero()) return null;
    if (monomio.p.isNegative() && a.lessThanOrEqualTo(0) && b.greaterThanOrEqualTo(0)) return null;
    const primitiva = x => monomio.c.dividedBy(nuevoExponente).times(x.pow(nuevoExponente));
    total = total.plus(primitiva(b).minus(primitiva(a)).times(signo));
  }
  return total.isFinite() ? total : null;
}
