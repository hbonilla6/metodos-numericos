/* ==========================================================================
   Gráfica del polinomio de interpolación y de los puntos por los que pasa.
   ========================================================================== */

function graficarPolinomio(polinomio, puntos) {
  const abscisas = puntos.map(punto => punto[0]);
  const [xMin, xMax] = rangoConMargen(abscisas, 0.35);

  dibujarGrafica('grafica', {
    xMin,
    xMax,
    curvas: [{ f: x => evaluarPolinomio(polinomio, x), color: 'var(--ink)' }],
    puntos: puntos.map(([x, fx]) => ({ x, y: fx, color: 'var(--green)', radio: 5.5, etiqueta: '(' + x + ', ' + fx + ')' })),
    etiquetaX: 'x',
  });
  dibujarLeyenda('graficaLeyenda', [
    { color: 'var(--ink)', texto: 'P(x)' },
    { color: 'var(--green)', texto: 'tus puntos' },
  ]);
  document.getElementById('graficaCard').style.display = 'block';
}
