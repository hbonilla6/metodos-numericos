/* ==========================================================================
   Procedimiento de cada método de integración: fórmula, cálculo de h, tabla
   y resultado, escritos con notación matemática.
   ========================================================================== */

const MAXIMO_DE_TERMINOS_EXPANDIDOS = 8;

const integralEnHtml = '∫<sub>a</sub><sup>b</sup> f(x) dx';
const sumaEnHtml = (desde, hasta) => 'Σ<sub>' + desde + '</sub><sup>' + hasta + '</sup>';
const nombreDeNodo = i => 'x' + aSubindice(i);

/** Valor para escribir dentro de una operación: los negativos van entre paréntesis. */
const operando = valor => entreParentesisSiNegativo(valor);

/** La suma desarrollada (a + b − c …), o null si hay demasiados términos para escribirla completa. */
function sumaDesarrollada(valores) {
  if (valores.length === 0 || valores.length > MAXIMO_DE_TERMINOS_EXPANDIDOS) return null;
  return valores.map((valor, k) => {
    if (k === 0) return formatear(valor);
    return valor.isNegative() && !valor.isZero() ? ' − ' + formatear(valor.abs()) : ' + ' + formatear(valor);
  }).join('');
}

/** "Paso 1: calcular h", con la fórmula, la sustitución y el valor. */
function pasoDeH(h, a, b, n) {
  const general = fraccion('b − a', 'n');
  const sustituido = fraccion(formatear(b) + ' − ' + operando(a), String(n));
  const resuelto = fraccion(formatear(b.minus(a)), String(n));
  return pasoEnHtml('Paso 1: ancho de cada subintervalo',
    formulaEnHtml('h = ' + general + ' = ' + sustituido + ' = ' + resuelto + ' = <strong>' + formatear(h) + '</strong>'));
}

function notaDeFormulaSimple(textoDeLaFormula, n) {
  return n === 1 ? '<p class="nota-campos">Con n = 1 se obtiene la fórmula simple: ' + textoDeLaFormula + '</p>' : '';
}

/** Resultado final y, si se conoce, el valor exacto con su error. */
function resultadoDeIntegralEnHtml(integral, exacta) {
  let html = '<div class="resultado">' + integralEnHtml + ' ≈ ' + formatear(integral) + '</div>';
  if (exacta !== null) {
    const error = integral.minus(exacta).abs();
    html += '<p class="comparacion">Valor exacto: <strong>' + formatear(exacta) + '</strong> · Error absoluto: <strong>' + formatear(error) + '</strong></p>';
  }
  return html;
}

// ---------- Punto medio ----------

function procedimientoDePuntoMedio(resultado, datos, exacta) {
  const { h, filas, suma, integral } = resultado;
  const { a, b, n } = datos;
  const medios = filas.slice(1).map(fila => fila.fMedio);

  const formulaGeneral = formulaEnHtml(integralEnHtml + ' ≈ h · ' + sumaEnHtml('i=1', 'n') + ' f(x̄ᵢ)') +
    formulaEnHtml('x̄ᵢ = ' + fraccion('xᵢ₋₁ + xᵢ', '2'), 'formula-chica') +
    notaDeFormulaSimple('f(c)(b − a), con c = ' + fraccion('a + b', '2'), n);

  const tabla = tablaDeResultados(['i', 'xᵢ', 'x̄ᵢ', 'f(x̄ᵢ)'], filas.map(fila => [
    fila.i, formatearAnotado(fila.x),
    fila.medio === null ? '—' : formatearAnotado(fila.medio),
    fila.fMedio === null ? '—' : formatearAnotado(fila.fMedio),
  ]));

  const desarrollo = sumaDesarrollada(medios);
  const calculoDeLaSuma = 'Σ = ' + (desarrollo ? desarrollo + ' = ' : '') + '<strong>' + formatear(suma) + '</strong>';
  const calculoFinal = integralEnHtml + ' ≈ h · Σ = (' + formatear(h) + ')(' + operando(suma) + ') = <strong>' + formatear(integral) + '</strong>';

  return pasoEnHtml('Fórmula del punto medio compuesto', formulaGeneral) +
    pasoDeH(h, a, b, n) +
    pasoEnHtml('Paso 2: nodos xᵢ = a + i·h, puntos medios x̄ᵢ y f(x̄ᵢ)', tabla) +
    pasoEnHtml('Paso 3: sumar la última columna y multiplicar por h', formulaEnHtml(calculoDeLaSuma) + formulaEnHtml(calculoFinal)) +
    resultadoDeIntegralEnHtml(integral, exacta);
}

// ---------- Trapecio ----------

function procedimientoDeTrapecio(resultado, datos, exacta) {
  const { h, filas, suma, integral } = resultado;
  const { a, b, n } = datos;

  const formulaGeneral = formulaEnHtml(integralEnHtml + ' ≈ ' + fraccion('h', '2') + ' [ f(a) + 2 ' + sumaEnHtml('i=1', 'n−1') + ' f(xᵢ) + f(b) ]') +
    notaDeFormulaSimple(fraccion('b − a', '2') + ' [ f(a) + f(b) ]', n);

  const tabla = tablaDeResultados(['i', 'xᵢ', 'f(xᵢ)', 'c · f(xᵢ)'], filas.map(fila => [
    fila.i, formatearAnotado(fila.x), formatearAnotado(fila.fx), formatearAnotado(fila.ponderado),
  ]));

  const desarrollo = sumaDesarrollada(filas.map(fila => fila.ponderado));
  const calculoDeLaSuma = 'Σ = ' + (desarrollo ? desarrollo + ' = ' : '') + '<strong>' + formatear(suma) + '</strong>';
  const calculoFinal = integralEnHtml + ' ≈ ' + fraccion('h', '2') + ' · Σ = ' + fraccion(formatear(h), '2') + '(' + operando(suma) + ') = <strong>' + formatear(integral) + '</strong>';

  return pasoEnHtml('Fórmula del trapecio compuesto', formulaGeneral) +
    pasoDeH(h, a, b, n) +
    pasoEnHtml('Paso 2: nodos xᵢ = a + i·h y f(xᵢ)', '<p class="nota-campos">c = 1 en los extremos (x₀ y xₙ) y c = 2 en los nodos interiores.</p>' + tabla) +
    pasoEnHtml('Paso 3: sumar la última columna y multiplicar por h/2', formulaEnHtml(calculoDeLaSuma) + formulaEnHtml(calculoFinal)) +
    resultadoDeIntegralEnHtml(integral, exacta);
}

// ---------- Simpson ----------

function procedimientoDeSimpson(resultado, datos, exacta) {
  const { h, filas, extremos, sigma1, sigma2, corchete, integral } = resultado;
  const { a, b, n } = datos;
  const fa = filas[0].fx;
  const fb = filas[n].fx;

  const formulaGeneral = formulaEnHtml(integralEnHtml + ' ≈ ' + fraccion('h', '6') + ' [ f(a) + 4Σ₂ + 2Σ₁ + f(b) ]') +
    formulaEnHtml('Σ₁ = ' + sumaEnHtml('i=1', 'n−1') + ' f(xᵢ) &nbsp;(sin f(a) ni f(b))&nbsp; · &nbsp;Σ₂ = ' + sumaEnHtml('i=1', 'n') + ' f(xₘ)', 'formula-chica') +
    notaDeFormulaSimple(fraccion('b − a', '6') + ' [ f(a) + 4 f(' + fraccion('a + b', '2') + ') + f(b) ]', n);

  const tabla = tablaDeResultados(['i', 'xᵢ', 'f(xᵢ)', 'xₘ', 'f(xₘ)'], filas.map(fila => [
    fila.i, formatearAnotado(fila.x), formatearAnotado(fila.fx),
    fila.medio === null ? '—' : formatearAnotado(fila.medio),
    fila.fMedio === null ? '—' : formatearAnotado(fila.fMedio),
  ]));

  const calculoDeSumas = formulaEnHtml('Σ₁ = <strong>' + formatear(sigma1) + '</strong>') +
    formulaEnHtml('Σ₂ = <strong>' + formatear(sigma2) + '</strong>');
  const sustituido = '[ ' + operando(fa) + ' + 4(' + operando(sigma2) + ') + 2(' + operando(sigma1) + ') + ' + operando(fb) + ' ]';
  const calculoFinal = integralEnHtml + ' ≈ ' + fraccion('h', '6') + ' ' + sustituido + ' = ' +
    fraccion(formatear(h), '6') + '(' + operando(corchete) + ') = <strong>' + formatear(integral) + '</strong>';

  return pasoEnHtml('Fórmula de Simpson compuesta', formulaGeneral) +
    pasoDeH(h, a, b, n) +
    pasoEnHtml('Paso 2: nodos xᵢ, puntos medios xₘ y sus valores de f', tabla) +
    pasoEnHtml('Paso 3: calcular Σ₁ y Σ₂', calculoDeSumas) +
    pasoEnHtml('Paso 4: aplicar la fórmula', formulaEnHtml(calculoFinal)) +
    resultadoDeIntegralEnHtml(integral, exacta);
}
