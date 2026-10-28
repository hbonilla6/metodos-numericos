/* ==========================================================================
   Método de Hermite para la página de interpolación: tabla de diferencias
   divididas y polinomio. Ver pagina.js para el contrato de un método.
   Campos: x (punto), f (f(x)) y d (f'(x)); el tercer punto es opcional.
   ========================================================================== */

const metodoHermite = {
  clave: 'hermite',
  cantidadDePuntos: 3,
  campos: [
    { prefijo: 'x', ayuda: 'x' },
    { prefijo: 'f', ayuda: 'f(x)' },
    { prefijo: 'd', ayuda: "f'(x)" },
  ],
  nota: "Escribe cada punto con su valor f(x) y su derivada f'(x). Con 2 puntos el polinomio es de grado 3; con 3 puntos, de grado 5. El tercer punto es opcional.",
  mensajeIncompleto: "Completa x, f(x) y f'(x) en cada punto que uses.",

  /** Dibuja el resultado; devuelve el mensaje de error si los datos no sirven. */
  resolver(escritos) {
    const sonEnteros = escritos.every(punto => [punto.x, punto.f, punto.d].every(valor => ES_ENTERO.test(valor.trim())));
    if (!sonEnteros) return 'Usa números enteros (esta herramienta trabaja con fracciones exactas).';

    const puntos = escritos.map(punto => ({
      x: parseInt(punto.x.trim(), 10),
      fx: parseInt(punto.f.trim(), 10),
      dfx: parseInt(punto.d.trim(), 10),
    }));
    if (new Set(puntos.map(punto => punto.x)).size !== puntos.length) return 'Los valores de x deben ser distintos entre sí.';

    const { z, columnas } = calcularDiferenciasDivididas(puntos);
    estado.puntos = puntos;
    estado.z = z;
    estado.columnas = columnas;
    construirGrafoDeDependencias();

    dibujarTablaDeDiferencias();
    document.getElementById('explainBox').innerHTML = '<p class="empty">Toca cualquier celda para ver cómo se calculó.</p>';
    document.getElementById('tablaCard').style.display = 'block';

    const polinomio = construirPolinomioDeHermite(z, columnas);
    document.getElementById('pasos').innerHTML = procedimientoDeHermiteEnHtml(polinomio);
    document.getElementById('resultCard').style.display = 'block';
    graficarHermite(polinomio.total, puntos);
    return null;
  },
};
