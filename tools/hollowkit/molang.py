"""A small Molang evaluator for previewing and validating animations offline.

Supports the subset THE HOLLOW's animations use: numbers, strings, query./q., variable./v.,
math. functions (trig in degrees, like the game), arithmetic, comparison, logic, ternary,
null-coalescing and parentheses. Unknown queries evaluate to 0, as they do in-game.
It is a preview aid and a syntax checker, not a reimplementation of the engine.
"""
import math
import re

_TOKEN = re.compile(r"""
    (?P<num>\d+\.\d*|\.\d+|\d+)f? |
    (?P<str>'[^']*') |
    (?P<id>[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*) |
    (?P<op>\?\?|&&|\|\||==|!=|<=|>=|[-+*/()<>!?:,;]) |
    (?P<ws>\s+)
""", re.X)

ALIAS = {"q.": "query.", "v.": "variable.", "t.": "temp.", "c.": "context."}


def tokenize(src):
    out = []
    pos = 0
    while pos < len(src):
        m = _TOKEN.match(src, pos)
        if not m:
            raise SyntaxError(f"bad Molang at {pos}: {src[pos:pos + 20]!r} in {src!r}")
        pos = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        val = m.group(kind)
        if kind == "id":
            for a, b in ALIAS.items():
                if val.startswith(a):
                    val = b + val[len(a):]
            val = val.lower()
        out.append((kind, val))
    out.append(("end", None))
    return out


def _deg(f):
    return lambda x: f(math.radians(x))


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


MATH = {
    "math.sin": _deg(math.sin), "math.cos": _deg(math.cos),
    "math.asin": lambda x: math.degrees(math.asin(_clamp(x, -1, 1))),
    "math.acos": lambda x: math.degrees(math.acos(_clamp(x, -1, 1))),
    "math.atan": lambda x: math.degrees(math.atan(x)),
    "math.atan2": lambda y, x: math.degrees(math.atan2(y, x)),
    "math.abs": abs, "math.clamp": _clamp, "math.max": max, "math.min": min,
    "math.mod": lambda a, b: math.fmod(a, b) if b else 0.0, "math.pow": lambda a, b: a ** b,
    "math.sqrt": lambda x: math.sqrt(max(0.0, x)), "math.floor": math.floor, "math.ceil": math.ceil,
    "math.round": lambda x: math.floor(x + 0.5), "math.trunc": math.trunc,
    "math.lerp": lambda a, b, t: a + (b - a) * t,
    "math.lerprotate": lambda a, b, t: a + (((b - a + 180) % 360) - 180) * t,
    "math.hermite_blend": lambda t: 3 * t * t - 2 * t * t * t,
    "math.exp": math.exp, "math.ln": lambda x: math.log(x) if x > 0 else 0.0,
    "math.pi": math.pi, "math.sign": lambda x: (x > 0) - (x < 0),
    "math.random": lambda a, b: (a + b) / 2.0, "math.random_integer": lambda a, b: (a + b) // 2,
    "math.die_roll": lambda n, a, b: n * (a + b) / 2.0,
}


class Parser:
    def __init__(self, tokens):
        self.t = tokens
        self.i = 0

    def peek(self):
        return self.t[self.i]

    def take(self, val=None):
        tok = self.t[self.i]
        if val is not None and tok[1] != val:
            raise SyntaxError(f"expected {val!r}, got {tok[1]!r}")
        self.i += 1
        return tok

    def program(self):
        stmts = [self.expr()]
        while self.peek()[1] == ";":
            self.take(";")
            if self.peek()[0] == "end":
                break
            stmts.append(self.expr())
        if self.peek()[0] != "end":
            raise SyntaxError(f"trailing tokens at {self.peek()}")
        return ("prog", stmts)

    def expr(self):
        return self.ternary()

    def ternary(self):
        c = self.coalesce()
        if self.peek()[1] == "?":
            self.take("?")
            a = self.ternary()
            if self.peek()[1] == ":":
                self.take(":")
                b = self.ternary()
            else:
                b = ("num", 0.0)
            return ("?:", c, a, b)
        return c

    def coalesce(self):
        a = self.lor()
        while self.peek()[1] == "??":
            self.take()
            a = ("??", a, self.lor())
        return a

    def lor(self):
        a = self.land()
        while self.peek()[1] == "||":
            self.take()
            a = ("||", a, self.land())
        return a

    def land(self):
        a = self.eq()
        while self.peek()[1] == "&&":
            self.take()
            a = ("&&", a, self.eq())
        return a

    def eq(self):
        a = self.rel()
        while self.peek()[1] in ("==", "!="):
            op = self.take()[1]
            a = (op, a, self.rel())
        return a

    def rel(self):
        a = self.add()
        while self.peek()[1] in ("<", ">", "<=", ">="):
            op = self.take()[1]
            a = (op, a, self.add())
        return a

    def add(self):
        a = self.mul()
        while self.peek()[1] in ("+", "-"):
            op = self.take()[1]
            a = (op, a, self.mul())
        return a

    def mul(self):
        a = self.unary()
        while self.peek()[1] in ("*", "/"):
            op = self.take()[1]
            a = (op, a, self.unary())
        return a

    def unary(self):
        if self.peek()[1] == "-":
            self.take()
            return ("neg", self.unary())
        if self.peek()[1] == "!":
            self.take()
            return ("not", self.unary())
        if self.peek()[1] == "+":
            self.take()
            return self.unary()
        return self.primary()

    def primary(self):
        kind, val = self.take()
        if kind == "num":
            return ("num", float(val))
        if kind == "str":
            return ("str", val[1:-1])
        if val == "(":
            e = self.expr()
            self.take(")")
            return e
        if kind == "id":
            if self.peek()[1] == "(":
                self.take("(")
                args = []
                if self.peek()[1] != ")":
                    args.append(self.expr())
                    while self.peek()[1] == ",":
                        self.take(",")
                        args.append(self.expr())
                self.take(")")
                return ("call", val, args)
            if val in ("true", "false"):
                return ("num", 1.0 if val == "true" else 0.0)
            return ("id", val)
        raise SyntaxError(f"unexpected {val!r}")


_cache = {}


def compile_molang(src):
    if isinstance(src, (int, float)):
        return ("num", float(src))
    if src not in _cache:
        _cache[src] = Parser(tokenize(src)).program()
    return _cache[src]


def evaluate(node, env):
    k = node[0]
    if k == "prog":
        r = 0.0
        for s in node[1]:
            r = evaluate(s, env)
        return r
    if k == "num":
        return node[1]
    if k == "str":
        return node[1]
    if k == "id":
        if node[1] in MATH and not callable(MATH[node[1]]):
            return MATH[node[1]]
        return env.get(node[1], 0.0)
    if k == "call":
        name = node[1]
        args = [evaluate(a, env) for a in node[2]]
        if name in MATH:
            return float(MATH[name](*args))
        fn = env.get(name)
        if callable(fn):
            return fn(*args)
        return 0.0
    if k == "neg":
        return -evaluate(node[1], env)
    if k == "not":
        return 0.0 if evaluate(node[1], env) else 1.0
    if k == "?:":
        return evaluate(node[2], env) if evaluate(node[1], env) else evaluate(node[3], env)
    if k == "??":
        a = evaluate(node[1], env)
        return a if a is not None else evaluate(node[2], env)
    a = evaluate(node[1], env)
    if k == "&&":
        return 1.0 if (a and evaluate(node[2], env)) else 0.0
    if k == "||":
        return 1.0 if (a or evaluate(node[2], env)) else 0.0
    b = evaluate(node[2], env)
    if k == "==":
        return 1.0 if a == b else 0.0
    if k == "!=":
        return 1.0 if a != b else 0.0
    if isinstance(a, str) or isinstance(b, str):
        raise TypeError(f"string in arithmetic: {node}")
    return {
        "+": lambda: a + b, "-": lambda: a - b, "*": lambda: a * b, "/": lambda: a / b if b else 0.0,
        "<": lambda: float(a < b), ">": lambda: float(a > b), "<=": lambda: float(a <= b), ">=": lambda: float(a >= b),
    }[k]()


def run(src, env):
    return evaluate(compile_molang(src), env)
