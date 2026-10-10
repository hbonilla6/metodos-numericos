/* ==========================================================================
   Métodos numéricos para encontrar raíces. Cada uno devuelve las filas de su tabla:
   { iteracion, a, b, fa, fb, xi, fxi, error, divergio, … }

   Qué guarda cada columna según el método:
     Bisección / Regla falsa   a, b = extremos del intervalo; xi = nuevo punto
     Secante                   a = x₀, b = x₁; xi = siguiente aproximación
     Newton-Raphson            a = xᵢ, b = f'(xᵢ), fa = f(xᵢ); xi = xᵢ₊₁
     Punto fijo                a = xᵢ, fa = g(xᵢ); xi = xᵢ₊₁
   ========================================================================== */

const MAX_ITERACIONES = 80;

/** Punto donde la recta (cuerda o secante) cruza el eje x, o el punto medio en bisección. */
function calcularNuevoPunto(metodo, a, b, fa, fb) {
  if (metodo === 'falsa' || metodo === 'secante') {
    return a.plus(a.minus(b).times(fa).dividedBy(fb.minus(fa)));
  }
  return a.plus(b).dividedBy(2);
}

/** ¿La última fila llegó a la tolerancia (o cayó justo en una raíz exacta, f(xᵢ) = 0)? */
function llegoALaTolerancia(filas, tolerancia) {
  const ultima = filas[filas.length - 1];
  if (ultima.divergio) return false;
  return ultima.raizExacta === true || (ultima.error !== null && ultima.error.lessThan(tolerancia));
}

function correrSecante(f, x0, x1, tolerancia, maxIteraciones) {
  let a = x0;
  let b = x1;
  const filas = [];

  for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
    const fa = f(a);
    const fb = f(b);
    const cambioPrevio = iteracion === 1 ? null : 'desliza';
    const sinResultado = () => ({
      iteracion, a, b, fa, fb, xi: null, fxi: null, error: null, cambioPrevio, producto: null, divergio: true,
    });

    const denominador = fb.minus(fa);
    if (denominador.isZero() || !denominador.isFinite()) { filas.push(sinResultado()); break; }

    const xi = calcularNuevoPunto('secante', a, b, fa, fb);
    if (!xi.isFinite()) { filas.push(sinResultado()); break; }

    const fxi = f(xi);
    const error = xi.minus(b).abs();
    filas.push({ iteracion, a, b, fa, fb, xi, fxi, error, cambioPrevio, producto: fa.times(fxi) });
    if (error.lessThan(tolerancia)) break;

    a = b;
    b = xi;
  }
  return filas;
}

/** Bisección y regla falsa: encierran la raíz entre a y b y la van acorralando. */
function correrIntervalo(metodo, f, aInicial, bInicial, tolerancia, maxIteraciones) {
  let a = aInicial;
  let b = bInicial;
  let xiAnterior = null;
  let cambioPrevio = null; // qué extremo se reemplazó para llegar a esta fila
  const filas = [];

  for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
    const fa = f(a);
    const fb = f(b);
    const xi = calcularNuevoPunto(metodo, a, b, fa, fb);
    const fxi = f(xi);
    const error = xiAnterior === null ? null : xi.minus(xiAnterior).abs();
    const producto = fa.times(fxi);
    const proximoCambio = producto.lessThan(0) ? 'b' : 'a'; // la raíz queda entre a y xi, o entre xi y b

    const raizExacta = fxi.isZero(); // el punto cayó justo en la raíz: no hay nada más que acorralar
    filas.push({ iteracion, a, b, fa, fb, xi, fxi, error, cambioPrevio, proximoCambio, producto, raizExacta });
    if (raizExacta || (error !== null && error.lessThan(tolerancia))) break;

    if (proximoCambio === 'b') b = xi; else a = xi;
    cambioPrevio = proximoCambio;
    xiAnterior = xi;
  }
  return filas;
}

function correrNewton(f, derivada, x0, tolerancia, maxIteraciones) {
  let x = x0;
  const filas = [];

  for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
    const fx = f(x);
    const pendiente = derivada(x);
    const sinResultado = () => ({
      iteracion, a: x, b: pendiente, fa: fx, fb: null, xi: null, fxi: null, error: null, divergio: true,
    });

    if (pendiente.isZero() || !pendiente.isFinite()) { filas.push(sinResultado()); break; }

    const siguiente = x.minus(fx.dividedBy(pendiente));
    if (!siguiente.isFinite()) { filas.push(sinResultado()); break; }

    const error = siguiente.minus(x).abs();
    filas.push({ iteracion, a: x, b: pendiente, fa: fx, fb: null, xi: siguiente, fxi: f(siguiente), error, divergio: false });
    if (error.lessThan(tolerancia)) break;
    x = siguiente;
  }
  return filas;
}

function correrPuntoFijo(g, x0, tolerancia, maxIteraciones) {
  let x = x0;
  const filas = [];

  for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
    const gx = g(x);
    if (!gx.isFinite()) {
      filas.push({ iteracion, a: x, b: null, fa: gx, fb: null, xi: null, fxi: null, error: null, divergio: true });
      break;
    }
    const error = gx.minus(x).abs();
    filas.push({ iteracion, a: x, b: null, fa: gx, fb: null, xi: gx, fxi: null, error, divergio: false });
    if (error.lessThan(tolerancia)) break;
    x = gx;
  }
  return filas;
}

/** Corre el método pedido (Newton y punto fijo se corren aparte porque necesitan f' o g). */
function correrMetodoDeIntervalo(metodo, f, a, b, tolerancia, maxIteraciones) {
  return metodo === 'secante'
    ? correrSecante(f, a, b, tolerancia, maxIteraciones)
    : correrIntervalo(metodo, f, a, b, tolerancia, maxIteraciones);
}
