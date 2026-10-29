/* ==========================================================================
   Página de interpolación: una pestaña por método (Lagrange, Hermite y spline
   lineal) y un solo formulario de puntos que comparten. La página lee y valida
   lo escrito y delega el cálculo y el resultado al método de la pestaña.

   Un método es un objeto con:
     clave, cantidadDePuntos, campos [{ prefijo, ayuda }], nota,
     mensajeIncompleto y resolver(escritos): dibuja el resultado y devuelve
     un mensaje de error o null.
   Ids de los campos: <prefijo><i> (x0, f0, d0, x1, …); d es f'(x) y solo lo usa Hermite.
   ========================================================================== */

const METODOS = [metodoLagrange, metodoHermite, metodoSpline];
const PUNTOS_EN_FORMULARIO = Math.max(...METODOS.map(metodo => metodo.cantidadDePuntos));
const CLAVE_CAMPOS = 'interpolacion_campos';
const CLAVE_PESTANA = 'interpolacion_pestana';

let metodoActual = METODOS[0];

function idsDeCampos() {
  const ids = [];
  for (let i = 0; i < PUNTOS_EN_FORMULARIO; i++) ids.push('x' + i, 'f' + i, 'd' + i);
  return ids;
}

function dibujarCamposDeLosPuntos() {
  let html = '';
  for (let i = 0; i < PUNTOS_EN_FORMULARIO; i++) {
    html += '<div class="pt-row" data-punto="' + i + '">';
    html += '<span class="pt-label">x' + i + ', f' + i + '</span>';
    html += '<input type="number" step="any" class="coef" id="x' + i + '" placeholder="x" autocomplete="off">';
    html += '<input type="number" step="any" class="coef" id="f' + i + '" placeholder="f(x)" autocomplete="off">';
    html += '<input type="number" step="any" class="coef campo-derivada" id="d' + i + '" placeholder="f\'(x)" autocomplete="off">';
    if (i >= 2) html += '<span class="pt-opcional">(opcional)</span>';
    html += '</div>';
  }
  document.getElementById('puntos').innerHTML = html;
}

/** Muestra solo las filas y columnas que usa el método de la pestaña. */
function mostrarCamposDelMetodo() {
  document.querySelectorAll('.pt-row').forEach(fila => {
    fila.style.display = Number(fila.dataset.punto) < metodoActual.cantidadDePuntos ? '' : 'none';
  });
  const usaDerivada = metodoActual.campos.some(campo => campo.prefijo === 'd');
  document.querySelectorAll('.campo-derivada').forEach(campo => { campo.style.display = usaDerivada ? '' : 'none'; });
  document.getElementById('notaCampos').textContent = metodoActual.nota;
}

/** Los puntos del método que tienen algo escrito, tal como están en los campos. */
function leerPuntosEscritos() {
  const escritos = [];
  for (let i = 0; i < metodoActual.cantidadDePuntos; i++) {
    const punto = {};
    metodoActual.campos.forEach(campo => { punto[campo.prefijo] = document.getElementById(campo.prefijo + i).value; });
    if (metodoActual.campos.every(campo => estaVacio(punto[campo.prefijo]))) continue;
    escritos.push(punto);
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

  if (escritos.some(punto => metodoActual.campos.some(campo => estaVacio(punto[campo.prefijo])))) {
    mostrarEstado(metodoActual.mensajeIncompleto, 'error');
    return;
  }

  const error = metodoActual.resolver(escritos);
  if (error) mostrarEstado(error, 'error');
}

function limpiarTodo() {
  idsDeCampos().forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  ocultarResultados();
  mostrarEstado('', null);
}

/** Cambia de método sin tocar lo escrito: los puntos son los mismos para todos. */
function seleccionarPestana(clave) {
  metodoActual = METODOS.find(metodo => metodo.clave === clave) || METODOS[0];
  guardarValores(CLAVE_PESTANA, { clave: metodoActual.clave });
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.classList.toggle('activo', boton.dataset.metodo === metodoActual.clave);
  });
  mostrarCamposDelMetodo();
  generarProcedimiento();
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
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.addEventListener('click', () => seleccionarPestana(boton.dataset.metodo));
  });
  document.getElementById('btnResolver').addEventListener('click', generarProcedimiento);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);

  restaurarCampos(CLAVE_CAMPOS, idsDeCampos());
  const guardada = leerValores(CLAVE_PESTANA);
  seleccionarPestana(guardada ? guardada.clave : METODOS[0].clave);
}

iniciarPagina();
