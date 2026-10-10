/* ==========================================================================
   Página de interpolación: lee los puntos, valida y muestra el procedimiento.
   Ids de los campos: x0, f0, x1, f1, x2, f2 (el tercer punto es opcional).
   ========================================================================== */

const CANTIDAD_DE_PUNTOS = 3;
const CLAVE_CAMPOS = 'interpolacion_campos';
const ES_ENTERO = /^-?\d+$/;

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
    if (i === 2) html += '<span class="pt-opcional">(opcional, solo si es parabólica)</span>';
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

  const sonEnteros = escritos.every(punto => ES_ENTERO.test(punto.x.trim()) && ES_ENTERO.test(punto.f.trim()));
  if (!sonEnteros) {
    mostrarEstado('Usa números enteros en x y f(x) (esta herramienta trabaja con fracciones exactas).', 'error');
    return;
  }

  const puntos = escritos.map(punto => [parseInt(punto.x.trim(), 10), parseInt(punto.f.trim(), 10)]);
  const valoresDeX = puntos.map(punto => punto[0]);
  if (new Set(valoresDeX).size !== valoresDeX.length) {
    mostrarEstado('Los valores de x deben ser distintos entre sí.', 'error');
    return;
  }

  const resultado = interpolarLagrange(puntos);
  document.getElementById('pasos').innerHTML = procedimientoEnHtml(resultado, puntos);
  document.getElementById('resultCard').style.display = 'block';
  graficarPolinomio(resultado.total, puntos);
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
