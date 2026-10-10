"""
Genera pruebas/referencias/referencias.json: valores de referencia calculados SIN usar el código
de la página, solo con la biblioteca estándar de Python:

  - `fractions` (aritmética racional exacta) para evaluaciones, derivadas, interpolación y sistemas;
  - `decimal` con 80 dígitos para raíces y para las trazas de los métodos iterativos.

Cada método iterativo está escrito aquí de nuevo, desde la fórmula del libro, sin mirar el JavaScript.
Para regenerar:   python pruebas/referencias/generar_referencias.py
"""
import itertools
import json
import random
import re
from decimal import Decimal, getcontext
from fractions import Fraction

random.seed(20251020)
getcontext().prec = 80
SALIDA = __file__.replace('generar_referencias.py', 'referencias.json')


def fr(f):
    return f'{f.numerator}/{f.denominator}'


def dec(d, digitos=60):
    return format(d, f'.{digitos}g')


# ----------------------------------------------------------------------------
# Números duales (valor y derivada exactos): derivación automática sobre Fraction o Decimal
# ----------------------------------------------------------------------------
class Dual:
    def __init__(self, a, b=None):
        self.a = a
        self.b = b if b is not None else a * 0

    @staticmethod
    def _de(x, como):
        return x if isinstance(x, Dual) else Dual(como(x))

    def _otro(self, o):
        return o if isinstance(o, Dual) else Dual(o, self.a * 0)

    def __add__(s, o): o = s._otro(o); return Dual(s.a + o.a, s.b + o.b)
    __radd__ = __add__
    def __sub__(s, o): o = s._otro(o); return Dual(s.a - o.a, s.b - o.b)
    def __rsub__(s, o): return s._otro(o) - s
    def __mul__(s, o): o = s._otro(o); return Dual(s.a * o.a, s.a * o.b + s.b * o.a)
    __rmul__ = __mul__
    def __truediv__(s, o):
        o = s._otro(o)
        return Dual(s.a / o.a, (s.b * o.a - s.a * o.b) / (o.a * o.a))
    def __rtruediv__(s, o): return s._otro(o) / s
    def __neg__(s): return Dual(-s.a, -s.b)

    def __pow__(s, n):
        n = n.a if isinstance(n, Dual) else n
        n = int(n)  # solo exponentes enteros
        if n < 0:
            return Dual(s.a * 0 + 1, s.a * 0) / (s ** -n)
        resultado = Dual(s.a * 0 + 1, s.a * 0)
        for _ in range(n):
            resultado = resultado * s
        return resultado


def evaluar_python(expresion, x, tipo):
    """Evalúa la expresión (sintaxis de Python) en x con derivada exacta. tipo = Fraction o Decimal."""
    texto = re.sub(r'\d+(\.\d+)?', lambda m: f"N('{m.group(0)}')", expresion)
    entorno = {'N': tipo, 'x': Dual(tipo(x), tipo(1))}
    resultado = eval(texto, {'__builtins__': {}}, entorno)  # noqa: S307 (expresiones escritas aquí mismo)
    return resultado if isinstance(resultado, Dual) else Dual(resultado, tipo(0))


# ----------------------------------------------------------------------------
# 1. Evaluación y derivada de expresiones (sintaxis de la página ↔ sintaxis de Python)
# ----------------------------------------------------------------------------
EXPRESIONES = [
    ('2*x^3 - x^2 - 3', '2*x**3 - x**2 - 3', True),
    ('x^3 - 2*x - 5', 'x**3 - 2*x - 5', True),
    ('x^2/3 - 2', 'x**2/3 - 2', True),
    ('(x+1)/(x-3) - 2', '(x+1)/(x-3) - 2', True),
    ('2x^2 + 3x - 5', '2*x**2 + 3*x - 5', True),
    ('-x^2', '-x**2', True),
    ('2^-1*x', '2**-1*x', True),
    ('(x+1)(x-1)', '(x+1)*(x-1)', True),
    ('3/(x^2+1)', '3/(x**2+1)', True),
    ('x^4 - 3*x - 1', 'x**4 - 3*x - 1', True),
    ('1/x + x', '1/x + x', True),
    ('-(x-2)^3', '-(x-2)**3', True),
    ('(x^2)^3', '(x**2)**3', True),
    ('5 - -x', '5 - -x', True),
    ('-x^-2', '-x**-2', True),
    ('0.5*x^2 - 0.25', '0.5*x**2 - 0.25', True),
    ('(2x+1)/(x^2-4)', '(2*x+1)/(x**2-4)', True),
    ('x(x+1)(x+2)', 'x*(x+1)*(x+2)', True),
    ('2(x-1)^2', '2*(x-1)**2', True),
    ('x^2x', 'x**2*x', True),
    ('3x^2 - 2x + 1', '3*x**2 - 2*x + 1', True),
    ('1/(x+2)^2', '1/(x+2)**2', True),
    ('-3x', '-3*x', True),
    ('x^3 + 1', 'x**3 + 1', True),
    ('1.5*x - 2.75', '1.5*x - 2.75', True),
    ('(x-1)/(x+1)', '(x-1)/(x+1)', True),
    ('x^2^2', 'x**2**2', False),            # exponente que no es un número: se evalúa pero no se deriva
    ('2^3^2', '2**3**2', False),
    ('x^(1+1)', 'x**(1+1)', False),
    ('x^-1', 'x**-1', True),
]
PUNTOS = ['-2.5', '-1.5', '-0.5', '0.3', '1', '2', '2.3', '5', '10', '-7']

expresiones = []
for nuestra, de_python, derivable in EXPRESIONES:
    casos = []
    for p in PUNTOS:
        try:
            r = evaluar_python(de_python, p, Fraction)
            casos.append({'x': p, 'valor': fr(r.a), 'derivada': fr(r.b) if derivable else None})
        except ZeroDivisionError:
            continue
    expresiones.append({'expresion': nuestra, 'derivable': derivable, 'casos': casos})


# ----------------------------------------------------------------------------
# 2. Interpolación: Lagrange y Hermite resueltas como sistemas lineales exactos
# ----------------------------------------------------------------------------
def resolver_exacto(matriz, vector):
    n = len(vector)
    m = [[Fraction(v) for v in fila] + [Fraction(b)] for fila, b in zip(matriz, vector)]
    for col in range(n):
        pivote = next(i for i in range(col, n) if m[i][col] != 0)
        m[col], m[pivote] = m[pivote], m[col]
        m[col] = [v / m[col][col] for v in m[col]]
        for i in range(n):
            if i != col and m[i][col] != 0:
                factor = m[i][col]
                m[i] = [a - factor * b for a, b in zip(m[i], m[col])]
    return [m[i][n] for i in range(n)]


def evaluar_poli(coef, x):
    return sum(c * Fraction(x) ** k for k, c in enumerate(coef))


def derivada_poli(coef):
    return [c * k for k, c in enumerate(coef)][1:]


def lagrange_ref(puntos):
    n = len(puntos)
    matriz = [[Fraction(x) ** k for k in range(n)] for x, _ in puntos]
    return resolver_exacto(matriz, [y for _, y in puntos])


def hermite_ref(puntos):
    n = 2 * len(puntos)
    filas, rhs = [], []
    for x, f, d in puntos:
        filas.append([Fraction(x) ** k for k in range(n)]); rhs.append(f)
        filas.append([Fraction(k) * Fraction(x) ** (k - 1) if k else Fraction(0) for k in range(n)]); rhs.append(d)
    return resolver_exacto(filas, rhs)


def coeficientes_de_newton(coef, nodos):
    """Coeficientes de la forma de Newton de un polinomio respecto de los nodos (división sintética sucesiva)."""
    poli = list(coef)
    resultado = []
    for z in nodos:
        z = Fraction(z)
        valor = evaluar_poli(poli, z)
        resultado.append(valor)
        poli[0] -= valor
        # dividir entre (x - z)
        grado = len(poli) - 1
        cociente = [Fraction(0)] * grado
        resto = Fraction(0)
        for k in range(grado, 0, -1):
            resto = poli[k] + resto * z
            cociente[k - 1] = resto
        poli = cociente if cociente else [Fraction(0)]
    return resultado


def distintos(cantidad, bajo=-8, alto=8):
    return random.sample(range(bajo, alto + 1), cantidad)


lagrange = []
CLASE_LAGRANGE = [
    [(0, 2), (1, 3)], [(7, 30), (-6, -22)], [(1, 2), (2, 0)],
    [(1, 3), (4, 18), (6, 38)], [(1, 10), (-4, 10), (-7, 34)], [(-6, 8), (6, -16), (-1, -2)],
]
casos_lagrange = list(CLASE_LAGRANGE)
for cantidad in (2, 3):
    for _ in range(40):
        xs = distintos(cantidad)
        casos_lagrange.append([(x, random.randint(-20, 20)) for x in xs])
for puntos in casos_lagrange:
    lagrange.append({'puntos': puntos, 'coeficientes': [fr(c) for c in lagrange_ref(puntos)]})

hermite = []
casos_hermite = [[(-2, -12, 22), (1, 9, 10)]]
for cantidad in (2, 3):
    for _ in range(40):
        xs = distintos(cantidad)
        casos_hermite.append([(x, random.randint(-15, 15), random.randint(-15, 15)) for x in xs])
for puntos in casos_hermite:
    coef = hermite_ref(puntos)
    z = [x for x, _, _ in puntos for _ in (0, 1)]
    tabla = []   # tabla[k][i] = f[z_i, ..., z_(i+k)]
    for k in range(len(z)):
        tabla.append([fr(coeficientes_de_newton(coef, z[i:i + k + 1])[k]) for i in range(len(z) - k)])
    hermite.append({'puntos': puntos, 'coeficientes': [fr(c) for c in coef], 'tabla': tabla})


# ----------------------------------------------------------------------------
# 3. Sistemas 3×3: solución exacta, determinante, orden y trazas de Jacobi / Gauss-Seidel
# ----------------------------------------------------------------------------
def determinante(A):
    a, b, c = A[0]; d, e, f = A[1]; g, h, i = A[2]
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)


def evaluar_orden(A, orden):
    estricta, puntaje = True, 0
    for v, ec in enumerate(orden):
        diag = abs(A[ec][v])
        resto = sum(abs(A[ec][j]) for j in range(3) if j != v)
        if diag <= resto:
            estricta = False
        puntaje += diag - resto
    return estricta, puntaje


def ordenes_ordenados(A):
    candidatos = []
    for orden in itertools.permutations(range(3)):
        estricta, puntaje = evaluar_orden(A, orden)
        candidatos.append((orden, estricta, puntaje, [abs(A[ec][v]) for v, ec in enumerate(orden)]))
    # estrictas primero; luego mayor puntaje; luego diagonal mayor en x, y, z; el resto del empate conserva el orden
    candidatos.sort(key=lambda c: (not c[1], -c[2], [-d for d in c[3]]))
    return candidatos


def orden_de_clase(A):
    mejor = ordenes_ordenados(A)[0]
    if mejor[1]:
        return list(mejor[0])
    usadas, orden = set(), []
    for v in range(3):
        elegida = None
        for ec in range(3):
            if ec in usadas:
                continue
            if elegida is None or abs(A[ec][v]) > abs(A[elegida][v]):
                elegida = ec
        orden.append(elegida)
        usadas.add(elegida)
    return orden


def traza(A, b, orden, metodo, pasos):
    """Iteraciones exactas con Fraction desde x = (0, 0, 0)."""
    Ar = [A[i] for i in orden]; br = [b[i] for i in orden]
    x = [Fraction(0)] * 3
    filas = []
    for _ in range(pasos):
        nuevo = list(x)
        for i in range(3):
            fuente = nuevo if metodo == 'gauss' else x
            s = Fraction(br[i]) - sum(Fraction(Ar[i][j]) * fuente[j] for j in range(3) if j != i)
            nuevo[i] = s / Fraction(Ar[i][i])
        error = max(abs(n - o) for n, o in zip(nuevo, x))
        filas.append({'x': [dec(Decimal(v.numerator) / Decimal(v.denominator)) for v in nuevo],
                      'error': dec(Decimal(error.numerator) / Decimal(error.denominator))})
        x = nuevo
    return filas


sistemas = []
SISTEMAS_FIJOS = [
    ([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]),
    ([[4, -1, 1], [4, -8, 1], [-2, 1, 5]], [7, -21, 15]),
    ([[2, 1, 1], [1, 3, -2], [1, -2, -3]], [6, 13, -1]),               # el del cuaderno
    ([[1, 3, 1], [3, -1, 2], [2, -1, 1]], [-8, 1, -1]),                # el que diverge con el orden de clase
    ([[2, -1, 0], [-1, 3, -1], [0, -1, 2]], [1, 8, -5]),
]
casos_sistemas = list(SISTEMAS_FIJOS)
while len(casos_sistemas) < 25:
    A = [[random.randint(-9, 9) for _ in range(3)] for _ in range(3)]
    if determinante([[Fraction(v) for v in f] for f in A]) == 0:
        continue
    casos_sistemas.append((A, [random.randint(-20, 20) for _ in range(3)]))

for A, b in casos_sistemas:
    AF = [[Fraction(v) for v in f] for f in A]
    det = determinante(AF)
    solucion = resolver_exacto(A, b) if det != 0 else None
    orden = orden_de_clase(A)
    ordenes = [{'orden': list(o), 'estricta': e, 'puntaje': fr(Fraction(p)), 'diagonal': [fr(Fraction(d)) for d in dg]}
               for o, e, p, dg in ordenes_ordenados(A)]
    entrada = {
        'A': A, 'b': b, 'determinante': fr(det), 'solucion': [fr(s) for s in solucion] if solucion else None,
        'ordenDeClase': orden, 'ordenes': ordenes,
    }
    if det != 0:
        entrada['trazas'] = {
            'jacobi': traza(A, b, orden, 'jacobi', 16),
            'gauss': traza(A, b, orden, 'gauss', 16),
        }
    sistemas.append(entrada)


# ----------------------------------------------------------------------------
# 4. Raíces: referencia de alta precisión y trazas de los cinco métodos (Decimal, 50 dígitos)
# ----------------------------------------------------------------------------
FUNCIONES = [
    # (sintaxis de la página, sintaxis de Python, a, b, g(x) de punto fijo en Python, x0 de punto fijo)
    ('2*x^3 - x^2 - 3', '2*x**3 - x**2 - 3', '-1', '2', lambda x: ((x * x + 3) / 2) ** (Decimal(1) / 3), '-1'),
    ('x^3 - 2*x - 5', 'x**3 - 2*x - 5', '2', '3', lambda x: (2 * x + 5) ** (Decimal(1) / 3), '2'),
    ('x^2 - 4*x + 1', 'x**2 - 4*x + 1', '3', '4', lambda x: (4 * x - 1) ** (Decimal(1) / 2), '3'),
    ('x^4 - 3*x - 1', 'x**4 - 3*x - 1', '1', '2', lambda x: (3 * x + 1) ** (Decimal(1) / 4), '1'),
    ('x^3 + x - 1', 'x**3 + x - 1', '0', '1', None, '0'),
    ('2x^2 + 3x - 5', '2*x**2 + 3*x - 5', '0', '2', None, '0'),
    ('(x+1)/(x-3) - 2', '(x+1)/(x-3) - 2', '6', '8', None, '6'),
    ('x^2/3 - 2', 'x**2/3 - 2', '1', '4', None, '1'),
    ('x^2 - 2', 'x**2 - 2', '1', '2', lambda x: (x * 0 + 2) ** (Decimal(1) / 2), '1'),
]
TOLERANCIA = Decimal('1e-7')
MAX_IT = 80


def valor(expresion, x):
    return evaluar_python(expresion, x, Decimal)


def raiz_de_referencia(expresion, a, b):
    getcontext().prec = 90
    a, b = Decimal(a), Decimal(b)
    fa = valor(expresion, a).a
    for _ in range(400):
        m = (a + b) / 2
        fm = valor(expresion, m).a
        if fa * fm <= 0:
            b = m
        else:
            a, fa = m, fm
    getcontext().prec = 80
    return (a + b) / 2


def fila(it, a, b, fa, fb, xi, fxi, error):
    r = lambda v: None if v is None else dec(v, 50)
    return {'it': it, 'a': r(a), 'b': r(b), 'fa': r(fa), 'fb': r(fb), 'xi': r(xi), 'fxi': r(fxi), 'error': r(error)}


def trazar_biseccion(e, a, b):
    getcontext().prec = 50
    a, b = Decimal(a), Decimal(b)
    filas, xi_ant = [], None
    for it in range(1, MAX_IT + 1):
        fa, fb = valor(e, a).a, valor(e, b).a
        xi = (a + b) / 2
        fxi = valor(e, xi).a
        error = None if xi_ant is None else abs(xi - xi_ant)
        filas.append(fila(it, a, b, fa, fb, xi, fxi, error))
        if fxi == 0 or (error is not None and error < TOLERANCIA):   # raíz exacta o dentro de la tolerancia
            break
        if fa * fxi < 0:
            b = xi
        else:
            a = xi
        xi_ant = xi
    getcontext().prec = 80
    return filas


def trazar_falsa(e, a, b):
    getcontext().prec = 50
    a, b = Decimal(a), Decimal(b)
    filas, xi_ant = [], None
    for it in range(1, MAX_IT + 1):
        fa, fb = valor(e, a).a, valor(e, b).a
        xi = (a * fb - b * fa) / (fb - fa)         # forma clásica de la regla falsa
        fxi = valor(e, xi).a
        error = None if xi_ant is None else abs(xi - xi_ant)
        filas.append(fila(it, a, b, fa, fb, xi, fxi, error))
        if fxi == 0 or (error is not None and error < TOLERANCIA):   # raíz exacta o dentro de la tolerancia
            break
        if fa * fxi < 0:
            b = xi
        else:
            a = xi
        xi_ant = xi
    getcontext().prec = 80
    return filas


def trazar_secante(e, x0, x1):
    getcontext().prec = 50
    a, b = Decimal(x0), Decimal(x1)
    filas = []
    for it in range(1, MAX_IT + 1):
        fa, fb = valor(e, a).a, valor(e, b).a
        if fb == fa:
            break
        xi = b - fb * (b - a) / (fb - fa)
        fxi = valor(e, xi).a
        error = abs(xi - b)
        filas.append(fila(it, a, b, fa, fb, xi, fxi, error))
        if error < TOLERANCIA:
            break
        a, b = b, xi
    getcontext().prec = 80
    return filas


def trazar_newton(e, x0):
    getcontext().prec = 50
    x = Decimal(x0)
    filas = []
    for it in range(1, MAX_IT + 1):
        d = valor(e, x)
        if d.b == 0:
            break
        siguiente = x - d.a / d.b
        error = abs(siguiente - x)
        filas.append(fila(it, x, d.b, d.a, None, siguiente, valor(e, siguiente).a, error))
        if error < TOLERANCIA:
            break
        x = siguiente
    getcontext().prec = 80
    return filas


def trazar_punto_fijo(g, x0):
    getcontext().prec = 50
    x = Decimal(x0)
    filas = []
    for it in range(1, MAX_IT + 1):
        try:
            gx = g(x)
        except Exception:
            break
        if not gx.is_finite():
            break
        error = abs(gx - x)
        filas.append(fila(it, x, None, gx, None, gx, None, error))
        if error < TOLERANCIA:
            break
        x = gx
    getcontext().prec = 80
    return filas


raices = []
for nuestra, de_python, a, b, g, x0 in FUNCIONES:
    entrada = {
        'expresion': nuestra, 'a': a, 'b': b,
        'raiz': dec(raiz_de_referencia(de_python, a, b), 70),
        'biseccion': trazar_biseccion(de_python, a, b),
        'falsa': trazar_falsa(de_python, a, b),
        'secante': trazar_secante(de_python, a, b),
        'newton': trazar_newton(de_python, a),
    }
    if g:
        entrada['puntoFijo'] = {'x0': x0, 'filas': trazar_punto_fijo(g, x0)}
    raices.append(entrada)

with open(SALIDA, 'w', encoding='utf-8') as archivo:
    json.dump({
        'expresiones': expresiones, 'lagrange': lagrange, 'hermite': hermite,
        'sistemas': sistemas, 'raices': raices,
    }, archivo, ensure_ascii=False)
print('escrito', SALIDA, '-', len(expresiones), 'expresiones,', len(lagrange), 'Lagrange,', len(hermite), 'Hermite,',
      len(sistemas), 'sistemas,', len(raices), 'funciones')
