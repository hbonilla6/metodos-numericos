const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, referencias, valorDeCeldaEnPagina, decimalDeFraccion } = require('./ayudas');

function resolver(A, b) {
  const pagina = abrirPagina('gauss_seidel.html');
  A.forEach((fila, i) => {
    fila.forEach((valor, j) => pagina.escribir('a' + i + j, valor));
    pagina.escribir('b' + i, b[i]);
  });
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

describe('página de Gauss-Seidel', () => {
  it('muestra a los integrantes y no tiene Jacobi', () => {
    const pagina = abrirPagina('gauss_seidel.html');
    const texto = pagina.d.querySelector('.wrap').textContent;
    ['VM100925', 'MM102325', 'GD100325', 'MM102425', 'BF100124'].forEach(carnet => assert.ok(texto.includes(carnet), carnet));
    assert.ok(!texto.includes('Jacobi'));
    pagina.cerrar();
  });

  referencias.sistemas.slice(0, 5).forEach((caso, i) => {
    it(`sistema ${i + 1}: la tabla sigue la traza de Gauss-Seidel`, () => {
      const pagina = resolver(caso.A, caso.b);
      assert.deepStrictEqual(pagina.errores, []);
      const esperadas = caso.trazas.gauss;
      const filas = pagina.d.querySelectorAll('#tableBody tr').length;
      for (let k = 1; k <= Math.min(filas, esperadas.length); k++) {
        [0, 1, 2].forEach(j => {
          const real = valorDeCeldaEnPagina(pagina, 'v' + j, k);
          const esperado = Number(esperadas[k - 1].x[j]);
          assert.ok(Math.abs(real - esperado) <= 1e-9 * Math.max(1, Math.abs(esperado)), `iteración ${k}, ${'xyz'[j]}`);
        });
      }
      pagina.cerrar();
    });
  });

  it('la respuesta final coincide con la solución exacta', () => {
    const caso = referencias.sistemas[0];
    const pagina = resolver(caso.A, caso.b);
    const mostrados = [...pagina.d.querySelectorAll('.final-answer strong')].map(e => Number(e.textContent.replace('−', '-')));
    assert.strictEqual(mostrados.length, 3);
    caso.solucion.forEach((valor, j) => assert.ok(Math.abs(mostrados[j] - Number(decimalDeFraccion(valor))) < 5e-6));
    pagina.cerrar();
  });
});
