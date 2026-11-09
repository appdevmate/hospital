'use strict';
/**
 * Minimal HTTP helper for the security suite. Node 18+ built-in fetch only —
 * no third-party dependencies, so the suite can run from a clean checkout.
 *
 * Every call returns { status, headers (lowercased map), text, json|null,
 * ms }. Never throws on HTTP errors; only on network failure.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

async function request(url, { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS, redirect = 'manual' } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = Date.now();
    try {
        const res = await fetch(url, { method, headers, body, redirect, signal: ctrl.signal });
        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
        const h = {};
        res.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
        return { status: res.status, headers: h, text, json, ms: Date.now() - t0 };
    } finally {
        clearTimeout(timer);
    }
}

const get  = (url, o = {}) => request(url, { ...o, method: 'GET' });
const post = (url, body, o = {}) => request(url, { ...o, method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', ...(o.headers || {}) } });
const patch = (url, body, o = {}) => request(url, { ...o, method: 'PATCH', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', ...(o.headers || {}) } });
const del  = (url, o = {}) => request(url, { ...o, method: 'DELETE' });
const options = (url, o = {}) => request(url, { ...o, method: 'OPTIONS' });

function bearer(token) { return { authorization: `Bearer ${token}` }; }

module.exports = { request, get, post, patch, del, options, bearer };
