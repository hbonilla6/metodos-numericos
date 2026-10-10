/* ==========================================================================
   Campos del sistema: dibujarlos, leerlos, convertirlos a números y
   mostrar cómo quedó escrito el sistema (vista previa).

   Ids de los campos: a<fila><columna> para coeficientes (a01 = fila 0, columna 1)
   y b<fila> para el término independiente.
   ========================================================================== */

function idsDeCampos() {
  const ids = [];
  for (let i = 0; i < TAMANO; i++) {
    for (let j = 0; j < TAMANO; j++) ids.push('a' + i + j);
    ids.push('b' + i);
  }
  return ids;
}

function dibujarCamposDelSistema() {
  let html = '';
  for (let i = 0; i < TAMANO; i++) {
    html += '<div class="eq-row">';
    html += '<span class="eq-num">(' + (i + 1) + ')</span>';
    for (let j = 0; j < TAMANO; j++) {
      html += '<input class="coef" id="a' + i + j + '" placeholder="1" autocomplete="off">';
      html += '<span class="var-label">' + NOMBRES_VARIABLES[j] + '</span>';
      html += '<span class="op">' + (j < TAMANO - 1 ? '+' : '=') + '</span>';
    }
    html += '<input class="coef" id="b' + i + '" placeholder="0" autocomplete="off">';
    html += '</div>';
  }
  document.getElementById('ecuaciones').innerHTML = html;
}

/** Lo que hay escrito ahora en cada campo: { a00: '1', b0: '7', … } */
function leerSistemaEscrito() {
  const escrito = {};
  idsDeCampos().forEach(id => { escrito[id] = document.getElementById(id).value; });
  return escrito;
}

/** Solo el término independiente es obligatorio; un coeficiente vacío vale 1. */
function faltanTerminosIndependientes(escrito) {
  for (let i = 0; i < TAMANO; i++) {
    if (estaVacio(escrito['b' + i])) return true;
  }
  return false;
}

/** Acepta coma decimal y distintos signos menos. Lanza error si no es un número. */
function aDecimal(texto) {
  return new Decimal(String(texto).trim().replace(/[−–]/g, '-').replace(',', '.'));
}

/** Convierte lo escrito en { A, b } con Decimales. Lanza error si algún campo no es un número. */
function convertirSistema(escrito) {
  const A = [];
  const b = [];
  for (let i = 0; i < TAMANO; i++) {
    const fila = [];
    for (let j = 0; j < TAMANO; j++) {
      const texto = escrito['a' + i + j];
      fila.push(estaVacio(texto) ? new Decimal(1) : aDecimal(texto));
    }
    A.push(fila);
    b.push(aDecimal(escrito['b' + i]));
  }
  return { A, b };
}

// ---------- Vista previa: cómo queda escrito el sistema ----------

function marcarComoInvalido(texto) {
  return '<span class="vp-mal">' + String(texto).replace(/</g, '&lt;') + '</span>';
}

/** Un término como "−2y": el signo va aparte (se pone al unir los términos) y el coeficiente 1 no se escribe. */
function terminoDeVistaPrevia(textoCoeficiente, variable) {
  if (estaVacio(textoCoeficiente)) return { negativo: false, html: '<i>' + variable + '</i>' };
  try {
    const coeficiente = aDecimal(textoCoeficiente);
    if (coeficiente.isZero()) return null; // no aparece en la ecuación
    const cuerpo = coeficiente.abs().equals(1) ? '' : formatear(coeficiente.abs());
    return { negativo: coeficiente.isNegative(), html: cuerpo + '<i>' + variable + '</i>' };
  } catch (e) {
    return { negativo: false, html: marcarComoInvalido(textoCoeficiente) + '<i>' + variable + '</i>' };
  }
}

function ladoDerechoDeVistaPrevia(texto) {
  if (estaVacio(texto)) return '<span class="vp-mal">?</span>';
  try { return formatear(aDecimal(texto)); } catch (e) { return marcarComoInvalido(texto); }
}

function actualizarVistaPrevia() {
  const caja = document.getElementById('vistaPrevia');
  const escrito = leerSistemaEscrito();

  if (Object.values(escrito).every(estaVacio)) {
    caja.style.display = 'none';
    caja.innerHTML = '';
    return;
  }

  let html = '<span class="vp-titulo">Tu sistema</span>';
  for (let i = 0; i < TAMANO; i++) {
    let ecuacion = '';
    for (let j = 0; j < TAMANO; j++) {
      const termino = terminoDeVistaPrevia(escrito['a' + i + j], NOMBRES_VARIABLES[j]);
      if (!termino) continue;
      if (ecuacion === '') ecuacion += termino.negativo ? '−' : '';
      else ecuacion += termino.negativo ? ' − ' : ' + ';
      ecuacion += termino.html;
    }
    if (ecuacion === '') ecuacion = '0';
    html += '<div class="vp-fila">' + ecuacion + ' = ' + ladoDerechoDeVistaPrevia(escrito['b' + i]) + '</div>';
  }
  caja.innerHTML = html;
  caja.style.display = 'block';
}
