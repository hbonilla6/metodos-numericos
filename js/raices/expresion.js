/* ==========================================================================
   Expresiones escritas por el usuario: de texto a función evaluable.

   Texto → tokens → árbol (AST) → función.
   El árbol tiene cuatro tipos de nodo:
     { tipo: 'numero', valor: '3.5' }
     { tipo: 'variable' }
     { tipo: 'negativo', argumento }
     { tipo: 'binario', op: '+' | '-' | '*' | '/' | '^', izquierda, derecha }
   ========================================================================== */

const nodoNumero = valor => ({ tipo: 'numero', valor });
const nodoVariable = () => ({ tipo: 'variable' });
const nodoNegativo = argumento => ({ tipo: 'negativo', argumento });
const nodoBinario = (op, izquierda, derecha) => ({ tipo: 'binario', op, izquierda, derecha });

/** Escribe un número de JavaScript como texto para un nodo: sin ceros de sobra ni "-0". */
function numeroComoTexto(n) {
  if (Object.is(n, -0)) n = 0;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}
const nodoDesdeNumero = n => nodoNumero(numeroComoTexto(n));
/** Nodo con un Decimal completo (sin recortar a 10 decimales, para que la aritmética siga exacta). */
const nodoDesdeDecimal = d => nodoNumero(d.toString());

function esNumero(nodo, n) { return nodo.tipo === 'numero' && parseFloat(nodo.valor) === n; }

/** Inserta los "·" implícitos: 2x → 2*x, x(x+1) → x*(x+1), (x+1)(x−1) → (x+1)*(x−1). */
function prepararExpresion(texto) {
  let expresion = texto.trim();
  let anterior;
  do {
    anterior = expresion;
    expresion = expresion.replace(/(\d)(x)/gi, '$1*$2');
    expresion = expresion.replace(/(x)(\d)/gi, '$1*$2');
    expresion = expresion.replace(/(x)(x)/gi, '$1*$2');
    expresion = expresion.replace(/(\))(\d|x|\()/gi, '$1*$2');
    expresion = expresion.replace(/(\d)(\()/g, '$1*$2');
    expresion = expresion.replace(/(x)(\()/gi, '$1*$2');
  } while (expresion !== anterior);
  return expresion;
}

/** Parte el texto en tokens: { tipo: 'NUMERO', valor }, { tipo: 'VARIABLE' } o un operador/paréntesis. */
function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  while (i < texto.length) {
    const caracter = texto[i];
    if (/\s/.test(caracter)) { i++; continue; }

    if (/[0-9.]/.test(caracter)) {
      let fin = i;
      while (fin < texto.length && /[0-9.]/.test(texto[fin])) fin++;
      tokens.push({ tipo: 'NUMERO', valor: texto.slice(i, fin) });
      i = fin;
      continue;
    }
    if (caracter.toLowerCase() === 'x') { tokens.push({ tipo: 'VARIABLE' }); i++; continue; }
    if ('+-*/^()'.includes(caracter)) { tokens.push({ tipo: caracter }); i++; continue; }

    throw new Error('Carácter no reconocido: ' + caracter);
  }
  return tokens;
}

/**
 * Convierte los tokens en un árbol respetando la precedencia:
 * suma y resta < producto y cociente < signo negativo < potencia.
 */
function construirArbol(tokens) {
  let posicion = 0;
  const siguiente = () => tokens[posicion];
  const consumir = tipo => {
    const token = tokens[posicion];
    if (!token || token.tipo !== tipo) throw new Error('Se esperaba ' + tipo);
    posicion++;
    return token;
  };

  function leerSuma() {
    let nodo = leerProducto();
    while (siguiente() && (siguiente().tipo === '+' || siguiente().tipo === '-')) {
      const op = consumir(siguiente().tipo).tipo;
      nodo = nodoBinario(op, nodo, leerProducto());
    }
    return nodo;
  }
  function leerProducto() {
    let nodo = leerConSigno();
    while (siguiente() && (siguiente().tipo === '*' || siguiente().tipo === '/')) {
      const op = consumir(siguiente().tipo).tipo;
      nodo = nodoBinario(op, nodo, leerConSigno());
    }
    return nodo;
  }
  function leerConSigno() {
    if (siguiente() && siguiente().tipo === '-') { consumir('-'); return nodoNegativo(leerConSigno()); }
    if (siguiente() && siguiente().tipo === '+') { consumir('+'); return leerConSigno(); }
    return leerPotencia();
  }
  function leerPotencia() {
    const base = leerBasico();
    if (siguiente() && siguiente().tipo === '^') {
      consumir('^');
      return nodoBinario('^', base, leerConSigno());
    }
    return base;
  }
  function leerBasico() {
    const token = siguiente();
    if (!token) throw new Error('Expresión incompleta');
    if (token.tipo === 'NUMERO') { consumir('NUMERO'); return nodoNumero(token.valor); }
    if (token.tipo === 'VARIABLE') { consumir('VARIABLE'); return nodoVariable(); }
    if (token.tipo === '(') { consumir('('); const dentro = leerSuma(); consumir(')'); return dentro; }
    if (token.tipo === '-') { consumir('-'); return nodoNegativo(leerBasico()); }
    throw new Error('Token inesperado: ' + token.tipo);
  }

  const arbol = leerSuma();
  if (posicion !== tokens.length) throw new Error('Expresión mal formada');
  return arbol;
}

function evaluarArbol(nodo, x) {
  switch (nodo.tipo) {
    case 'numero': return new Decimal(nodo.valor);
    case 'variable': return x;
    case 'negativo': return evaluarArbol(nodo.argumento, x).negated();
    case 'binario': {
      const izquierda = evaluarArbol(nodo.izquierda, x);
      const derecha = evaluarArbol(nodo.derecha, x);
      switch (nodo.op) {
        case '+': return izquierda.plus(derecha);
        case '-': return izquierda.minus(derecha);
        case '*': return izquierda.times(derecha);
        case '/': return izquierda.dividedBy(derecha);
        case '^': return izquierda.pow(derecha);
      }
    }
  }
  throw new Error('Nodo no soportado');
}

/** Función que evalúa el árbol en cualquier número (Decimal o texto). Guarda el árbol en .arbol. */
function funcionDesdeArbol(arbol) {
  const funcion = valor => evaluarArbol(arbol, valor instanceof Decimal ? valor : new Decimal(valor));
  funcion.arbol = arbol;
  return funcion;
}

/** Función a partir del texto escrito. Guarda también .tokens para mostrar la fórmula con sus símbolos. */
function construirFuncion(texto) {
  const tokens = tokenizar(prepararExpresion(texto));
  const funcion = funcionDesdeArbol(construirArbol(tokens));
  funcion.tokens = tokens;
  return funcion;
}
