/* ==========================================================================
   Página de integración numérica: una pestaña por método (punto medio,
   trapecio y Simpson) y un solo formulario que comparten. Lee y valida lo
   escrito, calcula con el método de la pestaña y dibuja procedimiento y gráfica.
   Orden de carga: comun/*, integracion/metodos, presentacion, grafica y este archivo.
   ========================================================================== */

const METODOS = [
  { clave: 'puntomedio', calcular: puntoMedioCompuesto, procedimiento: procedimientoDePuntoMedio, figura: figuraDePuntoMedio, textoDeLaFigura: 'rectángulos con altura f(x̄ᵢ)' },
  { clave: 'trapecio', calcular: trapecioCompuesto, procedimiento: procedimientoDeTrapecio, figura: figuraDeTrapecio, textoDeLaFigura: 'trapecios' },
  { clave: 'simpson', calcular: simpsonCompuesto, procedimiento: procedimientoDeSimpson, figura: figuraDeSimpson, textoDeLaFigura: 'parábolas por tres puntos' },
];

const IDS_DE_CAMPOS = ['fx', 'a', 'b', 'n'];
const CLAVE_CAMPOS = 'integracion_campos';
const CLAVE_PESTANA = 'integracion_pestana';

let metodoActual = METODOS[0];

const campo = id => document.getElementById(id).value;

/**
 * Lee y valida el formulario. Devuelve { f, a, b, n }, o { problema } con el mensaje
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

  let a, b;
  try {
    a = leerNumero(campo('a'));
    b = leerNumero(campo('b'));
  } catch (e) {
    return { problema: 'Los límites a y b deben ser números (también valen 1/2 o pi/2).' };
  }
  if (!a.lessThan(b)) return { problema: 'a debe ser menor que b.' };

  const textoDeN = campo('n').trim();
  const n = Number(textoDeN);
  if (!/^\d+$/.test(textoDeN) || n < 1 || n > MAXIMO_DE_SUBINTERVALOS) {
    return { problema: 'n debe ser un entero entre 1 y ' + MAXIMO_DE_SUBINTERVALOS + '.' };
  }
  return { f, a, b, n };
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

  const { f, a, b, n } = datos;
  let resultado;
  try {
    resultado = metodoActual.calcular(f, a, b, n);
  } catch (e) {
    mostrarEstado(e.message, 'error');
    return;
  }

  const exacta = integralExacta(f.arbol, a, b);
  document.getElementById('pasos').innerHTML = metodoActual.procedimiento(resultado, datos, exacta);
  document.getElementById('resultCard').style.display = 'block';
  graficarIntegral(f, datos, resultado, metodoActual.figura, metodoActual.textoDeLaFigura);
}

function limpiarTodo() {
  IDS_DE_CAMPOS.forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  document.getElementById('fxDisplay').innerHTML = '';
  ocultarResultados();
  mostrarEstado('', null);
}

/** Muestra la fórmula de f(x) apenas se escribe, aunque falten los demás campos. */
function actualizarVistaPrevia() {
  const texto = campo('fx');
  if (estaVacio(texto)) { document.getElementById('fxDisplay').innerHTML = ''; return; }
  try {
    mostrarFormulaEnPanel(construirFuncion(texto).tokens, 'f(x) = ', 'fxDisplay');
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
  document.getElementById('fx').addEventListener('input', actualizarVistaPrevia);
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
