/* ==========================================================================
   Procedimiento del spline lineal: la fórmula por tramos, el cálculo de la
   pendiente y de la recta de cada tramo, y el polinomio final por tramos.
   ========================================================================== */

/** Número para escribir en texto: −1/2, 3, 0. */
function textoDeFraccion(f) {
  return fraccionATexto(f).replace('-', '−');
}

function entreParentesis(f) {
  return f.n < 0n ? '(' + fraccionEnHtml(f) + ')' : fraccionEnHtml(f);
}

/** Coeficiente listo para multiplicar: los negativos y las fracciones van entre paréntesis. */
function coeficienteEntreParentesis(f) {
  return f.n < 0n || f.d !== 1n ? '(' + fraccionEnHtml(f) + ')' : fraccionEnHtml(f);
}

const formulaDelSpline = contenido => '<div class="formula">' + contenido + '</div>';

/** a − b sin paréntesis: 1/2 − (−1) pasa a 1/2 + 1. */
function restaSinParentesis(a, b) {
  return fraccionEnHtml(a) + (b.n < 0n ? ' + ' + fraccionEnHtml(negar(b)) : ' − ' + fraccionEnHtml(b));
}

function intervaloEnTexto(tramo) {
  return '[' + textoDeFraccion(tramo.inicio.x) + ', ' + textoDeFraccion(tramo.fin.x) + ']';
}

/** Varias expresiones una debajo de otra, con una llave a la izquierda. */
function porTramosEnHtml(expresiones) {
  return '<span class="por-tramos"><span class="llave">{</span><span class="tramos">' +
    expresiones.map(expresion => '<span class="tramo">' + expresion + '</span>').join('') + '</span></span>';
}

/** La fórmula general con los índices: y₀ + f[x₁,x₀](x − x₀), si x ∈ [x₀, x₁] … */
function formulaGeneralDelSpline(cantidadDeTramos) {
  const filas = [];
  for (let k = 0; k < cantidadDeTramos; k++) {
    const x = 'x' + aSubindice(k);
    const siguiente = 'x' + aSubindice(k + 1);
    filas.push('y' + aSubindice(k) + ' + f[' + siguiente + ',' + x + '](x − ' + x + '), si x ∈ [' + x + ', ' + siguiente + ']');
  }
  return 'P(x) = ' + porTramosEnHtml(filas);
}

/** f[xₖ₊₁,xₖ] = (f(xₖ₊₁) − f(xₖ)) / (xₖ₊₁ − xₖ), en general. */
function pendienteGeneral(k) {
  const x = 'x' + aSubindice(k);
  const siguiente = 'x' + aSubindice(k + 1);
  return 'f[' + siguiente + ',' + x + '] = ' +
    fraccion('f(' + siguiente + ') − f(' + x + ')', siguiente + ' − ' + x);
}

/** El cálculo de la pendiente de un tramo con sus valores. */
function calculoDeLaPendiente(tramo) {
  const { k, inicio, fin, pendiente } = tramo;
  const nombre = 'f[x' + aSubindice(k + 1) + ',x' + aSubindice(k) + ']';
  const conValores = fraccion(entreParentesis(fin.y) + ' − ' + entreParentesis(inicio.y), entreParentesis(fin.x) + ' − ' + entreParentesis(inicio.x));
  const sinParentesis = fraccion(restaSinParentesis(fin.y, inicio.y), restaSinParentesis(fin.x, inicio.x));
  const resuelta = fraccion(fraccionEnHtml(restar(fin.y, inicio.y)), fraccionEnHtml(restar(fin.x, inicio.x)));

  const pasos = [conValores];
  if (sinParentesis !== conValores) pasos.push(sinParentesis);
  pasos.push(resuelta, fraccionEnHtml(pendiente));
  return formulaDelSpline(nombre + ' = ' + pasos.join(' = '));
}

/** El desarrollo de la recta del tramo: y₀ + m(x − x₀) hasta quedar como mx + b. */
function desarrolloDeLaRecta(tramo) {
  const { k, inicio, pendiente, recta } = tramo;
  const nombreDePendiente = 'f[x' + aSubindice(k + 1) + ',x' + aSubindice(k) + ']';
  const lineas = [
    'y' + aSubindice(k) + ' + ' + nombreDePendiente + '(x − x' + aSubindice(k) + ')',
    fraccionEnHtml(inicio.y) + ' + ' + coeficienteEntreParentesis(pendiente) + '(x − ' + entreParentesis(inicio.x) + ')',
  ];
  if (inicio.x.n < 0n) {
    lineas.push(fraccionEnHtml(inicio.y) + ' + ' + coeficienteEntreParentesis(pendiente) + '(x + ' + fraccionEnHtml(negar(inicio.x)) + ')');
  }
  lineas.push(monomiosEnHtml([
    { coeficiente: inicio.y, grado: 0 },
    { coeficiente: pendiente, grado: 1 },
    { coeficiente: negar(multiplicar(pendiente, inicio.x)), grado: 0 },
  ]));
  lineas.push(polinomioEnHtml(recta));
  return formulaDelSpline('P(x) = ' + lineas.join(' = '));
}

function procedimientoDeSplineEnHtml(tramos) {
  // Las fórmulas generales quedan en un desplegable cerrado: el procedimiento empieza en los tramos
  let html = '<details class="formulas-generales"><summary>Ver fórmulas generales</summary>' +
    pasoEnHtml('Polinomio interpolador por tramos', formulaDelSpline(formulaGeneralDelSpline(tramos.length))) +
    pasoEnHtml('Donde', tramos.map(tramo => formulaDelSpline(pendienteGeneral(tramo.k))).join('')) +
    '</details>';

  for (const tramo of tramos) {
    const puntos = '(' + textoDeFraccion(tramo.inicio.x) + ', ' + textoDeFraccion(tramo.inicio.y) + ') y (' +
      textoDeFraccion(tramo.fin.x) + ', ' + textoDeFraccion(tramo.fin.y) + ')';
    html += pasoEnHtml('Tramo ' + (tramo.k + 1) + ': polinomio para los puntos ' + puntos,
      calculoDeLaPendiente(tramo) + desarrolloDeLaRecta(tramo));
  }

  const filas = tramos.map(tramo => polinomioEnHtml(tramo.recta) + ', si x ∈ ' + intervaloEnTexto(tramo));
  return html + '<div class="resultado">P(x) = ' + porTramosEnHtml(filas) + '</div>';
}
