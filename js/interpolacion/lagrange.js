/* ==========================================================================
   Interpolación de Lagrange: el polinomio que pasa por los puntos dados.
   ========================================================================== */

/**
 * Polinomio que pasa por los puntos [[x0, f0], [x1, f1], …].
 * Devuelve el polinomio total y, por cada punto, su término de Lagrange:
 *   numerador (producto de los (x − xj)), denominador (producto de los (xi − xj)),
 *   coeficiente (fi entre el denominador) y el término ya multiplicado.
 */
function interpolarLagrange(puntos) {
  const cantidad = puntos.length;
  const terminos = [];
  let total = polinomioNulo(cantidad - 1);

  for (let i = 0; i < cantidad; i++) {
    const [xi, fi] = puntos[i];
    let numerador = [crearFraccion(1)];
    let denominador = crearFraccion(1);

    for (let j = 0; j < cantidad; j++) {
      if (j === i) continue;
      const [xj] = puntos[j];
      numerador = multiplicarPolinomios(numerador, factorLineal(crearFraccion(xj)));
      denominador = multiplicar(denominador, restar(crearFraccion(xi), crearFraccion(xj)));
    }

    const coeficiente = dividir(crearFraccion(fi), denominador);
    const terminoFinal = multiplicarPolinomioPorNumero(numerador, coeficiente);
    terminos.push({ xi: crearFraccion(xi), fi: crearFraccion(fi), numerador, denominador, coeficiente, terminoFinal });
    total = sumarPolinomios(total, terminoFinal);
  }
  return { terminos, total };
}
