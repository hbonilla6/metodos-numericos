/* ==========================================================================
   Página del spline lineal: lee los puntos, valida y muestra el procedimiento.
   Ids de los campos: x0, f0, x1, f1, … (los dos primeros puntos son obligatorios).
   ========================================================================== */

const CANTIDAD_DE_PUNTOS = 5;
const CLAVE_CAMPOS = 'spline_campos';

function idsDeCampos() {
  const ids = [];
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) ids.push('x' + i, 'f' + i);
  return ids;
}

function dibujarCamposDeLosPuntos() {
  let html = '';
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) {
    html += '<div class="pt-row">';
    html += '<span class="pt-label">x' + i + ', f' + i + '</span>';
    html += '<input class="coef" id="x' + i + '" placeholder="x" autocomplete="off">';
    html += '<input class="coef" id="f' + i + '" placeholder="f(x)" autocomplete="off">';
    if (i >= 2) html += '<span class="pt-opcional">(opcional)</span>';
    html += '</div>';
  }
  document.getElementById('puntos').innerHTML = html;
}

/** Los puntos que tienen algo escrito (en x o en f(x)), tal como están en los campos. */
function leerPuntosEscritos() {
  const escritos = [];
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) {
    const x = document.getElementById('x' + i).value;
    const f = document.getElementById('f' + i).value;
    if (estaVacio(x) && estaVacio(f)) continue;
    escritos.push({ x, f });
  }
  return escritos;
}

function ocultarResultado() {
  document.getElementById('resultCard').style.display = 'none';
  document.getElementById('pasos').innerHTML = '';
  document.getElementById('graficaCard').style.display = 'none';
}

function generarProcedimiento() {
  mostrarEstado('', null);
  ocultarResultado();

  const escritos = leerPuntosEscritos();
  if (escritos.length < 2) return;

  if (escritos.some(punto => estaVacio(punto.x) || estaVacio(punto.f))) {
    mostrarEstado('Completa tanto x como f(x) en cada punto que uses.', 'error');
    return;
  }

  const puntos = escritos.map(punto => ({ x: leerFraccion(punto.x), y: leerFraccion(punto.f) }));
  if (puntos.some(punto => punto.x === null || punto.y === null)) {
    mostrarEstado('Usa enteros, fracciones (1/2) o decimales (0.5) en x y f(x).', 'error');
    return;
  }

  if (new Set(puntos.map(punto => fraccionATexto(punto.x))).size !== puntos.length) {
    mostrarEstado('Los valores de x deben ser distintos entre sí.', 'error');
    return;
  }

  puntos.sort((a, b) => (a.x.n * b.x.d < b.x.n * a.x.d ? -1 : 1));
  const tramos = interpolarSplineLineal(puntos);
  document.getElementById('pasos').innerHTML = procedimientoDeSplineEnHtml(tramos);
  document.getElementById('resultCard').style.display = 'block';
  graficarSpline(tramos);
}

function limpiarTodo() {
  idsDeCampos().forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  ocultarResultado();
  mostrarEstado('', null);
}

function iniciarPagina() {
  dibujarCamposDeLosPuntos();

  const resolverConRetardo = conRetardo(generarProcedimiento, 500);
  idsDeCampos().forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      guardarCampos(CLAVE_CAMPOS, idsDeCampos());
      resolverConRetardo();
    });
  });
  document.getElementById('btnResolver').addEventListener('click', generarProcedimiento);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);

  restaurarCampos(CLAVE_CAMPOS, idsDeCampos());
}

iniciarPagina();
