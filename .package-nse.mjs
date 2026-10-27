import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'nse-dashboard');
if(fs.existsSync(out)) throw new Error('Destination already exists');
const copied=new Set();
const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(out,p)),{recursive:true});fs.writeFileSync(path.join(out,p),s)};
function copy(p){
 p=p.replaceAll('\\','/'); if(copied.has(p)) return;
 const full=path.join(root,p); if(!fs.existsSync(full)||!fs.statSync(full).isFile()) throw new Error(`Missing ${p}`);
 copied.add(p); write(p,fs.readFileSync(full));
 if(!/\.(tsx?|jsx?|css|mjs)$/.test(p))return;
 const text=fs.readFileSync(full,'utf8');
 const re=/(?:from\s*|import\s*\(\s*|import\s*|require\(\s*)['"]([^'"]+)['"]/g;
 for(const m of text.matchAll(re)){
 const spec=m[1].split('?')[0];if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;
 const base=spec.startsWith('@/')?'src/'+spec.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(p),spec));
 const resolved=[base,...['.ts','.tsx','.js','.jsx','.json','/index.ts','/index.tsx'].map(e=>base+e)].find(f=>fs.existsSync(path.join(root,f))&&fs.statSync(path.join(root,f)).isFile());
 if(!resolved)throw new Error(`Unresolved ${p}: ${spec}`);copy(resolved);
 }
}
for(const dir of ['src/components/nse','src/services','src/test'])for(const f of fs.readdirSync(path.join(root,dir)))if(dir!=='src/services'||/^nse/i.test(f))if(fs.statSync(path.join(root,dir,f)).isFile())copy(`${dir}/${f}`);
for(const f of ['src/pages/dashboard/NSEDashboard.tsx','src/pages/dashboard/NSEDashboard.test.tsx','src/index.css','src/vite-env.d.ts','package.json','package-lock.json','tailwind.config.ts','postcss.config.js','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vitest.config.ts','nse-openapi.json','scripts/generate-nse-types.mjs','server/src/routes/nseRoutes.js','server/package.json','server/package-lock.json'])copy(f);
write('server/src/config/env.js',`require('dotenv').config();\nmodule.exports = { nse: { baseUrl: process.env.NSE_BASE_URL || 'http://165.22.218.229' } };\n`);
write('server/index.js',`const express = require('express');\nconst cors = require('cors');\nrequire('dotenv').config();\nconst app = express();\napp.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:8081' }));\napp.use(express.json({ limit: '8mb' }));\napp.use('/nse-api', require('./src/routes/nseRoutes'));\napp.get('/health', (_req, res) => res.json({ status: 'ok' }));\napp.listen(process.env.PORT || 5000);\n`);
write('server/.env.example','PORT=5000\nFRONTEND_ORIGIN=http://localhost:8081\nNSE_BASE_URL=http://165.22.218.229\n');
write('vite.config.ts',`import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react-swc';\nimport path from 'node:path';\nexport default defineConfig({ plugins: [react()], resolve: { alias: { '@': path.resolve(__dirname, './src') } }, server: { host: 'localhost', port: 8081, proxy: { '/nse-api': { target: 'http://localhost:5000', changeOrigin: true } } } });\n`);
write('index.html','<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>NSE Dashboard</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
write('src/main.tsx',`import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import NSEDashboard from './pages/dashboard/NSEDashboard';
import { loginToNSE } from './services/nseAuth';
import './index.css';
function Login() {
 const navigate = useNavigate();
 const [username, setUsername] = useState(''), [password, setPassword] = useState('');
 const [error, setError] = useState(''), [busy, setBusy] = useState(false);
 return <main className="min-h-screen grid place-items-center bg-slate-100 p-6"><form className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await loginToNSE(username, password); navigate('/nse-dashboard'); } catch(e) { setError(e instanceof Error ? e.message : 'Login failed'); } finally { setBusy(false); } }}><h1 className="text-2xl font-bold">NSE Dashboard Login</h1><label className="block">Username<input autoComplete="username" required className="mt-2 w-full rounded border p-3" value={username} onChange={e=>setUsername(e.target.value)}/></label><label className="block">Password<input type="password" autoComplete="current-password" required className="mt-2 w-full rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded bg-indigo-600 p-3 text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button></form></main>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Routes><Route path="/mf-login" element={<Login/>}/><Route path="/nse-dashboard" element={<NSEDashboard/>}/><Route path="*" element={<Navigate to="/nse-dashboard" replace/>}/></Routes></BrowserRouter>);
`);
write('.gitignore','node_modules/\nserver/node_modules/\ndist/\n.env\nserver/.env\n');
write('README.md',`# NSE Dashboard\n\nStandalone copy of the existing NSE dashboard, its interaction components, services, types, shared UI dependencies, fixtures and tests. Original source paths are preserved inside this folder.\n\n## Run\n\n1. Run npm ci in this folder.\n2. Run npm ci --prefix server.\n3. Optionally copy server/.env.example to server/.env and configure the NSE provider URL.\n4. Run npm run dev:full.\n5. Open http://localhost:8081 and sign in using valid NSE provider credentials.\n\n## Verify\n\n- npm run build\n- npm test\n\nThe dashboard components and services are copied unchanged. The standalone entry provides NSE login and logout routing. The Vite development proxy uses the included local NSE backend on port 5000. For production hosting, route /nse-api to this backend and serve the SPA fallback for frontend routes.\n\nReal account data and exchange transactions require a reachable provider and valid credentials. No credentials or .env files are included.\n`);
write('source-manifest.json',JSON.stringify([...copied].sort(),null,2));
console.log(`Created ${out}: ${copied.size} source files plus standalone setup.`);
