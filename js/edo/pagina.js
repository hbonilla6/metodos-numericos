/* ==========================================================================
   Página de ecuaciones diferenciales: una pestaña por método (Euler y Heun)
   y un solo formulario que comparten. Lee y valida lo escrito, calcula con el
   método de la pestaña y dibuja procedimiento y gráfica.
   Orden de carga: comun/*, edo/metodos, presentacion, grafica y este archivo.
   ========================================================================== */

const METODOS = [
  { clave: 'euler', calcular: metodoDeEuler, procedimiento: procedimientoDeEuler, textoDelMetodo: 'aproximación de Euler' },
  { clave: 'heun', calcular: metodoDeHeun, procedimiento: procedimientoDeHeun, textoDelMetodo: 'aproximación de Heun' },
];

const IDS_OBLIGATORIOS = ['fxy', 'x0', 'y0', 'xn', 'n'];
const IDS_DE_CAMPOS = [...IDS_OBLIGATORIOS, 'exacta'];
const CLAVE_CAMPOS = 'edo_campos';
const CLAVE_PESTANA = 'edo_pestana';

let metodoActual = METODOS[0];

const campo = id => document.getElementById(id).value;

/**
 * Lee y valida el formulario. Devuelve { f, x0, y0, xn, n, solucionExacta }, o { problema }
 * con el mensaje a mostrar ('' si todavía falta escribir algo). solucionExacta es null si no se escribió.
 */
function leerEntrada() {
  if (IDS_OBLIGATORIOS.some(id => estaVacio(campo(id)))) return { problema: '' };

  let f;
  try {
    f = construirFuncion(campo('fxy'), ['x', 'y']);
    mostrarFormulaEnPanel(f.tokens, "y' = ", 'fxDisplay');
  } catch (e) {
    return { problema: "No pude leer f(x, y). Usa x, y, + − * / ^, paréntesis y funciones como sqrt(x) o exp(y)." };
  }

  let x0, y0, xn;
  try {
    x0 = leerNumero(campo('x0'));
    y0 = leerNumero(campo('y0'));
    xn = leerNumero(campo('xn'));
  } catch (e) {
    return { problema: 'x₀, y₀ y xₙ deben ser números (también valen 1/2 o pi/2).' };
  }
  if (!x0.lessThan(xn)) return { problema: 'xₙ debe ser mayor que x₀.' };

  const textoDeN = campo('n').trim();
  const n = Number(textoDeN);
  if (!/^\d+$/.test(textoDeN) || n < 1 || n > MAXIMO_DE_PASOS) {
    return { problema: 'n debe ser un entero entre 1 y ' + MAXIMO_DE_PASOS + '.' };
  }

  let solucionExacta = null;
  if (!estaVacio(campo('exacta'))) {
    try {
      solucionExacta = construirFuncion(campo('exacta'));
      if (!solucionExacta(x0).isFinite()) throw new Error('no definida en x₀');
    } catch (e) {
      return { problema: 'No pude leer la solución exacta. Escríbela en términos de x, por ejemplo e^(x^2).' };
    }
  }
  return { f, x0, y0, xn, n, solucionExacta };
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

  const { f, x0, y0, xn, n, solucionExacta } = datos;
  let resultado;
  try {
    resultado = metodoActual.calcular(f, x0, y0, xn, n);
  } catch (e) {
    mostrarEstado(e.message, 'error');
    return;
  }

  const exactas = solucionExacta ? valoresExactos(solucionExacta, resultado.filas) : null;
  document.getElementById('pasos').innerHTML = metodoActual.procedimiento(resultado, datos, exactas);
  document.getElementById('resultCard').style.display = 'block';
  graficarEdo(datos, resultado, metodoActual.textoDelMetodo, solucionExacta);
}

function limpiarTodo() {
  IDS_DE_CAMPOS.forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  document.getElementById('fxDisplay').innerHTML = '';
  ocultarResultados();
  mostrarEstado('', null);
}

/** Muestra y' = f(x, y) apenas se escribe, aunque falten los demás campos. */
function actualizarVistaPrevia() {
  const texto = campo('fxy');
  if (estaVacio(texto)) { document.getElementById('fxDisplay').innerHTML = ''; return; }
  try {
    mostrarFormulaEnPanel(construirFuncion(texto, ['x', 'y']).tokens, "y' = ", 'fxDisplay');
  } catch (e) {
    // Expresión a medias: se deja la última vista previa válida
  }
}

/** Cambia de método sin tocar lo escrito: los datos son los mismos para todos. */
function seleccionarPestana(clave) {
  metodoActual = METODOS.find(metodo => metodo.clave === clave) || METODOS[0];
  guardarValores(CLAVE_PESTANA, { clave: metodoActual.clave });
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.classList.toggle('activo', boton.dataset.metodo === metodoActual.clave);
  });
  generarProcedimiento();
}

function iniciarPagina() {
  const resolverConRetardo = conRetardo(generarProcedimiento, 500);
  IDS_DE_CAMPOS.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      guardarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
      resolverConRetardo();
    });
  });
  document.getElementById('fxy').addEventListener('input', actualizarVistaPrevia);
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.addEventListener('click', () => seleccionarPestana(boton.dataset.metodo));
  });
  document.getElementById('btnResolver').addEventListener('click', generarProcedimiento);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);

  restaurarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
  actualizarVistaPrevia();
  const guardada = leerValores(CLAVE_PESTANA);
  seleccionarPestana(guardada ? guardada.clave : METODOS[0].clave);
}

iniciarPagina();
