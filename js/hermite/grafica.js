/* ==========================================================================
   Gráfica del polinomio de Hermite, con los puntos y un trazo corto de la
   tangente en cada uno (la pendiente que se pidió: f'(x)).
   ========================================================================== */

function graficarHermite(polinomio, puntos) {
  const [xMin, xMax] = rangoConMargen(puntos.map(punto => punto.x), 0.35, 2);
  const medioTrazo = (xMax - xMin) * 0.06;

  dibujarGrafica('grafica', {
    xMin,
    xMax,
    curvas: [{ f: x => evaluarPolinomio(polinomio, x), color: 'var(--ink)' }],
    segmentos: puntos.map(p => ({
      x1: p.x - medioTrazo, y1: p.fx - medioTrazo * p.dfx,
      x2: p.x + medioTrazo, y2: p.fx + medioTrazo * p.dfx,
      color: 'var(--red)',
    })),
    puntos: puntos.map(p => ({ x: p.x, y: p.fx, color: 'var(--green)', radio: 5.5, etiqueta: '(' + p.x + ', ' + p.fx + ')' })),
    etiquetaX: 'x',
  });
  dibujarLeyenda('graficaLeyenda', [
    { color: 'var(--ink)', texto: 'H(x)' },
    { color: 'var(--green)', texto: 'tus puntos' },
    { color: 'var(--red)', texto: "pendiente f'(x) en cada punto" },
  ]);
  document.getElementById('graficaCard').style.display = 'block';
}
