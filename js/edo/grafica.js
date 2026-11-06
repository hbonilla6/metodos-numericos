/* ==========================================================================
   Gráfica de la ecuación diferencial: los puntos (xᵢ, yᵢ) del método unidos
   por rectas y, si se escribió, la solución exacta.
   ========================================================================== */

function graficarEdo(datos, resultado, textoDelMetodo, solucionExacta) {
  const { x0, xn } = datos;
  const puntos = resultado.filas.map(fila => ({ x: fila.x.toNumber(), y: fila.y.toNumber() }));
  const [xMin, xMax] = rangoConMargen([x0.toNumber(), xn.toNumber()], 0.05);

  const opciones = {
    xMin,
    xMax,
    series: [{ puntos, color: 'var(--red)', titulo: textoDelMetodo }],
    etiquetaX: 'x',
  };
  const leyenda = [{ color: 'var(--red)', texto: textoDelMetodo }];

  if (solucionExacta) {
    opciones.curvas = [{ f: x => solucionExacta(x).toNumber(), color: 'var(--ink)', grosor: 2.5 }];
    leyenda.unshift({ color: 'var(--ink)', texto: 'solución exacta' });
  }

  dibujarGrafica('grafica', opciones);
  dibujarLeyenda('graficaLeyenda', leyenda);
  document.getElementById('graficaCard').style.display = 'block';
}
