/* ==========================================================================
   Expresiones escritas por el usuario: de texto a función evaluable.

   Texto → tokens → árbol (AST) → función.
   El árbol tiene siete tipos de nodo:
     { tipo: 'numero', valor: '3.5' }
     { tipo: 'variable' }                         (x; la y lleva nombre: 'y')
     { tipo: 'constante', nombre: 'e' | 'pi' }
     { tipo: 'negativo', argumento }
     { tipo: 'binario', op: '+' | '-' | '*' | '/' | '^', izquierda, derecha }
     { tipo: 'funcion', nombre: 'sqrt' | 'exp' | 'sin' | 'cos' | 'tan' | 'ln', argumento }
   ========================================================================== */

const FUNCIONES = ['sqrt', 'exp', 'sin', 'cos', 'tan', 'ln'];
const ALIAS_DE_FUNCIONES = { sen: 'sin' };
const CONSTANTES = ['e', 'pi'];

const nodoNumero = valor => ({ tipo: 'numero', valor });
/** La x no lleva nombre; cualquier otra variable (la y de las ecuaciones diferenciales) sí. */
const nodoVariable = nombre => (nombre && nombre !== 'x' ? { tipo: 'variable', nombre } : { tipo: 'variable' });
const nombreDeVariable = nodo => nodo.nombre || 'x';
const nodoConstante = nombre => ({ tipo: 'constante', nombre });
const nodoNegativo = argumento => ({ tipo: 'negativo', argumento });
const nodoBinario = (op, izquierda, derecha) => ({ tipo: 'binario', op, izquierda, derecha });
const nodoFuncion = (nombre, argumento) => ({ tipo: 'funcion', nombre, argumento });

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

/** ¿El árbol usa la variable x? */
function contieneVariable(nodo) {
  switch (nodo.tipo) {
    case 'variable': return nombreDeVariable(nodo) === 'x';
    case 'negativo': case 'funcion': return contieneVariable(nodo.argumento);
    case 'binario': return contieneVariable(nodo.izquierda) || contieneVariable(nodo.derecha);
    default: return false;
  }
}

/** Nombre que empieza en `posicion` (función, constante o variable permitida), el más largo posible; null si no hay. */
function nombreEnPosicion(texto, posicion, variables) {
  const candidatos = [
    ...FUNCIONES.map(nombre => ({ nombre, tipo: 'FUNCION', escrito: nombre })),
    ...Object.keys(ALIAS_DE_FUNCIONES).map(escrito => ({ nombre: ALIAS_DE_FUNCIONES[escrito], tipo: 'FUNCION', escrito })),
    ...CONSTANTES.map(nombre => ({ nombre, tipo: 'CONSTANTE', escrito: nombre })),
    ...variables.map(nombre => ({ nombre, tipo: 'VARIABLE', escrito: nombre })),
  ];
  const resto = texto.slice(posicion).toLowerCase();
  return candidatos
    .filter(candidato => resto.startsWith(candidato.escrito))
    .sort((a, b) => b.escrito.length - a.escrito.length)[0] || null;
}

const TERMINA_UNIDAD = ['NUMERO', 'VARIABLE', 'CONSTANTE', ')'];
const EMPIEZA_UNIDAD = ['NUMERO', 'VARIABLE', 'CONSTANTE', 'FUNCION', '('];

/** Inserta el "·" implícito entre unidades pegadas: 2x, x(x+1), (x+1)(x−1), 2sin(x), xy. */
function conProductosImplicitos(tokens) {
  const resultado = [];
  tokens.forEach(token => {
    const anterior = resultado[resultado.length - 1];
    const sonDosNumeros = anterior && anterior.tipo === 'NUMERO' && token.tipo === 'NUMERO';
    if (anterior && !sonDosNumeros && TERMINA_UNIDAD.includes(anterior.tipo) && EMPIEZA_UNIDAD.includes(token.tipo)) {
      resultado.push({ tipo: '*' });
    }
    resultado.push(token);
  });
  return resultado;
}

/**
 * Parte el texto en tokens: { tipo: 'NUMERO', valor }, { tipo: 'VARIABLE', nombre }, { tipo: 'CONSTANTE', nombre },
 * { tipo: 'FUNCION', nombre } o un operador/paréntesis. Las multiplicaciones implícitas ya vienen como "*".
 * `variables` son las letras permitidas como incógnita (por defecto solo x).
 */
function tokenizar(texto, variables = ['x']) {
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
    if (/[a-zA-Z]/.test(caracter)) {
      const encontrado = nombreEnPosicion(texto, i, variables);
      if (!encontrado) throw new Error('Carácter no reconocido: ' + caracter);
      tokens.push({ tipo: encontrado.tipo, nombre: encontrado.nombre });
      i += encontrado.escrito.length;
      continue;
    }
    if ('+-*/^()'.includes(caracter)) { tokens.push({ tipo: caracter }); i++; continue; }

    throw new Error('Carácter no reconocido: ' + caracter);
  }
  return conProductosImplicitos(tokens);
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
    if (token.tipo === 'VARIABLE') { consumir('VARIABLE'); return nodoVariable(token.nombre); }
    if (token.tipo === 'CONSTANTE') { consumir('CONSTANTE'); return nodoConstante(token.nombre); }
    if (token.tipo === 'FUNCION') {
      consumir('FUNCION');
      consumir('(');
      const argumento = leerSuma();
      consumir(')');
      return nodoFuncion(token.nombre, argumento);
    }
    if (token.tipo === '(') { consumir('('); const dentro = leerSuma(); consumir(')'); return dentro; }
    if (token.tipo === '-') { consumir('-'); return nodoNegativo(leerBasico()); }
    throw new Error('Token inesperado: ' + token.tipo);
  }

  const arbol = leerSuma();
  if (posicion !== tokens.length) throw new Error('Expresión mal formada');
  return arbol;
}

function evaluarConstante(nombre) {
  return nombre === 'e' ? Decimal.exp(1) : Decimal.acos(-1);
}

function evaluarFuncion(nombre, valor) {
  switch (nombre) {
    case 'sqrt': return valor.sqrt();
    case 'exp': return valor.exp();
    case 'sin': return valor.sin();
    case 'cos': return valor.cos();
    case 'tan': return valor.tan();
    case 'ln': return valor.ln();
  }
  throw new Error('Función no soportada: ' + nombre);
}

/** Valor del árbol con x (y, si la expresión la usa) dados como Decimal. */
function evaluarArbol(nodo, x, y) {
  switch (nodo.tipo) {
    case 'numero': return new Decimal(nodo.valor);
    case 'variable': {
      const valor = nombreDeVariable(nodo) === 'y' ? y : x;
      if (valor === undefined) throw new Error('La variable ' + nombreDeVariable(nodo) + ' no tiene valor');
      return valor;
    }
    case 'constante': return evaluarConstante(nodo.nombre);
    case 'negativo': return evaluarArbol(nodo.argumento, x, y).negated();
    case 'funcion': return evaluarFuncion(nodo.nombre, evaluarArbol(nodo.argumento, x, y));
    case 'binario': {
      const izquierda = evaluarArbol(nodo.izquierda, x, y);
      const derecha = evaluarArbol(nodo.derecha, x, y);
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

const aDecimal = valor => (valor instanceof Decimal ? valor : new Decimal(valor));

/** Función que evalúa el árbol en cualquier número (Decimal o texto). Guarda el árbol en .arbol. */
function funcionDesdeArbol(arbol) {
  const funcion = (valor, valorY) => evaluarArbol(arbol, aDecimal(valor), valorY === undefined ? undefined : aDecimal(valorY));
  funcion.arbol = arbol;
  return funcion;
}

/**
 * Función a partir del texto escrito. Guarda también .tokens para mostrar la fórmula con sus símbolos.
 * Con variables = ['x', 'y'] la función recibe (x, y).
 */
function construirFuncion(texto, variables = ['x']) {
  const tokens = tokenizar(texto.trim(), variables);
  const funcion = funcionDesdeArbol(construirArbol(tokens));
  funcion.tokens = tokens;
  return funcion;
}

/** Valor numérico de un texto sin variables (3, 1/2, 0.5, pi/2, sqrt(2)). Lanza error si no es un número. */
function leerNumero(texto) {
  const escrito = String(texto).trim().replace(',', '.');
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(escrito)) return new Decimal(escrito);
  const tokens = tokenizar(escrito, []);
  const valor = evaluarArbol(construirArbol(tokens));
  if (!valor.isFinite()) throw new Error('El valor no es un número finito');
  return valor;
}
