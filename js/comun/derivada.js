/* ==========================================================================
   Álgebra simbólica sobre el árbol de la expresión:
   simplificar y derivar (para Newton-Raphson).
   ========================================================================== */

/** Si `constante` es un número y `producto` es (algo · número), junta los dos números: 2·(3·x) → 6·x. */
function combinarConstantes(constante, producto) {
  if (producto.tipo !== 'binario' || producto.op !== '*') return null;
  const factores = [
    { numero: producto.izquierda, otro: producto.derecha },
    { numero: producto.derecha, otro: producto.izquierda },
  ];
  for (const { numero, otro } of factores) {
    if (numero.tipo !== 'numero') continue;
    const unidos = nodoDesdeDecimal(new Decimal(constante.valor).times(numero.valor));
    return simplificar(nodoBinario('*', unidos, otro));
  }
  return null;
}

function operarNumeros(op, a, b) {
  switch (op) {
    case '+': return a.plus(b);
    case '-': return a.minus(b);
    case '*': return a.times(b);
    case '/': return a.dividedBy(b);
    case '^': return a.pow(b);
  }
}

function simplificarNegativo(nodo) {
  const argumento = simplificar(nodo.argumento);
  if (argumento.tipo === 'numero') return nodoDesdeDecimal(new Decimal(argumento.valor).negated());
  if (argumento.tipo === 'negativo') return argumento.argumento;
  if (argumento.tipo === 'binario' && (argumento.op === '+' || argumento.op === '-')) {
    const opContrario = argumento.op === '+' ? '-' : '+';
    return simplificar(nodoBinario(opContrario, nodoNegativo(argumento.izquierda), argumento.derecha));
  }
  return nodoNegativo(argumento);
}

function simplificarBinario(nodo) {
  const izquierda = simplificar(nodo.izquierda);
  const derecha = simplificar(nodo.derecha);
  const op = nodo.op;

  if (izquierda.tipo === 'numero' && derecha.tipo === 'numero') {
    return nodoDesdeDecimal(operarNumeros(op, new Decimal(izquierda.valor), new Decimal(derecha.valor)));
  }

  if (op === '+') {
    if (esNumero(izquierda, 0)) return derecha;
    if (esNumero(derecha, 0)) return izquierda;
  }
  if (op === '-') {
    if (esNumero(derecha, 0)) return izquierda;
    if (esNumero(izquierda, 0)) return simplificar(nodoNegativo(derecha));
  }
  if (op === '*') {
    if (esNumero(izquierda, 0) || esNumero(derecha, 0)) return nodoDesdeNumero(0);
    if (esNumero(izquierda, 1)) return derecha;
    if (esNumero(derecha, 1)) return izquierda;
    const unido = (izquierda.tipo === 'numero' && combinarConstantes(izquierda, derecha)) ||
                  (derecha.tipo === 'numero' && combinarConstantes(derecha, izquierda));
    if (unido) return unido;
  }
  if (op === '/') {
    if (esNumero(izquierda, 0)) return nodoDesdeNumero(0);
    if (esNumero(derecha, 1)) return izquierda;
  }
  if (op === '^') {
    if (esNumero(derecha, 0)) return nodoDesdeNumero(1);
    if (esNumero(derecha, 1)) return izquierda;
  }
  return nodoBinario(op, izquierda, derecha);
}

function simplificarFuncion(nodo) {
  const argumento = simplificar(nodo.argumento);
  if (nodo.nombre === 'ln' && argumento.tipo === 'constante' && argumento.nombre === 'e') return nodoDesdeNumero(1);
  if (nodo.nombre === 'exp' && esNumero(argumento, 0)) return nodoDesdeNumero(1);
  return nodoFuncion(nodo.nombre, argumento);
}

function simplificar(nodo) {
  if (nodo.tipo === 'negativo') return simplificarNegativo(nodo);
  if (nodo.tipo === 'binario') return simplificarBinario(nodo);
  if (nodo.tipo === 'funcion') return simplificarFuncion(nodo);
  return nodo;
}

/** El valor (Decimal) de un exponente que es un número, también si es negativo como en x^-2; null si no lo es. */
function valorDeExponente(nodo) {
  if (nodo.tipo === 'numero') return new Decimal(nodo.valor);
  if (nodo.tipo === 'negativo' && nodo.argumento.tipo === 'numero') return new Decimal(nodo.argumento.valor).negated();
  return null;
}

/** Derivada de una función de un argumento, con la regla de la cadena (la derivada del argumento va primero). */
function derivarFuncionElemental(nodo) {
  const { nombre, argumento } = nodo;
  const interna = derivarArbol(argumento);
  const porLaInterna = factor => simplificar(nodoBinario('*', interna, factor));

  switch (nombre) {
    case 'sqrt': return simplificar(nodoBinario('/', interna, nodoBinario('*', nodoDesdeNumero(2), nodo)));
    case 'exp': return porLaInterna(nodo);
    case 'ln': return simplificar(nodoBinario('/', interna, argumento));
    case 'sin': return porLaInterna(nodoFuncion('cos', argumento));
    case 'cos': return simplificar(nodoNegativo(porLaInterna(nodoFuncion('sin', argumento))));
    case 'tan': return simplificar(nodoBinario('/', interna, nodoBinario('^', nodoFuncion('cos', argumento), nodoDesdeNumero(2))));
  }
  throw new Error('No se pudo derivar esta expresión.');
}

/** Derivada de un árbol respecto de x (suma, producto, cociente, potencias y funciones elementales). */
function derivarArbol(nodo) {
  switch (nodo.tipo) {
    case 'numero': case 'constante': return nodoDesdeNumero(0);
    case 'variable':
      if (nombreDeVariable(nodo) !== 'x') throw new Error('No se pudo derivar esta expresión.');
      return nodoDesdeNumero(1);
    case 'funcion': return derivarFuncionElemental(nodo);
    case 'negativo': return simplificar(nodoNegativo(derivarArbol(nodo.argumento)));
    case 'binario': {
      const { op, izquierda, derecha } = nodo;

      if (op === '+' || op === '-') {
        return simplificar(nodoBinario(op, derivarArbol(izquierda), derivarArbol(derecha)));
      }
      if (op === '*') {
        const primero = simplificar(nodoBinario('*', derivarArbol(izquierda), derecha));
        const segundo = simplificar(nodoBinario('*', izquierda, derivarArbol(derecha)));
        return simplificar(nodoBinario('+', primero, segundo));
      }
      if (op === '/') {
        const primero = simplificar(nodoBinario('*', derivarArbol(izquierda), derecha));
        const segundo = simplificar(nodoBinario('*', izquierda, derivarArbol(derecha)));
        const numerador = simplificar(nodoBinario('-', primero, segundo));
        const denominador = simplificar(nodoBinario('^', derecha, nodoDesdeNumero(2)));
        return simplificar(nodoBinario('/', numerador, denominador));
      }
      if (op === '^') {
        const exponente = valorDeExponente(derecha);
        const baseConstante = izquierda.tipo === 'numero' || izquierda.tipo === 'constante';
        if (exponente === null && baseConstante && contieneVariable(derecha)) {
          // b^v con b constante: b^v · ln(b) · v'
          const logaritmo = simplificar(nodoFuncion('ln', izquierda));
          const conLogaritmo = simplificar(nodoBinario('*', logaritmo, nodo));
          return simplificar(nodoBinario('*', derivarArbol(derecha), conLogaritmo));
        }
        if (exponente === null) throw new Error('EXPONENTE_NO_CONSTANTE');
        const potenciaMenor = simplificar(nodoBinario('^', izquierda, nodoDesdeDecimal(exponente.minus(1))));
        const conReglaDeLaCadena = simplificar(nodoBinario('*', potenciaMenor, derivarArbol(izquierda)));
        return simplificar(nodoBinario('*', nodoDesdeDecimal(exponente), conReglaDeLaCadena));
      }
    }
  }
  throw new Error('No se pudo derivar esta expresión.');
}

function derivarFuncion(funcion) {
  return funcionDesdeArbol(simplificar(derivarArbol(funcion.arbol)));
}

/** Reparte una suma/resta en sus términos, cada uno con su signo (+1 o −1). */
function terminosDeSuma(nodo, signo, terminos) {
  if (nodo.tipo === 'binario' && (nodo.op === '+' || nodo.op === '-')) {
    terminosDeSuma(nodo.izquierda, signo, terminos);
    terminosDeSuma(nodo.derecha, nodo.op === '-' ? -signo : signo, terminos);
  } else if (nodo.tipo === 'negativo') {
    terminosDeSuma(nodo.argumento, -signo, terminos);
  } else {
    terminos.push({ signo, nodo });
  }
}
