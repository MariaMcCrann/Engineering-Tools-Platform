import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/StructuralConcreteTools.tsx',import.meta.url),'utf8')+'\nexport {slabShearChecks,AdditionalSlabReinforcement};';
const exports={};
let stateValues=[],stateIndex=0;
const jsx=(type,props)=>({type,props});
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==="react"?{useState:initial=>[stateValues[stateIndex++]??initial,()=>{}]}:name==="react/jsx-runtime"?{jsx,jsxs:jsx}:{}});
const calc=exports.slabShearChecks;
const section={d:196.2,Ast:1500.8435303749638};
const run=(db=0,s=1000,angle=90,legs=2)=>calc(250,40,500,51.02816411556,-51.02816411556,70.560540099,section,section,db,s,angle,legs);
test('no-link calculation reproduces supplied workbook C310',()=>{
 assert.ok(Math.abs(run().capacity-186.33573503051269)<1e-8);
 assert.equal(run().phiVus,0);
});
test('link grid normalises effective legs across a one-metre strip and increases capacity',()=>{
 const r=run(16,100);
 assert.ok(Math.abs(r.Asv-2*Math.PI*16**2/4*1000/100)<1e-8);
 assert.ok(r.phiVus>0);
 assert.ok(r.capacity>run().capacity);
 assert.ok(r.capacity<=r.checks.find(c=>c.label==='Shear web crushing').provided);
 assert.equal(r.checks[0].pass,true);
});
test('wide spacing and invalid shear geometry cannot produce an overall PASS',()=>{
 assert.equal(run(16,400).checks.every(c=>c.pass),false);
 for(const args of [[16,0],[16,100,0],[16,100,90,1.5]]){
  const r=run(...args);assert.equal(r.checks[0].pass,false);assert.equal(r.capacity,0);
 }
});
test('weaker primary tension face governs the shear envelope',()=>{
 const weak={d:190,Ast:453.645979};
 const r=calc(250,40,500,51.028,-51.028,70.56,section,weak,0,1000,90,2);
 assert.ok(r.capacity<run().capacity);
});

function additional(states){
 stateValues=states;stateIndex=0;
 return exports.AdditionalSlabReinforcement({length:10000,width:9000,cover:50,topMesh:'RL1218',bottomMesh:'RL1218',D:400,fc:40,fsy:500,Mp:50,Mn:-10,V:70,primaryBottom:section,primaryTop:section});
}
function inspect(tree){const checks=[],controls=[];function visit(n){if(Array.isArray(n))n.forEach(visit);else if(n&&typeof n==='object'){if(n.props?.checks)checks.push(...n.props.checks);if(n.type==='input'||n.type==='select')controls.push(n);visit(n.props?.children)}}visit(tree);return {checks,controls};}
test('optional reinforcement defaults off and hides its inputs, checks and quantities',()=>{
 const r=inspect(additional([]));assert.equal(r.controls.length,2);assert.ok(r.controls.every(c=>c.props.type==='checkbox'&&!c.props.checked));
 assert.ok(!r.checks.some(c=>c.label.includes('secondary')||c.label.includes('Minimum transverse')));
 assert.ok(r.checks.some(c=>c.label.startsWith('One-way shear')));
});
test('secondary steel sums both faces and reacts to optional bars',()=>{
 const sparse=inspect(additional([16,1000,16,1000,0,400,90,2,0,true,false])).checks.find(c=>c.label.startsWith('Total secondary'));
 const dense=inspect(additional([16,200,16,200,0,400,90,2,0,true,false])).checks.find(c=>c.label.startsWith('Total secondary'));
 assert.ok(Math.abs(sparse.provided-2*(Math.PI*16**2/4+Math.PI*7.6**2/4*5))<1e-8);
 assert.equal(sparse.pass,true);assert.ok(dense.provided>sparse.provided);
 assert.equal(section.Ast,1500.8435303749638);
});
test('unchecking shear ignores retained link selections and invalid leg input',()=>{
 const selected=[0,1000,0,1000,16,100,90,2,0,false,true];
 const on=inspect(additional(selected)),off=inspect(additional([...selected.slice(0,10),false]));
 assert.ok(on.controls.length>off.controls.length);
 assert.ok(on.checks.find(c=>c.label.startsWith('One-way shear')).provided>off.checks.find(c=>c.label.startsWith('One-way shear')).provided);
 const invalidOff=inspect(additional([0,1000,0,1000,0,400,90,0,0,false,false]));
 assert.ok(invalidOff.checks.find(c=>c.label.startsWith('One-way shear')).provided>0);
});
test('reported 300 mm slab shear discrepancy is reproduced rather than hidden',()=>{
 const mesh=Math.PI*11.9**2/4*10,bar=Math.PI*16**2/4;
 const r=calc(300,40,500,84.797,-103.641,219.993,{d:244.05,Ast:mesh+bar*5},{d:244.05,Ast:mesh+bar*2.5},0,400,90,2);
 assert.ok(Math.abs(r.capacity-159.1)<.1);assert.equal(r.checks[0].pass,false);
});

test('350 mm slab distinguishes adequate shear strength from excessive 200 mm link spacing',()=>{
 const r=calc(350,40,500,50,-60,186.6,{d:294,Ast:1600},{d:294,Ast:1600},16,200,90,2);
 assert.ok(r.capacity>186.6);assert.equal(r.checks[0].pass,true);assert.equal(r.checks.every(c=>c.pass),false);
 const spacing=r.checks.find(c=>c.label.includes('along primary span'));
 assert.equal(spacing.required,200);assert.equal(spacing.provided,175);assert.equal(spacing.pass,false);
 assert.equal(spacing.requiredLabel,'Actual spacing');assert.equal(spacing.providedLabel,'Maximum spacing');
 assert.match(spacing.basis,/0.5 × slab thickness/);assert.match(spacing.basis,/175.0 mm/);
});
test('minimum shear steel remains a failed check even when links are not selected',()=>{
 const r=calc(800,40,500,0,0,1,{d:740,Ast:2000},{d:740,Ast:2000},0,200,90,2);
 assert.equal(r.checks[0].pass,true);assert.equal(r.checks.find(c=>c.label.startsWith('Minimum transverse')).pass,false);
 assert.equal(r.checks.every(c=>c.pass),false);
});
