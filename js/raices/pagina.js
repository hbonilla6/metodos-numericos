/* ==========================================================================
   Página de raíces de ecuaciones: genera la tabla del método elegido,
   compara los cinco métodos y atiende los eventos.
   Orden de carga: comun/*, expresion, derivada, metodos, punto-fijo, formulas,
   estado, entrada, comparacion, explicaciones, tabla y, al final, este archivo.
   ========================================================================== */

const CLAVE_CAMPOS = 'metodosNumericos_campos';
const CLAVE_MOSTRAR_ERROR = 'metodosNumericos_mostrarError';

const MENSAJE_REVISAR_CON_B = 'Revisa f(x), a, b y la tolerancia.';
const MENSAJE_REVISAR_CON_X0 = 'Revisa f(x), x₀ y la tolerancia.';

/**
 * Lee y valida lo escrito para un método. Devuelve { f, a, b, tolerancia }, o
 * { problema } con el mensaje a mostrar ('' si solo falta escribir algo).
 */
function leerEntrada(usaB, mensajeSiHayError) {
  const escrito = leerCampos();
  const falta = usaB
    ? faltaEscribirAlgo(escrito.fx, escrito.a, escrito.b, escrito.tol)
    : faltaEscribirAlgo(escrito.fx, escrito.a, escrito.tol);
  if (falta) return { problema: '' };

  try {
    const datos = interpretarCampos(escrito, usaB);
    estado.funcion = datos.f;
    mostrarFormulaEnPanel(datos.f.tokens, 'f(x) = ', 'fxDisplay');
    return datos;
  } catch (e) {
    return { problema: mensajeSiHayError };
  }
}

function mostrarPanelDeApoyo(html) {
  const panel = document.getElementById('derivDisplay');
  panel.innerHTML = html;
  panel.style.display = 'block';
}

// ---------- Una función por método ----------

function resolverIntervalo() {
  const datos = leerEntrada(true, MENSAJE_REVISAR_CON_B);
  if (datos.problema !== undefined) { mostrarEstado(datos.problema, 'error'); return; }
  const { f, a, b, tolerancia } = datos;

  if (estado.metodo === 'secante') {
    if (a.equals(b)) { mostrarEstado('x₀ y x₁ deben ser distintos.', 'error'); return; }
  } else {
    const producto = f(a).times(f(b));
    if (producto.greaterThanOrEqualTo(0)) {
      mostrarEstado('f(a)·f(b) = ' + formatear(producto) + ', no es negativo. No hay raíz garantizada en [a,b].', 'error');
      return;
    }
  }

  estado.filas = correrMetodoDeIntervalo(estado.metodo, f, a, b, tolerancia, MAX_ITERACIONES);
  pintarTabla(tolerancia);
  construirGrafoDeDependencias();
}

function resolverNewton() {
  const datos = leerEntrada(false, MENSAJE_REVISAR_CON_X0);
  if (datos.problema !== undefined) { mostrarEstado(datos.problema, 'error'); return; }
  const { f, a, tolerancia } = datos;

  try {
    estado.derivada = derivarFuncion(f);

    const terminos = [];
    terminosDeSuma(f.arbol, 1, terminos);
    const derivadaPorTermino = terminos.map(({ signo, nodo }) => {
      const conSigno = signo < 0 ? nodoNegativo(nodo) : nodo;
      return arbolAHtml(conSigno) + ' → ' + arbolAHtml(simplificar(derivarArbol(conSigno)));
    }).join('  ·  ');

    mostrarPanelDeApoyo(
      formulaHtml(fraccion('d', 'dx') + ' : ' + derivadaPorTermino, 'formula-chica') +
      formulaHtml("f'(x) = " + arbolAHtml(estado.derivada.arbol)) +
      '<span class="hint hint-bloque">Evaluando x₀ = ' + formatear(a) + '</span>');
  } catch (e) {
    mostrarEstado('No pude derivar esta función. Prueba otro método.', 'error');
    return;
  }

  estado.filas = correrNewton(f, estado.derivada, a, tolerancia, MAX_ITERACIONES);
  pintarTabla(tolerancia);
  construirGrafoDeDependencias();
}

function resolverPuntoFijo() {
  const datos = leerEntrada(false, MENSAJE_REVISAR_CON_X0);
  if (datos.problema !== undefined) { mostrarEstado(datos.problema, 'error'); return; }
  const { f, a, tolerancia } = datos;

  let resultado;
  try {
    resultado = elegirPuntoFijoConvergente(f, a, tolerancia, MAX_ITERACIONES);
  } catch (e) {
    mostrarEstado('No pude despejar x de esta f(x). Prueba otro método.', 'error');
    return;
  }

  estado.funcionG = resultado.g;
  mostrarFormulaEnPanel(f.tokens, 'f(x) = ', 'fxDisplay');

  // Cómo se despeja x: aₙ·xⁿ = −resto  →  xⁿ = −resto / aₙ  →  x = raíz n-ésima
  const { grado, coeficienteLider } = resultado;
  const coeficiente = coeficienteLider === 1 ? '' : numeroComoTexto(coeficienteLider) + '·';
  const xALaN = 'x' + (grado === 1 ? '' : '<sup>' + grado + '</sup>');
  const menosResto = arbolAHtml(resultado.menosResto);
  const dividido = coeficienteLider === 1 ? menosResto : fraccion(menosResto, numeroComoTexto(coeficienteLider));

  mostrarPanelDeApoyo(
    formulaHtml(coeficiente + xALaN + ' = ' + menosResto) +
    formulaHtml(xALaN + ' = ' + dividido) +
    formulaHtml('x = ' + raizEnesima(grado, dividido) + ' = g(x)') +
    '<span class="hint hint-bloque">Evaluando x₀ = ' + formatear(a) + (resultado.convergio ? '' : ' — no convergió') + '</span>');

  estado.filas = resultado.filas;
  pintarTabla(tolerancia);
  construirGrafoDeDependencias();
}

function generarTabla() {
  document.getElementById('statusBox').innerHTML = '';
  document.getElementById('tableCard').style.display = 'none';
  document.getElementById('graficaCard').style.display = 'none';
  document.getElementById('finalAnswerBox').innerHTML = '';

  const resolver = { puntofijo: resolverPuntoFijo, newton: resolverNewton }[estado.metodo] || resolverIntervalo;
  resolver();
}

// ---------- Pestañas, estrellas y contadores ----------

function actualizarEstrellas(ganador) {
  Object.entries(METODOS).forEach(([clave, metodo]) => {
    document.getElementById(metodo.estrella).classList.toggle('show', clave === ganador);
  });
}

function actualizarContadores(iteraciones) {
  Object.entries(METODOS).forEach(([clave, metodo]) => {
    const cantidad = iteraciones ? iteraciones[clave] : null;
    document.getElementById(metodo.contador).textContent = (cantidad !== null && cantidad !== undefined) ? '(' + cantidad + ')' : '';
  });
}

function cambiarMetodo(metodo, esAutomatico) {
  estado.metodo = metodo;
  if (!esAutomatico) estado.eligioMetodoAMano = true;

  Object.entries(METODOS).forEach(([clave, datos]) => {
    document.getElementById(datos.pestana).classList.toggle('activo', clave === metodo);
  });
  document.getElementById('derivDisplay').style.display = 'none';
  configurarColumnas(metodo);
  actualizarVistaPrevia();
  generarTabla();
}

/** Compara los métodos y, si el usuario no eligió uno a mano, abre la pestaña del más rápido. */
function actualizarTodo() {
  const comparacion = compararMetodos();
  if (!comparacion) {
    actualizarEstrellas(null);
    actualizarContadores(null);
    generarTabla();
    return;
  }

  actualizarEstrellas(comparacion.ganador);
  actualizarContadores(comparacion.iteraciones);
  const debeCambiarDePestana = comparacion.ganador && comparacion.ganador !== estado.metodo && !estado.eligioMetodoAMano;
  if (debeCambiarDePestana) cambiarMetodo(comparacion.ganador, true);
  else generarTabla();
}

// ---------- Vista previa de f(x) mientras se escribe ----------

/** Muestra f(x) (y g(x) en punto fijo) en formato matemático apenas se escribe, aunque falten otros campos. */
function actualizarVistaPrevia() {
  const texto = document.getElementById('fx').value;
  const panel = document.getElementById('fxDisplay');
  if (estaVacio(texto)) { panel.innerHTML = ''; return; }

  try {
    const tokens = tokenizar(prepararExpresion(texto));
    const arbol = construirArbol(tokens); // valida que se pueda leer completa
    mostrarFormulaEnPanel(tokens, 'f(x) = ', 'fxDisplay');

    if (estado.metodo === 'puntofijo') {
      try {
        const g = candidatosDePuntoFijo(arbol)[0].arbolG;
        panel.innerHTML += ' <span class="flecha-tenue">→</span> g(x) = ' + arbolAHtml(g);
      } catch (e) { /* todavía no se puede despejar x: se deja solo f(x) */ }
    }
  } catch (e) {
    // Expresión a medias (por ejemplo "2*x^"): se deja la última vista previa válida
  }
}

// ---------- Limpiar y arrancar ----------

function limpiarTodo() {
  IDS_DE_CAMPOS.forEach(id => { document.getElementById(id).value = ''; });
  olvidarValores(CLAVE_CAMPOS);
  estado.eligioMetodoAMano = false;

  document.getElementById('fxDisplay').innerHTML = '';
  document.getElementById('derivDisplay').innerHTML = '';
  document.getElementById('derivDisplay').style.display = 'none';
  document.getElementById('finalAnswerBox').innerHTML = '';
  mostrarEstado('', null);
  actualizarEstrellas(null);
  actualizarContadores(null);
  cambiarMetodo('bisec', true);
}

function iniciarPagina() {
  const resolverConRetardo = conRetardo(actualizarTodo, 500);
  IDS_DE_CAMPOS.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      resolverConRetardo();
      guardarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
    });
  });
  document.getElementById('fx').addEventListener('input', () => {
    actualizarVistaPrevia();
    estado.eligioMetodoAMano = false;
  });

  document.getElementById('btnGenerar').addEventListener('click', actualizarTodo);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);
  Object.entries(METODOS).forEach(([clave, metodo]) => {
    document.getElementById(metodo.pestana).addEventListener('click', () => cambiarMetodo(clave));
  });

  restaurarCampos(CLAVE_CAMPOS, IDS_DE_CAMPOS);
  activarOpcionMostrarError(CLAVE_MOSTRAR_ERROR);
  actualizarVistaPrevia();
}

iniciarPagina();
