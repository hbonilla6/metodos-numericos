/* ==========================================================================
   Interpolación segmentaria lineal (spline lineal): una recta entre cada par de
   puntos consecutivos, con fracciones exactas.

   En el tramo [xₖ, xₖ₊₁]:  P(x) = yₖ + f[xₖ₊₁, xₖ](x − xₖ)
   con f[xₖ₊₁, xₖ] = (f(xₖ₊₁) − f(xₖ)) / (xₖ₊₁ − xₖ).
   ========================================================================== */

/**
 * Convierte lo escrito en una fracción exacta. Acepta enteros, decimales (0.5 o 0,5)
 * y fracciones (1/2). Devuelve null si el texto no es un número válido.
 */
function leerFraccion(texto) {
  const limpio = String(texto).trim().replace('−', '-').replace(',', '.');
  const partes = /^([+-]?)(\d+)(?:\.(\d+))?(?:\/(\d+))?$/.exec(limpio);
  if (!partes) return null;

  const [, signo, enteros, decimales, denominador] = partes;
  if (decimales !== undefined && denominador !== undefined) return null;
  if (denominador !== undefined && BigInt(denominador) === 0n) return null;

  let numerador = BigInt(enteros + (decimales || ''));
  const divisor = denominador !== undefined ? BigInt(denominador) : 10n ** BigInt((decimales || '').length);
  if (signo === '-') numerador = -numerador;
  return crearFraccion(numerador, divisor);
}

/**
 * Los tramos del spline lineal para los puntos [{ x, y }] (fracciones), ordenados por x.
 * Cada tramo guarda sus extremos, la pendiente f[xₖ₊₁, xₖ] y la recta [término libre, pendiente].
 */
function interpolarSplineLineal(puntos) {
  const tramos = [];
  for (let k = 0; k < puntos.length - 1; k++) {
    const inicio = puntos[k];
    const fin = puntos[k + 1];
    const pendiente = dividir(restar(fin.y, inicio.y), restar(fin.x, inicio.x));
    const terminoLibre = restar(inicio.y, multiplicar(pendiente, inicio.x));
    tramos.push({ k, inicio, fin, pendiente, recta: [terminoLibre, pendiente] });
  }
  return tramos;
}
