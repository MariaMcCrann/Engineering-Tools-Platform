/* SI internally: kN, m, kNm. Source section values from supplied Tedds files.
   Linear elastic analysis only. No AS 4991 certification or stability design. */
(function(root){
const g=9.80665, pos=(x,n)=>x>0?x**n:0;
const defaults=()=>({project:'Bridge deck lift',number:'',designer:'Maria',section:'460 UB 67.1',L:7.9,o:0.3,mass:67.1,E:200000,G:80000,I:295800000,As:3859,Z:1303000,Mcap:399.33,Vcap:625.16,capBasis:'section',share:50,n:2,dynamic:1,gG:1.2,gQ:1.5,defRatio:250,stiffness:1,angle:0,loads:[{type:'udl',mass:27.3,width:7.5,center:3.95}]});
function validate(s){
 let e=[];const positive=['L','mass','E','G','I','As','Z','Mcap','Vcap','dynamic','gG','gQ','defRatio','stiffness'];
 for(const k of positive)if(!Number.isFinite(s[k])||s[k]<=0)e.push(k+' must be greater than zero.');
 if(!Number.isFinite(s.o)||s.o<0)e.push('End overhang must be zero or positive.');
 if(![1,2].includes(s.n))e.push('Select one or two beams.');
 if(!Number.isFinite(s.share)||s.share<=0||s.share>=100)e.push('Beam 1 share must be between 0 and 100%.');
 if(!Number.isFinite(s.angle)||s.angle<0||s.angle>=80)e.push('Sling angle must be from 0 to less than 80° from vertical.');
 if(!s.loads?.length)e.push('Add at least one payload.');
 (s.loads||[]).forEach((l,i)=>{if(!['udl','point'].includes(l.type))e.push('Unknown load type.');if(!Number.isFinite(l.mass)||l.mass<0)e.push('Load '+(i+1)+': mass cannot be negative.');if(!Number.isFinite(l.center)||l.center<0||l.center>s.L)e.push('Load '+(i+1)+': centre must lie between the lugs.');if(l.type==='udl'&&(!Number.isFinite(l.width)||l.width<=0||l.center-l.width/2< -1e-9||l.center+l.width/2>s.L+1e-9))e.push('Load '+(i+1)+': distributed load must fit between the lugs.');});
 return e;
}
function response(s,share,scale=1,strength=true){
 const L=s.L,o=s.o, sw=s.mass*g/1000*(strength?s.gG:1),qf=(strength?s.gQ:1)*s.dynamic;
 const udls=[{a:-o,b:L+o,q:sw}],points=[];
 for(const l of s.loads){let P=l.mass*g*share*scale*qf;if(l.type==='point')points.push({x:l.center,P});else udls.push({a:l.center-l.width/2,b:l.center+l.width/2,q:P/l.width});}
 let total=0,mom=0;udls.forEach(l=>{let w=l.q*(l.b-l.a);total+=w;mom+=w*(l.a+l.b)/2;});points.forEach(l=>{total+=l.P;mom+=l.P*l.x;});
 const RB=mom/L,RA=total-RB;
 function V(x){return RA*(x>=0?1:0)+RB*(x>=L?1:0)-udls.reduce((v,l)=>v+l.q*(pos(x-l.a,1)-pos(x-l.b,1)),0)-points.reduce((v,l)=>v+l.P*(x>=l.x?1:0),0);}
 function M(x){return RA*pos(x,1)+RB*pos(x-L,1)-udls.reduce((v,l)=>v+l.q*(pos(x-l.a,2)-pos(x-l.b,2))/2,0)-points.reduce((v,l)=>v+l.P*pos(x-l.x,1),0);}
 function F(x){return RA*pos(x,3)/6+RB*pos(x-L,3)/6-udls.reduce((v,l)=>v+l.q*(pos(x-l.a,4)-pos(x-l.b,4))/24,0)-points.reduce((v,l)=>v+l.P*pos(x-l.x,3)/6,0);}
 const EI=s.E*1000*s.I*1e-12*s.stiffness,GA=s.G*1000*s.As*1e-6,fl=(F(L)-F(0))/L,ml=(M(L)-M(0))/L;
 function d(x){return (-(F(x)-F(0)-fl*x)/EI+(M(x)-M(0)-ml*x)/GA)*1000;}
 const breaks=[-o,0,L,L+o,...points.map(p=>p.x),...udls.flatMap(l=>[l.a,l.b])].filter(x=>x>=-o&&x<=L+o).sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-9);
 let critical=[...breaks];
 for(let i=0;i<breaks.length-1;i++){let a=breaks[i],b=breaks[i+1],eps=Math.min(1e-7,(b-a)/100),v1=V(a+eps),v2=V(b-eps);if(v1*v2<0)critical.push(a+eps+(b-a-2*eps)*v1/(v1-v2));}
 let maxM=0,xM=0,maxV=0,maxD=0,xD=0;
 for(const x of critical){let m=Math.abs(M(x));if(m>maxM){maxM=m;xM=x;}for(const xx of [x-1e-8,x+1e-8]){if(xx>=-o&&xx<=L+o)maxV=Math.max(maxV,Math.abs(V(xx)));}}
 const samples=[];for(let i=0;i<=500;i++){let x=-o+(L+2*o)*i/500;let dd=d(x);if(Math.abs(dd)>maxD){maxD=Math.abs(dd);xD=x;}samples.push({x,M:M(x),V:V(x),d:dd});}
 return {RA,RB,maxM,xM,maxV,maxD,xD,samples,total};
}
function calculate(s,scale=1){
 let errors=validate(s);if(errors.length)return {errors};
 const shares=s.n===1?[1]:[s.share/100,1-s.share/100];
 const beams=shares.map((share,i)=>{let u=response(s,share,scale,true),v=response(s,share,scale,false),r=s.angle*Math.PI/180;return {name:'Beam '+(i+1),share,u,v,um:u.maxM/s.Mcap,uv:u.maxV/s.Vcap,ud:v.maxD/(s.L*1000/s.defRatio),sling:Math.max(u.RA,u.RB)/Math.cos(r),slingService:Math.max(v.RA,v.RB)/Math.cos(r),H:Math.max(u.RA,u.RB)*Math.tan(r),stress:u.maxM*1e6/s.Z};});
 let ratios=[Math.max(...beams.map(b=>b.um)),Math.max(...beams.map(b=>b.uv)),Math.max(...beams.map(b=>b.ud))];
 let index=ratios.indexOf(Math.max(...ratios));
 return {errors:[],beams,ratios,governing:['Bending','Shear','Deflection'][index],ratio:ratios[index],payload:s.loads.reduce((v,l)=>v+l.mass,0)*scale,tare:s.mass*(s.L+2*s.o)*s.n/1000};
}
function ceiling(s){
 const zero=calculate(s,0);if(zero.errors.length)return null;
 const base=s.loads.reduce((v,l)=>v+l.mass,0);if(base<=0)return null;
 if(zero.ratio>=1)return {mass:0,governing:zero.governing};
 let low=0,high=1;while(calculate(s,high).ratio<1&&high<1e6)high*=2;
 for(let i=0;i<35;i++){let mid=(low+high)/2;if(calculate(s,mid).ratio<=1)low=mid;else high=mid;}
 const r=calculate(s,low);return {mass:base*low,governing:r.governing};
}
function envelope(s,widths){return widths.map(width=>{let state={...s,loads:[{type:'udl',mass:1,width,center:s.L/2}]};let c=ceiling(state);return {width,...c};});}
const api={g,defaults,validate,response,calculate,ceiling,envelope};if(typeof module!=='undefined')module.exports=api;else root.BeamEngine=api;
})(typeof window!=='undefined'?window:globalThis);
