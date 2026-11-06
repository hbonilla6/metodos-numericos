/* ==========================================================================
   Procedimiento de la diferenciación numérica: derivada exacta, resumen de
   las cinco fórmulas y el detalle de cada una con sus valores.
   ========================================================================== */

const PUNTO_BASE = 'x₀';

/** El punto x₀ + k·h escrito en general: x₀, x₀ + h, x₀ − 2h. */
function puntoGeneral(desplazamiento) {
  if (desplazamiento === 0) return PUNTO_BASE;
  const multiplo = Math.abs(desplazamiento) === 1 ? '' : String(Math.abs(desplazamiento));
  return PUNTO_BASE + (desplazamiento > 0 ? ' + ' : ' − ') + multiplo + 'h';
}

/** Une los términos con su signo: "−3 · a + 4 · b − c". `dibujar(termino, coeficienteAbsoluto)` escribe cada uno. */
function sumaConSignos(terminos, dibujar) {
  return terminos.map((termino, k) => {
    const signo = termino.coeficiente < 0 ? (k === 0 ? '−' : ' − ') : (k === 0 ? '' : ' + ');
    return signo + dibujar(termino, Math.abs(termino.coeficiente));
  }).join('');
}

const conCoeficiente = (coeficiente, contenido) => (coeficiente === 1 ? contenido : coeficiente + contenido);

function sumaGeneral(formula) {
  return sumaConSignos(formula.terminos, (termino, coeficiente) => conCoeficiente(coeficiente, 'f(' + puntoGeneral(termino.desplazamiento) + ')'));
}

function sumaConValores(formula) {
  return sumaConSignos(formula.terminos, (termino, coeficiente) => conCoeficiente(coeficiente, entreParentesisSiNegativoOValor(termino.fx, coeficiente)));
}

/** Con coeficiente distinto de 1 el valor va entre paréntesis: 4(2.0248…). Con 1 va solo. */
function entreParentesisSiNegativoOValor(valor, coeficiente) {
  return coeficiente === 1 ? entreParentesisSiNegativo(valor) : '(' + formatear(valor) + ')';
}

const divisorGeneral = formula => (formula.factor === 1 ? 'h' : formula.factor + 'h');

function formulaGeneralEnHtml(formula) {
  const suma = sumaGeneral(formula);
  const lado = formula.forma === 'cociente' ? fraccion(suma, divisorGeneral(formula)) : fraccion('1', divisorGeneral(formula)) + ' [ ' + suma + ' ]';
  return "f'(" + PUNTO_BASE + ') ≈ ' + lado;
}

function sustituidaEnHtml(formula) {
  const suma = sumaConValores(formula);
  const divisor = formula.factor === 1 ? formatear(formula.divisor.dividedBy(formula.factor)) : formula.factor + '(' + formatear(formula.divisor.dividedBy(formula.factor)) + ')';
  const lado = formula.forma === 'cociente' ? fraccion(suma, divisor) : fraccion('1', divisor) + ' [ ' + suma + ' ]';
  return lado;
}

function ordenEnHtml(orden) {
  return 'O(h' + (orden === 1 ? '' : '<sup>' + orden + '</sup>') + ')';
}

/** Los valores de f en cada punto de la fórmula: f(x₀ + h) = f(1.1) = 2.0248… */
function valoresDeLaFormula(formula) {
  return formula.terminos.map(termino =>
    formulaEnHtml('f(' + puntoGeneral(termino.desplazamiento) + ') = f(' + formatear(termino.x) + ') = <strong>' + formatear(termino.fx) + '</strong>')).join('');
}

function detalleDeFormula(formula, exacta) {
  const titulo = formula.nombre + ' · error ' + ordenEnHtml(formula.orden);
  if (formula.problema) return pasoEnHtml(titulo, '<p class="nota-campos">' + formula.problema + '</p>');

  let html = formulaEnHtml(formulaGeneralEnHtml(formula)) + valoresDeLaFormula(formula) +
    formulaEnHtml("f'(" + PUNTO_BASE + ') ≈ ' + sustituidaEnHtml(formula) + ' = <strong>' + formatear(formula.aproximacion) + '</strong>');
  if (exacta) html += '<p class="comparacion">Error absoluto: <strong>' + formatear(formula.aproximacion.minus(exacta.valor).abs()) + '</strong></p>';
  return pasoEnHtml(titulo, html);
}

function resumenDeFormulas(formulas, exacta) {
  const encabezados = ['Fórmula', 'Error de la fórmula', "f'(x₀) ≈"].concat(exacta ? ['Error absoluto'] : []);
  const filas = formulas.map(formula => {
    const celdas = [formula.nombre, ordenEnHtml(formula.orden), formula.problema ? '—' : formatearAnotado(formula.aproximacion)];
    if (exacta) celdas.push(formula.problema ? '—' : formatearAnotado(formula.aproximacion.minus(exacta.valor).abs()));
    return celdas;
  });
  return tablaDeResultados(encabezados, filas);
}

function derivadaExactaEnHtml(exacta, x0) {
  if (!exacta) return '<p class="nota-campos">No pude derivar f(x) de forma exacta, así que no se calcula el error.</p>';
  return formulaEnHtml("f'(x) = " + arbolAHtml(exacta.arbol) + ' &nbsp;→&nbsp; f\'(' + formatear(x0) + ') = <strong>' + formatear(exacta.valor) + '</strong>');
}

function procedimientoDeDerivada(formulas, datos, exacta) {
  return pasoEnHtml('Derivada exacta (para comparar)', derivadaExactaEnHtml(exacta, datos.x0)) +
    pasoEnHtml('Resumen con h = ' + formatear(datos.h), resumenDeFormulas(formulas, exacta)) +
    formulas.map(formula => detalleDeFormula(formula, exacta)).join('');
}
