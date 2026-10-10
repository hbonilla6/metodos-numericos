/* ==========================================================================
   Lo que el usuario escribe: f(x), a, b y la tolerancia.
   ========================================================================== */

const IDS_DE_CAMPOS = ['fx', 'a', 'b', 'tol'];

function leerCampos() {
  return {
    fx: document.getElementById('fx').value,
    a: document.getElementById('a').value,
    b: document.getElementById('b').value,
    tol: document.getElementById('tol').value,
  };
}

function faltaEscribirAlgo(...valores) {
  return valores.some(valor => estaVacio(valor));
}

/**
 * Convierte lo escrito en { f, a, b, tolerancia }. Lanza error si algo no es válido.
 * `b` solo se convierte si el método lo usa (los demás usan solo x₀).
 */
function interpretarCampos(escrito, usaB) {
  const f = construirFuncion(escrito.fx);
  const a = new Decimal(escrito.a);
  const b = usaB ? new Decimal(escrito.b) : null;
  const tolerancia = new Decimal(escrito.tol);
  if (!f(a).isFinite()) throw new Error('f(a) no es finito');
  return { f, a, b, tolerancia };
}
