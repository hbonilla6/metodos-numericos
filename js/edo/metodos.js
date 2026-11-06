/* ==========================================================================
   Ecuaciones diferenciales y' = f(x, y), con y(x₀) = y₀: métodos de Euler y
   de Heun (Euler mejorado). Matemática pura, con Decimal (40 dígitos).

   Cada método devuelve { h, filas }. Una fila describe un nodo de la tabla:
     i, x, y         el nodo y la aproximación de y(x)
     pendiente       f(xᵢ, yᵢ), o null si f no está definida en ese punto (solo puede pasar en el último nodo)
   Heun agrega yPredicha (yᵢ*) y pendientePredicha = f(xᵢ, yᵢ*).
   ========================================================================== */

const MAXIMO_DE_PASOS = 200;

const textoDelPunto = (x, y) => 'x = ' + formatear(x) + ', y = ' + formatear(y);

/** f(x, y), o un error que dice en qué punto no está definida. */
function pendienteEn(f, x, y) {
  const valor = f(x, y);
  if (!valor.isFinite()) throw new Error('f(x, y) no está definida en ' + textoDelPunto(x, y) + '.');
  return valor;
}

/** Igual que pendienteEn, pero devuelve null si no se puede (el último nodo no la necesita para el resultado). */
function pendienteSiExiste(f, x, y) {
  const valor = f(x, y);
  return valor.isFinite() ? valor : null;
}

function verificarFinita(y, x) {
  if (!y.isFinite()) throw new Error('La aproximación crece sin límite cerca de x = ' + formatear(x) + '.');
  return y;
}

/** Paso h = (xₙ − x₀)/n y los nodos x₀, x₁ = x₀ + h, …, xₙ. */
function nodosDelPaso(x0, xn, n) {
  const h = xn.minus(x0).dividedBy(n);
  const nodos = [];
  for (let i = 0; i <= n; i++) nodos.push(i === n ? xn : x0.plus(h.times(i)));
  return { h, nodos };
}

/** Euler: yᵢ₊₁ = yᵢ + h · f(xᵢ, yᵢ). */
function metodoDeEuler(f, x0, y0, xn, n) {
  const { h, nodos } = nodosDelPaso(x0, xn, n);
  const filas = [{ i: 0, x: x0, y: y0, pendiente: pendienteEn(f, x0, y0) }];
  for (let i = 1; i <= n; i++) {
    const anterior = filas[i - 1];
    const x = nodos[i];
    const y = verificarFinita(anterior.y.plus(h.times(anterior.pendiente)), x);
    filas.push({ i, x, y, pendiente: i === n ? pendienteSiExiste(f, x, y) : pendienteEn(f, x, y) });
  }
  return { h, filas };
}

/**
 * Heun: yᵢ₊₁* = yᵢ + h · f(xᵢ, yᵢ)  y  yᵢ₊₁ = yᵢ + h/2 · [ f(xᵢ, yᵢ) + f(xᵢ₊₁, yᵢ₊₁*) ].
 * La pendiente de la fila anterior se reutiliza: cada paso evalúa f dos veces.
 */
function metodoDeHeun(f, x0, y0, xn, n) {
  const { h, nodos } = nodosDelPaso(x0, xn, n);
  const filas = [{ i: 0, x: x0, y: y0, yPredicha: null, pendientePredicha: null, pendiente: pendienteEn(f, x0, y0) }];
  for (let i = 1; i <= n; i++) {
    const anterior = filas[i - 1];
    const x = nodos[i];
    const yPredicha = verificarFinita(anterior.y.plus(h.times(anterior.pendiente)), x);
    const pendientePredicha = pendienteEn(f, x, yPredicha);
    const promedio = anterior.pendiente.plus(pendientePredicha).dividedBy(2);
    const y = verificarFinita(anterior.y.plus(h.times(promedio)), x);
    filas.push({ i, x, y, yPredicha, pendientePredicha, pendiente: i === n ? pendienteSiExiste(f, x, y) : pendienteEn(f, x, y) });
  }
  return { h, filas };
}

/** Valor de la solución exacta en cada nodo de las filas (null donde no se puede evaluar). */
function valoresExactos(solucionExacta, filas) {
  return filas.map(fila => {
    const valor = solucionExacta(fila.x);
    return valor.isFinite() ? valor : null;
  });
}
