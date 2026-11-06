/* ==========================================================================
   Procedimiento de Euler y de Heun: fórmulas, cálculo de h, primeros pasos
   con sus valores, tabla y resultado, escritos con notación matemática.
   ========================================================================== */

const PASOS_DETALLADOS = 2;

const nodoEn = i => 'x' + aSubindice(i);
const aproximacionEn = i => 'y' + aSubindice(i);
const pendienteGeneralEn = i => 'f(' + nodoEn(i) + ', ' + aproximacionEn(i) + ')';

/** f(x, y) con x e y reemplazadas por sus valores (entre paréntesis). */
function pendienteSustituida(f, x, y) {
  return tokensAHtml(f.tokens, nombre => '(' + formatear(nombre === 'y' ? y : x) + ')', valor => valor);
}

function pasoDeH(h, x0, xn, n) {
  const general = fraccion('xₙ − x₀', 'n');
  const sustituido = fraccion(formatear(xn) + ' − ' + entreParentesisSiNegativo(x0), String(n));
  const resuelto = fraccion(formatear(xn.minus(x0)), String(n));
  return pasoEnHtml('Paso 1: tamaño del paso',
    formulaEnHtml('h = ' + general + ' = ' + sustituido + ' = ' + resuelto + ' = <strong>' + formatear(h) + '</strong>') +
    formulaEnHtml('xᵢ = x₀ + i·h &nbsp;→&nbsp; x₁ = x₀ + h, &nbsp;x₂ = x₁ + h, &nbsp;…', 'formula-chica'));
}

/** "f(x₀, y₀) = 2·(0)·(1) = 0" */
function calculoDePendiente(f, fila) {
  return formulaEnHtml(pendienteGeneralEn(fila.i) + ' = ' + pendienteSustituida(f, fila.x, fila.y) + ' = <strong>' + formatear(fila.pendiente) + '</strong>');
}

function pasoEuler(f, filas, i, h) {
  const anterior = filas[i - 1];
  const fila = filas[i];
  const p = anterior.pendiente;
  return calculoDePendiente(f, anterior) +
    formulaEnHtml(aproximacionEn(i) + ' = ' + aproximacionEn(i - 1) + ' + h · ' + pendienteGeneralEn(i - 1) + ' = ' +
      formatear(anterior.y) + ' + (' + formatear(h) + ')(' + formatear(p) + ') = <strong>' + formatear(fila.y) + '</strong>');
}

function pasoHeun(f, filas, i, h) {
  const anterior = filas[i - 1];
  const fila = filas[i];
  const medioH = fraccion(formatear(h), '2');
  return calculoDePendiente(f, anterior) +
    formulaEnHtml(aproximacionEn(i) + '* = ' + aproximacionEn(i - 1) + ' + h · ' + pendienteGeneralEn(i - 1) + ' = ' +
      formatear(anterior.y) + ' + (' + formatear(h) + ')(' + formatear(anterior.pendiente) + ') = <strong>' + formatear(fila.yPredicha) + '</strong>') +
    formulaEnHtml('f(' + nodoEn(i) + ', ' + aproximacionEn(i) + '*) = ' + pendienteSustituida(f, fila.x, fila.yPredicha) + ' = <strong>' + formatear(fila.pendientePredicha) + '</strong>') +
    formulaEnHtml(aproximacionEn(i) + ' = ' + aproximacionEn(i - 1) + ' + ' + fraccion('h', '2') + ' [ ' + pendienteGeneralEn(i - 1) + ' + f(' + nodoEn(i) + ', ' + aproximacionEn(i) + '*) ] = ' +
      formatear(anterior.y) + ' + ' + medioH + ' [ ' + entreParentesisSiNegativo(anterior.pendiente) + ' + ' + entreParentesisSiNegativo(fila.pendientePredicha) + ' ] = <strong>' + formatear(fila.y) + '</strong>');
}

function primerosPasos(paso, f, filas, h) {
  const total = Math.min(PASOS_DETALLADOS, filas.length - 1);
  let html = '';
  for (let i = 1; i <= total; i++) html += pasoEnHtml('Paso 2.' + i + ': calcular ' + aproximacionEn(i), paso(f, filas, i, h));
  if (filas.length - 1 > total) html += '<p class="nota-campos">Los pasos siguientes se calculan igual; están en la tabla.</p>';
  return html;
}

const celdaOpcional = valor => (valor === null ? '—' : formatearAnotado(valor));

/** Tabla del método; con solución exacta se agregan las columnas de y(xᵢ) y del error. */
function tablaDeEdo(encabezados, filasDeTabla, filas, exactas) {
  if (!exactas) return tablaDeResultados(encabezados, filasDeTabla);
  const conExacta = filasDeTabla.map((celdas, k) => celdas.concat([
    celdaOpcional(exactas[k]),
    exactas[k] === null ? '—' : formatearAnotado(filas[k].y.minus(exactas[k]).abs()),
  ]));
  return tablaDeResultados(encabezados.concat(['y(xᵢ) exacta', 'Error']), conExacta);
}

function resultadoDeEdoEnHtml(xn, ultima, exacta) {
  let html = '<div class="resultado">y(' + formatear(xn) + ') ≈ ' + formatear(ultima.y) + '</div>';
  if (exacta !== null) {
    html += '<p class="comparacion">Valor exacto: <strong>' + formatear(exacta) + '</strong> · Error absoluto: <strong>' +
      formatear(ultima.y.minus(exacta).abs()) + '</strong></p>';
  }
  return html;
}

function procedimientoDeEuler(resultado, datos, exactas) {
  const { h, filas } = resultado;
  const { f, x0, xn, n } = datos;

  const formulaGeneral = formulaEnHtml('yᵢ₊₁ = yᵢ + h · f(xᵢ, yᵢ)') +
    formulaEnHtml('La recta tangente en (xᵢ, yᵢ) da el valor en el siguiente nodo.', 'formula-chica');

  const tabla = tablaDeEdo(['i', 'xᵢ', 'yᵢ', 'f(xᵢ, yᵢ)'],
    filas.map(fila => [fila.i, formatearAnotado(fila.x), formatearAnotado(fila.y), celdaOpcional(fila.pendiente)]), filas, exactas);

  return pasoEnHtml('Fórmula de Euler', formulaGeneral) +
    pasoDeH(h, x0, xn, n) +
    primerosPasos(pasoEuler, f, filas, h) +
    pasoEnHtml('Paso 3: tabla de aproximaciones', tabla) +
    resultadoDeEdoEnHtml(xn, filas[n], exactas ? exactas[n] : null);
}

function procedimientoDeHeun(resultado, datos, exactas) {
  const { h, filas } = resultado;
  const { f, x0, xn, n } = datos;

  const formulaGeneral = formulaEnHtml('yᵢ₊₁* = yᵢ + h · f(xᵢ, yᵢ)') +
    formulaEnHtml('yᵢ₊₁ = yᵢ + ' + fraccion('h', '2') + ' [ f(xᵢ, yᵢ) + f(xᵢ₊₁, yᵢ₊₁*) ]') +
    formulaEnHtml('Promedia la pendiente en el punto actual con la del paso de Euler (yᵢ₊₁*).', 'formula-chica');

  const tabla = tablaDeEdo(['i', 'xᵢ', 'yᵢ*', 'f(xᵢ, yᵢ*)', 'yᵢ', 'f(xᵢ, yᵢ)'],
    filas.map(fila => [fila.i, formatearAnotado(fila.x), celdaOpcional(fila.yPredicha), celdaOpcional(fila.pendientePredicha),
      formatearAnotado(fila.y), celdaOpcional(fila.pendiente)]), filas, exactas);

  return pasoEnHtml('Fórmula de Heun (Euler mejorado)', formulaGeneral) +
    pasoDeH(h, x0, xn, n) +
    primerosPasos(pasoHeun, f, filas, h) +
    pasoEnHtml('Paso 3: tabla de aproximaciones', tabla) +
    resultadoDeEdoEnHtml(xn, filas[n], exactas ? exactas[n] : null);
}
