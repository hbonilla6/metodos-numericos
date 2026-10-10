/* ==========================================================================
   Tabla de diferencias divididas: dibujarla y conectar la interacción de celdas.
   Cada celda se identifica por su columna (campo 'c0', 'c1'…) y su fila (idx).
   ========================================================================== */

const tablaInteractiva = crearTablaInteractiva({
  camposEnOrden: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'],
  grafo: () => estado.grafo,
  explicar: (campo, idx) => explicarCelda(campo, idx),
});

/** Título de cada columna de la tabla: f[zₖ], f[zₖ,zₖ₊₁], f[zₖ,zₖ₊₁,zₖ₊₂], f[zₖ,…,zₖ₊₃]… */
function tituloDeColumna(columna) {
  if (columna === 0) return 'f[zₖ]';
  if (columna === 1) return 'f[zₖ,zₖ₊₁]';
  if (columna === 2) return 'f[zₖ,zₖ₊₁,zₖ₊₂]';
  return 'f[zₖ,…,zₖ₊' + aSubindice(columna) + ']';
}

/** Nombre de una celda: f[z₂], f[z₀,z₁], f[z₀,z₁,z₂]… (con "…" si abarca más de cuatro z). */
function nombreDeCelda(columna, fila) {
  const indices = [];
  for (let i = fila; i <= fila + columna; i++) indices.push('z' + aSubindice(i));
  const lista = indices.length <= 4 ? indices.join(',') : indices[0] + ',…,' + indices[indices.length - 1];
  return 'f[' + lista + ']';
}

function columnaDeCampo(campo) { return parseInt(campo.slice(1)); }

function referenciaACelda(columna, fila) {
  return tablaInteractiva.referencia('c' + columna, fila, nombreDeCelda(columna, fila));
}

/** Cada celda usa las dos vecinas de la columna anterior (la de arriba y la de abajo), salvo la que usa la derivada. */
function construirGrafoDeDependencias() {
  const grafo = new GrafoDeDependencias();
  estado.columnas.forEach((celdas, columna) => {
    if (columna === 0) return;
    celdas.forEach((valor, fila) => {
      if (usaDerivada(estado.z, columna, fila)) return;
      grafo.agregar(celdaDe('c' + columna, fila), celdaDe('c' + (columna - 1), fila));
      grafo.agregar(celdaDe('c' + columna, fila), celdaDe('c' + (columna - 1), fila + 1));
    });
  });
  estado.grafo = grafo;
}

function dibujarTablaDeDiferencias() {
  const { z, columnas } = estado;

  const titulos = columnas.map((celdas, columna) => '<th>' + tituloDeColumna(columna) + '</th>');
  document.getElementById('headRow').innerHTML = '<th>k</th><th>zₖ</th>' + titulos.join('');

  let filas = '';
  z.forEach((valorDeZ, fila) => {
    filas += '<tr><td class="it-col">' + fila + '</td><td>' + String(valorDeZ).replace('-', '−') + '</td>';
    columnas.forEach((celdas, columna) => {
      filas += fila < celdas.length
        ? '<td class="clickable" data-campo="c' + columna + '" data-idx="' + fila + '">' + fraccionEnHtml(celdas[fila]) + '</td>'
        : '<td></td>';
    });
    filas += '</tr>';
  });
  document.getElementById('tableBody').innerHTML = filas;
  tablaInteractiva.activarCeldas();
}
