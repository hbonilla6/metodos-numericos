/* ==========================================================================
   Interpolación de Hermite con diferencias divididas (fracciones exactas).

   Cada punto xⱼ aporta su valor f(xⱼ) y su derivada f'(xⱼ). Se repite cada x dos veces:
     z₀ = z₁ = x₀,  z₂ = z₃ = x₁,  …
   y se arma la tabla de diferencias divididas. Donde la fórmula pediría dividir entre
   cero (zᵢ = zᵢ₊₁), se usa la derivada: f[zᵢ, zᵢ₊₁] = f'(xⱼ).

   columnas[k][i] = f[zᵢ, …, zᵢ₊ₖ]   (la columna 0 son los valores f(zᵢ))
   ========================================================================== */

/** Los puntos z: cada x aparece dos veces seguidas. */
function repetirPuntos(puntos) {
  return puntos.flatMap(punto => [punto.x, punto.x]);
}

/** ¿La celda f[zᵢ, zᵢ₊ₖ] usa la derivada en vez de dividir? (solo en la columna 1, entre z repetidos) */
function usaDerivada(z, columna, fila) {
  return columna === 1 && z[fila] === z[fila + 1];
}

/** Punto de origen de zᵢ: z₀ y z₁ vienen del punto 0, z₂ y z₃ del punto 1, … */
function puntoDeZ(indiceDeZ) {
  return Math.floor(indiceDeZ / 2);
}

/** Devuelve { z, columnas } con las diferencias divididas como fracciones exactas. */
function calcularDiferenciasDivididas(puntos) {
  const z = repetirPuntos(puntos);
  const columnas = [z.map((valor, i) => crearFraccion(puntos[puntoDeZ(i)].fx))];

  for (let columna = 1; columna < z.length; columna++) {
    const anterior = columnas[columna - 1];
    const actual = [];
    for (let fila = 0; fila < z.length - columna; fila++) {
      if (usaDerivada(z, columna, fila)) {
        actual.push(crearFraccion(puntos[puntoDeZ(fila)].dfx));
        continue;
      }
      const diferencia = restar(anterior[fila + 1], anterior[fila]);
      actual.push(dividir(diferencia, crearFraccion(z[fila + columna] - z[fila])));
    }
    columnas.push(actual);
  }
  return { z, columnas };
}

/**
 * Polinomio de Hermite en forma de Newton:
 *   H(x) = f[z₀] + f[z₀,z₁](x − z₀) + f[z₀,z₁,z₂](x − z₀)(x − z₁) + …
 * Devuelve cada término (coeficiente, base y término ya multiplicado) y el polinomio total.
 */
function construirPolinomioDeHermite(z, columnas) {
  const terminos = [];
  let base = [crearFraccion(1)];            // (x − z₀)(x − z₁)… hasta el término anterior
  let total = polinomioNulo(z.length - 1);

  columnas.forEach((columna, k) => {
    const coeficiente = columna[0];         // la diagonal superior de la tabla
    const expandido = multiplicarPolinomioPorNumero(base, coeficiente);
    terminos.push({ coeficiente, base, expandido, factores: z.slice(0, k) });
    total = sumarPolinomios(total, expandido);
    base = multiplicarPolinomios(base, factorLineal(crearFraccion(z[k])));
  });
  return { terminos, total };
}

// ---------- Comprobación: H(xⱼ) = f(xⱼ) y H'(xⱼ) = f'(xⱼ) ----------

function derivarPolinomio(polinomio) {
  return polinomio.slice(1).map((coeficiente, i) => multiplicar(coeficiente, crearFraccion(i + 1)));
}

function evaluarPolinomioExacto(polinomio, x) {
  const punto = crearFraccion(x);
  let valor = crearFraccion(0);
  for (let grado = polinomio.length - 1; grado >= 0; grado--) {
    valor = sumar(multiplicar(valor, punto), polinomio[grado]); // regla de Horner
  }
  return valor;
}
