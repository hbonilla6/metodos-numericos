/* ==========================================================================
   Formato de números Decimal para mostrarlos en pantalla.
   Requiere decimal.js cargado antes.
   ========================================================================== */

Decimal.set({ precision: 40 });

const DECIMALES_VISIBLES = 10;
const UMBRAL_CIENTIFICO = '1e-10';

/**
 * Convierte un Decimal en texto legible, sin ceros de sobra:
 * 3.0000000000 → 3, 0.5000 → 0.5, −0 → 0.
 * Los números diminutos salen en notación científica (1.2 × 10⁻¹³) en vez de un "0" engañoso.
 */
function formatear(valor) {
  if (valor === null || valor === undefined) return '—';

  const esDiminuto = !valor.isZero() && valor.isFinite() && valor.abs().lessThan(UMBRAL_CIENTIFICO);
  if (esDiminuto) {
    const exponente = valor.e;
    const mantisa = valor.dividedBy(new Decimal(10).pow(exponente)).toDecimalPlaces(4).toString().replace('-', '−');
    return mantisa + ' × 10<sup>' + String(exponente).replace('-', '−') + '</sup>';
  }

  let texto = valor.toFixed(DECIMALES_VISIBLES);
  if (texto.includes('.')) texto = texto.replace(/0+$/, '').replace(/\.$/, '');
  if (texto === '-0' || texto === '') texto = '0';
  return texto.replace('-', '−');
}

/** Marca con una llave y un contador los dígitos que se repiten (0.3333333 → "3" con un 7 debajo). */
function anotarRepeticiones(texto) {
  let resultado = '';
  let i = 0;
  while (i < texto.length) {
    const caracter = texto[i];
    if (!/[0-9]/.test(caracter)) {
      resultado += caracter;
      i++;
      continue;
    }
    let fin = i;
    while (fin < texto.length && texto[fin] === caracter) fin++;
    const repeticiones = fin - i;
    const digitos = caracter.repeat(repeticiones);
    // El contador va en data-n y lo dibuja el CSS (::after): así no forma parte del texto y no se copia con el número
    resultado += repeticiones >= 2
      ? '<span class="run-brace-char" data-n="' + repeticiones + '">' + digitos + '</span>'
      : digitos;
    i = fin;
  }
  return resultado;
}

/** Igual que formatear, pero con las repeticiones anotadas (para las celdas de las tablas). */
function formatearAnotado(valor) {
  const texto = formatear(valor);
  return texto.includes('<sup>') ? texto : anotarRepeticiones(texto);
}

/** Pone el valor entre paréntesis si es negativo, para usarlo dentro de sumas y productos. */
function entreParentesisSiNegativo(valor) {
  return valor.isNegative() && !valor.isZero() ? '(' + formatear(valor) + ')' : formatear(valor);
}
