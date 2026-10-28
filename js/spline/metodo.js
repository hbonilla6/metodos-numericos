/* ==========================================================================
   Método del spline lineal para la página de interpolación. Ver pagina.js
   para el contrato de un método. Los dos primeros puntos son obligatorios.
   ========================================================================== */

const metodoSpline = {
  clave: 'spline',
  claveDeGuardado: 'spline_campos',
  cantidadDePuntos: 5,
  campos: [
    { prefijo: 'x', ayuda: 'x' },
    { prefijo: 'f', ayuda: 'f(x)' },
  ],
  nota: 'Escribe al menos 2 puntos (hasta 5). Acepta enteros, fracciones como 1/2 y decimales como 0.5.',
  mensajeIncompleto: 'Completa tanto x como f(x) en cada punto que uses.',
  etiqueta: i => 'x' + i + ', f' + i,
  opcional: i => i >= 2 ? '(opcional)' : '',

  /** Dibuja el resultado; devuelve el mensaje de error si los datos no sirven. */
  resolver(escritos) {
    const puntos = escritos.map(punto => ({ x: leerFraccion(punto.x), y: leerFraccion(punto.f) }));
    if (puntos.some(punto => punto.x === null || punto.y === null)) {
      return 'Usa enteros, fracciones (1/2) o decimales (0.5) en x y f(x).';
    }
    if (new Set(puntos.map(punto => fraccionATexto(punto.x))).size !== puntos.length) {
      return 'Los valores de x deben ser distintos entre sí.';
    }

    puntos.sort((a, b) => (a.x.n * b.x.d < b.x.n * a.x.d ? -1 : 1));
    const tramos = interpolarSplineLineal(puntos);
    document.getElementById('pasos').innerHTML = procedimientoDeSplineEnHtml(tramos);
    document.getElementById('resultCard').style.display = 'block';
    graficarSpline(tramos);
    return null;
  },
};
