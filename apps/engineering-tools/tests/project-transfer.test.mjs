import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../app/project-transfer.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,crypto:webcrypto,TextEncoder,Date});
const {exportProjectFile:encode,parseProjectFile:decode,projectFilename}=exports;
const project={id:'original',name:'Culvert test',toolView:'headwall-concrete',toolLabel:'Headwall Concrete',note:'Check water level',savedAt:123,inputs:[{index:0,tag:'INPUT',type:'number',value:'2.43',key:'height'},{index:1,tag:'INPUT',type:'checkbox',value:'on',checked:true},{index:2,tag:'SELECT',type:'select-one',value:'RL1218'},{index:3,tag:'TEXTAREA',type:'textarea',value:'First line\nSecond line'}]};
test('portable project round trip preserves editable values and imports as a new copy',()=>{
 const file=encode(project),a=decode(file,['headwall-concrete']),b=decode(file,['headwall-concrete']);
 assert.equal(a.name,project.name);assert.equal(a.note,project.note);assert.equal(JSON.stringify(a.inputs),JSON.stringify(project.inputs));
 assert.notEqual(a.id,project.id);assert.notEqual(a.id,b.id);assert.ok(a.savedAt>project.savedAt);
});
test('rejects reports, missing inputs, unsupported tools and newer versions',()=>{
 assert.throws(()=>decode('bad',['headwall-concrete']),/valid project file/);
 for(const edit of [f=>{f.version=2},f=>{f.project.toolView='not-a-tool'},f=>{f.project.inputs=[]},f=>{f.project.inputs[0].index=-1},f=>{f.project.inputs[0].value={unsafe:true}},f=>{f.project.inputs[0].type='file'}]){
  const f=JSON.parse(encode(project));edit(f);assert.throws(()=>decode(JSON.stringify(f),['headwall-concrete']));
 }
 assert.throws(()=>encode({...project,inputs:undefined}),/no saved inputs/);
});
test('sanitizes download names and ignores unrecognized imported fields',()=>{
 assert.equal(projectFilename('../../my project'),'_my_project.engineering-project.json');
 const f=JSON.parse(encode(project));f.project.evil='ignored';f.project.inputs[0].onChange='ignored';
 const imported=decode(JSON.stringify(f),['headwall-concrete']);assert.equal(imported.evil,undefined);assert.equal(imported.inputs[0].onChange,undefined);
});
