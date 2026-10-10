/* ==========================================================================
   Lo que la página de Hermite recuerda mientras se usa.
   ========================================================================== */

const estado = {
  puntos: [],       // [{ x, fx, dfx }]
  z: [],            // z₀, z₁, …
  columnas: [],     // columnas[k][i] = f[zᵢ, …, zᵢ₊ₖ]
  grafo: new GrafoDeDependencias(),
};
