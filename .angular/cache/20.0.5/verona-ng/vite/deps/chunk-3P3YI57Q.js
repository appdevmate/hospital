import {
  F,
  G,
  U,
  _,
  a,
  b,
  ee,
  i,
  m,
  p,
  q2 as q,
  s,
  s2,
  w,
  z
} from "./chunk-ICG2ZITK.js";

// node_modules/@primeuix/styled/dist/index.mjs
var Qe = Object.defineProperty;
var Ye = Object.defineProperties;
var et = Object.getOwnPropertyDescriptors;
var F2 = Object.getOwnPropertySymbols;
var fe = Object.prototype.hasOwnProperty;
var ye = Object.prototype.propertyIsEnumerable;
var he = (e, t, r) => t in e ? Qe(e, t, { enumerable: true, configurable: true, writable: true, value: r }) : e[t] = r;
var d = (e, t) => {
  for (var r in t || (t = {})) fe.call(t, r) && he(e, r, t[r]);
  if (F2) for (var r of F2(t)) ye.call(t, r) && he(e, r, t[r]);
  return e;
};
var _2 = (e, t) => Ye(e, et(t));
var b2 = (e, t) => {
  var r = {};
  for (var s3 in e) fe.call(e, s3) && t.indexOf(s3) < 0 && (r[s3] = e[s3]);
  if (e != null && F2) for (var s3 of F2(e)) t.indexOf(s3) < 0 && ye.call(e, s3) && (r[s3] = e[s3]);
  return r;
};
function Se(...e) {
  return w(...e);
}
var st = s2();
var R = st;
var v = /{([^}]*)}/g;
var lt = /(\d+\s+[\+\-\*\/]\s+\d+)/g;
var ct = /var\([^)]+\)/g;
function Vt(e) {
  return p(e) ? e.replace(/[A-Z]/g, (t, r) => r === 0 ? t : "." + t.toLowerCase()).toLowerCase() : e;
}
function Et(e, t) {
  b(e) ? e.push(...t || []) : i(e) && Object.assign(e, t);
}
function ke(e) {
  return i(e) && e.hasOwnProperty("$value") && e.hasOwnProperty("$type") ? e.$value : e;
}
function Lt(e, t = "") {
  return ["opacity", "z-index", "line-height", "font-weight", "flex", "flex-grow", "flex-shrink", "order"].some((s3) => t.endsWith(s3)) ? e : `${e}`.trim().split(" ").map((a2) => _(a2) ? `${a2}px` : a2).join(" ");
}
function mt(e) {
  return e.replaceAll(/ /g, "").replace(/[^\w]/g, "-");
}
function Q(e = "", t = "") {
  return mt(`${p(e, false) && p(t, false) ? `${e}-` : e}${t}`);
}
function ne(e = "", t = "") {
  return `--${Q(e, t)}`;
}
function dt(e = "") {
  let t = (e.match(/{/g) || []).length, r = (e.match(/}/g) || []).length;
  return (t + r) % 2 !== 0;
}
function Y(e, t = "", r = "", s3 = [], o) {
  if (p(e)) {
    let a2 = e.trim();
    if (dt(a2)) return;
    if (z(a2, v)) {
      let n = a2.replaceAll(v, (l) => {
        let c = l.replace(/{|}/g, "").split(".").filter((m2) => !s3.some((u) => z(m2, u)));
        return `var(${ne(r, ee(c.join("-")))}${s(o) ? `, ${o}` : ""})`;
      });
      return z(n.replace(ct, "0"), lt) ? `calc(${n})` : n;
    }
    return a2;
  } else if (_(e)) return e;
}
function Mt(e = {}, t) {
  if (p(t)) {
    let r = t.trim();
    return z(r, v) ? r.replaceAll(v, (s3) => F(e, s3.replace(/{|}/g, ""))) : r;
  } else if (_(t)) return t;
}
function _e(e, t, r) {
  p(t, false) && e.push(`${t}:${r};`);
}
function T(e, t) {
  return e ? `${e}{${t}}` : "";
}
function oe(e, t) {
  if (e.indexOf("dt(") === -1) return e;
  function r(n, l) {
    let i2 = [], c = 0, m2 = "", u = null, p2 = 0;
    for (; c <= n.length; ) {
      let h = n[c];
      if ((h === '"' || h === "'" || h === "`") && n[c - 1] !== "\\" && (u = u === h ? null : h), !u && (h === "(" && p2++, h === ")" && p2--, (h === "," || c === n.length) && p2 === 0)) {
        let y = m2.trim();
        y.startsWith("dt(") ? i2.push(oe(y, l)) : i2.push(s3(y)), m2 = "", c++;
        continue;
      }
      h !== void 0 && (m2 += h), c++;
    }
    return i2;
  }
  function s3(n) {
    let l = n[0];
    if ((l === '"' || l === "'" || l === "`") && n[n.length - 1] === l) return n.slice(1, -1);
    let i2 = Number(n);
    return isNaN(i2) ? n : i2;
  }
  let o = [], a2 = [];
  for (let n = 0; n < e.length; n++) if (e[n] === "d" && e.slice(n, n + 3) === "dt(") a2.push(n), n += 2;
  else if (e[n] === ")" && a2.length > 0) {
    let l = a2.pop();
    a2.length === 0 && o.push([l, n]);
  }
  if (!o.length) return e;
  for (let n = o.length - 1; n >= 0; n--) {
    let [l, i2] = o[n], c = e.slice(l + 3, i2), m2 = r(c, t), u = t(...m2);
    e = e.slice(0, l) + u + e.slice(i2 + 1);
  }
  return e;
}
function be(e) {
  return e.length === 4 ? `#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}` : e;
}
function $e(e) {
  let t = parseInt(e.substring(1), 16), r = t >> 16 & 255, s3 = t >> 8 & 255, o = t & 255;
  return { r, g: s3, b: o };
}
function ut(e, t, r) {
  return `#${e.toString(16).padStart(2, "0")}${t.toString(16).padStart(2, "0")}${r.toString(16).padStart(2, "0")}`;
}
var A = (e, t, r) => {
  e = be(e), t = be(t);
  let a2 = (r / 100 * 2 - 1 + 1) / 2, n = 1 - a2, l = $e(e), i2 = $e(t), c = Math.round(l.r * a2 + i2.r * n), m2 = Math.round(l.g * a2 + i2.g * n), u = Math.round(l.b * a2 + i2.b * n);
  return ut(c, m2, u);
};
var ae = (e, t) => A("#000000", e, t);
var ie = (e, t) => A("#ffffff", e, t);
var Re = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
var gt = (e) => {
  if (z(e, v)) {
    let t = e.replace(/{|}/g, "");
    return Re.reduce((r, s3) => (r[s3] = `{${t}.${s3}}`, r), {});
  }
  return typeof e == "string" ? Re.reduce((t, r, s3) => (t[r] = s3 <= 5 ? ie(e, (5 - s3) * 19) : ae(e, (s3 - 5) * 15), t), {}) : e;
};
var tr = (e) => {
  var a2;
  let t = g.getTheme(), r = le(t, e, void 0, "variable"), s3 = (a2 = r == null ? void 0 : r.match(/--[\w-]+/g)) == null ? void 0 : a2[0], o = le(t, e, void 0, "value");
  return { name: s3, variable: r, value: o };
};
var P = (...e) => le(g.getTheme(), ...e);
var le = (e = {}, t, r, s3) => {
  if (t) {
    let { variable: o, options: a2 } = g.defaults || {}, { prefix: n, transform: l } = (e == null ? void 0 : e.options) || a2 || {}, i2 = z(t, v) ? t : `{${t}}`;
    return s3 === "value" || a(s3) && l === "strict" ? g.getTokenValue(t) : Y(i2, void 0, n, [o.excludedKeyRegex], r);
  }
  return "";
};
function ar(e, ...t) {
  if (e instanceof Array) {
    let r = e.reduce((s3, o, a2) => {
      var n;
      return s3 + o + ((n = m(t[a2], { dt: P })) != null ? n : "");
    }, "");
    return oe(r, P);
  }
  return m(e, { dt: P });
}
var O = (e = {}) => {
  let { preset: t, options: r } = e;
  return { preset(s3) {
    return t = t ? U(t, s3) : s3, this;
  }, options(s3) {
    return r = r ? d(d({}, r), s3) : s3, this;
  }, primaryPalette(s3) {
    let { semantic: o } = t || {};
    return t = _2(d({}, t), { semantic: _2(d({}, o), { primary: s3 }) }), this;
  }, surfacePalette(s3) {
    var i2, c;
    let { semantic: o } = t || {}, a2 = s3 && Object.hasOwn(s3, "light") ? s3.light : s3, n = s3 && Object.hasOwn(s3, "dark") ? s3.dark : s3, l = { colorScheme: { light: d(d({}, (i2 = o == null ? void 0 : o.colorScheme) == null ? void 0 : i2.light), !!a2 && { surface: a2 }), dark: d(d({}, (c = o == null ? void 0 : o.colorScheme) == null ? void 0 : c.dark), !!n && { surface: n }) } };
    return t = _2(d({}, t), { semantic: d(d({}, o), l) }), this;
  }, define({ useDefaultPreset: s3 = false, useDefaultOptions: o = false } = {}) {
    return { preset: s3 ? g.getPreset() : t, options: o ? g.getOptions() : r };
  }, update({ mergePresets: s3 = true, mergeOptions: o = true } = {}) {
    let a2 = { preset: s3 ? U(g.getPreset(), t) : t, options: o ? d(d({}, g.getOptions()), r) : r };
    return g.setTheme(a2), a2;
  }, use(s3) {
    let o = this.define(s3);
    return g.setTheme(o), o;
  } };
};
function ce(e, t = {}) {
  let r = g.defaults.variable, { prefix: s3 = r.prefix, selector: o = r.selector, excludedKeyRegex: a2 = r.excludedKeyRegex } = t, n = [], l = [], i2 = [{ node: e, path: s3 }];
  for (; i2.length; ) {
    let { node: m2, path: u } = i2.pop();
    for (let p2 in m2) {
      let h = m2[p2], y = ke(h), x = z(p2, a2) ? Q(u) : Q(u, ee(p2));
      if (i(y)) i2.push({ node: y, path: x });
      else {
        let k = ne(x), w2 = Y(y, x, s3, [a2]);
        _e(l, k, w2);
        let $ = x;
        s3 && $.startsWith(s3 + "-") && ($ = $.slice(s3.length + 1)), n.push($.replace(/-/g, "."));
      }
    }
  }
  let c = l.join("");
  return { value: l, tokens: n, declarations: c, css: T(o, c) };
}
var S = { regex: { rules: { class: { pattern: /^\.([a-zA-Z][\w-]*)$/, resolve(e) {
  return { type: "class", selector: e, matched: this.pattern.test(e.trim()) };
} }, attr: { pattern: /^\[(.*)\]$/, resolve(e) {
  return { type: "attr", selector: `:root${e}`, matched: this.pattern.test(e.trim()) };
} }, media: { pattern: /^@media (.*)$/, resolve(e) {
  return { type: "media", selector: e, matched: this.pattern.test(e.trim()) };
} }, system: { pattern: /^system$/, resolve(e) {
  return { type: "system", selector: "@media (prefers-color-scheme: dark)", matched: this.pattern.test(e.trim()) };
} }, custom: { resolve(e) {
  return { type: "custom", selector: e, matched: true };
} } }, resolve(e) {
  let t = Object.keys(this.rules).filter((r) => r !== "custom").map((r) => this.rules[r]);
  return [e].flat().map((r) => {
    var s3;
    return (s3 = t.map((o) => o.resolve(r)).find((o) => o.matched)) != null ? s3 : this.rules.custom.resolve(r);
  });
} }, _toVariables(e, t) {
  return ce(e, { prefix: t == null ? void 0 : t.prefix });
}, getCommon({ name: e = "", theme: t = {}, params: r, set: s3, defaults: o }) {
  var w2, $, j, V, D, z2, E;
  let { preset: a2, options: n } = t, l, i2, c, m2, u, p2, h;
  if (s(a2) && n.transform !== "strict") {
    let { primitive: L, semantic: te, extend: re } = a2, y = te || {}, { colorScheme: K } = y, M = b2(y, ["colorScheme"]), N = re || {}, { colorScheme: X } = N, B = b2(N, ["colorScheme"]), x = K || {}, { dark: G2 } = x, I = b2(x, ["dark"]), k = X || {}, { dark: U2 } = k, H = b2(k, ["dark"]), W = s(L) ? this._toVariables({ primitive: L }, n) : {}, q2 = s(M) ? this._toVariables({ semantic: M }, n) : {}, Z = s(I) ? this._toVariables({ light: I }, n) : {}, de = s(G2) ? this._toVariables({ dark: G2 }, n) : {}, ue = s(B) ? this._toVariables({ semantic: B }, n) : {}, pe = s(H) ? this._toVariables({ light: H }, n) : {}, ge = s(U2) ? this._toVariables({ dark: U2 }, n) : {}, [Le, Me] = [(w2 = W.declarations) != null ? w2 : "", W.tokens], [Ae, je] = [($ = q2.declarations) != null ? $ : "", q2.tokens || []], [De, ze] = [(j = Z.declarations) != null ? j : "", Z.tokens || []], [Ke, Xe] = [(V = de.declarations) != null ? V : "", de.tokens || []], [Be, Ge] = [(D = ue.declarations) != null ? D : "", ue.tokens || []], [Ie, Ue] = [(z2 = pe.declarations) != null ? z2 : "", pe.tokens || []], [He, We] = [(E = ge.declarations) != null ? E : "", ge.tokens || []];
    l = this.transformCSS(e, Le, "light", "variable", n, s3, o), i2 = Me;
    let qe = this.transformCSS(e, `${Ae}${De}`, "light", "variable", n, s3, o), Ze = this.transformCSS(e, `${Ke}`, "dark", "variable", n, s3, o);
    c = `${qe}${Ze}`, m2 = [.../* @__PURE__ */ new Set([...je, ...ze, ...Xe])];
    let Fe = this.transformCSS(e, `${Be}${Ie}color-scheme:light`, "light", "variable", n, s3, o), Je = this.transformCSS(e, `${He}color-scheme:dark`, "dark", "variable", n, s3, o);
    u = `${Fe}${Je}`, p2 = [.../* @__PURE__ */ new Set([...Ge, ...Ue, ...We])], h = m(a2.css, { dt: P });
  }
  return { primitive: { css: l, tokens: i2 }, semantic: { css: c, tokens: m2 }, global: { css: u, tokens: p2 }, style: h };
}, getPreset({ name: e = "", preset: t = {}, options: r, params: s3, set: o, defaults: a2, selector: n }) {
  var y, N, x;
  let l, i2, c;
  if (s(t) && r.transform !== "strict") {
    let k = e.replace("-directive", ""), m2 = t, { colorScheme: w2, extend: $, css: j } = m2, V = b2(m2, ["colorScheme", "extend", "css"]), u = $ || {}, { colorScheme: D } = u, z2 = b2(u, ["colorScheme"]), p2 = w2 || {}, { dark: E } = p2, L = b2(p2, ["dark"]), h = D || {}, { dark: te } = h, re = b2(h, ["dark"]), K = s(V) ? this._toVariables({ [k]: d(d({}, V), z2) }, r) : {}, M = s(L) ? this._toVariables({ [k]: d(d({}, L), re) }, r) : {}, X = s(E) ? this._toVariables({ [k]: d(d({}, E), te) }, r) : {}, [B, G2] = [(y = K.declarations) != null ? y : "", K.tokens || []], [I, U2] = [(N = M.declarations) != null ? N : "", M.tokens || []], [H, W] = [(x = X.declarations) != null ? x : "", X.tokens || []], q2 = this.transformCSS(k, `${B}${I}`, "light", "variable", r, o, a2, n), Z = this.transformCSS(k, H, "dark", "variable", r, o, a2, n);
    l = `${q2}${Z}`, i2 = [.../* @__PURE__ */ new Set([...G2, ...U2, ...W])], c = m(j, { dt: P });
  }
  return { css: l, tokens: i2, style: c };
}, getPresetC({ name: e = "", theme: t = {}, params: r, set: s3, defaults: o }) {
  var i2;
  let { preset: a2, options: n } = t, l = (i2 = a2 == null ? void 0 : a2.components) == null ? void 0 : i2[e];
  return this.getPreset({ name: e, preset: l, options: n, params: r, set: s3, defaults: o });
}, getPresetD({ name: e = "", theme: t = {}, params: r, set: s3, defaults: o }) {
  var c, m2;
  let a2 = e.replace("-directive", ""), { preset: n, options: l } = t, i2 = ((c = n == null ? void 0 : n.components) == null ? void 0 : c[a2]) || ((m2 = n == null ? void 0 : n.directives) == null ? void 0 : m2[a2]);
  return this.getPreset({ name: a2, preset: i2, options: l, params: r, set: s3, defaults: o });
}, applyDarkColorScheme(e) {
  return !(e.darkModeSelector === "none" || e.darkModeSelector === false);
}, getColorSchemeOption(e, t) {
  var r;
  return this.applyDarkColorScheme(e) ? this.regex.resolve(e.darkModeSelector === true ? t.options.darkModeSelector : (r = e.darkModeSelector) != null ? r : t.options.darkModeSelector) : [];
}, getLayerOrder(e, t = {}, r, s3) {
  let { cssLayer: o } = t;
  return o ? `@layer ${m(o.order || o.name || "primeui", r)}` : "";
}, getCommonStyleSheet({ name: e = "", theme: t = {}, params: r, props: s3 = {}, set: o, defaults: a2 }) {
  let n = this.getCommon({ name: e, theme: t, params: r, set: o, defaults: a2 }), l = Object.entries(s3).reduce((i2, [c, m2]) => i2.push(`${c}="${m2}"`) && i2, []).join(" ");
  return Object.entries(n || {}).reduce((i2, [c, m2]) => {
    if (i(m2) && Object.hasOwn(m2, "css")) {
      let u = G(m2.css), p2 = `${c}-variables`;
      i2.push(`<style type="text/css" data-primevue-style-id="${p2}" ${l}>${u}</style>`);
    }
    return i2;
  }, []).join("");
}, getStyleSheet({ name: e = "", theme: t = {}, params: r, props: s3 = {}, set: o, defaults: a2 }) {
  var c;
  let n = { name: e, theme: t, params: r, set: o, defaults: a2 }, l = (c = e.includes("-directive") ? this.getPresetD(n) : this.getPresetC(n)) == null ? void 0 : c.css, i2 = Object.entries(s3).reduce((m2, [u, p2]) => m2.push(`${u}="${p2}"`) && m2, []).join(" ");
  return l ? `<style type="text/css" data-primevue-style-id="${e}-variables" ${i2}>${G(l)}</style>` : "";
}, createTokens(e = {}, t, r = "", s3 = "", o = {}) {
  return {};
}, getTokenValue(e, t, r) {
  var l;
  let o = ((i2) => i2.split(".").filter((m2) => !z(m2.toLowerCase(), r.variable.excludedKeyRegex)).join("."))(t), a2 = t.includes("colorScheme.light") ? "light" : t.includes("colorScheme.dark") ? "dark" : void 0, n = [(l = e[o]) == null ? void 0 : l.computed(a2)].flat().filter((i2) => i2);
  return n.length === 1 ? n[0].value : n.reduce((i2 = {}, c) => {
    let p2 = c, { colorScheme: m2 } = p2, u = b2(p2, ["colorScheme"]);
    return i2[m2] = u, i2;
  }, void 0);
}, getSelectorRule(e, t, r, s3) {
  return r === "class" || r === "attr" ? T(s(t) ? `${e}${t},${e} ${t}` : e, s3) : T(e, T(t != null ? t : ":root", s3));
}, transformCSS(e, t, r, s3, o = {}, a2, n, l) {
  if (s(t)) {
    let { cssLayer: i2 } = o;
    if (s3 !== "style") {
      let c = this.getColorSchemeOption(o, n);
      t = r === "dark" ? c.reduce((m2, { type: u, selector: p2 }) => (s(p2) && (m2 += p2.includes("[CSS]") ? p2.replace("[CSS]", t) : this.getSelectorRule(p2, l, u, t)), m2), "") : T(l != null ? l : ":root", t);
    }
    if (i2) {
      let c = { name: "primeui", order: "primeui" };
      i(i2) && (c.name = m(i2.name, { name: e, type: s3 })), s(c.name) && (t = T(`@layer ${c.name}`, t), a2 == null || a2.layerNames(c.name));
    }
    return t;
  }
  return "";
} };
var g = { defaults: { variable: { prefix: "p", selector: ":root", excludedKeyRegex: /^(primitive|semantic|components|directives|variables|colorscheme|light|dark|common|root|states|extend|css)$/gi }, options: { prefix: "p", darkModeSelector: "system", cssLayer: false } }, _theme: void 0, _layerNames: /* @__PURE__ */ new Set(), _loadedStyleNames: /* @__PURE__ */ new Set(), _loadingStyles: /* @__PURE__ */ new Set(), _tokens: {}, update(e = {}) {
  let { theme: t } = e;
  t && (this._theme = _2(d({}, t), { options: d(d({}, this.defaults.options), t.options) }), this._tokens = S.createTokens(this.preset, this.defaults), this.clearLoadedStyleNames());
}, get theme() {
  return this._theme;
}, get preset() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.preset) || {};
}, get options() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.options) || {};
}, get tokens() {
  return this._tokens;
}, getTheme() {
  return this.theme;
}, setTheme(e) {
  this.update({ theme: e }), R.emit("theme:change", e);
}, getPreset() {
  return this.preset;
}, setPreset(e) {
  this._theme = _2(d({}, this.theme), { preset: e }), this._tokens = S.createTokens(e, this.defaults), this.clearLoadedStyleNames(), R.emit("preset:change", e), R.emit("theme:change", this.theme);
}, getOptions() {
  return this.options;
}, setOptions(e) {
  this._theme = _2(d({}, this.theme), { options: e }), this.clearLoadedStyleNames(), R.emit("options:change", e), R.emit("theme:change", this.theme);
}, getLayerNames() {
  return [...this._layerNames];
}, setLayerNames(e) {
  this._layerNames.add(e);
}, getLoadedStyleNames() {
  return this._loadedStyleNames;
}, isStyleNameLoaded(e) {
  return this._loadedStyleNames.has(e);
}, setLoadedStyleName(e) {
  this._loadedStyleNames.add(e);
}, deleteLoadedStyleName(e) {
  this._loadedStyleNames.delete(e);
}, clearLoadedStyleNames() {
  this._loadedStyleNames.clear();
}, getTokenValue(e) {
  return S.getTokenValue(this.tokens, e, this.defaults);
}, getCommon(e = "", t) {
  return S.getCommon({ name: e, theme: this.theme, params: t, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getComponent(e = "", t) {
  let r = { name: e, theme: this.theme, params: t, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return S.getPresetC(r);
}, getDirective(e = "", t) {
  let r = { name: e, theme: this.theme, params: t, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return S.getPresetD(r);
}, getCustomPreset(e = "", t, r, s3) {
  let o = { name: e, preset: t, options: this.options, selector: r, params: s3, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return S.getPreset(o);
}, getLayerOrderCSS(e = "") {
  return S.getLayerOrder(e, this.options, { names: this.getLayerNames() }, this.defaults);
}, transformCSS(e = "", t, r = "style", s3) {
  return S.transformCSS(e, t, s3, r, this.options, { layerNames: this.setLayerNames.bind(this) }, this.defaults);
}, getCommonStyleSheet(e = "", t, r = {}) {
  return S.getCommonStyleSheet({ name: e, theme: this.theme, params: t, props: r, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getStyleSheet(e, t, r = {}) {
  return S.getStyleSheet({ name: e, theme: this.theme, params: t, props: r, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, onStyleMounted(e) {
  this._loadingStyles.add(e);
}, onStyleUpdated(e) {
  this._loadingStyles.add(e);
}, onStyleLoaded(e, { name: t }) {
  this._loadingStyles.size && (this._loadingStyles.delete(t), R.emit(`theme:${t}:load`, e), !this._loadingStyles.size && R.emit("theme:load"));
} };
function we(...e) {
  let t = w(g.getPreset(), ...e);
  return g.setPreset(t), t;
}
function Ce(e) {
  return O().primaryPalette(e).update().preset;
}
function Oe(e) {
  return O().surfacePalette(e).update().preset;
}
function Ve(...e) {
  let t = w(...e);
  return g.setPreset(t), t;
}
function Ee(e) {
  return O(e).update({ mergePresets: false });
}
var me = class {
  constructor({ attrs: t } = {}) {
    this._styles = /* @__PURE__ */ new Map(), this._attrs = t || {};
  }
  get(t) {
    return this._styles.get(t);
  }
  has(t) {
    return this._styles.has(t);
  }
  delete(t) {
    this._styles.delete(t);
  }
  clear() {
    this._styles.clear();
  }
  add(t, r) {
    if (s(r)) {
      let s3 = { name: t, css: r, attrs: this._attrs, markup: q(r, this._attrs) };
      this._styles.set(t, _2(d({}, s3), { element: this.createStyleElement(s3) }));
    }
  }
  update() {
  }
  getStyles() {
    return this._styles;
  }
  getAllCSS() {
    return [...this._styles.values()].map((t) => t.css).filter(String);
  }
  getAllMarkup() {
    return [...this._styles.values()].map((t) => t.markup).filter(String);
  }
  getAllElements() {
    return [...this._styles.values()].map((t) => t.element);
  }
  createStyleElement(t = {}) {
  }
};
var vt = me;

export {
  Se,
  R,
  v,
  lt,
  ct,
  Vt,
  Et,
  ke,
  Lt,
  mt,
  Q,
  ne,
  dt,
  Y,
  Mt,
  _e,
  T,
  oe,
  A,
  ae,
  ie,
  gt,
  tr,
  P,
  le,
  ar,
  O,
  ce,
  S,
  g,
  we,
  Ce,
  Oe,
  Ve,
  Ee,
  vt
};
//# sourceMappingURL=chunk-3P3YI57Q.js.map
