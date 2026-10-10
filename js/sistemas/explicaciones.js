/* ==========================================================================
   Explicación paso a paso de la celda que el usuario toca.
   ========================================================================== */

function nombresDeValoresIniciales() {
  return NOMBRES_VARIABLES.map((nombre, j) => nombreDeCelda('v' + j, 0)).join(', ');
}

function explicarError(iteracion) {
  const fila = estado.filas[iteracion];
  if (iteracion === 0 || fila.error === null) {
    return '<p class="empty">Sin error todavía: la fila 0 es solo el punto de partida.</p>';
  }

  const anterior = estado.filas[iteracion - 1];
  const referencias = NOMBRES_VARIABLES.map((nombre, j) =>
    '|' + referenciaACelda('v' + j, iteracion) + ' − ' + referenciaACelda('v' + j, iteracion - 1) + '|').join(', ');
  const valores = NOMBRES_VARIABLES.map((nombre, j) =>
    '|' + entreParentesisSiNegativo(fila.x[j]) + ' − ' + entreParentesisSiNegativo(anterior.x[j]) + '|').join(', ');
  const diferencias = NOMBRES_VARIABLES.map((nombre, j) =>
    formatear(fila.x[j].minus(anterior.x[j]).abs())).join(', ');
  const celda = referenciaACelda('error', iteracion);

  return '<div class="formula">' + celda + ' = máx(' + referencias + ')</div>' +
    '<div class="formula">' + celda + ' = máx(' + valores + ')</div>' +
    '<div class="formula">' + celda + ' = máx(' + diferencias + ') = ' + formatear(fila.error) + '</div>' +
    (iteracion === 1 ? '<p>' + nombresDeValoresIniciales() + ' = 0: valores iniciales.</p>' : '') +
    '<p>Norma infinito: la mayor diferencia entre esta fila y la anterior, en cualquiera de las variables. ' +
    'El método se detiene cuando es menor que 10<sup>−7</sup>.</p>';
}

/** Qué valores usa el método: Jacobi solo los de la fila anterior; Gauss-Seidel también los ya calculados en esta fila. */
function notaDelMetodo(v, iteracion) {
  if (estado.metodo === 'jacobi') {
    return '<p>Jacobi: todo se calcula únicamente con los valores de la iteración anterior (fila ' + (iteracion - 1) + ').</p>';
  }

  const nuevas = [];
  const anteriores = [];
  for (let j = 0; j < TAMANO; j++) {
    if (j === v) continue;
    if (j < v) nuevas.push(referenciaACelda('v' + j, iteracion));
    else anteriores.push(referenciaACelda('v' + j, iteracion - 1));
  }

  let texto = 'Gauss-Seidel: ';
  if (nuevas.length) {
    texto += 'usa los valores ya actualizados en esta misma fila (' + nuevas.join(', ') + ')' +
      (anteriores.length ? ' y los de la anterior (' + anteriores.join(', ') + ').' : '.');
  } else {
    texto += 'todavía no hay valores nuevos en esta fila, así que usa los de la anterior (' + anteriores.join(', ') + ').';
  }
  return '<p>' + texto + '</p>';
}

function explicarVariable(v, iteracion) {
  const celda = referenciaACelda('v' + v, iteracion);
  if (iteracion === 0) {
    return '<div class="formula">' + celda + ' = 0</div><p>Valor inicial: el método arranca con todas las incógnitas en 0.</p>';
  }

  const { coeficientes, orden } = estado.sistema;
  const diagonal = formatear(coeficientes[v][v]);
  const simbolico = numeradorDeDespeje(v, 'simbolico');
  const conReferencias = numeradorDeDespeje(v, 'referencias', iteracion);
  const conValores = numeradorDeDespeje(v, 'numerico', iteracion);
  const enlaceDiagonal = enlaceACampo('a' + orden[v] + v, diagonal);
  const rotulo = texto => '<span class="formula-etq">' + texto + '</span>';

  let html =
    '<div class="formula">' + rotulo('Ecuación (' + (orden[v] + 1) + ')') + ecuacionEnHtml(v) + '</div>' +
    '<div class="formula">' + rotulo('Despejando ' + NOMBRES_VARIABLES[v]) + '<i>' + NOMBRES_VARIABLES[v] + '</i> = ' + fraccion(simbolico.html, enlaceDiagonal) + '</div>' +
    '<div class="formula">' + rotulo('Sustituyendo celdas') + celda + ' = ' + fraccion(conReferencias.html, diagonal) + '</div>' +
    '<div class="formula">' + rotulo('Con sus valores') + celda + ' = ' + fraccion(conValores.html, diagonal) + '</div>' +
    '<div class="formula">' + celda + ' = ' + fraccion(formatear(conValores.numerador), diagonal) + ' = ' + formatear(estado.filas[iteracion].x[v]) + '</div>';

  if (iteracion === 1) html += '<p>' + nombresDeValoresIniciales() + ' = 0: son los valores iniciales, el punto de partida.</p>';
  return html + notaDelMetodo(v, iteracion);
}

function explicarCelda(campo, iteracion) {
  const contenido = campo === 'error'
    ? explicarError(iteracion)
    : explicarVariable(parseInt(campo.slice(1)), iteracion);
  document.getElementById('explainBox').innerHTML =
    '<span class="tag">Celda ' + nombreDeCelda(campo, iteracion) + '</span>' + contenido;
}
