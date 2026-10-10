/* ==========================================================================
   Piezas de notación matemática en HTML: subíndices, fracciones y raíces.
   No depende de ninguna librería.
   ========================================================================== */

const SUBINDICES = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const SUPERINDICES = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

function convertirDigitos(numero, tabla) {
  return String(numero).split('').map(d => tabla[d] !== undefined ? tabla[d] : d).join('');
}
function aSubindice(numero) { return convertirDigitos(numero, SUBINDICES); }
function aSuperindice(numero) { return convertirDigitos(numero, SUPERINDICES); }

/** Fracción con numerador sobre denominador (HTML). */
function fraccion(numeradorHtml, denominadorHtml) {
  return '<span class="frac"><span class="frac-num">' + numeradorHtml + '</span>' +
         '<span class="frac-den">' + denominadorHtml + '</span></span>';
}

/** Raíz de cierto grado sobre un contenido (HTML). El índice 2 no se escribe. */
function raizEnesima(grado, contenidoHtml) {
  const indice = grado === 2 ? '' : '<sup class="raiz-indice">' + grado + '</sup>';
  return '<span class="raiz"><span class="raiz-marca">' + indice + '<span class="raiz-signo">√</span></span>' +
         '<span class="raiz-cont">' + contenidoHtml + '</span></span>';
}
