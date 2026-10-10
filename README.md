# Métodos numéricos

Herramientas web para resolver métodos numéricos **paso a paso**: cada resultado muestra el procedimiento completo, con las fórmulas en notación matemática (fracciones, raíces, exponentes) y la gráfica cuando tiene sentido. Pensado para estudiar y para comprobar ejercicios hechos a mano.

**Es un sitio estático**: no hay servidor, base de datos ni compilación. Todo el cálculo ocurre en el navegador de quien lo usa.

## Las herramientas

| Página | Qué resuelve | Gráfica |
|---|---|---|
| [`index.html`](index.html) | Portada con las herramientas | — |
| [`metodos_comparacion.html`](metodos_comparacion.html) | **Raíces de ecuaciones** f(x) = 0: bisección, regla falsa, secante, Newton-Raphson y punto fijo | f(x) con la raíz y el camino de cada método |
| [`sistemas_lineales.html`](sistemas_lineales.html) | **Sistemas 3×3** con Jacobi y Gauss-Seidel | x, y, z por iteración |
| [`interpolacion.html`](interpolacion.html) | **Interpolación de Lagrange**, lineal (2 puntos) y parabólica (3 puntos) | P(x) con los puntos |
| [`hermite.html`](hermite.html) | **Interpolación de Hermite** con diferencias divididas (2 o 3 puntos con f(x) y f'(x)) | H(x) con puntos y pendientes |

### Raíces de ecuaciones

- **Entrada:** f(x), los extremos `a` y `b` (o `x₀` y `x₁`) y la tolerancia (por defecto 10⁻⁷).
- **Escribir f(x):** usa `x`, números con punto decimal, `+ − * / ^` y paréntesis. La multiplicación puede ir implícita: `2x^3 - x^2 - 3`, `(x+1)(x-1)`. No hay funciones como `sin` o `ln`.
- **Los cinco métodos** se corren al mismo tiempo; la pestaña con ★ es la que llega a la tolerancia en menos iteraciones y se abre sola (si tocas una pestaña a mano, ya no cambia).
- **Tabla interactiva:** al tocar una celda se explica cómo se calculó, con la fórmula, la sustitución y el resultado; las celdas de las que depende se pintan del mismo color que su referencia en la explicación. Los números de f(x) y los datos de entrada parpadean al tocarlos desde la explicación.
- **Newton-Raphson** deriva f(x) simbólicamente y muestra la derivada término por término.
- **Punto fijo** despeja g(x) solo: aísla un término con x de f(x) = 0 (el de mayor grado primero) y prueba cada despeje hasta encontrar uno que converja. Solo funciona con polinomios sencillos.
- **Tope:** 80 iteraciones por método.

### Sistemas de ecuaciones

- **Entrada:** tres ecuaciones con x, y, z. Un coeficiente vacío vale 1, y `0` si la variable no aparece. Para restar se escribe el coeficiente negativo; la **vista previa** muestra el sistema tal como quedó escrito. Acepta coma decimal.
- **Diagonal dominante:** antes de iterar se muestra cómo se acomodan las ecuaciones (sistema original → sistema con la diagonal acomodada en rojo) y la comprobación |diagonal| > suma de |los demás| en cada fila.
- **Orden de clase:** si algún orden deja la diagonal estrictamente dominante, se usa ese; si no, se pone en x la fila con el mayor coeficiente de x, luego en y, y z con la última (el procedimiento que se hace a mano). Si con ese orden ningún método converge pero existe otro que sí, se ofrece con un botón.
- **Veredicto** (Converge / Converge pero muy lento / Diverge) y respuesta final redondeada a 6 decimales.
- **Regla de las 15 iteraciones:** en la iteración 15 se compara el error con el de la iteración 6; si no baja, se declara que diverge y se detiene. (Se compara con nueve iteraciones atrás, y no con tres, porque el error puede oscilar: con tres, 1.3 % de los sistemas que sí convergen se daban por perdidos.) Si va bajando, se sigue hasta la tolerancia (máximo 150 iteraciones; si se llega al tope y el error no bajó en el último tercio, también se declara divergente). Si la respuesta aparece hasta la iteración 25, se muestra la tabla completa; si tarda más, se muestran las primeras 15 con un botón para ver el resto.
- **Tolerancia** fija en 10⁻⁷, con el error como norma infinito (la mayor diferencia entre dos iteraciones).
- **Sistemas singulares** (determinante casi cero) se rechazan con un aviso.

### Interpolación de Lagrange

- **Entrada:** 2 o 3 puntos con coordenadas **enteras** (se trabaja con fracciones exactas).
- Muestra la fórmula con tus puntos, cada término expandido y simplificado, y la suma de términos semejantes, igual que en el pizarrón.

### Interpolación de Hermite

- **Entrada:** 2 o 3 puntos con x, f(x) y f'(x) **enteros**.
- Cada x se repite dos veces (z₀ = z₁ = x₀, z₂ = z₃ = x₁, …) y se arma la tabla de diferencias divididas. En las celdas entre z repetidos se usa la derivada en lugar de dividir entre cero.
- El polinomio sale en forma de Newton, se expande término por término y se **comprueba** con fracciones exactas que H(xⱼ) = f(xⱼ) y H'(xⱼ) = f'(xⱼ).

## Qué usamos para que los cálculos sean exactos y correctos

No hay frameworks ni dependencias que instalar. Solo **una librería externa** y herramientas del propio navegador:

| Qué | Para qué | Dónde se usa |
|---|---|---|
| [**decimal.js 10.4.3**](https://github.com/MikeMcl/decimal.js) (por CDN) | Aritmética decimal de **40 dígitos significativos**. Evita los errores típicos de `0.1 + 0.2` de los números de JavaScript y permite iterar sin arrastrar error de redondeo. | Raíces y sistemas |
| **`BigInt`** (nativo del navegador) | **Fracciones exactas**: numerador y denominador enteros sin límite, siempre simplificados. No hay redondeo en ningún paso. | Lagrange y Hermite |
| **Analizador y derivador propios** | Convierte el texto de f(x) en un árbol, lo evalúa con `Decimal` y lo deriva simbólicamente (suma, producto, cociente y potencias con exponente numérico). **No usa `eval`**, así que nada de lo escrito se ejecuta como código. | Raíces |
| **Gráficas SVG propias** (`js/comun/grafica.js`) | Dibuja curvas, puntos y segmentos sin librerías: funciona sin internet y se adapta al ancho de la pantalla. | Todas las herramientas |
| `localStorage` | Recuerda lo escrito y la casilla "Mostrar error" en ese navegador. Si el navegador no lo permite, todo sigue funcionando sin guardar. | Todas las herramientas |
| Google Fonts (Literata y Source Sans 3) | Solo tipografía. | Todas las páginas |

Detalles que cuidan la corrección:

- Los valores se muestran sin ceros de sobra (`3.0000000000` se ve como `3`), los dígitos repetidos llevan una llave con su contador (0.3333333) y los números diminutos salen en notación científica (`1.2 × 10⁻¹³`) en vez de un `0` engañoso.
- Un sistema o una f(x) mal escritos nunca rompen la página: se avisa qué revisar.
- Los resultados se contrastaron con los ejercicios resueltos a mano en clase: los 6 de Lagrange, el ejemplo de Gauss-Seidel (2x + y + z = 6, x + 3y − 2z = 13, x − 2y − 3z = −1, que converge a 2, 3, −1) y el de Hermite (H(x) = 2x³ + x² + 2x + 4).
- Hay una batería de pruebas automáticas (ver [Pruebas](#pruebas)).
- Los números que se muestran se pueden copiar sin sorpresas: el contador de dígitos repetidos lo dibuja el CSS y no forma parte del texto.

**Limitaciones conocidas:** la interpolación solo acepta enteros; los sistemas son siempre de 3×3; punto fijo solo despeja polinomios sencillos; f(x) no admite funciones trascendentes (`sin`, `ln`, `e^x`).

## Pruebas

Más de 1 200 pruebas automáticas comprueban los cálculos y también lo que se muestra en pantalla. Se necesita Node.js 22 o superior:

```bash
npm install     # una sola vez (instala decimal.js y jsdom, solo para las pruebas)
npm test        # corre todas las pruebas (≈ 1 minuto)
```

**Qué se prueba**

- **Contra una referencia independiente.** `pruebas/referencias/generar_referencias.py` calcula, solo con la biblioteca estándar de Python (`fractions` y `decimal` de 80 dígitos), los valores esperados: evaluación y derivada de 30 expresiones en 10 puntos, 86 interpolaciones de Lagrange y 81 de Hermite (resueltas como sistemas lineales exactos, con la tabla de diferencias divididas completa), 25 sistemas 3×3 (solución exacta, determinante, orden de ecuaciones y 16 iteraciones de Jacobi y de Gauss-Seidel) y las tablas completas de bisección, regla falsa, secante, Newton y punto fijo para 9 funciones. Cada método está escrito de nuevo desde la fórmula del libro. Para regenerar el archivo: `python pruebas/referencias/generar_referencias.py`.
- **Propiedades matemáticas.** Álgebra de fracciones y polinomios con miles de casos al azar; `simplificar` no cambia el valor y la derivada simbólica coincide con diferencias finitas en cientos de árboles al azar; la bisección siempre mantiene la raíz encerrada y reduce el intervalo a la mitad; Jacobi y Gauss-Seidel contra el radio espectral de su matriz de iteración (4 000 sistemas al azar) y contra el teorema de la diagonal dominante.
- **Lo que se ve.** Se abren las páginas completas y se pulsa cada celda de cada tabla: en cada explicación se evalúa como número cada paso de la fórmula (con las referencias a otras celdas sustituidas por su valor) y todos los pasos de una misma cadena deben dar el mismo resultado. Las fórmulas dibujadas con fracciones y raíces se evalúan y deben valer lo mismo que la función. Las gráficas se leen con los números de sus ejes: la curva debe ser f(x), la raíz debe quedar sobre el eje x, las tangentes de Newton deben cruzar donde dicen, y lo que sube debe verse arriba.
- **Mutaciones.** Se rompió el código a propósito de 36 maneras distintas (signos, fórmulas, criterios de paro, ejes, dependencias…) y se comprobó que alguna prueba lo detecta; las que sobrevivieron al principio llevaron a escribir pruebas nuevas.

**Qué no cubren:** el aspecto visual (colores, tipografías, cómo se acomoda en cada pantalla se revisó a mano) ni los detalles internos de decimal.js y del navegador.

## Cómo usarlo

Abre [`index.html`](index.html) en el navegador, o sirve la carpeta:

```bash
python -m http.server
```

y entra a `http://localhost:8000`. Necesita internet solo para cargar decimal.js y las tipografías.

## Publicación

El sitio se publica solo con **GitHub Pages**: cada `push` a `main` ejecuta [`.github/workflows/static.yml`](.github/workflows/static.yml), que sube la carpeta completa. Los archivos de `css/` y `js/` deben subirse junto con los HTML.

## Estructura del proyecto

```
index.html, *.html     páginas (solo estructura; sin estilos ni lógica)
css/
  base.css             estilos compartidos: variables, tarjetas, botones, pestañas, tablas, fórmulas, gráficas
  portada.css          portada
  raices.css           raíces de ecuaciones
  sistemas.css         sistemas de ecuaciones
  interpolacion.css    interpolación (también lo usa Hermite)
  hermite.css          Hermite
js/
  comun/               piezas que usan varias páginas
    notacion.js          subíndices, fracciones y raíces en HTML
    formato.js           números Decimal para mostrar (3.0000 → 3)
    algebra-exacta.js    fracciones (BigInt) y polinomios exactos, y su escritura en HTML
    utilidades.js        mensajes de estado, retardo al escribir, pasos titulados
    almacenamiento.js    guardar lo escrito en el navegador
    tabla-interactiva.js selección de celdas, colores y enlaces de las explicaciones
    grafica.js           graficador SVG
  raices/              expresion, derivada, metodos, punto-fijo, formulas, comparacion,
                       explicaciones, tabla, grafica, pagina
  sistemas/            matematica, entrada, despeje, tabla, explicaciones, veredicto, grafica, pagina
  interpolacion/       lagrange, presentacion, grafica, pagina
  hermite/             diferencias, tabla, explicaciones, presentacion, grafica, pagina
pruebas/               pruebas automáticas (ver Pruebas) y sus referencias calculadas con Python
package.json           solo declara las dependencias de las pruebas; el sitio no las necesita
```

Cada página carga sus scripts al final del `<body>`, en orden: primero `comun/`, luego los de su carpeta y `pagina.js` al último. No hay módulos ni empaquetador: cada archivo declara funciones globales y **el orden de las etiquetas `<script>` es el orden de dependencia**.

### Cómo está organizada cada herramienta

Los archivos se separan por tarea, de lo más puro a lo más cercano a la pantalla:

- **Matemática** (sin tocar la pantalla): `matematica.js` en sistemas; `expresion.js`, `derivada.js`, `metodos.js` y `punto-fijo.js` en raíces; `lagrange.js` y `diferencias.js` en interpolación.
- **Entrada:** lee y valida lo que se escribe.
- **Presentación:** tabla, fórmulas, explicaciones, veredicto y gráfica.
- **`pagina.js`:** une todo y atiende los eventos. Es el único archivo que conoce el orden del flujo.

### Agregar una herramienta nueva

1. Crea `miherramienta.html` copiando la estructura de una existente (carga `css/base.css` y los scripts de `js/comun/` que necesites).
2. Crea `css/miherramienta.css` solo con lo que sea propio de esa página.
3. Crea `js/miherramienta/` con la matemática en un archivo, la presentación en otro y `pagina.js` al final.
4. Agrega una tarjeta en `index.html`.

## Convenciones del código

- Nombres en español, completos y descriptivos (`calcularPaso`, `ordenesPosibles`). Las únicas abreviaturas son las matemáticas (`fa`, `fxi`, `xi`).
- Las funciones de cálculo no leen ni escriben el DOM: reciben datos y devuelven datos.
- El estado de las páginas que lo necesitan vive en un solo objeto, `estado`, nunca repartido en variables sueltas.
- Los comentarios explican el porqué o el significado de un dato, no repiten lo que dice el código.
- Los ids y clases del HTML son parte del contrato entre las páginas, el CSS y el JS: si se cambia uno, hay que buscarlo en los tres lugares.
