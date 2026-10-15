/* ==========================================================================
   Gráfica del spline lineal: una recta entre cada par de puntos consecutivos.
   ========================================================================== */

function graficarSpline(tramos) {
  const aNumero = f => Number(f.n) / Number(f.d);
  const puntos = [tramos[0].inicio, ...tramos.map(tramo => tramo.fin)].map(p => ({ x: aNumero(p.x), y: aNumero(p.y) }));
  const [xMin, xMax] = rangoConMargen(puntos.map(p => p.x), 0.2);

  dibujarGrafica('grafica', {
    xMin,
    xMax,
    segmentos: puntos.slice(1).map((p, i) => ({ x1: puntos[i].x, y1: puntos[i].y, x2: p.x, y2: p.y, color: 'var(--ink)' })),
    puntos: puntos.map(p => ({ x: p.x, y: p.y, color: 'var(--green)', radio: 5.5, etiqueta: '(' + textoDeMarca(p.x) + ', ' + textoDeMarca(p.y) + ')' })),
    etiquetaX: 'x',
  });
  dibujarLeyenda('graficaLeyenda', [
    { color: 'var(--ink)', texto: 'P(x) por tramos' },
    { color: 'var(--green)', texto: 'tus puntos' },
  ]);
  document.getElementById('graficaCard').style.display = 'block';
}
