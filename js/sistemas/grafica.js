/* ==========================================================================
   Gráfica de las iteraciones: cómo cambian x, y, z de una iteración a otra.
   Si el método converge, las tres líneas se aplanan hacia la solución;
   si diverge, se alejan.
   ========================================================================== */

const COLORES_DE_VARIABLES = ['var(--ink)', 'var(--red)', 'var(--green)'];

function graficarIteraciones(resultado) {
  const filas = estado.filas; // incluye la fila 0 (valores iniciales)
  const ultima = filas.length - 1;
  const [xMin, xMax] = rangoConMargen([0, ultima], 0.04);

  const series = NOMBRES_VARIABLES.map((nombre, j) => ({
    titulo: nombre,
    color: COLORES_DE_VARIABLES[j],
    puntos: filas.map(fila => ({ x: fila.iteracion, y: fila.x[j].toNumber() })),
  }));

  // Con solución: una línea punteada del color de cada variable en su valor final
  const segmentos = resultado.estado === ESTADO.CONVERGIO
    ? NOMBRES_VARIABLES.map((nombre, j) => {
        const valor = filas[ultima].x[j].toNumber();
        return { x1: 0, y1: valor, x2: ultima, y2: valor, color: COLORES_DE_VARIABLES[j], discontinuo: true };
      })
    : [];

  // La iteración de control (15) se marca si la tabla llega más allá
  const verticales = ultima > ITERACION_DE_CONTROL
    ? [{ x: ITERACION_DE_CONTROL, color: 'var(--muted)', etiqueta: 'iteración ' + ITERACION_DE_CONTROL }]
    : [];

  document.getElementById('graficaCard').style.display = 'block';
  dibujarGrafica('grafica', { xMin, xMax, series, segmentos, verticales, etiquetaX: 'iteración' });

  const leyenda = NOMBRES_VARIABLES.map((nombre, j) => ({ color: COLORES_DE_VARIABLES[j], texto: nombre }));
  if (segmentos.length) leyenda.push({ color: 'var(--muted)', texto: 'línea punteada: valor final de cada variable' });
  dibujarLeyenda('graficaLeyenda', leyenda);
}
