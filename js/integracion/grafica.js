/* ==========================================================================
   Gráfica de la integral: f(x) y la figura que cada método usa para
   aproximar el área (rectángulos, trapecios o parábolas).
   ========================================================================== */

const TRAMOS_POR_PARABOLA = 12;

const aNumero = decimal => decimal.toNumber();

function segmento(x1, y1, x2, y2, color) {
  return { x1, y1, x2, y2, color };
}

/** Rectángulos del punto medio: la altura de cada uno es f(x̄ᵢ). */
function figuraDePuntoMedio(resultado) {
  const { filas } = resultado;
  const segmentos = [];
  const puntos = [];
  for (let i = 1; i < filas.length; i++) {
    const [izquierda, derecha] = [aNumero(filas[i - 1].x), aNumero(filas[i].x)];
    const altura = aNumero(filas[i].fMedio);
    segmentos.push(
      segmento(izquierda, 0, izquierda, altura, 'var(--red)'),
      segmento(derecha, 0, derecha, altura, 'var(--red)'),
      segmento(izquierda, altura, derecha, altura, 'var(--red)'));
    puntos.push({ x: aNumero(filas[i].medio), y: altura, color: 'var(--green)', radio: 3.5 });
  }
  return { segmentos, puntos };
}

/** Trapecios: una recta entre cada par de nodos consecutivos. */
function figuraDeTrapecio(resultado) {
  const { filas } = resultado;
  const segmentos = [];
  const puntos = filas.map(fila => ({ x: aNumero(fila.x), y: aNumero(fila.fx), color: 'var(--green)', radio: 3.5 }));
  filas.forEach((fila, i) => {
    const x = aNumero(fila.x);
    segmentos.push(segmento(x, 0, x, aNumero(fila.fx), 'var(--red)'));
    if (i > 0) segmentos.push(segmento(aNumero(filas[i - 1].x), aNumero(filas[i - 1].fx), x, aNumero(fila.fx), 'var(--red)'));
  });
  return { segmentos, puntos };
}

/** Parábola que pasa por (x₀, f₀), (xₘ, fₘ) y (x₁, f₁), en forma de Lagrange. */
function parabolaPorTresPuntos(x0, y0, xm, ym, x1, y1) {
  return x => y0 * (x - xm) * (x - x1) / ((x0 - xm) * (x0 - x1)) +
    ym * (x - x0) * (x - x1) / ((xm - x0) * (xm - x1)) +
    y1 * (x - x0) * (x - xm) / ((x1 - x0) * (x1 - xm));
}

/** Simpson: una parábola por subintervalo, dibujada con tramos rectos muy cortos. */
function figuraDeSimpson(resultado) {
  const { filas } = resultado;
  const segmentos = [];
  const puntos = [];
  for (let i = 1; i < filas.length; i++) {
    const [x0, y0] = [aNumero(filas[i - 1].x), aNumero(filas[i - 1].fx)];
    const [xm, ym] = [aNumero(filas[i].medio), aNumero(filas[i].fMedio)];
    const [x1, y1] = [aNumero(filas[i].x), aNumero(filas[i].fx)];
    const parabola = parabolaPorTresPuntos(x0, y0, xm, ym, x1, y1);
    for (let k = 0; k < TRAMOS_POR_PARABOLA; k++) {
      const desde = x0 + (x1 - x0) * k / TRAMOS_POR_PARABOLA;
      const hasta = x0 + (x1 - x0) * (k + 1) / TRAMOS_POR_PARABOLA;
      segmentos.push(segmento(desde, parabola(desde), hasta, parabola(hasta), 'var(--red)'));
    }
    puntos.push({ x: x1, y: y1, color: 'var(--green)', radio: 3.5 }, { x: xm, y: ym, color: 'var(--green)', radio: 3.5 });
  }
  puntos.push({ x: aNumero(filas[0].x), y: aNumero(filas[0].fx), color: 'var(--green)', radio: 3.5 });
  return { segmentos, puntos };
}

function graficarIntegral(f, datos, resultado, figura, textoDeLaFigura) {
  const [xMin, xMax] = rangoConMargen([aNumero(datos.a), aNumero(datos.b)], 0.05);
  const { segmentos, puntos } = figura(resultado);

  dibujarGrafica('grafica', {
    xMin,
    xMax,
    curvas: [{ f: x => aNumero(f(x)), color: 'var(--ink)', grosor: 2.5 }],
    segmentos,
    puntos,
    etiquetaX: 'x',
  });
  dibujarLeyenda('graficaLeyenda', [
    { color: 'var(--ink)', texto: 'f(x)' },
    { color: 'var(--red)', texto: textoDeLaFigura },
    { color: 'var(--green)', texto: 'puntos donde se evalúa f' },
  ]);
  document.getElementById('graficaCard').style.display = 'block';
}
