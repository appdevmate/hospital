'use strict';
/** Tiny result collector + console table. */
class Report {
    constructor(suite) { this.suite = suite; this.rows = []; }
    pass(check, detail = '')  { this.rows.push({ check, result: 'PASS', detail }); }
    fail(check, detail = '')  { this.rows.push({ check, result: 'FAIL', detail }); }
    skip(check, detail = '')  { this.rows.push({ check, result: 'SKIP', detail }); }
    expect(check, cond, detail = '') { cond ? this.pass(check, detail) : this.fail(check, detail); return !!cond; }
    get failed() { return this.rows.filter(r => r.result === 'FAIL').length; }
    get passed() { return this.rows.filter(r => r.result === 'PASS').length; }
    get skipped() { return this.rows.filter(r => r.result === 'SKIP').length; }
    print() {
        console.log(`\n── ${this.suite} ──`);
        for (const r of this.rows) {
            const tag = r.result === 'PASS' ? '  ok  ' : r.result === 'FAIL' ? ' FAIL ' : ' skip ';
            console.log(`[${tag}] ${r.check}${r.detail ? '  — ' + r.detail : ''}`);
        }
        console.log(`   ${this.passed} passed, ${this.failed} failed, ${this.skipped} skipped`);
    }
}
module.exports = { Report };
