/* ==========================================================================
   Diferenciación numérica: cinco fórmulas para aproximar f'(x₀) con paso h.
   Matemática pura, con Decimal (40 dígitos).

   Cada fórmula es una combinación lineal de valores de f en puntos x₀ + k·h:
     f'(x₀) ≈ ( Σ cₖ · f(x₀ + k·h) ) / (factor · h)
   `forma` indica cómo se escribe: 'cociente' (suma sobre el divisor) o
   'corchete' (1/divisor multiplicando a la suma).
   ========================================================================== */

const FORMULAS_DE_DERIVADA = [
  { clave: 'adelante', nombre: 'Diferencias hacia adelante', orden: 1, factor: 1, forma: 'cociente',
    terminos: [{ coeficiente: 1, desplazamiento: 1 }, { coeficiente: -1, desplazamiento: 0 }] },
  { clave: 'atras', nombre: 'Diferencias hacia atrás', orden: 1, factor: 1, forma: 'cociente',
    terminos: [{ coeficiente: 1, desplazamiento: 0 }, { coeficiente: -1, desplazamiento: -1 }] },
  { clave: 'centrales', nombre: 'Diferencias centrales', orden: 2, factor: 2, forma: 'cociente',
    terminos: [{ coeficiente: 1, desplazamiento: 1 }, { coeficiente: -1, desplazamiento: -1 }] },
  { clave: 'tres', nombre: 'Fórmula de 3 puntos', orden: 2, factor: 2, forma: 'corchete',
    terminos: [{ coeficiente: -3, desplazamiento: 0 }, { coeficiente: 4, desplazamiento: 1 }, { coeficiente: -1, desplazamiento: 2 }] },
  { clave: 'cinco', nombre: 'Fórmula de 5 puntos', orden: 4, factor: 12, forma: 'corchete',
    terminos: [{ coeficiente: 1, desplazamiento: -2 }, { coeficiente: -8, desplazamiento: -1 }, { coeficiente: 8, desplazamiento: 1 }, { coeficiente: -1, desplazamiento: 2 }] },
];

/**
 * Aplica una fórmula. Devuelve la fórmula con sus términos evaluados (x, fx), el numerador,
 * el divisor y la aproximación; o con `problema` si f no está definida en alguno de los puntos.
 */
function aplicarFormulaDeDerivada(formula, f, x0, h) {
  try {
    const terminos = formula.terminos.map(termino => {
      const x = x0.plus(h.times(termino.desplazamiento));
      const fx = f(x);
      if (!fx.isFinite()) throw new Error('f(x) no está definida en x = ' + formatear(x) + '.');
      return { ...termino, x, fx };
    });
    const numerador = terminos.reduce((total, termino) => total.plus(termino.fx.times(termino.coeficiente)), new Decimal(0));
    const divisor = h.times(formula.factor);
    return { ...formula, terminos, numerador, divisor, aproximacion: numerador.dividedBy(divisor) };
  } catch (e) {
    return { ...formula, problema: e.message };
  }
}

/** Las cinco aproximaciones de f'(x₀). */
function aproximarDerivada(f, x0, h) {
  return FORMULAS_DE_DERIVADA.map(formula => aplicarFormulaDeDerivada(formula, f, x0, h));
}

/**
 * La derivada exacta de f (derivada simbólica) y su valor en x₀.
 * Devuelve { arbol, valor }, o null si f no se puede derivar o f'(x₀) no es un número.
 */
function derivadaExactaEn(f, x0) {
  try {
    const derivada = derivarFuncion(f);
    const valor = derivada(x0);
    return valor.isFinite() ? { arbol: derivada.arbol, valor } : null;
  } catch (e) {
    return null;
  }
}
