/* ==========================================================================
   Página de interpolación de Hermite: lee los puntos, valida y muestra
   la tabla de diferencias divididas y el polinomio.
   Ids de los campos: x0, f0, d0, x1, f1, d1, x2, f2, d2
   (x = punto, f = f(x), d = f'(x); el tercer punto es opcional).
   ========================================================================== */

const CANTIDAD_DE_PUNTOS = 3;
const CLAVE_CAMPOS = 'hermite_campos';
const ES_ENTERO = /^-?\d+$/;

function idsDeCampos() {
  const ids = [];
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) ids.push('x' + i, 'f' + i, 'd' + i);
  return ids;
}

function dibujarCamposDeLosPuntos() {
  let html = '';
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) {
    html += '<div class="pt-row">';
    html += '<span class="pt-label">x' + aSubindice(i) + '</span>';
    html += '<input class="coef" id="x' + i + '" placeholder="x" autocomplete="off">';
    html += '<input class="coef" id="f' + i + '" placeholder="f(x)" autocomplete="off">';
    html += '<input class="coef" id="d' + i + '" placeholder="f\'(x)" autocomplete="off">';
    if (i === 2) html += '<span class="pt-opcional">(opcional)</span>';
    html += '</div>';
  }
  document.getElementById('puntos').innerHTML = html;
}

/** Los puntos que tienen algo escrito, tal como están en los campos. */
function leerPuntosEscritos() {
  const escritos = [];
  for (let i = 0; i < CANTIDAD_DE_PUNTOS; i++) {
    const x = document.getElementById('x' + i).value;
    const f = document.getElementById('f' + i).value;
    const d = document.getElementById('d' + i).value;
    if (estaVacio(x) && estaVacio(f) && estaVacio(d)) continue;
    escritos.push({ x, f, d });
  }
  return escritos;
}

function ocultarResultados() {
  ['tablaCard', 'resultCard', 'graficaCard'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  document.getElementById('pasos').innerHTML = '';
  document.getElementById('explainBox').innerHTML = '';
}

function generarProcedimiento() {
  mostrarEstado('', null);
  ocultarResultados();

  const escritos = leerPuntosEscritos();
  if (escritos.length < 2) return;

  if (escritos.some(punto => estaVacio(punto.x) || estaVacio(punto.f) || estaVacio(punto.d))) {
    mostrarEstado("Completa x, f(x) y f'(x) en cada punto que uses.", 'error');
    return;
  }
  const sonEnteros = escritos.every(punto => [punto.x, punto.f, punto.d].every(valor => ES_ENTERO.test(valor.trim())));
  if (!sonEnteros) {
    mostrarEstado('Usa números enteros (esta herramienta trabaja con fracciones exactas).', 'error');
    return;
  }

  const puntos = escritos.map(punto => ({
    x: parseInt(punto.x.trim(), 10),
    fx: parseInt(punto.f.trim(), 10),
    dfx: parseInt(punto.d.trim(), 10),
  }));
  if (new Set(puntos.map(punto => punto.x)).size !== puntos.length) {
    mostrarEstado('Los valores de x deben ser distintos entre sí.', 'error');
    return;
  }

  const { z, columnas } = calcularDiferenciasDivididas(puntos);
  estado.puntos = puntos;
  estado.z = z;
  estado.columnas = columnas;
  construirGrafoDeDependencias();

  dibujarTablaDeDiferencias();
  document.getElementById('explainBox').innerHTML = '<p class="empty">Toca cualquier celda para ver cómo se calculó.</p>';
  document.getElementById('tablaCard').style.display = 'block';

  const polinomio = construirPolinomioDeHermite(z, columnas);
  document.getElementById('pasos').innerHTML = procedimientoDeHermiteEnHtml(polinomio);
  document.getElementById('resultCard').style.display = 'block';
  graficarHermite(polinomio.total, puntos);
}

function limpiarTodo() {
  idsDeCampos().forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  ocultarResultados();
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
