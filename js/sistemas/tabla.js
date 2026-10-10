/* ==========================================================================
   Tabla de iteraciones: dibujarla, plegar las filas de más y conectar
   la interacción al tocar una celda.
   ========================================================================== */

const CAMPOS_DE_LA_TABLA = ['v0', 'v1', 'v2', 'error'];

const tablaInteractiva = crearTablaInteractiva({
  camposEnOrden: CAMPOS_DE_LA_TABLA,
  grafo: () => estado.grafo,
  explicar: (campo, iteracion) => explicarCelda(campo, iteracion),
});

/** Enlace a la celda de otra iteración. Los valores iniciales (fila 0) no tienen celda, solo texto. */
function referenciaACelda(campo, iteracion) {
  const etiqueta = nombreDeCelda(campo, iteracion);
  if (iteracion === 0) return '<span>' + etiqueta + '</span>';
  return tablaInteractiva.referencia(campo, iteracion, etiqueta);
}

/**
 * Cada variable depende de las otras de la fila anterior; en Gauss-Seidel, de las que ya se
 * calcularon en la misma fila. El error depende de toda la fila y de la anterior.
 */
function construirGrafoDeDependencias() {
  const grafo = new GrafoDeDependencias();
  for (let iteracion = 1; iteracion < estado.filas.length; iteracion++) {
    for (let v = 0; v < TAMANO; v++) {
      for (let j = 0; j < TAMANO; j++) {
        if (j === v) continue;
        const usaValorNuevo = estado.metodo === 'gauss' && j < v;
        grafo.agregar(celdaDe('v' + v, iteracion), celdaDe('v' + j, usaValorNuevo ? iteracion : iteracion - 1));
      }
      grafo.agregar(celdaDe('error', iteracion), celdaDe('v' + v, iteracion));
      grafo.agregar(celdaDe('error', iteracion), celdaDe('v' + v, iteracion - 1));
    }
  }
  estado.grafo = grafo;
}

function textoDelBotonDeFilasExtra(abierta) {
  const ultima = estado.filas.length - 1;
  const restantes = ultima - ITERACION_DE_CONTROL;
  if (abierta) return 'Mostrar solo las primeras ' + ITERACION_DE_CONTROL;
  const cuantas = restantes === 1 ? 'la iteración restante (' : 'las ' + restantes + ' iteraciones restantes (';
  return 'Ver ' + cuantas + (ITERACION_DE_CONTROL + 1) + '–' + ultima + ')';
}

function alternarFilasExtra() {
  const abierta = document.getElementById('resultTable').classList.toggle('expandida');
  document.getElementById('btnExpandir').textContent = textoDelBotonDeFilasExtra(abierta);
}

/** Dibuja la tabla con las filas de estado.filas (sin la fila 0, que son los valores iniciales). */
function dibujarTabla(resultado) {
  document.getElementById('headRow').innerHTML =
    '<th>It</th>' + NOMBRES_VARIABLES.map(nombre => '<th>' + nombre + '</th>').join('') + '<th class="col-error">Error</th>';

  const cuerpo = document.getElementById('tableBody');
  cuerpo.innerHTML = '';

  const ultima = estado.filas.length - 1;
  const plegar = ultima > MOSTRAR_TODO_HASTA;

  estado.filas.forEach((fila, iteracion) => {
    if (iteracion === 0) return;

    const tr = document.createElement('tr');
    if (plegar && iteracion > ITERACION_DE_CONTROL) tr.classList.add('fila-extra');
    const esFinal = iteracion === ultima && resultado.estado === ESTADO.CONVERGIO;
    if (esFinal) tr.classList.add('final-row');

    let celdas = '<td class="it-col">' + fila.iteracion + '</td>';
    NOMBRES_VARIABLES.forEach((nombre, j) => {
      celdas += '<td class="clickable' + (esFinal ? ' celda-raiz' : '') + '" data-campo="v' + j + '" data-idx="' + iteracion + '">' +
        formatearAnotado(fila.x[j]) + '</td>';
    });
    celdas += '<td class="clickable col-error" data-campo="error" data-idx="' + iteracion + '">' +
      (fila.error !== null ? formatearAnotado(fila.error) : '—') + '</td>';
    tr.innerHTML = celdas;
    cuerpo.appendChild(tr);
  });

  tablaInteractiva.activarCeldas();

  document.getElementById('resultTable').classList.remove('expandida');
  const cajaDelBoton = document.getElementById('expandirBox');
  if (!plegar) {
    cajaDelBoton.innerHTML = '';
    return;
  }
  cajaDelBoton.innerHTML = '<button type="button" id="btnExpandir">' + textoDelBotonDeFilasExtra(false) + '</button>';
  document.getElementById('btnExpandir').addEventListener('click', alternarFilasExtra);
}
