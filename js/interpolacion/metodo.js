/* ==========================================================================
   Método de Lagrange (lineal con 2 puntos, parabólico con 3) para la página
   de interpolación. Ver pagina.js para el contrato de un método.
   ========================================================================== */

const ES_ENTERO = /^-?\d+$/;

const metodoLagrange = {
  clave: 'lagrange',
  claveDeGuardado: 'interpolacion_campos',
  cantidadDePuntos: 3,
  campos: [
    { prefijo: 'x', ayuda: 'x' },
    { prefijo: 'f', ayuda: 'f(x)' },
  ],
  nota: '2 puntos = interpolación lineal. 3 puntos = parabólica. Deja el tercer punto vacío si solo tienes 2.',
  mensajeIncompleto: 'Completa tanto x como f(x) en cada punto que uses.',
  etiqueta: i => 'x' + i + ', f' + i,
  opcional: i => i === 2 ? '(opcional, solo si es parabólica)' : '',

  /** Dibuja el resultado; devuelve el mensaje de error si los datos no sirven. */
  resolver(escritos) {
    const sonEnteros = escritos.every(punto => ES_ENTERO.test(punto.x.trim()) && ES_ENTERO.test(punto.f.trim()));
    if (!sonEnteros) return 'Usa números enteros en x y f(x) (esta herramienta trabaja con fracciones exactas).';

    const puntos = escritos.map(punto => [parseInt(punto.x.trim(), 10), parseInt(punto.f.trim(), 10)]);
    const valoresDeX = puntos.map(punto => punto[0]);
    if (new Set(valoresDeX).size !== valoresDeX.length) return 'Los valores de x deben ser distintos entre sí.';

    const resultado = interpolarLagrange(puntos);
    document.getElementById('pasos').innerHTML = procedimientoEnHtml(resultado, puntos);
    document.getElementById('resultCard').style.display = 'block';
    graficarPolinomio(resultado.total, puntos);
    return null;
  },
};
