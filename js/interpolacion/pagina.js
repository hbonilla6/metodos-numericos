/* ==========================================================================
   Página de interpolación: una pestaña por método (Lagrange, Hermite y spline
   lineal). Esta página dibuja los campos del método elegido, lee y valida lo
   escrito y delega el cálculo y el resultado al método.

   Un método es un objeto con:
     clave, claveDeGuardado, cantidadDePuntos, campos [{ prefijo, ayuda }],
     nota, mensajeIncompleto, etiqueta(i), opcional(i) y
     resolver(escritos): dibuja el resultado y devuelve un mensaje de error o null.
   Ids de los campos: <prefijo><i> (x0, f0, d0, x1, …).
   ========================================================================== */

const METODOS = [metodoLagrange, metodoHermite, metodoSpline];
const CLAVE_PESTANA = 'interpolacion_pestana';

let metodoActual = METODOS[0];

function idsDeCampos() {
  const ids = [];
  for (let i = 0; i < metodoActual.cantidadDePuntos; i++) {
    metodoActual.campos.forEach(campo => ids.push(campo.prefijo + i));
  }
  return ids;
}

function dibujarCamposDeLosPuntos() {
  let html = '';
  for (let i = 0; i < metodoActual.cantidadDePuntos; i++) {
    html += '<div class="pt-row">';
    html += '<span class="pt-label">' + metodoActual.etiqueta(i) + '</span>';
    metodoActual.campos.forEach(campo => {
      html += '<input class="coef" id="' + campo.prefijo + i + '" placeholder="' + campo.ayuda + '" autocomplete="off">';
    });
    const opcional = metodoActual.opcional(i);
    if (opcional) html += '<span class="pt-opcional">' + opcional + '</span>';
    html += '</div>';
  }
  document.getElementById('puntos').innerHTML = html;
  document.getElementById('notaCampos').textContent = metodoActual.nota;
}

/** Los puntos que tienen algo escrito, tal como están en los campos. */
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
  olvidarValores(metodoActual.claveDeGuardado);
  ocultarResultados();
  mostrarEstado('', null);
}

/** Muestra la pestaña del método, con sus campos y lo que se escribió antes en ellos. */
function seleccionarPestana(clave) {
  metodoActual = METODOS.find(metodo => metodo.clave === clave) || METODOS[0];
  guardarValores(CLAVE_PESTANA, { clave: metodoActual.clave });
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.classList.toggle('activo', boton.dataset.metodo === metodoActual.clave);
  });

  dibujarCamposDeLosPuntos();
  const resolverConRetardo = conRetardo(generarProcedimiento, 500);
  idsDeCampos().forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      guardarCampos(metodoActual.claveDeGuardado, idsDeCampos());
      resolverConRetardo();
    });
  });
  restaurarCampos(metodoActual.claveDeGuardado, idsDeCampos());
  generarProcedimiento();
}

function iniciarPagina() {
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.addEventListener('click', () => seleccionarPestana(boton.dataset.metodo));
  });
  document.getElementById('btnResolver').addEventListener('click', generarProcedimiento);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);

  const guardada = leerValores(CLAVE_PESTANA);
  seleccionarPestana(guardada ? guardada.clave : METODOS[0].clave);
}

iniciarPagina();
