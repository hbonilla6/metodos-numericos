/* ==========================================================================
   Cómo se dibujan las fórmulas: de árbol o tokens a HTML con formato matemático
   (fracciones de verdad, raíces, exponentes y signo menos tipográfico).
   ========================================================================== */

const SIMBOLO_EN_PANTALLA = { '+': '+', '-': '−', '*': '·', '/': '÷', '^': '^' };

// ---------- Desde un árbol (se usa para derivadas y g(x), que no tienen tokens propios) ----------

/** ¿El nodo necesita paréntesis según dónde se escribe? ('suelto' = sin nada alrededor que lo exija) */
function necesitaParentesis(nodo, contexto) {
  if (nodo.tipo === 'negativo') return contexto !== 'suelto';
  if (nodo.tipo !== 'binario') return false;

  const esSumaOResta = nodo.op === '+' || nodo.op === '-';
  const esProductoOCociente = nodo.op === '*' || nodo.op === '/';
  if (esSumaOResta) return contexto !== 'suelto';
  return esProductoOCociente && contexto === 'base-de-potencia';
}

function arbolConParentesis(nodo, contexto, dibujarVariable) {
  const html = arbolAHtml(nodo, dibujarVariable);
  return necesitaParentesis(nodo, contexto) ? '(' + html + ')' : html;
}

/** El exponente 1 ÷ n (o su valor decimal, como 0.5) se dibuja como raíz n-ésima en vez de x^0.3333… */
function exponenteComoRaiz(derecha) {
  const esCocienteUnoEntreN = derecha.tipo === 'binario' && derecha.op === '/' &&
    derecha.izquierda.tipo === 'numero' && parseFloat(derecha.izquierda.valor) === 1 && derecha.derecha.tipo === 'numero';
  if (esCocienteUnoEntreN) {
    const n = parseFloat(derecha.derecha.valor);
    return Number.isInteger(n) && n >= 2 ? n : null;
  }
  if (derecha.tipo !== 'numero') return null;
  const valor = parseFloat(derecha.valor);
  const grado = valor > 0 && valor < 1 ? 1 / valor : 0;
  const esRaizExacta = grado >= 2 && Math.abs(grado - Math.round(grado)) < 1e-6;
  return esRaizExacta ? Math.round(grado) : null;
}

/** Suma o resta: un número negativo a la derecha se escribe como resta de su valor absoluto. */
function sumaOrestaEnHtml(nodo, dibujarVariable) {
  let { op, derecha } = nodo;
  if (derecha.tipo === 'numero' && parseFloat(derecha.valor) < 0) {
    derecha = nodoDesdeNumero(-parseFloat(derecha.valor));
    op = op === '+' ? '-' : '+';
  } else if (derecha.tipo === 'negativo') {
    derecha = derecha.argumento;
    op = op === '+' ? '-' : '+';
  }
  const contextoDerecha = op === '-' ? 'resta' : 'suelto';
  const simbolo = op === '+' ? ' + ' : ' − ';
  return arbolConParentesis(nodo.izquierda, 'suelto', dibujarVariable) + simbolo +
         arbolConParentesis(derecha, contextoDerecha, dibujarVariable);
}

/** Dibuja un árbol. `dibujarVariable` decide cómo se escribe la x (por defecto, "x"). */
function arbolAHtml(nodo, dibujarVariable) {
  dibujarVariable = dibujarVariable || (() => 'x');

  switch (nodo.tipo) {
    case 'numero': return formatear(new Decimal(nodo.valor));
    case 'variable': return dibujarVariable();
    case 'negativo': return '−' + arbolConParentesis(nodo.argumento, 'negativo', dibujarVariable);
    case 'binario': {
      const { op, izquierda, derecha } = nodo;
      if (op === '^') {
        const gradoDeRaiz = exponenteComoRaiz(derecha);
        if (gradoDeRaiz) return raizEnesima(gradoDeRaiz, arbolAHtml(izquierda, dibujarVariable));
        return arbolConParentesis(izquierda, 'base-de-potencia', dibujarVariable) +
               '<sup>' + arbolAHtml(derecha, dibujarVariable) + '</sup>';
      }
      if (op === '*') {
        return arbolConParentesis(izquierda, 'producto', dibujarVariable) + ' · ' +
               arbolConParentesis(derecha, 'producto', dibujarVariable);
      }
      if (op === '/') {
        return fraccion(arbolAHtml(izquierda, dibujarVariable), arbolAHtml(derecha, dibujarVariable));
      }
      return sumaOrestaEnHtml(nodo, dibujarVariable);
    }
  }
}

/** El árbol con la x sustituida por un valor (entre paréntesis), por ejemplo f'(2) = 3·(2)² − 2. */
function arbolSustituido(arbol, valorHtml) {
  return arbolAHtml(arbol, () => '(' + valorHtml + ')');
}

// ---------- Desde tokens (se usa para f(x) tal como la escribió el usuario) ----------

/**
 * Une los elementos ya dibujados. Cada "/" se vuelve una fracción de verdad:
 * numerador = el operando anterior, denominador = el siguiente.
 * Cada elemento es una unidad (número, variable o paréntesis) o un operador.
 */
function unirElementos(elementos) {
  const resultado = [];

  for (let k = 0; k < elementos.length; k++) {
    const elemento = elementos[k];
    const esDivision = elemento.esOperador && elemento.simbolo === '/' && !elemento.esUnario;
    const hayNumerador = resultado.length && resultado[resultado.length - 1].esUnidad;

    if (!esDivision || !hayNumerador) {
      resultado.push(elemento);
      continue;
    }

    const numerador = resultado.pop();
    let posicionDenominador = k + 1;
    let denominadorNegativo = false;
    const siguiente = elementos[posicionDenominador];
    if (siguiente && siguiente.esOperador && siguiente.esUnario && siguiente.simbolo === '-') {
      denominadorNegativo = true;
      posicionDenominador++;
    }

    const denominador = elementos[posicionDenominador];
    if (!denominador || !denominador.esUnidad) {
      // División sin denominador (se está escribiendo todavía): se deja como ÷
      resultado.push(numerador, { esOperador: true, html: ' ÷ ' });
      continue;
    }

    // Dentro de una fracción sobran los paréntesis que rodean al numerador o al denominador
    const numeradorHtml = numerador.interior !== undefined ? numerador.interior : numerador.html;
    let denominadorHtml = denominador.interior !== undefined ? denominador.interior : denominador.html;
    if (denominadorNegativo) denominadorHtml = '−' + denominadorHtml;

    resultado.push({ esUnidad: true, html: fraccion(numeradorHtml, denominadorHtml) });
    k = posicionDenominador;
  }
  return resultado.map(elemento => elemento.html).join('');
}

/**
 * Dibuja la lista de tokens como fórmula en HTML.
 *   dibujarVariable()           cómo se escribe la x
 *   dibujarNumero(valor, indice) cómo se escribe cada número (el índice es su lugar entre los tokens)
 */
function tokensAHtml(tokens, dibujarVariable, dibujarNumero) {

  /** Lee los tokens desde `inicio` hasta cerrar el paréntesis (si `dentroDeParentesis`) o hasta el final. */
  function leerElementos(inicio, dentroDeParentesis) {
    const elementos = [];
    let i = inicio;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.tipo === ')') {
        if (dentroDeParentesis) break;
        i++;
        continue;
      }
      if (token.tipo === '(') {
        const dentro = leerElementos(i + 1, true);
        const interior = unirElementos(dentro.elementos);
        elementos.push({ esUnidad: true, html: '(' + interior + ')', interior });
        i = dentro.siguiente + 1;
        continue;
      }
      if (token.tipo === 'VARIABLE') { elementos.push({ esUnidad: true, html: dibujarVariable() }); i++; continue; }
      if (token.tipo === 'NUMERO') { elementos.push({ esUnidad: true, html: dibujarNumero(token.valor, i) }); i++; continue; }

      if (token.tipo === '^') {
        i++;
        let exponente = '';
        if (tokens[i] && tokens[i].tipo === '-') { exponente += '−'; i++; }
        if (tokens[i] && tokens[i].tipo === 'NUMERO') {
          exponente += dibujarNumero(tokens[i].valor, i);
          i++;
        } else if (tokens[i] && tokens[i].tipo === '(') {
          const dentro = leerElementos(i + 1, true);
          exponente += unirElementos(dentro.elementos);
          i = dentro.siguiente + 1;
        }
        const ultimo = elementos[elementos.length - 1];
        if (exponente && ultimo && ultimo.esUnidad) {
          ultimo.html += '<sup>' + exponente + '</sup>';
          delete ultimo.interior; // con exponente, los paréntesis ya no sobran
        } else {
          elementos.push({ esOperador: true, html: exponente ? '<sup>' + exponente + '</sup>' : '^' });
        }
        continue;
      }

      const anterior = elementos[elementos.length - 1];
      const esUnario = (token.tipo === '-' || token.tipo === '+') && (!anterior || anterior.esOperador);
      const simbolo = SIMBOLO_EN_PANTALLA[token.tipo];
      elementos.push({
        esOperador: true,
        simbolo: token.tipo,
        esUnario,
        html: esUnario ? simbolo : ' ' + simbolo + ' ',
      });
      i++;
    }
    return { elementos, siguiente: i };
  }

  return unirElementos(leerElementos(0, false).elementos).replace(/\s+/g, ' ').trim();
}

/** f(x) con la x sustituida por un valor; cada número de la fórmula enlaza a su lugar en el campo f(x). */
function tokensSustituidos(tokens, valorHtml) {
  return tokensAHtml(tokens, () => '(' + valorHtml + ')', (valor, indice) => enlaceACampo('fx', valor, indice));
}

/** Muestra una fórmula en un panel; cada número queda marcado para poder señalarlo desde las explicaciones. */
function mostrarFormulaEnPanel(tokens, prefijo, idDelPanel) {
  const cuerpo = tokensAHtml(tokens, () => 'x',
    (valor, indice) => '<span class="fx-token" id="fx-tok-' + indice + '">' + valor + '</span>');
  const panel = document.getElementById(idDelPanel);
  if (panel) panel.innerHTML = prefijo + cuerpo;
}
