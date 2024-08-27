var It = Object.defineProperty;
var Ct = (t, o, n) => o in t ? It(t, o, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[o] = n;
var W = (t, o, n) => (Ct(t, typeof o != "symbol" ? o + "" : o, n), n);
const gt = Math.cos, ct = Math.sin, T = Math.PI, z = Math.PI * 2, wt = (t, o = z) => {
  const n = o / 2, s = t % n;
  return t < n ? s / n : 1 - s / n;
}, Et = (t, o) => t != null && typeof t[o] == "function", et = (t) => Et(t, "xform") ? t.xform() : t, tt = Symbol(), rt = () => {
}, at = (t) => t != null && typeof t[Symbol.iterator] == "function", Tt = (t) => t, yt = (t, o = (n) => n !== void 0 ? ": " + n : "") => class extends Error {
  constructor(s) {
    super(t(s) + o(s));
    W(this, "origMessage");
    this.origMessage = s !== void 0 ? String(s) : "";
  }
}, Pt = yt(() => "illegal arity"), kt = (t) => {
  throw new Pt(t);
};
class q {
  constructor(o) {
    W(this, "value");
    this.value = o;
  }
  deref() {
    return this.value;
  }
}
const At = (t) => new q(t), Y = (t) => t instanceof q, Ot = (t) => t instanceof q ? t : new q(t), st = (t) => t instanceof q ? t.deref() : t, zt = (t, o) => [t, Tt, o];
function Gt(t) {
  return t ? [...t] : zt(
    () => [],
    (o, n) => (o.push(n), o)
  );
}
function* xt(t, o) {
  const n = et(t)(Gt()), s = n[1], c = n[2];
  for (let a of o) {
    const e = c([], a);
    if (Y(e)) {
      yield* st(s(e.deref()));
      return;
    }
    e.length && (yield* e);
  }
  yield* st(s([]));
}
function* $t(t, o) {
  const n = et(t)([rt, rt, (s, c) => c])[2];
  for (let s of o) {
    let c = n(tt, s);
    if (Y(c)) {
      c = st(c.deref()), c !== tt && (yield c);
      return;
    }
    c !== tt && (yield c);
  }
}
const Bt = (t, o, n = $t) => {
  const s = o.length - 1;
  return at(o[s]) ? o.length > 1 ? n(t.apply(null, o.slice(0, s)), o[s]) : n(t(), o[0]) : void 0;
}, lt = (t, o) => [t[0], t[1], o];
function H(t, o) {
  return at(o) ? $t(H(t), o) : (n) => {
    const s = n[2];
    return lt(n, (c, a) => s(c, t(a)));
  };
}
function bt(...t) {
  let [o, n, s, c, a, e, i, u, d, y] = t;
  switch (t.length) {
    case 0:
      kt(0);
    case 1:
      return o;
    case 2:
      return (...f) => o(n(...f));
    case 3:
      return (...f) => o(n(s(...f)));
    case 4:
      return (...f) => o(n(s(c(...f))));
    case 5:
      return (...f) => o(n(s(c(a(...f)))));
    case 6:
      return (...f) => o(n(s(c(a(e(...f))))));
    case 7:
      return (...f) => o(n(s(c(a(e(i(...f)))))));
    case 8:
      return (...f) => o(n(s(c(a(e(i(u(...f))))))));
    case 9:
      return (...f) => o(n(s(c(a(e(i(u(d(...f)))))))));
    case 10:
    default:
      const h = (...f) => o(n(s(c(a(e(i(u(d(y(...f))))))))));
      return t.length === 10 ? h : bt(h, ...t.slice(10));
  }
}
function Rt(...t) {
  return t = t.map(et), bt.apply(null, t);
}
const vt = yt(() => "illegal argument(s)"), Nt = (t) => {
  throw new vt(t);
};
function Mt(t, o, n) {
  return new Ht(t, o, n);
}
class Ht {
  constructor(o, n, s) {
    W(this, "from");
    W(this, "to");
    W(this, "step");
    o === void 0 ? (o = 0, n = 1 / 0) : n === void 0 && (n = o, o = 0), s = s === void 0 ? o < n ? 1 : -1 : s, this.from = o, this.to = n, this.step = s;
  }
  *[Symbol.iterator]() {
    let { from: o, to: n, step: s } = this;
    if (s > 0)
      for (; o < n; )
        yield o, o += s;
    else if (s < 0)
      for (; o > n; )
        yield o, o += s;
  }
  $reduce(o, n) {
    const s = this.step;
    if (s > 0)
      for (let c = this.from, a = this.to; c < a && !Y(n); c += s)
        n = o(n, c);
    else
      for (let c = this.from, a = this.to; c > a && !Y(n); c += s)
        n = o(n, c);
    return n;
  }
}
function J(...t) {
  return Bt(J, t) || ((o) => {
    const n = o[2], s = t[0];
    let c = t[1] || 0;
    return lt(o, (a, e) => n(a, s(c++, e)));
  });
}
function* U(t, o = !0, n = !1) {
  if (t > 0)
    for (let s = 0, c = o ? t + 1 : t; s < c; s++)
      yield n ? 1 - s / t : s / t;
}
function* ht(t, o, n = !0, s = !0) {
  const c = [...U(t, n)];
  for (let a of U(o, s))
    yield* H((e) => [e, a], c);
}
function ft(t, o) {
  return at(o) ? xt(ft(t), o) : (n) => {
    const s = n[2];
    let c = t;
    return lt(
      n,
      (a, e) => --c > 0 ? s(a, e) : c === 0 ? Ot(s(a, e)) : At(a)
    );
  };
}
const Dt = Array.isArray, Lt = (t) => ((t == null || !t[Symbol.iterator]) && Nt(`value is not iterable: ${t}`), t), Ft = (t) => Dt(t) ? t : [...Lt(t)];
function* j(...t) {
  for (let o of t)
    o != null && (yield* Lt(o));
}
function* X(t, o = 1 / 0) {
  if (o < 1)
    return;
  let n = [];
  for (let s of t)
    n.push(s), yield s;
  if (n.length > 0)
    for (; --o > 0; )
      yield* n;
}
function* Q(t) {
  const o = Ft(t);
  let n = o.length;
  for (; n-- > 0; )
    yield o[n];
}
function V(t) {
  return { i: t.i, x: t.x, y: t.y, z: t.z };
}
function* nt({ rows: t, cols: o, skipFirst: n = 0, skipLast: s = 0 }) {
  const c = o * t;
  for (let a = n; a < c - s; a++) {
    const e = a / t | 0;
    let i = a % t;
    e & 1 && (i = t - 1 - i), yield [e / (o - 1), i / (t - 1)];
  }
}
const D = (t) => J((o, n) => {
  const s = n[0], c = n[1];
  return { i: o, x: s, y: c, z: 1 };
}, t);
function Wt({ center: t, radius: o, sides: n, fr: s }) {
  return xt(
    Rt(
      J((c, a) => {
        const e = s(c, o), i = c / n, u = z * i;
        return {
          i: c,
          x: t[0] + e * gt(u),
          y: t[1] + e * ct(u),
          z: Math.floor(i)
        };
      })
    ),
    X(U(n))
  );
}
function Kt(t) {
  console.log(t);
  const o = Array.isArray(t) ? t : [t], [n, s] = o.reduce(
    (g, l) => [
      g[0] + l.dim[0] * l.dim[1],
      g[1] + l.scale
    ],
    [0, 0]
  ), c = t.length > 1, a = (g) => {
    let l = 0, m = !0;
    const r = g.reduce((M, x) => {
      m = !m;
      const { dim: b, scale: S } = x;
      if (!b || !S || !Array.isArray(b))
        throw Error(
          `createGrids: bad argument in array, should be obj of {dim[cols,rows], scale}: ${b}, ${S}`
        );
      const [$, _] = b, L = S / s, A = [...nt({ cols: $, rows: _, skipFirst: 0, skipLast: _ })].map((P, R) => [
        P[0] * L + l,
        P[1]
      ]);
      return l += L, [...M, A];
    }, []);
    return D(j(...r));
  }, e = a(o), i = Q(a(o)), u = X(j(e, i));
  let d = 0, y = -1, h = 1;
  return H((g) => {
    const l = g.i - y;
    return l == 0 && h != 0 && (d += 1), g.z = Math.floor(d), y = g.i, h = l, V(g);
  }, u);
}
const qt = ({ cols: t, rows: o }) => {
  const n = t * o, s = D(nt({ cols: t, rows: o })), c = D(Q(nt({ cols: t, rows: o }))), a = X(j(s, c));
  let e = -0.5;
  const i = H((u) => (u.i % (n - 1) == 0 && (e += 0.5), u.z = Math.floor(e), V(u)), a);
  return console.log("GRIDLIB: made grid"), i;
}, jt = ({ points: t, orient: o, loop: n } = { orient: "x", loop: !1 }) => {
  const s = t, c = () => {
    switch (o) {
      case "x":
        return ht(t - 1, 1, !0, !1);
      case "y":
        return ht(1, t - 1, !1, !0);
    }
  }, a = D(c()), e = D(Q(c())), i = X(j(a, e)), u = n ? 0.25 : 0.5;
  let d = -0.5;
  const y = H((h) => (h.i % (s - 1) == 0 && (d += u), h.z = Math.floor(d), V(h)), i);
  return console.log("GRIDLIB: made line"), y;
};
function Jt({ points: t, thickness: o, offsetx: n, offsety: s, xRadius: c, yRadius: a, minZ: e, layerThickness: i, loop: u }) {
  const d = Math.ceil(c / o), y = Math.ceil(a / o), h = Math.max(d, y), f = h * z, g = Math.ceil(f / t);
  console.log("makeSpiral ::", { turnsX: d, turnsY: y, turns: h, points: t, radsPerTurn: g });
  const l = ($) => H(
    (_) => {
      const L = Math.pow(_, 1), C = L * f, I = L * c * gt(C) + n, E = L * a * ct(C) + s;
      return [I, E];
    },
    U(t - 1, !0)
  ), m = D(l()), r = D(Q(l())), M = X(j(m, r)), x = u ? 0.25 : 0.5;
  let b = -0.5;
  const S = H(($) => ($.i % (t - 1) == 0 && (b += x), $.z = Math.floor(b) * i + e, V($)), M);
  return console.log("GRIDLIB: made spiral"), S;
}
function G(t, o = 1) {
  const n = o * T / t;
  let s = -n;
  return (c) => (s = (s + n) % T, Math.sin(s));
}
function O(t, o = 1, n = 0, s = 0) {
  const c = o * z / t;
  let a = -c + n;
  return (e) => (a = (a + c + s) % z, ct(a));
}
function Z(t, o = 1) {
  const n = o * z / t;
  let s = -n;
  return (c) => (s = (s + n) % z, Math.cos(s));
}
function Xt() {
  const t = Math.round(100 * Math.random()), o = G(t - 1), n = Mt(0, t), s = J((c, a) => [c, o(a)], n);
  console.log("TEST MAKESINT"), console.log([...ft(t, s)]);
}
function N(t, o = 1) {
  const n = o * z / t;
  let s = -n;
  return (c) => (s = (s + n) % z, Math.sin(s));
}
function _t(t, o = 1) {
  const n = o * z / t;
  let s = -n;
  return (c) => (s = (s + n) % z, Math.cos(s));
}
function mt(t, o, n, s = 1) {
  const c = T / o, a = s * z / t;
  let e = -a, i = -c;
  return (u, d) => (i += c, i > T && (i = i % T, e = (e + a) % z), d + n * Math.sin(e));
}
function Yt(t, o = 1) {
  let n = -o, s = -o;
  return (c) => (n = (n + o) % t, n < s && console.log(`t jump ${n}/${s}`), s = n, n / (t - o));
}
function w(t, o = 1, n = 0) {
  let s = -o + n;
  return (c) => (s = (s + o) % t, wt(s, t));
}
function Ut() {
  const t = Math.round(100 * Math.random()), o = w(t - 1), n = Mt(0, t), s = J((c, a) => [c, o(a)], n);
  console.log("TEST MAKETRI"), console.log([...ft(t, s)]);
}
const Qt = ["x", "y", "z"];
function it(t, o) {
  const n = { i: t.i };
  for (const s of Qt)
    n[s] = o[s](t.i, t[s]);
  return n;
}
const B = (t) => t && Array.isArray(t) ? t.reduce(
  (o, n) => o + n.dim[0],
  0
) - t.length : t.cols, k = (t, o) => o, ut = 0.1;
function Vt(t) {
  if (!t)
    throw Error("No printer!");
  t.bpm(95), Ut();
  const o = 9, n = [
    { dim: [3, o], scale: 1 },
    { dim: [5, o], scale: 1 },
    { dim: [3, o], scale: 1 },
    { dim: [2, o], scale: 1 }
  ], s = 10, c = t.maxx / 10 + s, a = t.maxy / 10 + s, e = 0.2, i = 45, u = "1/2b", d = "1/2b", y = t.t2mm(d), h = 0.25 * y / i, f = "C7", g = "D6", l = B(_grids);
  t.m2s(f);
  let m = G(l * o * i / 4), r = w(l * o * i, 1);
  const M = (x, b) => b + 0.025 * r(x) * m(x);
  return t.tsp(t.psp()), t.interval("1/16b"), t.thick(h), {
    printer: t,
    grids: n,
    offsetx: c,
    offsety: a,
    minz: e,
    t: u,
    height: y + e,
    rowNote: f,
    colNote: g,
    layerThick: h,
    fx: M,
    fy: k,
    fz: k
    // xrange: calcMinMax(fx, totalBeats),
    // yrange: calcMinMax(ident, totalBeats)
  };
}
function Zt(t) {
  if (!t)
    throw Error("No printer!");
  t.bpm(95);
  const o = 9, n = [
    { dim: [3, o], scale: 1 },
    { dim: [5, o], scale: 1 },
    { dim: [3, o], scale: 1 },
    { dim: [2, o], scale: 1 }
  ], s = 10, c = t.maxx / 10 + s, a = t.maxy / 10 + s, e = 0.2, i = 90, u = "1/2b", d = "1/2b", y = t.t2mm(d), h = Math.max(ut, y / i), f = "C7", g = "D6", l = B(_grids);
  t.m2s(f);
  let m = w(l * o * i, 1), r = w(l * o * i, 1), M = G(12, 1), x = Z(6, 1);
  const b = ($, _) => _ + 0.04 * m($) * M($), S = ($, _) => _ + 0.04 * r($) * x($);
  return t.tsp(t.psp()), t.interval("1/16b"), t.thick(h), {
    printer: t,
    grids: n,
    offsetx: c,
    offsety: a,
    minz: e,
    t: u,
    height: y + e,
    rowNote: f,
    colNote: g,
    layerThick: h,
    fx: b,
    fy: S,
    fz: k
  };
}
function pt(t) {
  if (!t)
    throw Error("No printer!");
  t.bpm(95);
  const o = 9, n = [
    { dim: [3, o], scale: 1 },
    { dim: [5, o], scale: 1 },
    { dim: [3, o], scale: 1 },
    { dim: [2, o], scale: 1 }
  ], s = 10, c = t.maxx / 10 + s, a = t.maxy / 10 + s, e = 0.15, i = 90, u = "1/2b", d = "1/4b", y = t.t2mm(d), h = Math.max(ut, y / i), f = "C6", g = "E5";
  t.m2s(f);
  const l = B(_grids);
  let m = w(l * o * i, 2), r = w(l * o * i, 1), M = G(3, 1), x = Z(6, 1);
  const b = ($, _) => _ + 0.08 * m($) * M($), S = ($, _) => _ + 0.08 * r($) * x($);
  return t.tsp(t.psp()), t.interval("1/4b"), console.log(`THICK: ${h}`), t.thick(h), {
    printer: t,
    grids: n,
    offsetx: c,
    offsety: a,
    minz: e,
    t: u,
    height: y + e,
    rowNote: f,
    colNote: g,
    layerThick: h,
    fx: b,
    fy: S,
    fz: k
  };
}
function to({
  printer: t,
  grids: o,
  minz: n = 0.13,
  layers: s = 50,
  t: c = "1/4b",
  beatHeight: a = "1/4b",
  rowNote: e = "C6",
  colNote: i = "E8",
  bpm: u = 95
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(u), t.m2s(e);
  const d = 9, y = o || [
    { dim: [3, d], scale: 1 },
    { dim: [5, d], scale: 1 },
    { dim: [3, d], scale: 1 }
  ], h = 10, f = t.maxx / 10 + h, g = t.maxy / 10 + h, l = t.t2mm(a), m = Math.max(ut, l / s), r = B(y), M = w(r * d * s / 1.5, 1), x = w(r * d * s, 1), b = G(3, 1 / 3), S = Z(3, 1), $ = (L, C) => C + 0.05 * M(L) * b(L), _ = (L, C) => C + 0.08 * x(L) * S(L);
  return t.tsp(t.psp()), t.interval(0.25 * t.b2t(c)), console.log(`THICK: ${m}`), t.thick(m), {
    printer: t,
    grids: y,
    offsetx: f,
    offsety: g,
    minz: n,
    t: c,
    height: l + n,
    rowNote: e,
    colNote: i,
    layerThick: m,
    fx: $,
    fy: _,
    fz: k
  };
}
function oo({
  printer: t,
  grids: o,
  minz: n = 0.13,
  layers: s = 50,
  t: c = "1b",
  beatHeight: a = "1/4b",
  rowNote: e = "E5",
  colNote: i = "C4",
  bpm: u = 95
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(u), t.m2s(e);
  const d = 9, y = o || [
    { dim: [3, d], scale: 1 },
    { dim: [5, d], scale: 2 },
    { dim: [3, d], scale: 1 }
    // { dim: [2, ROWS], scale: 1 },
  ], h = 10, f = t.maxx / 10 + h, g = t.maxy / 10 + h, l = t.t2mm(a), m = Math.min(0.18, l / s), r = B(y);
  let M = w(r * d * s, 2), x = w(r * d * s, 1), b = G(3, 1), S = Z(6, 1);
  const $ = (L, C) => C + 0.12 * M(L) * b(L), _ = (L, C) => C + 0.08 * x(L) * S(L);
  return t.tsp(t.psp()), t.interval(c), console.log(`THICK: ${m}`), t.thick(m), {
    printer: t,
    grids: y,
    offsetx: f,
    offsety: g,
    minz: n,
    t: c,
    height: l + n,
    rowNote: e,
    colNote: i,
    layerThick: m,
    fx: $,
    fy: _,
    fz: k
  };
}
function ot(t) {
  return new Date(t).toISOString().substring(11, 22);
}
function so({
  printer: t,
  grids: o,
  minz: n = 0.13,
  layerThick: s = 0.2,
  t: c = "6b",
  amtx: a = 0.08,
  amty: e = 0.08,
  beatHeight: i = "10b",
  rowNote: u = "C3",
  colNote: d = "E3",
  bpm: y = 96,
  loop: h = !0
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(y), t.m2s(u);
  const f = 4, l = o || { cols: 4, rows: f }, m = B(l), r = 10, M = t.maxx / 10 + r, x = t.maxy / 10 + r, b = m * f, S = t.t2mm(i), $ = 2 * Math.round(S / s), _ = $ * s + n, L = b * $;
  console.log(
    `-----
    GenP6:
    total cols ${m}
    rows ${f}
    t ${t.b2t(c)}
    total beats: ${L},`
  ), t.psp(d);
  const C = m * t.t2mm(t.b2t(c)), I = m * t.b2t(c);
  t.psp(u);
  const E = f * t.t2mm(t.b2t(c)), A = f * t.b2t(c);
  console.log(
    `
    w x d x h: ${C} x ${E} ${_}
    coltime: ${I}
  total est. time per layer (s): [cols]:${ot(I)} + [rows]${ot(A)}
  total time: ${ot((I + A) * $)}
  -----`
  );
  const P = N(b / 4, 1), R = N(L * 2, 1), v = _t(b / 3, 1), F = (K, p) => p + a * P(K) * R(K), St = (K, p) => p + e * v(K) * R(K);
  return console.log(`PRESET G6 THICK: ${s}`), t.thick(s), {
    printer: t,
    grids: l,
    offsetx: M,
    offsety: x,
    minz: n,
    t: c,
    height: _ + n,
    rowNote: u,
    colNote: d,
    layerThick: s,
    fx: F,
    fy: St,
    fz: k,
    loop: h
  };
}
function no({
  printer: t,
  sides: o,
  cx: n,
  cy: s,
  circumference: c,
  minz: a = 0.13,
  layerThick: e = 0.2,
  amtx: i = 10,
  amty: u = 6,
  amtr: d = 0.25,
  beatHeight: y = "10b",
  note: h = "g3",
  bpm: f = 96
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(f), t.m2s(h);
  const g = 10, l = [n || t.maxx / 2 + g, s || t.maxy / 2 + g], m = o, r = t.t2mm(y), M = Math.round(r / e), x = (M - 2) * e + a, b = m * M, S = t.t2mm(c);
  console.log(
    `-----
    GenPoly1:
    center ${l}
    circumference ${S}
    layer time time ${t.b2t(c)}
    total sides ${o}
    layers ${M}
    total beats: ${b}
    height ${x},`
  ), t.psp(h);
  const $ = w(b, 1), _ = N(b / 2, 1), L = N(b / 4, 1), C = _t(m / 4, 1), I = N(b / 8, 1), E = Yt(b, 1), A = (v, F) => F + i * _(Math.floor(v / o)) * L(Math.floor(v)), P = k, R = (v, F) => d * F + (1 - d) * F * (0.125 * I(v) + 0.875 * $(v)) * C(v) * E(v);
  return console.log(`PRESET poly1 THICK: ${e}`), t.thick(e), {
    printer: t,
    sides: o,
    center: l,
    circumference: c,
    minz: a,
    height: x + a,
    note: h,
    layerThick: e,
    fr: R,
    fx: A,
    fy: P,
    fz: k,
    bpm: f
  };
}
function co({
  printer: t,
  sides: o,
  cx: n,
  cy: s,
  circumference: c,
  minz: a = 0.13,
  layerThick: e = 0.2,
  amtx: i = 10,
  amty: u = 6,
  amtr: d = 0.25,
  beatHeight: y = "10b",
  note: h = "g3",
  bpm: f = 96
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(f), t.m2s(h);
  const g = 10, l = [n || t.maxx / 2 + g, s || t.maxy / 2 + g], m = o, r = t.t2mm(y), M = Math.round(r / e), x = (M - 2) * e + a, b = m * M, S = t.t2mm(c);
  console.log(
    `-----
    GenPoly1:
    center ${l}
    circumference ${S}
    layer time time ${t.b2t(c)}
    total sides ${o}
    layers ${M}
    total beats: ${b}
    height ${x},`
  ), t.psp(h);
  const $ = w(b, 1), _ = N(b / 2, 1), L = N(b / 4, 1), C = (A, P) => P + i * _(Math.floor(A / o)) * L(Math.floor(A)), I = k, E = (A, P) => d * P + (1 - d) * P * (1 - $(A));
  return console.log(`PRESET poly1 THICK: ${e}`), t.thick(e), {
    printer: t,
    sides: o,
    center: l,
    circumference: c,
    minz: a,
    height: x + a,
    note: h,
    layerThick: e,
    fr: E,
    fx: C,
    fy: I,
    fz: k,
    bpm: f
  };
}
function eo(t) {
  if (!t)
    throw Error("No printer!");
  Xt();
  const o = 9, n = [
    { dim: [3, o], scale: 1 },
    { dim: [5, o], scale: 1 },
    { dim: [3, o], scale: 1 },
    { dim: [2, o], scale: 1 }
  ], s = 10, c = t.maxx / 10 + s, a = t.maxy / 10 + s, e = 0.2, i = 75, u = "1/4b", d = "1/4b", y = t.t2mm(d), h = Math.min(0.18, y / i), f = "D7", g = "C6", l = B(_grids);
  let m = G(l * o * i / 4);
  const r = (M, x) => x + 0.025 * m(M);
  return t.tsp(t.psp()), t.interval("4b"), t.thick(h), console.log(`THICK: ${h}`), {
    printer: t,
    grids: n,
    offsetx: c,
    offsety: a,
    minz: e,
    t: u,
    height: y + e,
    rowNote: f,
    colNote: g,
    layerThick: h,
    fx: r,
    fy: (M, x) => x,
    fz: (M, x) => x
  };
}
function ao(t) {
  if (!t)
    throw Error("No printer!");
  t.bpm(95);
  const o = 9, n = [
    { dim: [3, o], scale: 1 },
    { dim: [5, o], scale: 1 },
    { dim: [3, o], scale: 1 },
    { dim: [2, o], scale: 1 }
  ], s = 10, c = t.maxx / 10 + s, a = t.maxy / 10 + s, e = 0.2, i = 45, u = "1/2b", d = "1/2b", y = t.t2mm(d), h = 0.25 * y / i, f = "C7", g = "D6";
  t.m2s(f);
  const l = B(_grids);
  let m = mt(
    l * o / 2 + 2,
    l * o * i / 2,
    0.05,
    l + 6
  ), r = mt(
    l * o / 2 + 1,
    l * o * i / 2,
    0.03,
    l + 5
  );
  return t.tsp(t.psp()), t.interval("1/16b"), t.thick(h), {
    printer: t,
    grids: n,
    offsetx: c,
    offsety: a,
    minz: e,
    t: u,
    height: y + e,
    rowNote: f,
    colNote: g,
    layerThick: h,
    fx: m,
    fy: r,
    fz: (M, x) => x
  };
}
function lo({
  printer: t,
  points: o = 16,
  minz: n = 0.2,
  layerThick: s = 0.22,
  t: c = "1/2b",
  beatHeight: a = "8b",
  note: e = "C3",
  bpm: i = 95,
  amt: u = 0.5,
  loop: d = !1
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const y = 30, h = t.maxx / 10 + y, f = t.maxy / 10 + y, g = t.t2mm(a), l = 2 * Math.round(g / s), m = l * s + n, r = o * l, M = w(r * 2, 1, r / 2), x = w(r / 3, 1, r / 6), b = w(r / 3, 1, r), S = O(r * 2, 1, 0, T / 4), $ = O(r * 4, 1, T / 4, T / 4), _ = G(r * 8, 1), L = (I, E) => E + (0.05 * b(I) + u * S(I + o) * Math.sqrt((1 - _(I)) * (1 - _(I)))), C = (I, E) => E + M(I) * (1 + 0.125 * u * x(I) + 0.33 * u * $(I));
  return t.tsp(t.psp()), t.interval(c), t.thick(s), console.log(`MakeTriLineTest: totalBeats: ${r}, height: ${m}, layers: ${l}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: h,
    offsety: f,
    minz: n,
    t: c,
    height: m,
    note: e,
    layerThick: s,
    fx: C,
    fy: L,
    fz: k,
    loop: d
  };
}
function fo({
  printer: t,
  points: o = 32,
  minz: n = 0.2,
  layerThick: s = 0.22,
  t: c = "1/4b",
  beatHeight: a = "8b",
  note: e = "E3",
  bpm: i = 95,
  amt: u = 0.2
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const d = 30, y = t.maxx / 10 + d, h = t.maxy / 10 + d, f = t.t2mm(a), g = 2 * Math.round(f / s), l = g * s + n, m = o * g, r = w(m / 8, 1), M = O(m / 2, 1, 0, T / 4), x = O(2 / m / 6, 1, 0, T / 4), b = G(m * 2, 1), S = (_, L) => L + 2 * u * M(_) * Math.sqrt(1 - b(_)), $ = (_, L) => L + 0.25 * u * r(_ + o) + u * x(_);
  return t.tsp(t.psp()), t.interval("2b"), t.thick(s), console.log(`MakeTriLineTestSlower: totalBeats: ${m}, height: ${l}, layers: ${g}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: y,
    offsety: h,
    minz: n,
    t: c,
    height: l,
    note: e,
    layerThick: s,
    fx: $,
    fy: S,
    fz: k
  };
}
function io({
  printer: t,
  points: o = 16,
  minz: n = 0.2,
  layerThick: s = 0.22,
  t: c = "1/2b",
  beatHeight: a = "8b",
  note: e = "C3",
  bpm: i = 95,
  amt: u = 0.5,
  loop: d = !1
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const y = 30, h = t.maxx / 10 + y, f = t.maxy / 10 + y, g = t.t2mm(a), l = 2 * Math.round(g / s), m = l * s + n, r = o * l, M = w(r / 8, 0.25), x = w(r, 1), b = O(2 / r, 1, 0, T / 2), S = O(r / 2, 0.75, 0, T / 2), $ = O(r, 0.75, 0, T / 2), _ = G(r * 2, 1), L = (I, E) => E + (0.5 * u * x(Math.round(Math.sqrt(I))) + u * b(I)), C = (I, E) => E + u * _(I) + 0.25 * u * (u * (0.5 - M(I)) + u * S(I) * $(I));
  return t.tsp(t.psp()), t.interval(c), t.thick(s), console.log(`MakeTriLineTest: totalBeats: ${r}, height: ${m}, layers: ${l}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: h,
    offsety: f,
    minz: n,
    t: c,
    height: m,
    note: e,
    layerThick: s,
    fx: C,
    fy: L,
    fz: k,
    loop: d
  };
}
function uo({
  printer: t,
  points: o = 2,
  minz: n = 0.13,
  layerThick: s = 0.15,
  t: c = "6b",
  beatHeight: a = "16b",
  note: e = "G3",
  bpm: i = 95,
  amt: u = 8 * 0.075,
  loop: d = !0
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const y = 30, h = t.maxx / 10 + y, f = t.maxy / 10 + y, g = t.t2mm(a), l = 2 * Math.round(g / s), m = l * s + n, r = o * l, M = w(r / 3, 1), x = w(r, 1), b = O(2 / r, 1, 0, T / 2), S = O(6 * r / 3, 1, T / 2, T / 2), $ = (L, C) => C + (u * x(L) + (u + u * b(L))), _ = (L, C) => C + u * (1 + u * M(L) + 0.33 * u * S(L));
  return t.tsp(t.psp()), t.interval(c), t.thick(s), console.log(`MakeTriLineTest: totalBeats: ${r}, height: ${m}, layers: ${l}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: h,
    offsety: f,
    minz: n,
    t: c,
    height: m,
    note: e,
    layerThick: s,
    fx: _,
    fy: $,
    fz: k,
    loop: d
  };
}
function ro({
  printer: t,
  points: o = 2,
  minz: n = 0.15,
  layerThick: s = 0.15,
  t: c = "6b",
  beatHeight: a = "16b",
  note: e = "G3",
  bpm: i = 95,
  amt: u = 10 * 0.075,
  loop: d = !0
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const y = 30, h = t.maxx / 10 + y, f = t.maxy / 10 + y, g = t.t2mm(a), l = 2 * Math.round(g / s), m = l * s + n, r = o * l, M = w(r * 2, 1, r / 2), x = w(r / 3, 1, r / 6), b = w(r / 3, 1, r), S = O(r * 2, 1, 0, T / 4), $ = O(r * 4, 1, T / 4, T / 4), _ = G(r * 8, 1), L = (I, E) => E + (0.05 * b(I) + u * S(I + o) * Math.sqrt((1 - _(I)) * (1 - _(I)))), C = (I, E) => E + M(I) * (1 + 0.125 * u * x(I) + 0.33 * u * $(I));
  return t.tsp(t.psp()), t.interval(c), t.thick(s), console.log(`MakeTriLineTest: totalBeats: ${r}, height: ${m}, layers: ${l}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: h,
    offsety: f,
    minz: n,
    t: c,
    height: m,
    note: e,
    layerThick: s,
    fx: C,
    fy: L,
    fz: k,
    loop: d
  };
}
function ho({
  printer: t,
  points: o = 16,
  minz: n = 0.18,
  layerThick: s = 0.15,
  t: c = "1/2b",
  beatHeight: a = "4b",
  note: e = "C3",
  bpm: i = 95,
  amt: u = 0.3
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const d = 30, y = t.maxx / 10 + d, h = t.maxy / 10 + d, f = t.t2mm(a), g = 2 * Math.round(f / s), l = g * s + n, m = o * g, r = w(m / 4, 1), M = G(m / 2, 1), x = (S, $) => $ + 0.5 * u * (1 - M(S)), b = (S, $) => $ + u * r(S);
  return t.tsp(t.psp()), t.interval("1/4b"), t.thick(s), console.log(`makeSimpleLine: totalBeats: ${m}, height: ${l}, layers: ${g}, layer thick ${s}, speed:${t.psp()}`), {
    printer: t,
    points: o,
    offsetx: y,
    offsety: h,
    minz: n,
    t: c,
    height: l,
    note: e,
    layerThick: s,
    fx: b,
    fy: x,
    fz: k
  };
}
function mo({
  printer: t,
  points: o = 32,
  minz: n = 0.15,
  layerThick: s = 0.15,
  t: c = "1b",
  beatHeight: a = "32b",
  note: e = "C3",
  bpm: i = 95,
  amt: u = 0.15
}) {
  if (!t)
    throw Error("No printer!");
  t.bpm(i), t.m2s(e);
  const d = 30, y = t.maxx / 10 + d, h = t.maxy / 10 + d, f = t.t2mm(a), g = 2 * Math.round(f / s), l = g * s + n, m = o * g, r = w(m / 9, 1), M = G(m / 6 + 5, 1), x = O(m / 9, 1), b = O(m * 2, 1), S = w(m * 2.25, 1), $ = (P, R) => R + u / 4 * (1 - x(S(P) * P)) + u / 2 * (1 - M(P)), _ = (P, R) => R + u * r(P) + b(P) * (1 - S(P));
  t.tsp(t.psp()), t.interval(c), t.thick(s);
  const L = dt(_, m), C = dt($, m);
  console.log(`x:${L}, y ${C}, note length: ${t.n2mm(e, c, i)}`);
  const I = o * t.n2mm(e, c, i), E = L[1] + L[0] + I, A = C[1] + C[0];
  return console.log(`makeGiacometti_1: totalBeats: ${m}, height: ${l}, layers: ${g}, layer thick ${s}, speed:${t.psp()}`), console.log(`width: ${E}, depth: ${A}`), {
    printer: t,
    points: o,
    offsetx: y,
    offsety: h,
    minz: n,
    t: c,
    height: l,
    note: e,
    layerThick: s,
    fx: _,
    fy: $,
    fz: k,
    width: E,
    depth: A
  };
}
function dt(t, o) {
  let n = 999999, s = -999999;
  for (let c = 0; c < o; c++) {
    const a = t(c, 1);
    n = Math.min(n, a), s = Math.max(s, a);
  }
  return [n, s];
}
const go = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  calcCols: B,
  genP4: oo,
  genP5: to,
  genP6: so,
  genPoly1: no,
  genPoly2: co,
  makeBoxy: uo,
  makeGiacometti_1: mo,
  makeP1: ao,
  makeP3: Zt,
  makeP4: pt,
  makeSimpleLine: ho,
  makeSinTest: eo,
  makeTriLineTest: lo,
  makeTriLineTestJuly4th: io,
  makeTriLineTestJuly5th: ro,
  makeTriLineTestSlower: fo,
  makeTriTest: Vt
}, Symbol.toStringTag, { value: "Module" })), xo = go, $o = Jt;
function bo({
  printer: t,
  grids: o,
  offsetx: n = 0,
  offsety: s = 0,
  minz: c = 0.2,
  rowNote: a = "C6",
  colNote: e = "E6",
  layerThick: i,
  t: u = "1/4b",
  fx: d = (g, l) => l,
  fy: y = (g, l) => l,
  fz: h = (g, l) => l,
  loop: f = !1
}) {
  console.log("GRIDLIB: preset data:"), console.log({
    printer: t,
    grids: o,
    offsetx: n,
    offsety: s,
    minz: c,
    rowNote: a,
    colNote: e,
    layerThick: i,
    t: u
  });
  const g = Array.isArray(o) ? Kt(o) : qt(o), l = B(o), m = Array.isArray(o) ? o[0].dim[1] : o.rows, r = t.n2mm(e, u) * l, M = t.n2mm(a, u) * m;
  t.m2s(a), console.log(`GRIDLIB: TCs: ${l}/ TRs: ${m} // W:${r}/H:${M}`);
  const x = ({ i: $, x: _, y: L, z: C }) => ({
    i: $,
    x: _ * M + n,
    y: L * M + s,
    z: C * (f ? i * 0.5 : i) + c
  }), b = {
    x: d,
    y,
    z: h
  };
  return () => {
    const $ = g.next();
    if ($)
      return x(it($.value, b));
  };
}
function Mo({
  printer: t,
  points: o,
  orient: n = "x",
  // or 'y'
  offsetx: s = 0,
  offsety: c = 0,
  minz: a = 0.2,
  note: e = "C6",
  t: i = "1/4b",
  fx: u = (g, l) => l,
  fy: d = (g, l) => l,
  fz: y = (g, l) => l,
  layerThick: h,
  loop: f
}) {
  console.log("GRIDLIB: preset data:"), console.log({
    printer: t,
    points: o,
    offsetx: s,
    offsety: c,
    minz: a,
    note: e,
    t: i
  });
  const g = jt({ points: o, orient: n, loop: f != null }), l = t.n2mm(e, i) * o, m = ({ i: x, x: b, y: S, z: $ }) => ({
    i: x,
    x: b * l + s,
    y: S * l + c,
    z: $ * h + a
  }), r = {
    x: u,
    y: d,
    z: y
  };
  return () => {
    const x = g.next();
    if (x)
      return m(it(x.value, r));
  };
}
function Lo({
  printer: t,
  sides: o,
  circumference: n,
  center: s,
  minz: c,
  note: a,
  fr: e = (h, f) => f,
  fx: i = (h, f) => f,
  fy: u = (h, f) => f,
  fz: d = (h, f) => f,
  layerThick: y
}) {
  const h = t.n2mm(a, n), f = 0.5 * h / T, g = h / o, l = Wt({ sides: o, center: s, radius: f, fr: e });
  console.log(`GRIDLIB POLY: TCs: ${o}  // side length ${g} (${t.d2t(g)}) / Circumference:${h}`);
  const m = ({ i: x, x: b, y: S, z: $ }) => ({
    i: x,
    x: b,
    y: S,
    z: $ * y + c
  }), r = {
    x: i,
    y: u,
    z: d
  };
  return () => {
    const x = l.next();
    if (x)
      return m(it(x.value, r));
  };
}
export {
  bo as makeIterator,
  Mo as makeLineIterator,
  Lo as makePolyIterator,
  $o as makeSpiral,
  xo as presets
};
