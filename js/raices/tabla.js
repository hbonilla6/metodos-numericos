/* ==========================================================================
   Tabla de resultados: columnas según el método, dependencias entre celdas,
   dibujo de las filas y mensaje final.
   ========================================================================== */

const CAMPOS_DE_LA_TABLA = ['a', 'b', 'fa', 'fb', 'xi', 'fxi', 'error'];

// Columnas que cada método no usa (se ocultan con la clase oculta-<campo> de la tabla)
const COLUMNAS_OCULTAS = {
  newton: ['fb'],
  puntofijo: ['b', 'fb', 'fxi', 'xi'],
};

const tablaInteractiva = crearTablaInteractiva({
  camposEnOrden: CAMPOS_DE_LA_TABLA,
  grafo: () => estado.grafo,
  explicar: (campo, idx) => explicarCelda(campo, idx),
  alTocarToken: resaltarSimboloDeFormula,
});

/** Destella el número de f(x) al que apunta un enlace de la explicación. */
function resaltarSimboloDeFormula(indice) {
  document.querySelectorAll('.fx-token.token-flash').forEach(el => el.classList.remove('token-flash'));
  const simbolo = document.getElementById('fx-tok-' + indice);
  if (!simbolo) return;
  simbolo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  void simbolo.offsetWidth; // reinicia la animación
  simbolo.classList.add('token-flash');
}

/** Ajusta los títulos de las columnas y oculta las que el método no usa. */
function configurarColumnas(metodo) {
  const esSecante = metodo === 'secante';
  const conB = metodo !== 'newton' && metodo !== 'puntofijo';

  document.getElementById('fieldB').style.opacity = conB ? '1' : '0.55';
  document.getElementById('labelA').textContent = metodo === 'bisec' || metodo === 'falsa' ? 'a' : 'x₀';
  document.getElementById('labelB').textContent = esSecante ? 'x₁' : 'b';

  const titulos = { a: 'thA', b: 'thB', fa: 'thFa', fb: 'thFb', xi: 'thXi', fxi: 'thFxi' };
  Object.entries(titulos).forEach(([campo, id]) => {
    document.getElementById(id).textContent = etiquetaDeCampo(campo, metodo);
  });

  const tabla = document.getElementById('resultTable');
  CAMPOS_DE_LA_TABLA.forEach(campo => tabla.classList.remove('oculta-' + campo));
  (COLUMNAS_OCULTAS[metodo] || []).forEach(campo => tabla.classList.add('oculta-' + campo));
}

/**
 * Qué celdas usa cada celda para calcularse (se pintan al tocarla). Solo se enlazan columnas que el método
 * muestra, y todo lo que la explicación menciona queda resaltado.
 * Cada función recibe `depende(campo, fila, deCampo, deFila)` y la fila actual.
 */
function dependenciasDeBiseccionYFalsa(depende, fila, idx) {
  depende('xi', idx, 'a', idx);
  depende('xi', idx, 'b', idx);
  if (estado.metodo === 'falsa') {
    depende('xi', idx, 'fa', idx);
    depende('xi', idx, 'fb', idx);
  }
  depende('fa', idx, 'a', idx);
  depende('fb', idx, 'b', idx);
  depende('fxi', idx, 'xi', idx);
  depende('fxi', idx, 'fa', idx);        // el signo de f(a)·f(xᵢ) decide qué extremo se reemplaza

  if (idx === 0) return;
  depende('error', idx, 'xi', idx);
  depende('error', idx, 'xi', idx - 1);
  if (fila.cambioPrevio === 'a') {       // la raíz quedó en [xᵢ, b]: a se reemplazó
    depende('a', idx, 'xi', idx - 1);
    depende('a', idx, 'fa', idx - 1);
    depende('a', idx, 'fxi', idx - 1);
    depende('b', idx, 'b', idx - 1);
  } else if (fila.cambioPrevio === 'b') {
    depende('b', idx, 'xi', idx - 1);
    depende('b', idx, 'fa', idx - 1);
    depende('b', idx, 'fxi', idx - 1);
    depende('a', idx, 'a', idx - 1);
  }
}

function dependenciasDeSecante(depende, fila, idx) {
  depende('xi', idx, 'a', idx);
  depende('xi', idx, 'b', idx);
  depende('xi', idx, 'fa', idx);
  depende('xi', idx, 'fb', idx);
  depende('fa', idx, 'a', idx);
  depende('fb', idx, 'b', idx);
  depende('fxi', idx, 'xi', idx);
  depende('error', idx, 'xi', idx);      // el error usa el x₁ de la MISMA fila, no el xᵢ de la fila anterior
  depende('error', idx, 'b', idx);
  if (fila.cambioPrevio === 'desliza') {
    depende('a', idx, 'b', idx - 1);
    depende('b', idx, 'xi', idx - 1);
  }
}

function dependenciasDeNewton(depende, fila, idx) {
  depende('fa', idx, 'a', idx);
  depende('b', idx, 'a', idx);           // f'(xᵢ) se evalúa en xᵢ
  depende('xi', idx, 'a', idx);
  depende('xi', idx, 'fa', idx);
  depende('xi', idx, 'b', idx);
  depende('fxi', idx, 'xi', idx);
  depende('error', idx, 'xi', idx);
  depende('error', idx, 'a', idx);
  if (idx > 0) depende('a', idx, 'xi', idx - 1);
}

function dependenciasDePuntoFijo(depende, fila, idx) {
  // Solo se ven xᵢ y g(xᵢ): la siguiente aproximación es g(xᵢ)
  depende('fa', idx, 'a', idx);
  depende('error', idx, 'fa', idx);
  depende('error', idx, 'a', idx);
  if (idx > 0) depende('a', idx, 'fa', idx - 1);
}

function construirGrafoDeDependencias() {
  const grafo = new GrafoDeDependencias();
  const depende = (campo, idx, deCampo, deIdx) => grafo.agregar(celdaDe(campo, idx), celdaDe(deCampo, deIdx));
  const agregarDependencias = {
    bisec: dependenciasDeBiseccionYFalsa,
    falsa: dependenciasDeBiseccionYFalsa,
    secante: dependenciasDeSecante,
    newton: dependenciasDeNewton,
    puntofijo: dependenciasDePuntoFijo,
  }[estado.metodo];

  // También las filas divergentes: sus celdas vacías (—) explican por qué no hay resultado y mencionan las celdas que lo causan
  estado.filas.forEach((fila, idx) => agregarDependencias(depende, fila, idx));
  estado.grafo = grafo;
}

function valorDeCelda(campo, fila) {
  if (campo === 'error') return fila.error === null ? '—' : formatearAnotado(fila.error);
  return formatearAnotado(fila[campo]);
}

function celdaEnHtml(campo, idx) {
  return '<td class="clickable col-' + campo + '" data-campo="' + campo + '" data-idx="' + idx + '">' +
    valorDeCelda(campo, estado.filas[idx]) + '</td>';
}

function mensajeSiDivergio() {
  const mensajes = {
    secante: 'Diverge: f(x₀) = f(x₁). Prueba otros puntos.',
    newton: "Diverge: f'(xᵢ) = 0. Prueba otro x₀.",
    puntofijo: 'Ninguna g(x) convergió. Prueba otro x₀ o método.',
  };
  return mensajes[estado.metodo] || 'El método no puede continuar.';
}

/** Dibuja las filas de estado.filas y escribe debajo la raíz o el motivo por el que no se llegó. */
function pintarTabla(tolerancia) {
  const cuerpo = document.getElementById('tableBody');
  cuerpo.innerHTML = '';
  document.getElementById('finalAnswerBox').innerHTML = '';

  const llego = llegoALaTolerancia(estado.filas, tolerancia);
  const columnaDeLaRaiz = estado.metodo === 'puntofijo' ? 'td.col-fa' : 'td.col-xi';

  estado.filas.forEach((fila, idx) => {
    const tr = document.createElement('tr');
    const esFinal = idx === estado.filas.length - 1 && llego;
    if (esFinal) tr.classList.add('final-row');

    tr.innerHTML = '<td class="it-col">' + fila.iteracion + '</td>' +
      CAMPOS_DE_LA_TABLA.map(campo => celdaEnHtml(campo, idx)).join('');

    if (esFinal) {
      const celdaDeLaRaiz = tr.querySelector(columnaDeLaRaiz);
      if (celdaDeLaRaiz) celdaDeLaRaiz.classList.add('celda-raiz');
    }
    cuerpo.appendChild(tr);
  });

  tablaInteractiva.activarCeldas();
  document.getElementById('tableCard').style.display = 'block';
  document.getElementById('explainBox').innerHTML = '';

  const ultima = estado.filas[estado.filas.length - 1];
  if (ultima.divergio) {
    mostrarEstado(mensajeSiDivergio(), 'error');
  } else if (llego) {
    mostrarEstado('', null);
    document.getElementById('finalAnswerBox').innerHTML =
      '<div class="final-answer">r ≈ <strong>' + formatearAnotado(ultima.xi) + '</strong></div>';
  } else {
    mostrarEstado('No se alcanzó la tolerancia.', 'error');
  }
  graficarRaiz(tolerancia);
}
