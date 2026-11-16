/* SI internally: kN, m, kNm. Source section values from supplied Tedds files.
   Linear elastic analysis only. No AS 4991 certification or stability design. */
(function(root){
const g=9.80665, pos=(x,n)=>x>0?x**n:0;

// InfraBuild/Liberty HRSSP 9th edition (2019), Tables 9 & 10, printed pp 10–11.
// Columns: nominal depth, kg/m, d, bf, tf, tw, Ix(10^6), Zx(10^3),
// Iy(10^6), J(10^3), Iw(10^9), flange fy, web fy, Zex(10^3). 300PLUS only.
const sectionSource='https://www.infrabuild.com/wp-content/uploads/sites/8/2022/02/Hot20Rolled20Cat_Edition9_2019.pdf';
const sections=[[610,125,611.6,229,19.6,11.9,986,3230,39.3,1560,3450,280,300,3680],[610,113,607,228,17.3,11.2,875,2880,34.3,1140,2980,280,300,3290],[610,101,602,228,14.8,10.6,761,2530,29.3,790,2530,300,320,2900],[530,92.4,533,209,15.6,10.2,554,2080,23.8,775,1590,300,320,2370],[530,82,528.2,209,13.2,9.6,477,1810,20.1,526,1330,300,320,2070],[460,82.1,460.4,191,16,9.9,372,1610,18.6,701,919,300,320,1840],[460,74.6,457.4,190,14.5,9.1,335,1460,16.6,530,815,300,320,1660],[460,67.1,453.8,190,12.7,8.5,296,1300,14.5,378,708,300,320,1480],[410,59.7,406.4,178,12.8,7.8,216,1060,12.1,337,467,300,320,1200],[410,53.7,402.6,178,10.9,7.6,188,933,10.3,234,394,320,320,1060],[360,56.7,358.6,172,13,8,161,899,11,338,330,300,320,1010],[360,50.7,355.6,171,11.5,7.3,142,798,9.6,241,284,300,320,897],[360,44.7,352,171,9.7,6.9,121,689,8.1,161,237,320,320,770],[310,46.2,307.2,166,11.8,6.7,100,654,9.01,233,197,300,320,729],[310,40.4,304,165,10.2,6.1,86.4,569,7.65,157,165,320,320,633],[310,32,298,149,8,5.5,63.2,424,4.42,86.5,92.9,320,320,467],[250,37.3,256.2,146,10.9,6.4,55.7,435,5.66,158,85.2,320,320,486],[250,31.4,251.6,146,8.6,6.1,44.5,354,4.47,89.3,65.9,320,320,395],[250,25.7,248,124,8,5,35.4,285,2.55,67.4,36.7,320,320,319],[200,29.8,207,134,9.6,6.3,29.1,281,3.86,105,37.6,320,320,316],[200,25.4,203.2,133,7.8,5.8,23.6,232,3.06,62.7,29.2,320,320,259],[200,22.3,201.6,133,7,5,21,208,2.75,45,26,320,320,227],[200,18.2,198,99,7,4.5,15.8,160,1.14,38.6,10.4,320,320,180],[180,22.2,179,90,10,6,15.3,171,1.22,81.6,8.71,320,320,195],[180,18.1,175,90,8,5,12.1,139,0.975,44.8,6.8,320,320,157],[180,16.1,173,90,7,4.5,10.6,123,0.853,31.5,5.88,320,320,138],[150,18,155,75,9.5,6,9.05,117,0.672,60.5,3.56,320,320,135],[150,14,150,75,7,5,6.66,88.8,0.495,28.1,2.53,320,320,102]].map(([size,mass,d,bf,tf,tw,I,Z,Iy,J,Iw,fy,fyw,Ze])=>({
 id:size+'UB'+mass,name:size+' UB '+mass,mass,d,bf,tf,tw,I:I*1e6,Z:Z*1e3,Iy:Iy*1e6,J:J*1e3,Iw:Iw*1e9,fy,fyw,Ze:Ze*1e3
}));
function sectionState(s,id){
 const p=sections.find(p=>p.id===id);if(!p)throw new Error('Unknown UB section.');
 const sectionM=0.9*p.fy*p.Ze/1e6;
 const Vcap=0.9*0.6*p.fyw*(p.d-2*p.tf)*p.tw/1000;
 let Mcap=sectionM,Mo=null,reduction=1;
 if(s.capBasis==='ltb'){
  const le=s.effectiveLength*1000;
  Mo=Math.sqrt((Math.PI**2*s.E*p.Iy/le**2)*(s.G*p.J+Math.PI**2*s.E*p.Iw/le**2))/1e6;
  const ratio=(sectionM/0.9)/Mo;
  // Stable equivalent of 0.6 * (sqrt(ratio^2 + 3) - ratio); alpha_m = 1.
  reduction=Math.min(1,1.8/(Math.sqrt(ratio*ratio+3)+ratio));
  Mcap=sectionM*reduction;
 }
 return {...s,catalogueId:id,section:p.name,mass:p.mass,I:p.I,Z:p.Z,As:p.d*p.tw,
  Mcap:s.capBasis==='verified'?s.Mcap:Mcap,Vcap:s.capBasis==='verified'?s.Vcap:Vcap,
  sectionM,Mo,reduction,sectionData:p};
}
function resolveState(s){return s.catalogueId&&s.catalogueId!=='custom'?sectionState(s,s.catalogueId):s;}
function comparison(s){
 const r=calculate(s);if(r.errors.length)return {errors:r.errors};
 const c=ceiling(s);
 return {errors:[],payload:r.payload,ceiling:c?.mass??null,remaining:c?c.mass-r.payload:null,
  governing:c?.governing??r.governing,ratio:r.ratio,
  status:r.ratio>1?'exceeded':'within',
  scope:s.capBasis==='verified'?'Entered member capacities':'Preliminary member screening'};
}

const defaults=()=>({catalogueId:'460UB67.1',effectiveLength:7.9,project:'Bridge deck lift',number:'',designer:'Maria',section:'460 UB 67.1',L:7.9,o:0.3,mass:67.1,E:200000,G:80000,I:295800000,As:3859,Z:1303000,Mcap:399.33,Vcap:625.16,capBasis:'ltb',share:50,n:2,dynamic:1,gG:1.2,gQ:1.5,defRatio:250,stiffness:1,angle:0,loads:[{type:'udl',mass:27.3,width:7.5,center:3.95}]});
function validate(s){
 let e=[];
 if(!['section','ltb','verified'].includes(s.capBasis))e.push('Select a valid capacity basis.');
 if(s.catalogueId&&s.catalogueId!=='custom'&&!sections.some(p=>p.id===s.catalogueId))e.push('Unknown UB section.');
 if(s.capBasis==='ltb'&&(!Number.isFinite(s.effectiveLength)||s.effectiveLength<=0))e.push('Effective buckling length must be greater than zero.');
 if(s.capBasis==='ltb'&&(!s.catalogueId||s.catalogueId==='custom'))e.push('Automatic buckling screening requires a catalogue UB.');const positive=['L','mass','E','G','I','As','Z','Mcap','Vcap','dynamic','gG','gQ','defRatio','stiffness'];
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
 s=resolveState(s);errors=validate(s);if(errors.length)return {errors};
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
const api={sections,sectionSource,sectionState,resolveState,comparison,g,defaults,validate,response,calculate,ceiling,envelope};if(typeof module!=='undefined')module.exports=api;else root.BeamEngine=api;
})(typeof window!=='undefined'?window:globalThis);
