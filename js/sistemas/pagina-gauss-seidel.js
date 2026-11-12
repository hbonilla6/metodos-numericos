/* ==========================================================================
   Página de solo Gauss-Seidel: une los módulos de sistemas y atiende los
   eventos. Es la versión de pagina.js sin Jacobi ni pestañas.
   Orden de carga: comun/*, matematica, entrada, estado, despeje, tabla,
   explicaciones, veredicto, grafica y, al final, este archivo.
   ========================================================================== */

const CLAVE_CAMPOS = 'gaussSeidel_campos';
const CLAVE_MOSTRAR_ERROR = 'gaussSeidel_mostrarError';
const MENSAJE_NUMEROS_INVALIDOS = 'Revisa que todos los coeficientes sean números válidos.';
const MENSAJE_SISTEMA_SINGULAR = 'Este sistema no tiene solución única (el determinante es prácticamente 0): ' +
  'puede no tener solución, o tener infinitas. Revisa si alguna ecuación es combinación de las otras.';

estado.metodo = 'gauss';

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

/** Resuelve con Gauss-Seidel; el otro orden solo se ofrece si con él Gauss-Seidel converge. */
function resolverConGaussSeidel(A, b) {
  const resolucion = resolverSistema(A, b, estado.usarOrdenAlternativo);
  if (!resolucion.esAlternativo && resolucion.alternativo && !convergio(resolucion.alternativo.gauss)) {
    resolucion.alternativo = null;
  }
  return resolucion;
}

function generarTabla() {
  limpiarSalida();

  const sistema = leerSistemaListo();
  if (sistema.problema !== undefined) {
    mostrarEstado(sistema.problema, 'error');
    return;
  }

  const resolucion = resolverConGaussSeidel(sistema.A, sistema.b);
  const resultado = resolucion.gauss;

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

function alternarOrden() {
  estado.usarOrdenAlternativo = !estado.usarOrdenAlternativo;
  generarTabla();
}

function limpiarTodo() {
  idsDeCampos().forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  estado.usarOrdenAlternativo = false;
  limpiarSalida();
  actualizarVistaPrevia();
}

function iniciarPagina() {
  dibujarCamposDelSistema();

  const resolverConRetardo = conRetardo(generarTabla, 500);
  idsDeCampos().forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      estado.usarOrdenAlternativo = false;
      guardarCampos(CLAVE_CAMPOS, idsDeCampos());
      actualizarVistaPrevia();
      resolverConRetardo();
    });
  });

  document.getElementById('btnResolver').addEventListener('click', generarTabla);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);
  document.getElementById('veredicto').addEventListener('click', evento => {
    if (evento.target.closest('[data-accion="alternar-orden"]')) alternarOrden();
  });

  restaurarCampos(CLAVE_CAMPOS, idsDeCampos());
  activarOpcionMostrarError(CLAVE_MOSTRAR_ERROR);
  actualizarVistaPrevia();
}

iniciarPagina();
