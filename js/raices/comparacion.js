/* ==========================================================================
   Comparación de los cinco métodos con los datos escritos:
   cuántas iteraciones necesita cada uno y cuál llega primero (la ★).
   ========================================================================== */

/** Tabla de Newton, o null si f no se puede derivar. */
function tablaDeNewton(f, x0, tolerancia) {
  try {
    return correrNewton(f, derivarFuncion(f), x0, tolerancia, MAX_ITERACIONES);
  } catch (e) {
    return null; // por ejemplo, un exponente que no es constante
  }
}

/** Tabla de punto fijo si logra converger, o null (no se pudo despejar x o ninguna g converge). */
function tablaDePuntoFijoSiConverge(f, x0, tolerancia) {
  try {
    const resultado = elegirPuntoFijoConvergente(f, x0, tolerancia, MAX_ITERACIONES);
    return resultado.convergio ? resultado.filas : null;
  } catch (e) {
    return null;
  }
}

/**
 * Devuelve { ganador, iteraciones } con las iteraciones de cada método (null si no converge
 * o no aplica) y la clave del que necesita menos. Devuelve null si los datos no están completos.
 */
function compararMetodos() {
  let datos;
  try {
    datos = interpretarCampos(leerCampos(), true);
  } catch (e) {
    return null;
  }
  const { f, a, b, tolerancia } = datos;

  const hayCambioDeSigno = f(a).times(f(b)).lessThan(0);
  const tablas = {
    bisec: hayCambioDeSigno ? correrIntervalo('bisec', f, a, b, tolerancia, MAX_ITERACIONES) : null,
    falsa: hayCambioDeSigno ? correrIntervalo('falsa', f, a, b, tolerancia, MAX_ITERACIONES) : null,
    secante: a.equals(b) ? null : correrSecante(f, a, b, tolerancia, MAX_ITERACIONES),
    newton: tablaDeNewton(f, a, tolerancia),
    puntofijo: tablaDePuntoFijoSiConverge(f, a, tolerancia),
  };

  const iteraciones = {};
  let ganador = null;
  Object.keys(METODOS).forEach(metodo => {
    const tabla = tablas[metodo];
    iteraciones[metodo] = tabla && llegoALaTolerancia(tabla, tolerancia) ? tabla.length : null;
    const mejoraAlGanador = iteraciones[metodo] !== null &&
      (ganador === null || iteraciones[metodo] < iteraciones[ganador]);
    if (mejoraAlGanador) ganador = metodo;
  });
  return { ganador, iteraciones };
}
