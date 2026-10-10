/* ==========================================================================
   Interacción común de las tablas de resultados (raíces y sistemas).

   Al tocar una celda:
     1. se resalta la celda y su fila,
     2. se pintan, cada una con su color, las celdas de las que depende,
     3. se muestra en el panel cómo se calculó.
   Dentro de las explicaciones hay enlaces a otras celdas (.ref-link) y a los
   campos de entrada (.input-link).

   Cada celda se identifica por su columna ("campo") y su fila (índice).
   ========================================================================== */

const TABLA_RESULTADOS = '#resultTable';
const ANGULO_AUREO = 137.508; // reparte los colores lo más separados posible

/** Guarda quién depende de quién: cada celda apunta a las celdas que usa para calcularse. */
class GrafoDeDependencias {
  constructor() { this.dependencias = new Map(); }

  static clave(campo, idx) { return campo + '_' + idx; }

  agregar(celda, dependeDe) {
    const clave = GrafoDeDependencias.clave(celda.campo, celda.idx);
    if (!this.dependencias.has(clave)) this.dependencias.set(clave, []);
    this.dependencias.get(clave).push(dependeDe);
  }

  de(campo, idx) {
    return this.dependencias.get(GrafoDeDependencias.clave(campo, idx)) || [];
  }
}

/** Atajo para describir una celda: celdaDe('xi', 3). */
function celdaDe(campo, idx) { return { campo, idx }; }

/** Enlace dentro de una explicación que lleva a un campo de entrada (y lo hace parpadear). */
function enlaceACampo(idCampo, etiqueta, indiceDeToken) {
  const atributoToken = indiceDeToken !== undefined ? ' data-tokidx="' + indiceDeToken + '"' : '';
  return '<span class="input-link" data-input="' + idCampo + '"' + atributoToken + '>' + etiqueta + '</span>';
}

function llevarAlCampo(idCampo) {
  const campo = document.getElementById(idCampo);
  if (!campo) return;
  campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  campo.classList.remove('input-flash');
  void campo.offsetWidth; // reinicia la animación
  campo.classList.add('input-flash');
  campo.focus({ preventScroll: true });
}

/**
 * Crea el comportamiento interactivo de una tabla.
 *   camposEnOrden  columnas que se pueden tocar, en orden (define el color de cada celda)
 *   grafo()        devuelve el GrafoDeDependencias vigente
 *   explicar       función (campo, idx) que escribe la explicación de la celda
 *   alTocarToken   (opcional) función (indice) para los enlaces que apuntan a un símbolo de f(x)
 */
function crearTablaInteractiva({ camposEnOrden, grafo, explicar, alTocarToken }) {
  function tonoDeCelda(campo, idx) {
    const numeroGlobal = idx * camposEnOrden.length + camposEnOrden.indexOf(campo);
    return (numeroGlobal * ANGULO_AUREO) % 360;
  }
  function colorDeCelda(campo, idx) {
    return 'hsl(' + tonoDeCelda(campo, idx).toFixed(1) + ', 68%, 38%)';
  }
  function fondoDeCelda(campo, idx, opacidad) {
    return 'hsla(' + tonoDeCelda(campo, idx).toFixed(1) + ', 68%, 38%, ' + opacidad + ')';
  }

  function buscarCelda(campo, idx) {
    return document.querySelector(TABLA_RESULTADOS + ' td[data-campo="' + campo + '"][data-idx="' + idx + '"]');
  }

  /** Enlace a otra celda, con el color de esa celda. */
  function referencia(campo, idx, etiqueta) {
    return '<span class="ref-link" style="color:' + colorDeCelda(campo, idx) + ';" ' +
           'data-campo="' + campo + '" data-idx="' + idx + '">' + etiqueta + '</span>';
  }

  function quitarRelacionadas() {
    document.querySelectorAll(TABLA_RESULTADOS + ' td.related').forEach(td => {
      td.classList.remove('related');
      td.style.outline = '';
      td.style.background = '';
    });
  }
  function quitarPulsos() {
    document.querySelectorAll(TABLA_RESULTADOS + ' td.ref-highlight').forEach(td => {
      td.classList.remove('ref-highlight');
      td.style.outline = '';
      td.style.background = '';
    });
  }

  function pintarRelacionadas(campo, idx) {
    quitarRelacionadas();
    grafo().de(campo, idx).forEach(relacionada => {
      const td = buscarCelda(relacionada.campo, relacionada.idx);
      if (!td) return;
      td.classList.add('related');
      td.style.outline = '2px solid ' + colorDeCelda(relacionada.campo, relacionada.idx);
      td.style.background = fondoDeCelda(relacionada.campo, relacionada.idx, 0.22);
    });
  }

  function seleccionar(campo, idx) {
    document.querySelectorAll(TABLA_RESULTADOS + ' td.selected').forEach(td => td.classList.remove('selected'));
    document.querySelectorAll(TABLA_RESULTADOS + ' tr.fila-activa').forEach(tr => tr.classList.remove('fila-activa'));
    quitarPulsos();
    quitarRelacionadas();

    const td = buscarCelda(campo, idx);
    if (td) {
      td.classList.add('selected');
      if (td.parentElement) td.parentElement.classList.add('fila-activa');
      td.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    pintarRelacionadas(campo, idx);
    explicar(campo, idx);
  }

  /** Hace pulsar una celda (al tocar una referencia dentro de la explicación). */
  function hacerPulsar(campo, idx) {
    quitarPulsos();
    const td = buscarCelda(campo, idx);
    if (!td) return;
    void td.offsetWidth; // reinicia la animación
    td.classList.add('ref-highlight');
    td.style.outline = '2px solid ' + colorDeCelda(campo, idx);
    td.style.background = fondoDeCelda(campo, idx, 0.2);
    td.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  /** Conecta el clic de todas las celdas tocables que hay ahora en la tabla. */
  function activarCeldas() {
    document.querySelectorAll(TABLA_RESULTADOS + ' td.clickable').forEach(td => {
      td.addEventListener('click', () => seleccionar(td.dataset.campo, parseInt(td.dataset.idx)));
    });
  }

  // Un solo escuchador para todos los enlaces de las explicaciones
  document.addEventListener('click', evento => {
    const referenciaTocada = evento.target.closest('.ref-link');
    if (referenciaTocada) {
      hacerPulsar(referenciaTocada.dataset.campo, parseInt(referenciaTocada.dataset.idx));
      return;
    }
    const enlaceACampoTocado = evento.target.closest('.input-link');
    if (!enlaceACampoTocado) return;
    if (enlaceACampoTocado.dataset.tokidx !== undefined && alTocarToken) {
      alTocarToken(parseInt(enlaceACampoTocado.dataset.tokidx));
    } else {
      llevarAlCampo(enlaceACampoTocado.dataset.input);
    }
  });

  return { colorDeCelda, referencia, seleccionar, activarCeldas };
}
