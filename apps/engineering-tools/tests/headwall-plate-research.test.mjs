import assert from 'node:assert/strict';
import test from 'node:test';
import {solveResearchPlate as solve} from '../analysis/headwall/plate.ts';
const square={width:1,height:1,uniform:1,triangle:0,nx:10,ny:10};
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('banded browser solver agrees with independently assembled SciPy sparse solve',()=>{
 // analysis/headwall/bfs_reference.py, 10x10 elements, D=1, nu=0.2.
 const uniform=solve(square),triangle=solve({...square,uniform:0,triangle:1});
 for(const [r,mx,mn,my,myn,vx,vy] of [[uniform,.28500,-.03643,.28500,-.03643,1.23704,1.23704],[triangle,.06767,-.00834,.11054,-.01780,.27874,.58856]]){
  close(r.horizontal.positive,mx,5e-6);close(r.horizontal.negative,mn,5e-6);close(r.vertical.positive,my,5e-6);close(r.vertical.negative,myn,5e-6);close(r.rawPeakReactionPerMetre.left,vx,5e-6);close(r.rawPeakReactionPerMetre.base,vy,5e-6);
  assert.ok(r.relativeEquilibriumError<1e-8);assert.ok(r.relativeFreeResidual<1e-8);
 }
});

test('strain energy agrees with independent global Rayleigh–Ritz basis',()=>{
 // 16x16 integrated Legendre basis, analysis/headwall/ritz_reference.py.
 // This is a global response check, not validation of singular point shear.
 const uniform=solve(square),triangle=solve({...square,uniform:0,triangle:1});
 assert.ok(Math.abs(uniform.compliance/.008675616726739522-1)<.001);
 assert.ok(Math.abs(triangle.compliance/.0008435775569349741-1)<.001);
});

test('uniform loading respects rotation symmetry and dimensional scaling',()=>{
 const i={...square,width:2,nx:20},r=solve(i),rotated=solve({...square,height:2,ny:20}),scaled=solve({...i,width:6,height:3,uniform:2});
 close(r.horizontal.positive,rotated.vertical.positive);close(r.vertical.negative,rotated.horizontal.negative);
 close(scaled.horizontal.positive,18*r.horizontal.positive);close(scaled.vertical.negative,18*r.vertical.negative);close(scaled.supportForce,18*r.supportForce);
 close(scaled.rawPeakReactionPerMetre.left,6*r.rawPeakReactionPerMetre.left);
});

test('Church Street actual aspect ratio balances load without square-table or cantilever substitution',()=>{
 const r=solve({width:5.5,height:2.43,uniform:20,triangle:35.3565,nx:23,ny:10});
 close(r.appliedForce,503.56981125);close(r.horizontal.positive,71.09756,5e-6);close(r.vertical.positive,88.41633,5e-6);
 assert.ok(r.relativeEquilibriumError<1e-8);assert.ok(r.relativeFreeResidual<1e-8);
 assert.equal(r.assessed,false);assert.match(r.reason,/not validated/);
});

test('mesh refinement exposes the corner reaction singularity instead of approving a design',()=>{
 const coarse=solve(square),fine=solve({...square,nx:20,ny:20});
 assert.ok(fine.compliance>coarse.compliance);assert.ok(Math.abs(fine.compliance/coarse.compliance-1)<.001);
 // Global response converges while local corner reaction grows strongly.
 assert.ok(fine.rawPeakReactionPerMetre.left/coarse.rawPeakReactionPerMetre.left>1.5);
 assert.equal(coarse.assessed,false);assert.equal(fine.assessed,false);
});

test('invalid geometry, pressures and excessive mesh sizes fail before assembly',()=>{
 for(const bad of [{width:0},{height:NaN},{uniform:-1},{triangle:Infinity},{nx:1},{ny:2.5},{nx:96,ny:96}])assert.throws(()=>solve({...square,...bad}),/Invalid plate/);
 const zero=solve({...square,uniform:0});close(zero.appliedForce,0);close(zero.compliance,0);close(zero.horizontal.positive,0);
});
