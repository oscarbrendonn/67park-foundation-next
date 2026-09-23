import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../.github/workflows/release.yml',import.meta.url),'utf8');
test('automatic releases default to short checks, with explicit full-suite opt-ins',()=>{
 assert.match(source,/full_regression:\s+description:[^\n]+\s+type: boolean\s+required: false\s+default: false/);
 assert(source.includes("RUN_FULL_BROWSER_TESTS: ${{ vars.PARK_FULL_REGRESSION == 'true' || inputs.full_regression == true }}"));
 const selected=(variable,input)=>variable==='true'||input===true;
 for(const variable of [undefined,'','false'])assert.equal(selected(variable,undefined),false);
 assert(selected('true',undefined));assert(selected('false',true));
});
test('long test and its costly browser setup are conditional; no thresholds are reduced',()=>{
 const steps=source.split(/\n      - /).slice(1),long=steps.filter(s=>s.includes('npx playwright install')||s.includes('sudo apt-get install')||s.includes('npm run test:browser'));
 assert.equal(long.length,3);
 for(const step of long)assert(step.includes("if: env.RUN_FULL_BROWSER_TESTS == 'true'"));
 assert(source.includes("PARK_SOAK_MS: '900000'"));
 assert(source.includes("PARK_SOFTWARE_DRIVER: 'mesa'"));
 assert(!source.includes('continue-on-error'));assert(!source.includes('|| true'));
});
test('short checks and deployment dependency stay mandatory',()=>{
 assert(source.includes('- run: npm audit --audit-level=high'));
 assert(source.includes('- run: npm test'));
 assert.match(source,/name: Release profile and changed-feature unit checks\s+run: node --import/);
 assert.match(source,/deploy:\s+needs: regression/);
 assert(source.includes('uses: actions/deploy-pages@v4'));
});
