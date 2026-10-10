/* ==========================================================================
   Gráfica de la tabla de raíces: la curva y cómo se acerca cada método a la raíz.
     Bisección          puntos sobre la curva en cada punto medio
     Regla falsa        cuerdas entre (a, f(a)) y (b, f(b))
     Secante            rectas que cruzan el eje x en cada nueva aproximación
     Newton-Raphson     tangentes que bajan hasta el eje x
     Punto fijo         g(x) contra y = x, con la "escalera" de las iteraciones
   ========================================================================== */

const FILAS_CON_TRAZO = 6;      // cuántas iteraciones llevan segmentos y número
const ANCHO_MINIMO_DEL_ZOOM = 1.5; // si las aproximaciones caen muy juntas, se muestra la curva alrededor
const FILAS_PARA_EL_RANGO = 12; // cuántas se usan para decidir el zoom (las divergentes no deben estirarlo)

function comoNumero(valor) { return valor === null || valor === undefined ? null : valor.toNumber(); }

function funcionNumerica(f) { return x => f(new Decimal(x)).toNumber(); }

/** Puntos, segmentos y curvas de cada método. Devuelve las opciones para dibujarGrafica (sin el rango). */
function elementosDelMetodo(filas, raiz) {
  const puntos = [];
  const segmentos = [];
  const f = estado.funcion;
  const primera = filas[0];
  const conTrazo = filas.slice(0, FILAS_CON_TRAZO).filter(fila => !fila.divergio);

  if (estado.metodo === 'puntofijo') {
    // Escalera: de (x, x) sube hasta g(x) y avanza hasta la recta y = x
    conTrazo.forEach(fila => {
      const x = fila.a.toNumber();
      const gx = fila.fa.toNumber();
      segmentos.push({ x1: x, y1: x, x2: x, y2: gx, color: 'var(--red)' });
      segmentos.push({ x1: x, y1: gx, x2: gx, y2: gx, color: 'var(--red)' });
    });
    puntos.push({ x: primera.a.toNumber(), y: primera.a.toNumber(), color: 'var(--gold)', etiqueta: 'x₀' });
    if (raiz !== null) puntos.push({ x: raiz, y: raiz, color: 'var(--green)', radio: 5.5, etiqueta: 'r ≈ ' + textoDeMarca(raiz) });
    return { puntos, segmentos };
  }

  // Los demás métodos: puntos de partida y una marca por iteración sobre la curva
  const salida = {
    bisec: [['a', 'fa', 'a'], ['b', 'fb', 'b']],
    falsa: [['a', 'fa', 'a'], ['b', 'fb', 'b']],
    secante: [['a', 'fa', 'x₀'], ['b', 'fb', 'x₁']],
    newton: [['a', 'fa', 'x₀']],
  }[estado.metodo];
  salida.forEach(([campoX, campoY, etiqueta]) => {
    puntos.push({ x: primera[campoX].toNumber(), y: primera[campoY].toNumber(), color: 'var(--ink-soft)', etiqueta });
  });

  filas.filter(fila => !fila.divergio).forEach((fila, i) => {
    const dibujarNumero = i < FILAS_CON_TRAZO;
    puntos.push({
      x: fila.xi.toNumber(), y: fila.fxi.toNumber(), color: 'var(--gold)', radio: 3.8,
      etiqueta: dibujarNumero ? String(fila.iteracion) : undefined,
      titulo: 'Iteración ' + fila.iteracion + ': xᵢ = ' + formatear(fila.xi),
    });
  });

  conTrazo.forEach(fila => {
    const xi = fila.xi.toNumber();
    if (estado.metodo === 'newton' || estado.metodo === 'secante') {
      segmentos.push({ x1: fila.a.toNumber(), y1: fila.fa.toNumber(), x2: xi, y2: 0, color: 'var(--red)' });
    } else if (estado.metodo === 'falsa') {
      segmentos.push({ x1: fila.a.toNumber(), y1: fila.fa.toNumber(), x2: fila.b.toNumber(), y2: fila.fb.toNumber(), color: 'var(--red)', discontinuo: true });
    } else {
      segmentos.push({ x1: xi, y1: 0, x2: xi, y2: fila.fxi.toNumber(), color: 'var(--muted)', discontinuo: true });
    }
  });

  if (raiz !== null) puntos.push({ x: raiz, y: 0, color: 'var(--green)', radio: 5.5, etiqueta: 'r ≈ ' + textoDeMarca(raiz) });
  return { puntos, segmentos };
}

function leyendaDelMetodo() {
  const curva = estado.metodo === 'puntofijo'
    ? [{ color: 'var(--ink)', texto: 'g(x)' }, { color: 'var(--muted)', texto: 'y = x' }]
    : [{ color: 'var(--ink)', texto: 'f(x)' }];
  const rastro = {
    bisec: [{ color: 'var(--gold)', texto: 'punto medio de cada iteración' }],
    falsa: [{ color: 'var(--gold)', texto: 'xᵢ de cada iteración' }, { color: 'var(--red)', texto: 'cuerdas entre (a, f(a)) y (b, f(b))' }],
    secante: [{ color: 'var(--gold)', texto: 'xᵢ de cada iteración' }, { color: 'var(--red)', texto: 'rectas secantes' }],
    newton: [{ color: 'var(--gold)', texto: 'xᵢ₊₁ de cada iteración' }, { color: 'var(--red)', texto: 'tangentes' }],
    puntofijo: [{ color: 'var(--red)', texto: 'escalera de las iteraciones' }],
  }[estado.metodo];
  return curva.concat(rastro, [{ color: 'var(--green)', texto: 'raíz' }]);
}

/** Dibuja la gráfica del método actual con las filas que hay en la tabla. */
function graficarRaiz(tolerancia) {
  const tarjeta = document.getElementById('graficaCard');
  const filas = estado.filas;
  const utiles = filas.filter(fila => !fila.divergio);
  if (!utiles.length) { tarjeta.style.display = 'none'; return; }

  const raiz = llegoALaTolerancia(filas, tolerancia) ? comoNumero(filas[filas.length - 1].xi) : null;
  const esPuntoFijo = estado.metodo === 'puntofijo';

  // Zoom: las primeras aproximaciones, los extremos iniciales y la raíz
  const abscisas = [];
  filas.slice(0, FILAS_PARA_EL_RANGO).filter(fila => !fila.divergio).forEach(fila => {
    abscisas.push(fila.a.toNumber(), fila.xi.toNumber());
    if (fila.b !== null && !esPuntoFijo && estado.metodo !== 'newton') abscisas.push(fila.b.toNumber());
    if (esPuntoFijo) abscisas.push(fila.fa.toNumber());
  });
  if (raiz !== null) abscisas.push(raiz);
  const [xMin, xMax] = rangoConMargen(abscisas, 0.25, ANCHO_MINIMO_DEL_ZOOM);

  const { puntos, segmentos } = elementosDelMetodo(filas, raiz);
  const curvas = esPuntoFijo
    ? [{ f: funcionNumerica(estado.funcionG), color: 'var(--ink)' }, { f: x => x, color: 'var(--muted)', discontinua: true, grosor: 1.6 }]
    : [{ f: funcionNumerica(estado.funcion), color: 'var(--ink)' }];

  tarjeta.style.display = 'block';
  dibujarGrafica('grafica', { xMin, xMax, curvas, puntos, segmentos, etiquetaX: 'x' });
  dibujarLeyenda('graficaLeyenda', leyendaDelMetodo());
}
