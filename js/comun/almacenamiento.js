/* ==========================================================================
   Guardado de lo que el usuario escribe, en este navegador (localStorage).
   Si el navegador no lo permite, la página sigue funcionando sin guardar nada.
   ========================================================================== */

function guardarValores(clave, valores) {
  try { localStorage.setItem(clave, JSON.stringify(valores)); } catch (e) { /* sin almacenamiento */ }
}

/** Devuelve el objeto guardado, o null si no hay nada o no se puede leer. */
function leerValores(clave) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : null;
  } catch (e) {
    return null;
  }
}

function olvidarValores(clave) {
  try { localStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
}

/** Escribe en los campos los valores guardados. Devuelve true si restauró alguno. */
function restaurarCampos(clave, idsDeCampos) {
  const valores = leerValores(clave);
  if (!valores) return false;
  let restauroAlguno = false;
  idsDeCampos.forEach(id => {
    if (valores[id] !== undefined && valores[id] !== '') {
      document.getElementById(id).value = valores[id];
      restauroAlguno = true;
    }
  });
  return restauroAlguno;
}

function guardarCampos(clave, idsDeCampos) {
  const valores = {};
  idsDeCampos.forEach(id => { valores[id] = document.getElementById(id).value; });
  guardarValores(clave, valores);
}

/**
 * Casilla "Mostrar error": oculta o muestra la columna de error de la tabla
 * y recuerda la preferencia. Hay que llamarla una vez al cargar la página.
 */
function activarOpcionMostrarError(clavePreferencia) {
  const casilla = document.getElementById('chkError');
  const tabla = document.getElementById('resultTable');

  function aplicar() {
    tabla.classList.toggle('oculta-error', !casilla.checked);
    try { localStorage.setItem(clavePreferencia, casilla.checked ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  }

  try {
    if (localStorage.getItem(clavePreferencia) === '0') casilla.checked = false;
  } catch (e) { /* sin almacenamiento */ }

  casilla.addEventListener('change', aplicar);
  aplicar();
}
