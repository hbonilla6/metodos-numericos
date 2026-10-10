/* ==========================================================================
   Bloque previo a la tabla: cómo se acomoda la diagonal y cómo se despeja
   cada variable. También arma los términos que usan las explicaciones de celdas.
   ========================================================================== */

/** Une términos { negativo, html }: el primero lleva el "−" pegado y los demás " + " o " − ". */
function unirTerminos(terminos) {
  if (!terminos.length) return '0';
  return terminos.map((termino, i) => {
    if (i === 0) return (termino.negativo ? '−' : '') + termino.html;
    return (termino.negativo ? ' − ' : ' + ') + termino.html;
  }).join('');
}

/**
 * Numerador al despejar la variable v de la fila v (b − suma de los demás términos).
 *   'simbolico'   → con las letras x, y, z y los coeficientes enlazados a sus campos
 *   'referencias' → con las celdas de donde salen los valores (x₂, y₂…)
 *   'numerico'    → con los valores ya sustituidos
 * Devuelve el html y el valor del numerador (solo se calcula con referencias o números).
 */
function numeradorDeDespeje(v, modo, iteracion) {
  const { coeficientes, independientes, orden } = estado.sistema;
  const ecuacionOriginal = orden[v];
  const fila = coeficientes[v];
  const b = independientes[v];

  const terminos = [];
  let numerador = b;

  const hayOtrasVariables = fila.some((c, j) => j !== v && !c.isZero());
  if (!b.isZero() || !hayOtrasVariables) {
    const textoB = formatear(b.abs());
    terminos.push({
      negativo: b.isNegative() && !b.isZero(),
      html: modo === 'simbolico' ? enlaceACampo('b' + ecuacionOriginal, textoB) : textoB,
    });
  }

  for (let j = 0; j < TAMANO; j++) {
    if (j === v || fila[j].isZero()) continue;

    const coeficiente = fila[j];
    const absoluto = coeficiente.abs();
    const esUno = absoluto.equals(1);
    const negativo = coeficiente.greaterThan(0); // pasa restando si el coeficiente es positivo
    let html;

    if (modo === 'simbolico') {
      const enlace = esUno ? '' : enlaceACampo('a' + ecuacionOriginal + j, formatear(absoluto)) + '·';
      html = enlace + '<i>' + NOMBRES_VARIABLES[j] + '</i>';
    } else {
      const usaValorNuevo = estado.metodo === 'gauss' && j < v;
      const filaDelValor = usaValorNuevo ? iteracion : iteracion - 1;
      const valor = estado.filas[filaDelValor].x[j];
      const coeficienteTexto = esUno ? '' : formatear(absoluto) + '·';
      html = coeficienteTexto + (modo === 'referencias'
        ? referenciaACelda('v' + j, filaDelValor)
        : entreParentesisSiNegativo(valor));
      numerador = numerador.minus(coeficiente.times(valor));
    }
    terminos.push({ negativo, html });
  }
  return { html: unirTerminos(terminos), numerador };
}

/** La ecuación de la fila v escrita con sus coeficientes (enlazados a los campos). La diagonal puede ir en rojo. */
function ecuacionEnHtml(v, resaltarDiagonal) {
  const { coeficientes, independientes, orden } = estado.sistema;
  const ecuacionOriginal = orden[v];
  let texto = '';

  for (let j = 0; j < TAMANO; j++) {
    const coeficiente = coeficientes[v][j];
    if (coeficiente.isZero()) continue;

    const enlace = coeficiente.abs().equals(1) ? '' : enlaceACampo('a' + ecuacionOriginal + j, formatear(coeficiente.abs()));
    const negativo = coeficiente.isNegative();
    if (texto === '') texto += negativo ? '−' : '';
    else texto += negativo ? ' − ' : ' + ';

    const termino = enlace + '<i>' + NOMBRES_VARIABLES[j] + '</i>';
    texto += (resaltarDiagonal && j === v) ? '<span class="diag-term">' + termino + '</span>' : termino;
  }
  return (texto || '0') + ' = ' + enlaceACampo('b' + ecuacionOriginal, formatear(independientes[v]));
}

/** Bloque "Buscando la diagonal dominante": sistema original → sistema acomodado, con la comprobación por fila. */
function bloqueDeDiagonal() {
  const { coeficientes, orden } = estado.sistema;
  const seReordeno = orden.some((ecuacion, v) => ecuacion !== v);

  const introduccion = seReordeno
    ? 'Reordeno las ecuaciones para que el coeficiente más grande de cada incógnita quede en la diagonal (x en la 1.ª fila, y en la 2.ª, z en la 3.ª).'
    : 'Las ecuaciones ya están en un orden que deja los coeficientes de la diagonal lo más grandes posible.';

  let html = '<div class="bloque-diag"><div class="orden-titulo">Buscando la diagonal dominante</div>' +
    '<p class="orden-intro">' + introduccion + ' En cada fila debe cumplirse |diagonal| &gt; suma de |los demás|.</p>';

  let original = '';
  let acomodado = '';
  for (let k = 0; k < TAMANO; k++) {
    original += '<div class="fila-eq">' + ecuacionEnHtml(orden.indexOf(k), false) + '</div>';
  }
  for (let v = 0; v < TAMANO; v++) {
    acomodado += '<div class="fila-eq">' + ecuacionEnHtml(v, true) + '</div>';
  }
  html += '<div class="diag-sistemas">' +
    '<div class="col"><span class="col-etq">Original</span>' + original + '</div>' +
    '<div class="flecha">→</div>' +
    '<div class="col"><span class="col-etq">Con la diagonal acomodada</span>' + acomodado + '</div></div>';

  const barras = valor => '|' + formatear(valor) + '|';
  for (let v = 0; v < TAMANO; v++) {
    const fila = coeficientes[v];
    const diagonal = fila[v].abs();
    const otros = fila.filter((c, j) => j !== v).map(c => c.abs());
    const suma = otros.reduce((total, valor) => total.plus(valor), new Decimal(0));
    const cumple = diagonal.greaterThan(suma);

    const rotulo = orden[v] !== v
      ? 'Fila ' + (v + 1) + ' (era la ecuación ' + (orden[v] + 1) + ')'
      : 'Fila ' + (v + 1);
    const veredicto = cumple
      ? '<span class="diag-ok">✓ cumple</span>'
      : '<span class="diag-mal">✗ no cumple</span>';

    html += '<div class="formula"><span class="formula-etq">' + rotulo + '</span>' +
      barras(diagonal) + ' &gt; ' + otros.map(barras).join(' + ') +
      ' &nbsp;→&nbsp; ' + formatear(diagonal) + ' &gt; ' + formatear(suma) + ' &nbsp;' + veredicto + '</div>';
  }
  return html + '</div>';
}

/** Todo lo que va arriba de la tabla: la diagonal y el despeje de cada variable. */
function ordenYDespejeEnHtml(diagonalEstricta) {
  const { coeficientes, orden } = estado.sistema;
  let html = bloqueDeDiagonal() + '<div class="orden-titulo">Despeje de cada variable</div>';

  for (let v = 0; v < TAMANO; v++) {
    const numerador = numeradorDeDespeje(v, 'simbolico');
    const denominador = enlaceACampo('a' + orden[v] + v, formatear(coeficientes[v][v]));
    html += '<div class="formula"><i>' + NOMBRES_VARIABLES[v] + '</i> = ' + fraccion(numerador.html, denominador) +
      '<span class="orden-de">de la ecuación (' + (orden[v] + 1) + ')</span></div>';
  }
  if (!diagonalEstricta) {
    html += '<div class="aviso">Ningún orden de las ecuaciones logra diagonal estrictamente dominante, así que la convergencia no está garantizada.</div>';
  }
  return html;
}
