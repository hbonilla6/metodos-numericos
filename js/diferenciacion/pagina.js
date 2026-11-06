/* ==========================================================================
   Página de diferenciación numérica: calcula f'(x₀) con las cinco fórmulas
   a la vez y las compara con la derivada exacta.
   Orden de carga: comun/*, diferenciacion/metodos, presentacion, grafica y este archivo.
   ========================================================================== */

const IDS_DE_CAMPOS = ['fx', 'x0', 'h'];
const CLAVE_CAMPOS = 'diferenciacion_campos';

const campo = id => document.getElementById(id).value;

/**
 * Lee y valida el formulario. Devuelve { f, x0, h }, o { problema } con el mensaje
 * a mostrar ('' si todavía falta escribir algo).
 */
function leerEntrada() {
  if (IDS_DE_CAMPOS.some(id => estaVacio(campo(id)))) return { problema: '' };

  let f;
  try {
    f = construirFuncion(campo('fx'));
    mostrarFormulaEnPanel(f.tokens, 'f(x) = ', 'fxDisplay');
  } catch (e) {
    return { problema: 'No pude leer f(x). Usa x, + − * / ^, paréntesis y funciones como sqrt(x) o sin(x).' };
  }

  let x0, h;
  try {
    x0 = leerNumero(campo('x0'));
    h = leerNumero(campo('h'));
  } catch (e) {
    return { problema: 'x₀ y h deben ser números (también valen 1/2 o pi/2).' };
  }
  if (!h.greaterThan(0)) return { problema: 'h debe ser un número positivo, por ejemplo 0.1.' };
  return { f, x0, h };
}

function ocultarResultados() {
  ['resultCard', 'graficaCard'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  document.getElementById('pasos').innerHTML = '';
}

function generarProcedimiento() {
  mostrarEstado('', null);
  ocultarResultados();

  const datos = leerEntrada();
  if (datos.problema !== undefined) {
    if (datos.problema) mostrarEstado(datos.problema, 'error');
    return;
  }

  const { f, x0, h } = datos;
  const formulas = aproximarDerivada(f, x0, h);
  if (formulas.every(formula => formula.problema)) {
    mostrarEstado('f(x) no está definida cerca de x₀ = ' + formatear(x0) + '. Prueba otro punto o un h más pequeño.', 'error');
    return;
  }

  const exacta = derivadaExactaEn(f, x0);
  document.getElementById('pasos').innerHTML = procedimientoDeDerivada(formulas, datos, exacta);
  document.getElementById('resultCard').style.display = 'block';
  if (!f(x0).isFinite()) return;
  graficarDerivada(f, datos, formulas, exacta);
}

function limpiarTodo() {
  IDS_DE_CAMPOS.forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  document.getElementById('fxDisplay').innerHTML = '';
  ocultarResultados();
  mostrarEstado('', null);
}

/** Muestra f(x) apenas se escribe, aunque falten los demás campos. */
function actualizarVistaPrevia() {
  const texto = campo('fx');
  if (estaVacio(texto)) { document.getElementById('fxDisplay').innerHTML = ''; return; }
  try {
    mostrarFormulaEnPanel(construirFuncion(texto).tokens, 'f(x) = ', 'fxDisplay');
  } catch (e) {
    // Expresión a medias: se deja la última vista previa válida
  }
}

function iniciarPagina() {
  const resolverConRetardo = conRetardo(generarProcedimiento, 500);
  IDS_DE_CAMPOS.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      guardarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
      resolverConRetardo();
    });
  });
  document.getElementById('fx').addEventListener('input', actualizarVistaPrevia);
  document.getElementById('btnResolver').addEventListener('click', generarProcedimiento);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);

  restaurarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
  actualizarVistaPrevia();
  generarProcedimiento();
}

iniciarPagina();
