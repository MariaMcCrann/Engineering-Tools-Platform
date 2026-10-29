import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,extra=''){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:()=>({})});return exports;}
const {calculateBoxCulvertLoading:loading}=load('../app/StructuralLoadGenerators.tsx');
const {slabShearChecks:shear,sectionChecks:section}=load('../app/StructuralConcreteTools.tsx','\nexport {slabShearChecks,sectionChecks};');
const inputs={cells:2,unitsLong:6,linkSlabs:0,boxOuterWidth:2.772,linkWidth:1.524,unitLength:1.22,clearSpan:2.438,slabOverhang:.25,soilCover:.38,slabDepth:.3,soilDensity:20,concreteDensity:24.5,boxMassKg:7500,linkMassKg:1930};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('uploaded test workbook loading chain matches saved results',()=>{
 const r=loading(inputs);
 for(const [name,expected] of Object.entries({slabWidth:6.05,slabLength:7.37,deadLoad:198.51688,transverseReduction:.4572713643178411,liveLoad:279.9019555425412,ulsPressure:89.15772785717542,Mp:48.176329616136826,Mn:-58.882180641945006,V:124.98576079658135,Msls:35.024164317800263,bearing:62.671047018850153}))near(r[name],expected);
});
test('uploaded test workbook bending and no-link shear capacities reconcile',()=>{
 const r=loading(inputs),face=section(300,50,16,400,'RL1218','pri',40,500,r.Mp,r.Msls,1.75);
 near(face.Ast,1614.8571637614937);
 // Workbook C-cells give phiMuo 121.430 (phi 0.65, d to mesh wire). Tool now uses AS 3600-2018 ku-based phi (0.85 here)
 // and d to the larger of N16 and mesh wire (d = 242 mm).
 near(face.d,242);near(face.phi,.85);near(face.phiMuo,157.38595851378258);
 const check=shear(300,40,500,r.Mp,r.Mn,r.V,face,face,0,100,90,2);
 near(check.capacity,214.66189279343524);assert.equal(check.checks[0].pass,true);
});
test('two-unit PDF and six-unit workbook are materially different load cases',()=>{
 const short=loading({...inputs,unitsLong:2}),long=loading(inputs);
 near(short.transverseReduction,1);assert.ok(short.liveLoad>2*long.liveLoad);assert.ok(short.V>long.V);
 near(short.slabLength,2.45);near(long.slabLength,7.37);
});
test('link slabs count as spans when selecting the workbook coefficient case',()=>{
 const r=loading({...inputs,cells:1,linkSlabs:1});
 near(r.Mp,r.ulsPressure*inputs.clearSpan**2/11);
 near(r.Mn,-r.ulsPressure*inputs.clearSpan**2/9);
});
