/* ==========================================================================
   Explicación paso a paso de la celda de la tabla que el usuario toca.
   ========================================================================== */

const formulaHtml = contenido => '<div class="formula">' + contenido + '</div>';
const notaHtml = contenido => '<p>' + contenido + '</p>';

/** Una fracción exacta entre paréntesis si es negativa, para usarla dentro de una resta. */
function conParentesis(valor) {
  return valor.n < 0n ? '(' + fraccionEnHtml(valor) + ')' : fraccionEnHtml(valor);
}

function nombreDeZ(indice) { return 'z' + aSubindice(indice); }
function numeroConSigno(n) { return String(n).replace('-', '−'); }

/** f[zᵢ] = f(xⱼ): los valores de la primera columna vienen directo del dato. */
function explicarValor(fila) {
  const punto = puntoDeZ(fila);
  const celda = referenciaACelda(0, fila);
  return formulaHtml(celda + ' = f(' + numeroConSigno(estado.z[fila]) + ') = ' + fraccionEnHtml(estado.columnas[0][fila])) +
    notaHtml(nombreDeZ(fila) + ' = x' + aSubindice(punto) + ' = ' + numeroConSigno(estado.z[fila]) + ': el valor sale del dato.');
}

/** f[zᵢ, zᵢ₊₁] con zᵢ = zᵢ₊₁: no se puede dividir entre cero, así que se usa la derivada. */
function explicarDerivada(fila) {
  const punto = puntoDeZ(fila);
  const celda = referenciaACelda(1, fila);
  return formulaHtml(celda + " = f'(x" + aSubindice(punto) + ') = ' + fraccionEnHtml(estado.columnas[1][fila])) +
    notaHtml(nombreDeZ(fila) + ' = ' + nombreDeZ(fila + 1) + ' = x' + aSubindice(punto) + ': la fórmula daría ' + fraccion('0', '0') + ', ' +
      "por eso aquí se usa la derivada f'(x" + aSubindice(punto) + ') que te dieron.');
}

/** f[zᵢ,…,zᵢ₊ₖ] = (f[zᵢ₊₁,…,zᵢ₊ₖ] − f[zᵢ,…,zᵢ₊ₖ₋₁]) / (zᵢ₊ₖ − zᵢ) */
function explicarDivision(columna, fila) {
  const { z, columnas } = estado;
  const celda = referenciaACelda(columna, fila);
  const abajo = referenciaACelda(columna - 1, fila + 1);
  const arriba = referenciaACelda(columna - 1, fila);
  const zFinal = fila + columna;
  const valorAbajo = columnas[columna - 1][fila + 1];
  const valorArriba = columnas[columna - 1][fila];
  const diferenciaDeZ = z[zFinal] - z[fila];

  const simbolica = fraccion(abajo + ' − ' + arriba, nombreDeZ(zFinal) + ' − ' + nombreDeZ(fila));
  const conValores = fraccion(
    conParentesis(valorAbajo) + ' − ' + conParentesis(valorArriba),
    numeroConSigno(z[zFinal]) + ' − ' + (z[fila] < 0 ? '(' + numeroConSigno(z[fila]) + ')' : z[fila]));
  const resuelta = fraccion(fraccionEnHtml(restar(valorAbajo, valorArriba)), numeroConSigno(diferenciaDeZ));

  return formulaHtml(celda + ' = ' + simbolica) +
    formulaHtml(celda + ' = ' + conValores) +
    formulaHtml(celda + ' = ' + resuelta + ' = ' + fraccionEnHtml(columnas[columna][fila])) +
    notaHtml('Resta la celda de abajo menos la de arriba, de la columna anterior, y divide entre la diferencia de las z de los extremos.');
}

function explicarCelda(campo, fila) {
  const columna = columnaDeCampo(campo);
  let contenido;
  if (columna === 0) contenido = explicarValor(fila);
  else if (usaDerivada(estado.z, columna, fila)) contenido = explicarDerivada(fila);
  else contenido = explicarDivision(columna, fila);

  document.getElementById('explainBox').innerHTML =
    '<span class="tag">Celda ' + nombreDeCelda(columna, fila) + '</span>' + contenido;
}
