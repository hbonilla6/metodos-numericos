/* ==========================================================================
   Cálculo de sistemas 3×3 con Jacobi y Gauss-Seidel.
   Aquí no hay nada de pantalla: solo matemáticas.

   Vocabulario:
     A, b           sistema original (coeficientes y términos independientes)
     orden          orden[v] = ecuación original que queda en la fila v
     diagonal       el coeficiente de la variable v en la fila v
   ========================================================================== */

const TAMANO = 3;                               // 3 ecuaciones con x, y, z
const NOMBRES_VARIABLES = ['x', 'y', 'z'];
const TOLERANCIA = new Decimal('1e-7');
const MAX_ITERACIONES = 150;                    // tope mientras los valores sigan acercándose
const ITERACION_DE_CONTROL = 15;                // en la 15 se revisa si los valores se acercan; si no, nos rendimos
const ITERACIONES_ATRAS_EN_EL_CONTROL = 9;      // el error de la 15 se compara con el de la 6: así las oscilaciones no engañan
const VALOR_DESBORDADO = '1e15';                // más allá de esto se considera que diverge

const ESTADO = { CONVERGIO: 'convergio', DIVERGE: 'diverge', MAXIMO: 'maximo', ERROR: 'error' };

// ---------- Orden de las ecuaciones ----------

function permutacionesDe(cantidad) {
  const indices = Array.from({ length: cantidad }, (_, i) => i);
  const resultado = [];

  function construir(actual, restantes) {
    if (restantes.length === 0) { resultado.push(actual); return; }
    restantes.forEach((elegido, posicion) => {
      const sinElegido = restantes.slice(0, posicion).concat(restantes.slice(posicion + 1));
      construir(actual.concat([elegido]), sinElegido);
    });
  }

  construir([], indices);
  return resultado;
}

/**
 * Qué tan dominante queda la diagonal con un orden dado.
 * estricta: en cada fila |diagonal| > suma de |los demás|.
 * puntaje: suma de (|diagonal| − suma de |los demás|); mientras mayor, mejor.
 */
function evaluarDiagonal(A, orden) {
  let estricta = true;
  let puntaje = new Decimal(0);
  orden.forEach((ecuacion, v) => {
    const fila = A[ecuacion];
    const diagonal = fila[v].abs();
    const resto = fila.reduce((suma, coeficiente, j) => j === v ? suma : suma.plus(coeficiente.abs()), new Decimal(0));
    if (diagonal.lessThanOrEqualTo(resto)) estricta = false;
    puntaje = puntaje.plus(diagonal.minus(resto));
  });
  return { estricta, puntaje };
}

/** Todos los órdenes posibles, del mejor al peor: primero los de diagonal estricta, luego por puntaje. */
function ordenesPosibles(A) {
  const candidatos = permutacionesDe(A.length).map(orden => {
    const { estricta, puntaje } = evaluarDiagonal(A, orden);
    return { orden, estricta, puntaje, diagonal: orden.map((ecuacion, v) => A[ecuacion][v].abs()) };
  });

  candidatos.sort((a, b) => {
    if (a.estricta !== b.estricta) return a.estricta ? -1 : 1;
    const porPuntaje = b.puntaje.minus(a.puntaje).toNumber();
    if (porPuntaje !== 0) return porPuntaje;
    // Empate: como a mano, el coeficiente mayor primero en x, luego en y, luego en z
    for (let v = 0; v < a.diagonal.length; v++) {
      const diferencia = b.diagonal[v].minus(a.diagonal[v]).toNumber();
      if (diferencia !== 0) return diferencia;
    }
    return 0;
  });
  return candidatos;
}

/**
 * Orden "de clase": si alguno deja la diagonal estrictamente dominante, ese.
 * Si no, x se queda con la fila de mayor |coeficiente de x|, y con la de mayor |coeficiente de y|
 * entre las que quedan, y z con la última.
 */
function ordenDeClase(A) {
  const mejor = ordenesPosibles(A)[0];
  if (mejor.estricta) return mejor.orden;

  const usadas = new Set();
  const orden = [];
  for (let v = 0; v < A.length; v++) {
    let elegida = -1;
    for (let ecuacion = 0; ecuacion < A.length; ecuacion++) {
      if (usadas.has(ecuacion)) continue;
      if (elegida < 0 || A[ecuacion][v].abs().greaterThan(A[elegida][v].abs())) elegida = ecuacion;
    }
    orden.push(elegida);
    usadas.add(elegida);
  }
  return orden;
}

// ---------- Iteraciones ----------

/**
 * Un paso de iteración. Con valores nuevos (Gauss-Seidel) cada variable usa de inmediato
 * lo ya calculado en este paso; sin ellos (Jacobi) usa solo los valores del paso anterior.
 */
function calcularPaso(A, b, anteriores, usarValoresNuevos) {
  const nuevos = anteriores.slice();
  const fuente = usarValoresNuevos ? nuevos : anteriores;
  for (let i = 0; i < A.length; i++) {
    let suma = b[i];
    for (let j = 0; j < A.length; j++) {
      if (j !== i) suma = suma.minus(A[i][j].times(fuente[j]));
    }
    nuevos[i] = suma.dividedBy(A[i][i]);
  }
  return nuevos;
}

/** Mayor diferencia, en valor absoluto, entre dos vectores. */
function normaInfinito(a, b) {
  let mayor = new Decimal(0);
  a.forEach((valor, i) => {
    const diferencia = valor.minus(b[i]).abs();
    if (diferencia.greaterThan(mayor)) mayor = diferencia;
  });
  return mayor;
}

/**
 * Corre un método con un orden de ecuaciones y devuelve las filas de la tabla:
 *   { filas: [{ iteracion, x, error, diverge }], estado, sinAcercarse, iteracionDeControl, coeficientes, independientes }
 * Se detiene al llegar a la tolerancia, al desbordarse, o si en la iteración de control (la 15) el error
 * no ha bajado respecto al de 9 iteraciones antes. Si llega al tope sin converger, hace una última revisión:
 * si el error tampoco bajó en el último tercio de iteraciones, el sistema diverge (despacio).
 */
function correrMetodo(metodo, A, b, orden, tolerancia, maxIteraciones) {
  const coeficientes = orden.map(i => A[i]);
  const independientes = orden.map(i => b[i]);
  const usarValoresNuevos = metodo === 'gauss';
  const resultado = (filas, estado, extra) => Object.assign({ filas, estado, coeficientes, independientes }, extra);

  let x = Array.from({ length: A.length }, () => new Decimal(0));
  const filas = [];

  for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
    let nuevo;
    try {
      nuevo = calcularPaso(coeficientes, independientes, x, usarValoresNuevos);
    } catch (e) {
      return resultado(filas, ESTADO.ERROR);
    }

    const seDesbordo = nuevo.some(valor => !valor.isFinite() || valor.abs().greaterThan(VALOR_DESBORDADO));
    if (seDesbordo) {
      filas.push({ iteracion, x: nuevo, error: null, diverge: true });
      return resultado(filas, ESTADO.DIVERGE);
    }

    const error = normaInfinito(nuevo, x);
    filas.push({ iteracion, x: nuevo, error, diverge: false });
    x = nuevo;

    if (error.lessThan(tolerancia)) return resultado(filas, ESTADO.CONVERGIO);

    if (iteracion === ITERACION_DE_CONTROL) {
      const errorDeReferencia = filas[iteracion - 1 - ITERACIONES_ATRAS_EN_EL_CONTROL].error;
      const noBaja = errorDeReferencia !== null && !error.lessThan(errorDeReferencia);
      if (noBaja) return resultado(filas, ESTADO.DIVERGE, { sinAcercarse: true, iteracionDeControl: iteracion });
    }
  }

  // Tope alcanzado: ¿el error sigue bajando o el sistema se aleja despacio?
  const atras = Math.max(1, Math.floor(filas.length / 3));
  const errorDeReferencia = filas[filas.length - 1 - atras].error;
  const errorFinal = filas[filas.length - 1].error;
  const seAleja = filas.length > ITERACION_DE_CONTROL && errorDeReferencia !== null && !errorFinal.lessThan(errorDeReferencia);
  if (seAleja) return resultado(filas, ESTADO.DIVERGE, { sinAcercarse: true, iteracionDeControl: filas.length });
  return resultado(filas, ESTADO.MAXIMO);
}

// ---------- Elegir el orden con el que se trabaja ----------

/** Qué tan cerca de funcionar quedó un intento que no convergió (mayor es mejor). */
function calidadSinConvergencia(resultado) {
  if (resultado.estado === ESTADO.MAXIMO) {
    const ultima = resultado.filas[resultado.filas.length - 1];
    const error = ultima.error ? ultima.error.toNumber() : Infinity;
    return 1e6 - Math.min(error, 1e6 - 1);
  }
  if (resultado.estado === ESTADO.DIVERGE) return -1e6;
  return -2e6;
}

function convergio(resultado) { return resultado.estado === ESTADO.CONVERGIO; }

/**
 * Busca un orden de ecuaciones con el que converjan los dos métodos (o al menos uno).
 * Si ninguno converge con ningún orden, devuelve el intento que más se acercó.
 */
function buscarOrdenQueConverge(A, b) {
  let mejorConvergente = null;
  let mejorIntento = null;
  let calidadDelMejorIntento = -Infinity;

  for (const candidato of ordenesPosibles(A)) {
    const jacobi = correrMetodo('jacobi', A, b, candidato.orden, TOLERANCIA, MAX_ITERACIONES);
    const gauss = correrMetodo('gauss', A, b, candidato.orden, TOLERANCIA, MAX_ITERACIONES);
    const intento = { orden: candidato.orden, estricta: candidato.estricta, jacobi, gauss };
    const metodosQueConvergen = (convergio(jacobi) ? 1 : 0) + (convergio(gauss) ? 1 : 0);

    if (metodosQueConvergen === 2) return intento;

    if (metodosQueConvergen === 1) {
      if (!mejorConvergente) mejorConvergente = intento;
    } else {
      const calidad = Math.max(calidadSinConvergencia(jacobi), calidadSinConvergencia(gauss));
      if (calidad > calidadDelMejorIntento) {
        calidadDelMejorIntento = calidad;
        mejorIntento = intento;
      }
    }
  }
  return mejorConvergente || mejorIntento;
}

/**
 * Resuelve con el orden de clase. Si con él ningún método converge, busca otro orden que sí
 * funcione y lo guarda como `alternativo` (el usuario puede activarlo con un botón).
 * Devuelve { orden, estricta, jacobi, gauss, alternativo, esAlternativo, ordenDeClase }.
 */
function resolverSistema(A, b, usarOrdenAlternativo) {
  const orden = ordenDeClase(A);
  const deClase = {
    orden,
    estricta: evaluarDiagonal(A, orden).estricta,
    jacobi: correrMetodo('jacobi', A, b, orden, TOLERANCIA, MAX_ITERACIONES),
    gauss: correrMetodo('gauss', A, b, orden, TOLERANCIA, MAX_ITERACIONES),
    alternativo: null,
    esAlternativo: false,
    ordenDeClase: orden,
  };

  if (convergio(deClase.jacobi) || convergio(deClase.gauss)) return deClase;

  const otro = buscarOrdenQueConverge(A, b);
  const sirveOtroOrden = otro && otro.orden.join() !== orden.join() && (convergio(otro.jacobi) || convergio(otro.gauss));
  if (!sirveOtroOrden) return deClase;

  deClase.alternativo = otro;
  if (!usarOrdenAlternativo) return deClase;

  return Object.assign(otro, { alternativo: otro, esAlternativo: true, ordenDeClase: orden });
}

// ---------- Validación del sistema ----------

function determinante3x3(A) {
  const [[a, b, c], [d, e, f], [g, h, i]] = A;
  return a.times(e.times(i).minus(f.times(h)))
    .minus(b.times(d.times(i).minus(f.times(g))))
    .plus(c.times(d.times(h).minus(e.times(g))));
}

/**
 * El determinante se compara con la escala de los coeficientes (el mayor, al cubo), para no confundir
 * "números chicos" con "singular": 0.001·I no es singular aunque su determinante valga 10⁻⁹.
 */
function esSingular(A) {
  let mayorEntrada = new Decimal(0);
  A.forEach(fila => fila.forEach(valor => {
    if (valor.abs().greaterThan(mayorEntrada)) mayorEntrada = valor.abs();
  }));
  if (mayorEntrada.isZero()) return true;
  return determinante3x3(A).abs().dividedBy(mayorEntrada.pow(TAMANO)).lessThan('1e-8');
}
