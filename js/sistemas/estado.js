/* ==========================================================================
   Lo que la página de sistemas recuerda mientras se usa.
   ========================================================================== */

const MOSTRAR_TODO_HASTA = 25; // si la respuesta aparece hasta esta iteración se muestra completa; si no, se pliega a ITERACION_DE_CONTROL

const estado = {
  metodo: 'jacobi',               // 'jacobi' o 'gauss'
  eligioMetodoAMano: false,       // true cuando el usuario toca una pestaña (ya no se cambia sola)
  usarOrdenAlternativo: false,    // true cuando pidió probar el otro orden de ecuaciones

  filas: [],                      // filas de la tabla; el índice es la iteración (la 0 son los valores iniciales)
  sistema: null,                  // { coeficientes, independientes, orden } del sistema ya reordenado
  grafo: new GrafoDeDependencias(),
};

/** Nombre de una celda, por ejemplo "y₃" o "E₂". */
function nombreDeCelda(campo, iteracion) {
  const base = campo === 'error' ? 'E' : NOMBRES_VARIABLES[parseInt(campo.slice(1))];
  return base + aSubindice(iteracion);
}

/** Dice cuál método ganó (el que llega en menos iteraciones), o null si ninguno convergió. */
function metodoGanador(jacobi, gauss) {
  if (convergio(jacobi) && convergio(gauss)) return jacobi.filas.length <= gauss.filas.length ? 'jacobi' : 'gauss';
  if (convergio(jacobi)) return 'jacobi';
  if (convergio(gauss)) return 'gauss';
  return null;
}
