/* ==========================================================================
   Gráfica de la diferenciación: f(x) cerca de x₀, la tangente exacta y las
   rectas cuyas pendientes son las aproximaciones por diferencias.
   ========================================================================== */

const MARGEN_EN_PASOS = 2.5;

/** Segmento de la recta de pendiente m que pasa por (xp, yp), extendido de xMin a xMax. */
function rectaExtendida(xp, yp, m, xMin, xMax, color, discontinuo) {
  return { x1: xMin, y1: yp + m * (xMin - xp), x2: xMax, y2: yp + m * (xMax - xp), color, discontinuo };
}

/** Rango vertical ajustado a la curva y a las rectas dibujadas (sin forzar y = 0, para que se distingan). */
function rangoVerticalCercano(f, xMin, xMax, segmentos) {
  const valores = segmentos.flatMap(s => [s.y1, s.y2]);
  for (let k = 0; k <= 20; k++) valores.push(f(xMin + (xMax - xMin) * k / 20));
  const validos = valores.filter(Number.isFinite);
  const minimo = Math.min(...validos);
  const maximo = Math.max(...validos);
  const holgura = (maximo - minimo) * 0.15 || 1;
  return [minimo - holgura, maximo + holgura];
}

function graficarDerivada(f, datos, formulas, exacta) {
  const x0 = datos.x0.toNumber();
  const h = datos.h.toNumber();
  const xMin = x0 - MARGEN_EN_PASOS * h;
  const xMax = x0 + MARGEN_EN_PASOS * h;
  const aNumero = valor => valor.toNumber();
  const fEnNumero = x => aNumero(f(x));
  const porClave = clave => formulas.find(formula => formula.clave === clave);

  const segmentos = [];
  const leyenda = [{ color: 'var(--ink)', texto: 'f(x)' }];
  if (exacta) {
    segmentos.push(rectaExtendida(x0, fEnNumero(x0), aNumero(exacta.valor), xMin, xMax, 'var(--green)', true));
    leyenda.push({ color: 'var(--green)', texto: 'tangente (derivada exacta)' });
  }

  const secantes = [
    { clave: 'adelante', desde: 0, color: 'var(--red)', texto: 'adelante' },
    { clave: 'atras', desde: -1, color: 'var(--gold)', texto: 'atrás' },
    { clave: 'centrales', desde: -1, color: 'var(--ink-soft)', texto: 'centrales' },
  ];
  secantes.forEach(({ clave, desde, color, texto }) => {
    const formula = porClave(clave);
    if (formula.problema) return;
    const xp = x0 + desde * h;
    segmentos.push(rectaExtendida(xp, fEnNumero(xp), aNumero(formula.aproximacion), xMin, xMax, color, false));
    leyenda.push({ color, texto: 'recta con pendiente ' + texto });
  });

  const puntos = [-2, -1, 0, 1, 2].map(k => ({ x: x0 + k * h, y: fEnNumero(x0 + k * h), color: 'var(--ink)', radio: 3.5 }))
    .filter(punto => Number.isFinite(punto.y));

  const [yMin, yMax] = rangoVerticalCercano(fEnNumero, xMin, xMax, segmentos);
  dibujarGrafica('grafica', { xMin, xMax, yMin, yMax, curvas: [{ f: fEnNumero, color: 'var(--ink)', grosor: 2.5 }], segmentos, puntos, etiquetaX: 'x' });
  dibujarLeyenda('graficaLeyenda', leyenda);
  document.getElementById('graficaCard').style.display = 'block';
}
