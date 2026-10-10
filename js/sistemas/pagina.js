/* ==========================================================================
   Página de sistemas de ecuaciones: une los módulos y atiende los eventos.
   Orden de carga: comun/*, matematica, entrada, estado, despeje, tabla,
   explicaciones, veredicto y, al final, este archivo.
   ========================================================================== */

const CLAVE_CAMPOS = 'sistemasLineales_campos';
const CLAVE_MOSTRAR_ERROR = 'sistemasLineales_mostrarError';
const MENSAJE_NUMEROS_INVALIDOS = 'Revisa que todos los coeficientes sean números válidos.';
const MENSAJE_SISTEMA_SINGULAR = 'Este sistema no tiene solución única (el determinante es prácticamente 0): ' +
  'puede no tener solución, o tener infinitas. Revisa si alguna ecuación es combinación de las otras.';

function limpiarSalida() {
  document.getElementById('statusBox').innerHTML = '';
  document.getElementById('resultCard').style.display = 'none';
  document.getElementById('finalAnswerBox').innerHTML = '';
  document.getElementById('explainBox').innerHTML = '';
  document.getElementById('veredicto').innerHTML = '';
  document.getElementById('expandirBox').innerHTML = '';
  document.getElementById('graficaCard').style.display = 'none';
}

/**
 * Lee el sistema escrito. Devuelve { A, b } si está listo para resolver,
 * o { problema } con el mensaje a mostrar ('' si solo falta escribir algo).
 */
function leerSistemaListo() {
  const escrito = leerSistemaEscrito();
  if (faltanTerminosIndependientes(escrito)) return { problema: '' };

  let sistema;
  try {
    sistema = convertirSistema(escrito);
  } catch (e) {
    return { problema: MENSAJE_NUMEROS_INVALIDOS };
  }
  if (esSingular(sistema.A)) return { problema: MENSAJE_SISTEMA_SINGULAR };
  return sistema;
}

function resolverSistemaEscrito() {
  const sistema = leerSistemaListo();
  if (sistema.problema !== undefined) return null;
  return resolverSistema(sistema.A, sistema.b, estado.usarOrdenAlternativo);
}

function generarTabla() {
  limpiarSalida();

  const sistema = leerSistemaListo();
  if (sistema.problema !== undefined) {
    mostrarEstado(sistema.problema, 'error');
    return;
  }

  const resolucion = resolverSistema(sistema.A, sistema.b, estado.usarOrdenAlternativo);
  const resultado = estado.metodo === 'jacobi' ? resolucion.jacobi : resolucion.gauss;

  estado.sistema = {
    coeficientes: resultado.coeficientes,
    independientes: resultado.independientes,
    orden: resolucion.orden,
  };
  const valoresIniciales = { iteracion: 0, x: Array.from({ length: TAMANO }, () => new Decimal(0)), error: null, diverge: false };
  estado.filas = [valoresIniciales].concat(resultado.filas);

  construirGrafoDeDependencias();
  document.getElementById('ordenBox').innerHTML = ordenYDespejeEnHtml(resolucion.estricta);
  dibujarTabla(resultado);
  document.getElementById('explainBox').innerHTML = '<p class="empty">Toca cualquier celda para ver cómo se calculó.</p>';
  document.getElementById('resultCard').style.display = 'block';
  mostrarVeredicto(resultado, resolucion);
  graficarIteraciones(resultado);
}

/** Pone en cada pestaña cuántas iteraciones necesitó el método y marca con ★ al ganador. */
function actualizarContadoresYGanador(resolucion) {
  const textoDeIteraciones = resultado => {
    if (!resultado) return '';
    return convergio(resultado) ? ' (' + resultado.filas.length + ')' : ' (—)';
  };
  document.getElementById('iterJacobi').textContent = resolucion ? textoDeIteraciones(resolucion.jacobi) : '';
  document.getElementById('iterGauss').textContent = resolucion ? textoDeIteraciones(resolucion.gauss) : '';

  const ganador = resolucion ? metodoGanador(resolucion.jacobi, resolucion.gauss) : null;
  document.getElementById('badgeJacobi').classList.toggle('show', ganador === 'jacobi');
  document.getElementById('badgeGauss').classList.toggle('show', ganador === 'gauss');
  return ganador;
}

function cambiarMetodo(metodo, esAutomatico) {
  estado.metodo = metodo;
  if (!esAutomatico) estado.eligioMetodoAMano = true;
  document.getElementById('tabJacobi').classList.toggle('activo', metodo === 'jacobi');
  document.getElementById('tabGauss').classList.toggle('activo', metodo === 'gauss');
  generarTabla();
}

/** Resuelve y, si el usuario no eligió método a mano, abre la pestaña del que ganó. */
function actualizarTodo() {
  const resolucion = resolverSistemaEscrito();
  const ganador = actualizarContadoresYGanador(resolucion);
  const debeCambiarDePestana = resolucion && ganador && ganador !== estado.metodo && !estado.eligioMetodoAMano;
  if (debeCambiarDePestana) cambiarMetodo(ganador, true);
  else generarTabla();
}

function alternarOrden() {
  estado.usarOrdenAlternativo = !estado.usarOrdenAlternativo;
  actualizarTodo();
}

function limpiarTodo() {
  idsDeCampos().forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  estado.eligioMetodoAMano = false;
  limpiarSalida();
  actualizarVistaPrevia();
  actualizarContadoresYGanador(null);
  cambiarMetodo('jacobi', true);
}

function iniciarPagina() {
  dibujarCamposDelSistema();

  const resolverConRetardo = conRetardo(actualizarTodo, 500);
  idsDeCampos().forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      estado.eligioMetodoAMano = false;
      estado.usarOrdenAlternativo = false;
      guardarCampos(CLAVE_CAMPOS, idsDeCampos());
      actualizarVistaPrevia();
      resolverConRetardo();
    });
  });

  document.getElementById('btnResolver').addEventListener('click', actualizarTodo);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);
  document.getElementById('tabJacobi').addEventListener('click', () => cambiarMetodo('jacobi'));
  document.getElementById('tabGauss').addEventListener('click', () => cambiarMetodo('gauss'));
  document.getElementById('veredicto').addEventListener('click', evento => {
    if (evento.target.closest('[data-accion="alternar-orden"]')) alternarOrden();
  });

  restaurarCampos(CLAVE_CAMPOS, idsDeCampos());
  activarOpcionMostrarError(CLAVE_MOSTRAR_ERROR);
  actualizarVistaPrevia();
}

iniciarPagina();
