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
 assert.equal(run(16,400).checks[0].pass,false);
 for(const args of [[16,0],[16,100,0],[16,100,90,1.5]]){
  const r=run(...args);assert.equal(r.checks[0].pass,false);assert.equal(r.capacity,0);
 }
});
test('weaker primary tension face governs the shear envelope',()=>{
 const weak={d:190,Ast:453.645979};
 const r=calc(250,40,500,51.028,-51.028,70.56,section,weak,0,1000,90,2);
 assert.ok(r.capacity<run().capacity);
});

test('secondary bars update secondary steel checks without being added to primary steel',()=>{
 function secondary(spacing){
  stateValues=[16,spacing,16,spacing];stateIndex=0;
  const tree=exports.AdditionalSlabReinforcement({length:10000,width:9000,cover:50,topMesh:'RL1218',bottomMesh:'RL1218',D:400,fc:40,fsy:500,Mp:50,Mn:-10,V:70,primaryBottom:section,primaryTop:section});
  let checks=[];function visit(n){if(Array.isArray(n))n.forEach(visit);else if(n&&typeof n==='object'){if(n.props?.checks)checks.push(...n.props.checks);visit(n.props?.children)}}visit(tree);
  return checks.filter(c=>c.label.includes('secondary temperature'));
 }
 const sparse=secondary(1000),dense=secondary(200);
 assert.equal(sparse.length,2);assert.equal(sparse[0].pass,false);assert.equal(dense[0].pass,true);
 assert.ok(dense[0].provided>sparse[0].provided);
 assert.equal(section.Ast,1500.8435303749638);
});
