/* ==========================================================================
   Graficador sencillo en SVG (sin librerías).

   dibujarGrafica(idContenedor, opciones) dibuja ejes, cuadrícula y lo que se pida:
     curvas:     [{ f, color, grosor, discontinua }]          f(x) devuelve un número o null
     series:     [{ puntos: [{ x, y }], color, titulo }]      línea con marcadores
     segmentos:  [{ x1, y1, x2, y2, color, discontinuo }]
     puntos:     [{ x, y, color, radio, etiqueta, titulo }]
     verticales: [{ x, color, etiqueta }]                      líneas verticales discontinuas
   Rango: xMin y xMax son obligatorios; yMin y yMax se calculan si no se dan.
   Los colores se escriben como variables CSS, por ejemplo 'var(--ink)'.
   ========================================================================== */

const GRAFICA = { ancho: 640, alto: 340, izquierda: 56, derecha: 18, arriba: 14, abajo: 34, muestras: 500 };

function escaparTexto(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Paso "redondo" (1, 2, 5 × 10ⁿ) para que haya unas 6 marcas en un rango. */
function pasoRedondo(rango) {
  const bruto = rango / 6;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const fraccion = bruto / potencia;
  const redondo = fraccion < 1.5 ? 1 : fraccion < 3 ? 2 : fraccion < 7 ? 5 : 10;
  return redondo * potencia;
}

function marcasDelEje(minimo, maximo) {
  const paso = pasoRedondo(maximo - minimo);
  const marcas = [];
  for (let valor = Math.ceil(minimo / paso) * paso; valor <= maximo + paso * 1e-9; valor += paso) {
    marcas.push(Number(valor.toFixed(12)));
  }
  return marcas;
}

function textoDeMarca(valor) {
  return String(parseFloat(valor.toPrecision(6))).replace('-', '−');
}

/** Valor de la curva en x como número, o null si no se puede evaluar. */
function valorSeguro(f, x) {
  try {
    const y = f(x);
    return Number.isFinite(y) ? y : null;
  } catch (e) {
    return null;
  }
}

/** Muestras de una curva: [{ x, y }] con y = null donde no existe. */
function muestrasDeCurva(f, xMin, xMax) {
  const muestras = [];
  for (let i = 0; i <= GRAFICA.muestras; i++) {
    const x = xMin + (xMax - xMin) * i / GRAFICA.muestras;
    muestras.push({ x, y: valorSeguro(f, x) });
  }
  return muestras;
}

/** Rango vertical que deja ver lo importante sin que una asíntota lo estire: ignora el 5 % más extremo. */
function rangoVertical(valores) {
  const ordenados = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!ordenados.length) return [-1, 1];
  const corte = Math.floor(ordenados.length * 0.05);
  let minimo = ordenados[corte];
  let maximo = ordenados[ordenados.length - 1 - corte];
  if (minimo === maximo) { minimo -= 1; maximo += 1; }
  const holgura = (maximo - minimo) * 0.1;
  return [minimo - holgura, maximo + holgura];
}

function dibujarGrafica(idContenedor, opciones) {
  const contenedor = document.getElementById(idContenedor);
  const { ancho, alto, izquierda, derecha, arriba, abajo } = GRAFICA;
  const { xMin, xMax } = opciones;
  const curvas = opciones.curvas || [];
  const series = opciones.series || [];
  const segmentos = opciones.segmentos || [];
  const puntos = opciones.puntos || [];
  const verticales = opciones.verticales || [];

  const muestras = curvas.map(curva => muestrasDeCurva(curva.f, xMin, xMax));

  // Rango vertical: el pedido, o el que sale de todo lo dibujado (siempre incluyendo y = 0)
  let yMin = opciones.yMin;
  let yMax = opciones.yMax;
  if (yMin === undefined || yMax === undefined) {
    const valores = [0];
    muestras.forEach(lista => lista.forEach(m => { if (m.y !== null) valores.push(m.y); }));
    series.forEach(serie => serie.puntos.forEach(p => valores.push(p.y)));
    segmentos.forEach(s => valores.push(s.y1, s.y2));
    puntos.forEach(p => valores.push(p.y));
    [yMin, yMax] = rangoVertical(valores);
    // Lo que se marca a propósito (puntos y segmentos) nunca debe quedar fuera
    const marcados = [0].concat(puntos.map(p => p.y), segmentos.flatMap(s => [s.y1, s.y2]), series.flatMap(s => s.puntos.map(p => p.y)));
    yMin = Math.min(yMin, ...marcados.filter(Number.isFinite));
    yMax = Math.max(yMax, ...marcados.filter(Number.isFinite));
    const holgura = (yMax - yMin) * 0.06 || 1;
    yMin -= holgura;
    yMax += holgura;
  }

  const aX = x => izquierda + (x - xMin) / (xMax - xMin) * (ancho - izquierda - derecha);
  const aY = y => arriba + (yMax - y) / (yMax - yMin) * (alto - arriba - abajo);
  const fx = n => n.toFixed(1);
  const idRecorte = 'recorte-' + idContenedor;

  let svg = '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" class="grafica-svg" role="img">' +
    '<defs><clipPath id="' + idRecorte + '"><rect x="' + izquierda + '" y="' + arriba + '" width="' + (ancho - izquierda - derecha) + '" height="' + (alto - arriba - abajo) + '"/></clipPath></defs>';

  // Cuadrícula y números de los ejes
  marcasDelEje(xMin, xMax).forEach(x => {
    svg += '<line class="g-cuadricula" x1="' + fx(aX(x)) + '" y1="' + arriba + '" x2="' + fx(aX(x)) + '" y2="' + (alto - abajo) + '"/>' +
      '<text class="g-marca" x="' + fx(aX(x)) + '" y="' + (alto - abajo + 16) + '" text-anchor="middle">' + textoDeMarca(x) + '</text>';
  });
  marcasDelEje(yMin, yMax).forEach(y => {
    svg += '<line class="g-cuadricula" x1="' + izquierda + '" y1="' + fx(aY(y)) + '" x2="' + (ancho - derecha) + '" y2="' + fx(aY(y)) + '"/>' +
      '<text class="g-marca" x="' + (izquierda - 6) + '" y="' + fx(aY(y) + 4) + '" text-anchor="end">' + textoDeMarca(y) + '</text>';
  });

  // Ejes (donde x = 0 e y = 0) y marco
  if (yMin <= 0 && yMax >= 0) svg += '<line class="g-eje" x1="' + izquierda + '" y1="' + fx(aY(0)) + '" x2="' + (ancho - derecha) + '" y2="' + fx(aY(0)) + '"/>';
  if (xMin <= 0 && xMax >= 0) svg += '<line class="g-eje" x1="' + fx(aX(0)) + '" y1="' + arriba + '" x2="' + fx(aX(0)) + '" y2="' + (alto - abajo) + '"/>';
  svg += '<rect class="g-marco" x="' + izquierda + '" y="' + arriba + '" width="' + (ancho - izquierda - derecha) + '" height="' + (alto - arriba - abajo) + '"/>';

  // Todo lo que se dibuja dentro del marco va recortado
  svg += '<g clip-path="url(#' + idRecorte + ')">';

  verticales.forEach(v => {
    svg += '<line class="g-discontinua" style="stroke:' + (v.color || 'var(--muted)') + '" x1="' + fx(aX(v.x)) + '" y1="' + arriba + '" x2="' + fx(aX(v.x)) + '" y2="' + (alto - abajo) + '"/>';
  });

  curvas.forEach((curva, i) => {
    // Se corta el trazo donde la función no existe o salta de un extremo al otro (asíntota)
    const salto = (yMax - yMin) * 3;
    let trazo = '';
    let anterior = null;
    muestras[i].forEach(m => {
      if (m.y === null) { anterior = null; return; }
      const continuaConElAnterior = anterior !== null && Math.abs(m.y - anterior) < salto;
      trazo += (continuaConElAnterior ? ' L' : ' M') + fx(aX(m.x)) + ' ' + fx(aY(m.y));
      anterior = m.y;
    });
    svg += '<path class="g-curva' + (curva.discontinua ? ' g-discontinua' : '') + '" style="stroke:' + curva.color + ';stroke-width:' + (curva.grosor || 2.5) + '" d="' + trazo.trim() + '"/>';
  });

  segmentos.forEach(s => {
    svg += '<line class="g-segmento' + (s.discontinuo ? ' g-discontinua' : '') + '" style="stroke:' + (s.color || 'var(--red)') + '" x1="' + fx(aX(s.x1)) + '" y1="' + fx(aY(s.y1)) + '" x2="' + fx(aX(s.x2)) + '" y2="' + fx(aY(s.y2)) + '"/>';
  });

  series.forEach(serie => {
    const trazo = serie.puntos.map((p, i) => (i ? 'L' : 'M') + fx(aX(p.x)) + ' ' + fx(aY(p.y))).join(' ');
    svg += '<path class="g-curva" style="stroke:' + serie.color + ';stroke-width:2" d="' + trazo + '"/>';
    serie.puntos.forEach(p => {
      svg += '<circle cx="' + fx(aX(p.x)) + '" cy="' + fx(aY(p.y)) + '" r="3.2" style="fill:' + serie.color + '"><title>' +
        escaparTexto((serie.titulo || '') + ' (' + textoDeMarca(p.x) + ', ' + textoDeMarca(p.y) + ')') + '</title></circle>';
    });
  });

  svg += '</g>';

  // Puntos y etiquetas van encima, sin recortar, para que se lean aunque estén en el borde
  puntos.forEach(p => {
    const cx = aX(p.x);
    const cy = aY(p.y);
    if (cx < izquierda - 1 || cx > ancho - derecha + 1 || cy < arriba - 1 || cy > alto - abajo + 1) return;
    svg += '<circle cx="' + fx(cx) + '" cy="' + fx(cy) + '" r="' + (p.radio || 4.5) + '" style="fill:' + (p.color || 'var(--gold)') + '" class="g-punto"><title>' +
      escaparTexto(p.titulo || ('(' + textoDeMarca(p.x) + ', ' + textoDeMarca(p.y) + ')')) + '</title></circle>';
    if (p.etiqueta) {
      svg += '<text class="g-etiqueta" x="' + fx(cx + 7) + '" y="' + fx(cy - 7) + '">' + escaparTexto(p.etiqueta) + '</text>';
    }
  });
  verticales.forEach(v => {
    if (v.etiqueta) svg += '<text class="g-etiqueta" x="' + fx(aX(v.x) + 4) + '" y="' + (arriba + 12) + '">' + escaparTexto(v.etiqueta) + '</text>';
  });

  if (opciones.etiquetaX) svg += '<text class="g-titulo-eje" x="' + (izquierda + (ancho - izquierda - derecha) / 2) + '" y="' + (alto - 4) + '" text-anchor="middle">' + escaparTexto(opciones.etiquetaX) + '</text>';

  contenedor.innerHTML = svg + '</svg>';
}

/** Leyenda bajo la gráfica: [{ color, texto }] */
function dibujarLeyenda(idContenedor, elementos) {
  document.getElementById(idContenedor).innerHTML = elementos
    .map(e => '<span class="leyenda-item"><span class="leyenda-color" style="background:' + e.color + '"></span>' + e.texto + '</span>')
    .join('');
}

/**
 * Rango [min, max] que abarca los valores, con un margen proporcional (o fijo si todos son iguales).
 * Si queda más angosto que anchoMinimo, se ensancha alrededor del centro para que se vea la curva alrededor.
 */
function rangoConMargen(valores, proporcion = 0.15, anchoMinimo = 0) {
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const margen = (maximo - minimo) * proporcion || 1;
  let desde = minimo - margen;
  let hasta = maximo + margen;
  if (hasta - desde < anchoMinimo) {
    const centro = (desde + hasta) / 2;
    desde = centro - anchoMinimo / 2;
    hasta = centro + anchoMinimo / 2;
  }
  return [desde, hasta];
}
