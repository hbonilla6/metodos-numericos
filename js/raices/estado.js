/* ==========================================================================
   Los cinco métodos y lo que la página recuerda mientras se usa.
   ========================================================================== */

// Para cada método: su nombre y los ids de su pestaña, su contador de iteraciones y su estrella
const METODOS = {
  bisec:     { nombre: 'Bisección',      pestana: 'tabBisec',   contador: 'iterBisec',   estrella: 'badgeBisec' },
  falsa:     { nombre: 'Regla Falsa',    pestana: 'tabFalsa',   contador: 'iterFalsa',   estrella: 'badgeFalsa' },
  secante:   { nombre: 'Secante',        pestana: 'tabSecante', contador: 'iterSecante', estrella: 'badgeSecante' },
  newton:    { nombre: 'Newton-Raphson', pestana: 'tabNewton',  contador: 'iterNewton',  estrella: 'badgeNewton' },
  puntofijo: { nombre: 'Punto Fijo',     pestana: 'tabPF',      contador: 'iterPF',      estrella: 'badgePF' },
};

const estado = {
  metodo: 'bisec',                // clave de METODOS
  eligioMetodoAMano: false,       // true cuando el usuario toca una pestaña (ya no se cambia sola); se reinicia al cambiar f(x)

  filas: [],                      // filas de la tabla que se está mostrando
  funcion: null,                  // f(x), con .tokens y .arbol
  derivada: null,                 // f'(x), solo en Newton-Raphson
  funcionG: null,                 // g(x), solo en punto fijo
  grafo: new GrafoDeDependencias(),
};
