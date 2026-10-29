/**
 * Research solver, deliberately not connected to design PASS/FAIL.
 * Bogner–Fox–Schmit conforming rectangular Kirchhoff plate elements (nu=0.2).
 * The base and left edge are clamped, top and right edges are free.
 * D is normalised to one: actions are stiffness-independent for this homogeneous
 * idealised plate. The displacement variable is NOT a physical deflection.
 * Fixed/free corner point reactions are singular and are not design shears.
 */
export type PlateInput = {width:number;height:number;uniform:number;triangle:number;nx:number;ny:number};
export type PlateResult = {
  assessed:false;
  reason:string;
  horizontal:{positive:number;negative:number};
  vertical:{positive:number;negative:number};
  twistingPeak:number;
  appliedForce:number;
  supportForce:number;
  relativeEquilibriumError:number;
  relativeFreeResidual:number;
  compliance:number;
  leftReactions:number[];
  baseReactions:number[];
  rawPeakReactionPerMetre:{left:number;base:number};
};
const NU=.2;
const GX=[.06943184420297371,.33000947820757187,.6699905217924281,.9305681557970262];
const GW=[.17392742256872692,.32607257743127305,.32607257743127305,.17392742256872692];
/** Cubic Hermite interpolation: endpoint value, slope, value, slope. */
function hermite(t:number,h:number,k:number):number[]{
 const values=k===0?[1-3*t*t+2*t*t*t,t-2*t*t+t*t*t,3*t*t-2*t*t*t,-t*t+t*t*t]:k===1?[-6*t+6*t*t,1-4*t+3*t*t,6*t-6*t*t,-2*t+3*t*t]:[-6+12*t,-4+6*t,6-12*t,-2+6*t];
 return values.map((v,i)=>v*h**(i%2-k));
}
function tensor(x:number[],y:number[]):number[]{return x.flatMap(a=>y.map(b=>a*b))}
function field(x:number,y:number,hx:number,hy:number){
 return {w:tensor(hermite(x,hx,0),hermite(y,hy,0)),xx:tensor(hermite(x,hx,2),hermite(y,hy,0)),yy:tensor(hermite(x,hx,0),hermite(y,hy,2)),xy:tensor(hermite(x,hx,1),hermite(y,hy,1))};
}
function dot(a:number[],b:Float64Array):number{return a.reduce((s,v,i)=>s+v*b[i],0)}
/** Lower triangular band storage. Cholesky retains this bandwidth. */
function solveBand(matrix:Float64Array,rhs:Float64Array,n:number,band:number):Float64Array{
 const L=matrix.slice(),at=(i:number,j:number)=>i*band+i-j;
 for(let i=0;i<n;i++)for(let j=Math.max(0,i-band+1);j<=i;j++){
  let value=L[at(i,j)];
  for(let k=Math.max(0,i-band+1,j-band+1);k<j;k++)value-=L[at(i,k)]*L[at(j,k)];
  if(i===j){if(!(value>0)||!Number.isFinite(value))throw Error('Plate stiffness is not positive definite');L[at(i,j)]=Math.sqrt(value)}
  else L[at(i,j)]=value/L[at(j,j)];
 }
 const x=rhs.slice();
 for(let i=0;i<n;i++){for(let j=Math.max(0,i-band+1);j<i;j++)x[i]-=L[at(i,j)]*x[j];x[i]/=L[at(i,i)]}
 for(let i=n-1;i>=0;i--){for(let j=i+1;j<Math.min(n,i+band);j++)x[i]-=L[at(j,i)]*x[j];x[i]/=L[at(i,i)]}
 return x;
}
export function solveResearchPlate(input:PlateInput):PlateResult{
 const {width:a,height:b,uniform:q,triangle:p,nx,ny}=input;
 if(![a,b].every(v=>Number.isFinite(v)&&v>0)||![q,p].every(v=>Number.isFinite(v)&&v>=0)||![nx,ny].every(v=>Number.isInteger(v)&&v>=2&&v<=96)||nx*ny>5000)throw Error('Invalid plate geometry, pressure or mesh');
 const hx=a/nx,hy=b/ny,n=nx*ny*4,band=4*ny+8;
 const K=new Float64Array(256),F=new Float64Array(16),Fy=new Float64Array(16);
 for(let ix=0;ix<4;ix++)for(let iy=0;iy<4;iy++){
  const {w,xx,yy,xy}=field(GX[ix],GX[iy],hx,hy),weight=GW[ix]*GW[iy]*hx*hy;
  for(let i=0;i<16;i++){
   F[i]+=weight*w[i];Fy[i]+=weight*w[i]*GX[iy];
   for(let j=0;j<16;j++)K[i*16+j]+=weight*(xx[i]*xx[j]+yy[i]*yy[j]+NU*(xx[i]*yy[j]+yy[i]*xx[j])+2*(1-NU)*xy[i]*xy[j]);
  }
 }
 // All four nodal DOFs vanish along either clamped edge. Free ordering is
 // x-major and excludes both clamped edges, preserving a narrow matrix band.
 const global=(x:number,y:number,d:number)=>4*(x*(ny+1)+y)+d;
 const free=(x:number,y:number,d:number)=>x===0||y===0?-1:4*((x-1)*ny+y-1)+d;
 function indices(ex:number,ey:number){
  const ids:number[]=[],gids:number[]=[];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
   const x=ex+Math.floor(i/2),y=ey+Math.floor(j/2),d=2*(i%2)+j%2;
   ids.push(free(x,y,d));gids.push(global(x,y,d));
  }
  return {ids,gids};
 }
 const matrix=new Float64Array(n*band),rhs=new Float64Array(n);
 for(let ex=0;ex<nx;ex++)for(let ey=0;ey<ny;ey++){
  const {ids}=indices(ex,ey);
  for(let i=0;i<16;i++)if(ids[i]>=0){
   rhs[ids[i]]+=(q+p*(1-ey/ny))*F[i]-p/ny*Fy[i];
   for(let j=0;j<16;j++)if(ids[j]>=0&&ids[i]>=ids[j])matrix[ids[i]*band+ids[i]-ids[j]]+=K[i*16+j];
  }
 }
 const solution=solveBand(matrix,rhs,n,band),reactions=new Float64Array(4*(nx+1)*(ny+1));
 let hpos=0,hneg=0,vpos=0,vneg=0,twisting=0;
 const samples=[0,.5,1].flatMap(x=>[0,.5,1].map(y=>field(x,y,hx,hy)));
 for(let ex=0;ex<nx;ex++)for(let ey=0;ey<ny;ey++){
  const {ids,gids}=indices(ex,ey),u=Float64Array.from(ids,id=>id<0?0:solution[id]);
  for(let i=0;i<16;i++){
   let r=-((q+p*(1-ey/ny))*F[i]-p/ny*Fy[i]);
   for(let j=0;j<16;j++)r+=K[i*16+j]*u[j];
   reactions[gids[i]]+=r;
  }
  for(const f of samples){
   const xx=dot(f.xx,u),yy=dot(f.yy,u),mx=xx+NU*yy,my=yy+NU*xx;
   hpos=Math.max(hpos,mx);hneg=Math.min(hneg,mx);vpos=Math.max(vpos,my);vneg=Math.min(vneg,my);twisting=Math.max(twisting,Math.abs((1-NU)*dot(f.xy,u)));
  }
 }
 // The shared clamped/clamped corner force belongs to the support union.
 // Split it equally only for displaying the two arrays; count it once in sum.
 const left=Array.from({length:ny+1},(_,y)=>-reactions[global(0,y,0)]);
 const base=Array.from({length:nx+1},(_,x)=>-reactions[global(x,0,0)]);
 left[0]/=2;base[0]/=2;
 const applied=a*b*(q+p/2),support=[...left,...base].reduce((s,v)=>s+v,0);
 let residual=0;
 for(let x=1;x<=nx;x++)for(let y=1;y<=ny;y++)for(let d=0;d<4;d++)residual=Math.max(residual,Math.abs(reactions[global(x,y,d)]));
 return {assessed:false,reason:'Research analysis only: corner shear, torsion design, action envelopes and design-section extraction are not validated. No design PASS/FAIL is permitted.',horizontal:{positive:hpos,negative:hneg},vertical:{positive:vpos,negative:vneg},twistingPeak:twisting,appliedForce:applied,supportForce:support,relativeEquilibriumError:Math.abs(support-applied)/Math.max(1,Math.abs(applied)),relativeFreeResidual:residual/Math.max(1,...Array.from(rhs,Math.abs)),compliance:solution.reduce((s,v,i)=>s+v*rhs[i],0),leftReactions:left,baseReactions:base,rawPeakReactionPerMetre:{left:Math.max(...left.map(Math.abs))/hy,base:Math.max(...base.map(Math.abs))/hx}};
}
