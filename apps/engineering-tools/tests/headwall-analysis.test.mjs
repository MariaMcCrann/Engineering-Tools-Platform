import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
function load(path,extra='',resolver=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:resolver});return exports;}
const {calculateHeadwallActions:calc,verifiedHeadwallActions:manual}=load('../app/StructuralLoadGenerators.tsx');
const {sectionChecks:section,headwallCrackLimit:limit}=load('../app/StructuralConcreteTools.tsx','\nexport {sectionChecks,headwallCrackLimit};');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Church Street long panel calculates forces: cantilever vertical strip plus local a/b=1 horizontal actions',()=>{
 const r=calc(5.5,2.43,2.43,2.43,20,9.1,20,'case4'),square=calc(2.43,2.43,2.43,2.43,20,9.1,20,'case4');
 assert.equal(r.valid,true);assert.equal(r.method,'cantilever');
 near(r.vMp,20*2.43**2/2+.5*20*2.43**3/6+.5*9.1*2.43**3/6);near(r.vV,20*2.43+.5*20*2.43**2/2+.5*9.1*2.43**2/2);near(r.vMn,0);
 near(r.hMp,square.hMp);near(r.hMn,square.hMn);near(r.hV,square.hV);
});
test('square plate uses the published EM27 full-height triangular coefficients',()=>{
 const r=calc(2.43,2.43,2.43,2.43,20,9.1,20,'case4');assert.equal(r.valid,true);near(r.hMp,48.64811091147);near(r.hMn,-5.433954995745);near(r.hV,73.9542337515);near(r.vMp,58.982552455545);near(r.vMn,-6.75598386582);near(r.vV,105.476922387);
});
test('base-only cantilever is explicitly selected and has no invented horizontal plate demand',()=>{
 const r=calc(1,2.43,2.43,2.43,20,9.1,20,'cantilever');assert.equal(r.valid,true);assert.equal(r.method,'cantilever');near(r.vMp,93.845099475);near(r.vMn,0);near(r.vV,91.5581475);near(r.hMp,0);near(r.hV,0);
});
test('dry and partial-height cantilever loads integrate actual pressure triangles',()=>{
 const r=calc(5,3,2,1,20,10,5,'cantilever');near(r.vMp,5*2**2/2+.5*20*2**3/6+.5*10*1**3/6);near(r.vV,5*2+.5*20*2**2/2+.5*10*1**2/2);
});
test('invalid inputs and three-edge support are blocked; other plate ratios and partial heights calculate',()=>{
 for(const args of [[1,2,2,2,20,10,5,'case4'],[2,2,1,1,20,10,5,'case4'],[4,2,1,1,20,10,5,'case4']])assert.equal(calc(...args).valid,true);
 for(const args of [[2,2,2,2,20,10,5,'three'],[0,2,2,2,20,10,5,'cantilever'],[2,2,2,3,20,10,5,'cantilever']])assert.equal(calc(...args).valid,false);
});
const actions={hMp:'51.028',hMn:'-5.664',hV:'70.561',vMp:'68.336',vMn:'-9.762',vV:'121.715',hServicePositive:'35',hServiceNegative:'-4',vServicePositive:'47',vServiceNegative:'-7'};
test('manual analysis requires complete signed ULS/SLS actions and provenance',()=>{
 const r=manual(5.5,2.43,'case4',actions,'Plate model HW-01 Rev B',true);assert.equal(r.valid,true);near(r.vServiceNegative,-7);assert.equal(r.method,'manual');
 assert.equal(manual(5.5,2.43,'case4',actions,'',true).valid,false);assert.equal(manual(5.5,2.43,'case4',actions,'ref',false).valid,false);
 assert.equal(manual(5.5,2.43,'case4',{...actions,hV:''},'ref',true).valid,false);assert.equal(manual(5.5,2.43,'case4',{...actions,vMn:'9'},'ref',true).valid,false);
});
test('mesh directions, signed service moments and cracking limits follow workbook equations',()=>{
 const h=section(250,50,20,300,'RL1218','pri',40,500,50,35,1.75),v=section(250,50,20,300,'RL1218','sec',40,500,50,-35,1.75);
 assert.ok(h.Ast>v.Ast);assert.ok(v.fscr>0);assert.ok(v.fscr>h.fscr);
 near(limit(250,20,300,'SL81','pri',500),200);near(section(250,50,20,300,'SL81','pri',40,500,51,51.02816411556,1.75).fscr,196.35019954321797);
});

test('rendered headwall retains face options and force fields without blanking steel-only checks',()=>{
 function component(path){return load(path,'',name=>name==='react'?React:name==='react/jsx-runtime'?jsxRuntime:name==='./StructuralLoadGenerators'?component('../app/StructuralLoadGenerators.tsx'):{});}
 const html=renderToStaticMarkup(React.createElement(component('../app/StructuralConcreteTools.tsx').HeadwallStructuralTool));
 for(const label of ['Inside face reinforcement','Outside face reinforcement','Inside face N-bar','Outside face N-bar','Inside face mesh wire spacing','Outside face mesh wire spacing','Design actions','Analysis required'])assert.ok(html.includes(label),label);
 const rows=html.match(/<tr[\s\S]*?<\/tr>/g)||[];
 const minimum=rows.find(row=>row.includes('Horizontal inside face minimum bending steel'));
 assert.ok(minimum.includes('499.3'));assert.ok(minimum.includes('PASS'));
 for(const row of rows.filter(row=>row.includes('One-way shear')||row.includes('+ve bending'))){assert.ok(row.includes('NOT ASSESSED'));assert.ok(!row.includes('PASS'));}
 assert.ok(!html.includes('351.2 kN/m'));
});

test('unit pressure benchmarks separate uniform Figure 27 from triangular Figure 30',()=>{
 // Isolate each pressure shape. Figure 30: a/b=1, p=1, b=1.
 const triangle=calc(1,1,1,0,2,1,0,'case4');
 for(const [key,expected] of Object.entries({hMp:.0662,hMn:-.0077,hV:.2481,vMp:.1157,vMn:-.0172,vV:.5586}))near(triangle[key],expected);
 // With no retained soil or water, this is a pure uniform-pressure benchmark.
 const uniform=calc(1,1,0,0,1,1,1,'case4');
 for(const [key,expected] of Object.entries({hMp:.2949,hMn:-.0324,hV:1.1828,vMp:.2949,vMn:-.0324,vV:1.1828}))near(uniform[key],expected);
});

test('dry plate does not subtract buoyancy where there is no groundwater',()=>{
 const dry=calc(2,2,2,0,20,9.81,0,'case4');near(dry.deadPressure,20);near(dry.hMp,.0662*20*4);near(dry.vMp,.1157*20*4);
});

test('ST043566: surcharge acts over retained soil only and the cantilever base moment matches the plate sign',()=>{
 const long=calc(5.5,3.04,2.43,2.43,20,9.81,20,'case4');
 near(long.vMp,20*2.43**2/2+.5*20*2.43**3/6+.5*9.81*2.43**3/6);assert.ok(Math.abs(long.vMp-94.7)<.1);near(long.vMn,0);
 const square=calc(2.43,2.43,2.43,2.43,20,9.81,20,'case4');assert.ok(square.vMp>0&&square.vMp>Math.abs(square.vMn));
});

test('crack width selector: 0.3 keeps workbook tables; 0.2 and 0.4 use Eurocode 2 limits in order',()=>{
 near(limit(250,20,300,'SL81','pri',500),200);near(limit(250,20,300,'SL81','pri',500,.3),200);
 // N20 @ 150: EC2 0.4 mm spacing table allows 320 MPa; 0.2 mm spacing table allows 200 MPa.
 near(limit(350,20,150,'None','pri',500,.4),320);near(limit(350,20,150,'None','pri',500,.2),200);
 for(const [db,s] of [[16,300],[20,200],[12,100],[24,250]]){const l2=limit(300,db,s,'None','pri',500,.2),l4=limit(300,db,s,'None','pri',500,.4);assert.ok(l2<l4,`${db}@${s}`);assert.ok(l4<=400);}
});

test('turning RL mesh vertical moves the heavy wires into the vertical direction',()=>{
 const standard=section(300,50,16,300,'RL1218','sec',40,500,0,0,1.75),turned=section(300,50,16,300,'RL1218','pri',40,500,0,0,1.75);
 assert.ok(turned.Ast-standard.Ast>800);
});

test('independent soil and water factors apply to effective soil plus hydrostatic pressure',()=>{
 const args=[5.5,3,2,1,20,10,5,'cantilever'];
 const u=calc(...args,{soil:1.5,water:1,surcharge:1});
 // Effective soil moment = K*(gamma*hs^3 - gammaw*hw^3)/6; water moment = gammaw*hw^3/6.
 near(u.vMp,1.5*.5*(20*8-10)/6+10/6+5*4/2);
 near(u.vV,1.5*.5*(20*4-10)/2+10/2+5*2);
 const service=calc(...args,{soil:1.2,water:1,surcharge:1});
 near(service.vMp,1.2*.5*(20*8-10)/6+10/6+10);
 for(const support of ['case4','cantilever']){
  const base=calc(2,2,2,1,20,10,5,support);
  const doubled=calc(2,2,2,1,20,10,5,support,{soil:2,water:2,surcharge:2});
  for(const key of ['hMp','hMn','hV','vMp','vMn','vV'])near(doubled[key],2*base[key]);
 }
 assert.equal(calc(...args,{soil:NaN,water:1,surcharge:1}).valid,false);
 assert.equal(calc(...args,{soil:1,water:0,surcharge:1}).valid,false);
});
test('AS5100 presets distinguish fill quality and reset water and surcharge factors',()=>{
 const {HEADWALL_FACTOR_GUIDE:guide}=load('../app/StructuralLoadGenerators.tsx');
 assert.equal(guide.length,2);
 near(guide[0].soil,1.25);near(guide[0].slsSoil,1);
 near(guide[1].soil,1.5);near(guide[1].slsSoil,1.2);
 for(const row of guide){near(row.water,1);near(row.live,1);}
});
