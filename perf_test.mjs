const tests = [
  { lang: 'Python',     id: 71, code: 'print(sum(range(1000)))' },
  { lang: 'C++',        id: 54, code: '#include<iostream>\nusing namespace std;\nint main(){ int s=0; for(int i=0;i<1000;i++) s+=i; cout<<s; return 0;}' },
  { lang: 'Java',       id: 62, code: 'public class Main { public static void main(String[] a){ int s=0; for(int i=0;i<1000;i++) s+=i; System.out.println(s); } }' },
  { lang: 'C',          id: 50, code: '#include<stdio.h>\nint main(){ int s=0; for(int i=0;i<1000;i++) s+=i; printf("%d",s); return 0;}' },
  { lang: 'JavaScript', id: 63, code: 'let s=0; for(let i=0;i<1000;i++) s+=i; console.log(s);' },
];

async function runTest(t) {
  const start = Date.now();
  const r = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_code: t.code, language_id: t.id, stdin: '' })
  });
  const d = await r.json();
  const ms = Date.now() - start;
  return { lang: t.lang, ms, status: d.status?.description, output: d.stdout?.trim() };
}

async function measureSocketLatency() {
  const url = 'http://localhost:3001';
  const start = Date.now();
  try {
    await fetch(url + '/api/ice-servers');
    return Date.now() - start;
  } catch {
    return null;
  }
}

console.log('=== PERFORMANCE BENCHMARK ===\n');
console.log('1. Testing Judge0 Code Execution Latency...');

const results = [];
for (const t of tests) {
  try {
    const res = await runTest(t);
    results.push(res);
    console.log(`   ${res.lang}: ${res.ms}ms | Status: ${res.status} | Output: ${res.output}`);
  } catch (e) {
    console.log(`   ${t.lang}: ERROR - ${e.message}`);
  }
}

console.log('\n2. Testing Local Server Response Time...');
const serverMs = await measureSocketLatency();
if (serverMs) {
  console.log(`   Server /api/ice-servers: ${serverMs}ms`);
} else {
  console.log('   Server not running locally (expected if using Render)');
}

console.log('\n=== RESULTS SUMMARY ===');
if (results.length > 0) {
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const min = Math.min(...results.map(r => r.ms));
  const max = Math.max(...results.map(r => r.ms));
  console.log(`   Languages tested: ${results.length}`);
  console.log(`   Avg execution latency: ${avg}ms`);
  console.log(`   Fastest: ${min}ms | Slowest: ${max}ms`);
  console.log(`   Success rate: ${results.filter(r => r.status === 'Accepted').length}/${results.length} (${Math.round(results.filter(r=>r.status==='Accepted').length/results.length*100)}%)`);
}
