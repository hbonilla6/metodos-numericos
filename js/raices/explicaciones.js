/* ==========================================================================
   Nombres de las celdas y explicación paso a paso de la celda que se toca.
   ========================================================================== */

// ---------- Nombres de celdas según el método ----------

const ETIQUETAS_DE_CELDAS = {
  intervalo: { a: 'a', b: 'b', fa: 'f(a)', fb: 'f(b)', xi: 'xᵢ', fxi: 'f(xᵢ)', error: 'E' },
  secante: { a: 'x₀', b: 'x₁', fa: 'f(x₀)', fb: 'f(x₁)', xi: 'xᵢ', fxi: 'f(xᵢ)', error: 'E' },
  newton: { a: 'xᵢ', b: "f'(xᵢ)", fa: 'f(xᵢ)', fb: 'f(b)', xi: 'xᵢ₊₁', fxi: 'f(xᵢ₊₁)', error: 'E' },
  puntofijo: { a: 'xᵢ', b: 'b', fa: 'g(xᵢ)', fb: 'f(b)', xi: 'xᵢ₊₁', fxi: 'f(xᵢ)', error: 'E' },
};

// Estas etiquetas ya llevan un subíndice propio (x₀, xᵢ₊₁…): el número de fila va como superíndice
const CAMPOS_CON_SUPERINDICE = {
  secante: ['a', 'b', 'fa', 'fb'],
  newton: ['a', 'b', 'fa', 'xi', 'fxi'],
  puntofijo: ['a', 'fa', 'xi'],
};

/** Los métodos de bisección y regla falsa comparten etiquetas ("intervalo"). */
function familiaDeEtiquetas(metodo) {
  return metodo === 'bisec' || metodo === 'falsa' ? 'intervalo' : metodo;
}

function etiquetaDeCampo(campo, metodo = estado.metodo) {
  return ETIQUETAS_DE_CELDAS[familiaDeEtiquetas(metodo)][campo];
}

/** Nombre completo de una celda, por ejemplo "xᵢ₊₁³" o "f(a)₂". */
function nombreDeCelda(campo, idx) {
  const usaSuperindice = (CAMPOS_CON_SUPERINDICE[estado.metodo] || []).includes(campo);
  const numeroDeFila = estado.filas[idx].iteracion;
  return etiquetaDeCampo(campo) + (usaSuperindice ? aSuperindice(numeroDeFila) : aSubindice(numeroDeFila));
}

/** Enlace (con color) a otra celda de la tabla. */
function referenciaACelda(campo, idx) {
  return tablaInteractiva.referencia(campo, idx, nombreDeCelda(campo, idx));
}

// ---------- Piezas de HTML de las explicaciones ----------

const formulaHtml = (contenido, claseExtra) => '<div class="formula' + (claseExtra ? ' ' + claseExtra : '') + '">' + contenido + '</div>';
const notaHtml = contenido => '<p>' + contenido + '</p>';
const vacioHtml = contenido => '<p class="empty">' + contenido + '</p>';

/** Referencias a las celdas de una fila (y a las de la fila anterior) que usan las explicaciones. */
function referenciasDeFila(idx) {
  const fila = estado.filas[idx];
  const hayAnterior = idx > 0;
  return {
    a: referenciaACelda('a', idx),
    b: referenciaACelda('b', idx),
    fa: referenciaACelda('fa', idx),
    fb: referenciaACelda('fb', idx),
    xi: fila.xi !== null ? referenciaACelda('xi', idx) : null,
    fxi: fila.fxi !== null ? referenciaACelda('fxi', idx) : null,
    error: fila.error !== null ? referenciaACelda('error', idx) : null,
    aAnterior: hayAnterior ? referenciaACelda('a', idx - 1) : null,
    bAnterior: hayAnterior ? referenciaACelda('b', idx - 1) : null,
    faAnterior: hayAnterior ? referenciaACelda('fa', idx - 1) : null,
    xiAnterior: hayAnterior ? referenciaACelda('xi', idx - 1) : null,
  };
}

/** "celda = f(valor) = sustitución = resultado", la línea típica de f(x) evaluada. */
function evaluacionDeF(celda, valorHtml, resultado) {
  return formulaHtml(celda + ' = f(' + valorHtml + ') = ' + tokensSustituidos(estado.funcion.tokens, valorHtml) +
    ' = ' + formatear(resultado));
}

// ---------- Bisección, regla falsa y secante ----------

function explicarExtremo(campo, fila, ref, esSecante) {
  const esA = campo === 'a';
  const propio = esA ? ref.a : ref.b;
  const valor = formatear(fila[campo]);
  const inicial = formulaHtml(propio + ' = ' + enlaceACampo(campo, valor));
  const copia = anterior => formulaHtml(propio + ' = ' + anterior + ' = ' + valor);

  if (esSecante) {
    if (fila.cambioPrevio === null) return inicial + notaHtml(esA ? 'x₀ inicial.' : 'x₁ inicial.');
    return esA
      ? copia(ref.bAnterior) + notaHtml('Se desliza: era x₁.')
      : copia(ref.xiAnterior) + notaHtml('Era xᵢ de la fila anterior.');
  }

  if (fila.cambioPrevio === null) return inicial + notaHtml(esA ? 'Extremo izquierdo inicial.' : 'Extremo derecho inicial.');

  const seReemplazo = fila.cambioPrevio === campo;
  if (seReemplazo) return copia(ref.xiAnterior) + notaHtml(esA ? 'Raíz quedó en [xᵢ, b].' : 'Raíz quedó en [a, xᵢ].');
  return copia(esA ? ref.aAnterior : ref.bAnterior) + notaHtml('No cambió.');
}

function explicarNuevoPunto(fila, ref, esSecante) {
  if (fila.divergio) return vacioHtml('Sin xᵢ: ' + ref.fa + ' = ' + ref.fb + ' (división entre cero).');

  const resultado = formatear(fila.xi);
  if (esSecante) {
    const numerador = '(' + ref.b + ' − ' + ref.a + ')·' + ref.fb;
    const denominador = '(' + ref.fb + ' − ' + ref.fa + ')';
    return formulaHtml(ref.xi + ' = ' + ref.b + ' − ' + fraccion(numerador, denominador) + ' = ' + resultado) +
      notaHtml('Recta entre los dos puntos, corta el eje x.');
  }
  if (estado.metodo === 'falsa') {
    const numerador = '(' + ref.a + ' − ' + ref.b + ')·' + ref.fa;
    const denominador = '(' + ref.fb + ' − ' + ref.fa + ')';
    return formulaHtml(ref.xi + ' = ' + ref.a + ' + ' + fraccion(numerador, denominador) + ' = ' + resultado) +
      notaHtml('Cuerda entre (a,f(a)) y (b,f(b)).');
  }
  return formulaHtml(ref.xi + ' = ' + fraccion(ref.a + ' + ' + ref.b, '2') + ' = ' + resultado) +
    notaHtml('Punto medio del intervalo.');
}

function explicarValorEnNuevoPunto(fila, ref, esSecante) {
  if (fila.divergio || fila.fxi === null) return vacioHtml('Sin f(xᵢ): no hubo xᵢ.');

  const evaluacion = evaluacionDeF(ref.fxi, ref.xi, fila.fxi);
  if (esSecante) return evaluacion + notaHtml('Nuevo x₁, sin comparar signos.');

  const signo = fila.producto.lessThan(0) ? 'negativo' : 'positivo';
  const decision = fila.proximoCambio === 'b' ? 'se reemplaza b' : 'se reemplaza a';
  return evaluacion + notaHtml(ref.fa + '·' + ref.fxi + ' es ' + signo + ' → ' + decision + '.');
}

function explicarErrorDeIntervalo(fila, ref, esSecante) {
  if (fila.error === null) return vacioHtml('Sin error todavía.');
  const anterior = esSecante ? ref.b : ref.xiAnterior;
  return formulaHtml(ref.error + ' = |' + ref.xi + ' − ' + anterior + '| = ' + formatear(fila.error));
}

function explicarIntervalo(campo, idx) {
  const fila = estado.filas[idx];
  const ref = referenciasDeFila(idx);
  const esSecante = estado.metodo === 'secante';

  switch (campo) {
    case 'a':
    case 'b': return explicarExtremo(campo, fila, ref, esSecante);
    case 'fa': return evaluacionDeF(ref.fa, ref.a, fila.fa);
    case 'fb': return evaluacionDeF(ref.fb, ref.b, fila.fb);
    case 'xi': return explicarNuevoPunto(fila, ref, esSecante);
    case 'fxi': return explicarValorEnNuevoPunto(fila, ref, esSecante);
    case 'error': return explicarErrorDeIntervalo(fila, ref, esSecante);
  }
  return '';
}

// ---------- Newton-Raphson ----------

function explicarNewton(campo, idx) {
  const fila = estado.filas[idx];
  const ref = referenciasDeFila(idx);

  switch (campo) {
    case 'a':
      if (idx === 0) return formulaHtml(ref.a + ' = ' + enlaceACampo('a', formatear(fila.a))) + notaHtml('x₀ inicial.');
      return formulaHtml(ref.a + ' = ' + ref.xiAnterior + ' = ' + formatear(fila.a)) + notaHtml('Era xᵢ₊₁ anterior.');

    case 'fa':
      return evaluacionDeF(ref.fa, ref.a, fila.fa);

    case 'b': {
      const sustitucion = arbolSustituido(estado.derivada.arbol, formatear(fila.a));
      return formulaHtml(ref.b + " = f'(" + ref.a + ') = ' + sustitucion + ' = ' + formatear(fila.b));
    }

    case 'xi':
      if (fila.divergio) return vacioHtml("Sin xᵢ₊₁: f'(" + ref.a + ') = 0.');
      return formulaHtml(ref.xi + ' = ' + ref.a + ' − ' + fraccion(ref.fa, ref.b) + ' = ' + formatear(fila.xi)) +
        notaHtml('Tangente en ' + ref.a + ', corta el eje x.');

    case 'fxi':
      if (fila.divergio || fila.fxi === null) return vacioHtml('Sin f(xᵢ₊₁).');
      return evaluacionDeF(ref.fxi, ref.xi, fila.fxi);

    case 'error':
      if (fila.error === null) return vacioHtml('Sin error todavía.');
      return formulaHtml(ref.error + ' = |' + ref.xi + ' − ' + ref.a + '| = ' + formatear(fila.error));
  }
  return '';
}

// ---------- Punto fijo ----------

function explicarPuntoFijo(campo, idx) {
  const fila = estado.filas[idx];
  const ref = referenciasDeFila(idx);

  switch (campo) {
    case 'a':
      if (idx === 0) return formulaHtml(ref.a + ' = ' + enlaceACampo('a', formatear(fila.a))) + notaHtml('x₀ inicial.');
      return formulaHtml(ref.a + ' = ' + ref.faAnterior + ' = ' + formatear(fila.a)) + notaHtml('Era g(xᵢ) anterior.');

    case 'fa': {
      if (fila.divergio) return vacioHtml('g(' + ref.a + ') no es finito.');
      const sustitucion = arbolSustituido(estado.funcionG.arbol, formatear(fila.a));
      return formulaHtml(ref.fa + ' = g(' + ref.a + ') = ' + sustitucion + ' = ' + formatear(fila.fa));
    }

    case 'error':
      if (fila.error === null) return vacioHtml('Sin error todavía.');
      return formulaHtml(ref.error + ' = |' + ref.fa + ' − ' + ref.a + '| = ' + formatear(fila.error));
  }
  return '';
}

// ---------- Entrada común ----------

function explicarCelda(campo, idx) {
  const explicar = {
    newton: explicarNewton,
    puntofijo: explicarPuntoFijo,
  }[estado.metodo] || explicarIntervalo;

  document.getElementById('explainBox').innerHTML =
    '<span class="tag">Celda ' + nombreDeCelda(campo, idx) + '</span>' + explicar(campo, idx);
}
