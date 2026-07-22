"use client";

import { useMemo, useState } from "react";

const num=(v:string)=>Number(v);
const fmt=(v:number,d=3)=>Number.isFinite(v)?v.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
type Point={x:number;z:number};
type Side={natureWidth:number;pathWidth:number;natureFall:number;pathFall:number;boundaryFall:number};

function profile(reserve:number,pavement:number,roadFall:number,kerbHeight:number,kerbWidth:number,left:Side,right:Side){
  const verge=(reserve-pavement)/2;
  if(verge<0)throw new Error("Pavement and kerbs exceed the road reserve.");
  const lb=verge-left.natureWidth-left.pathWidth,rb=verge-right.natureWidth-right.pathWidth;
  if(lb<0||rb<0)throw new Error("Nature strip and path widths exceed the available verge.");
  const roadHalf=(pavement-2*kerbWidth)/2;if(roadHalf<=0)throw new Error("Kerb widths leave no usable road pavement.");\n  const crown=roadFall*roadHalf;
  const lNature=kerbHeight+left.natureWidth*left.natureFall,lPath=lNature+left.pathWidth*left.pathFall,lBoundary=lPath+lb*left.boundaryFall;
  const rNature=kerbHeight+right.natureWidth*right.natureFall,rPath=rNature+right.pathWidth*right.pathFall,rBoundary=rPath+rb*right.boundaryFall;
  let x=0;const points:Point[]=[];const add=(width:number,z:number)=>{points.push({x,z});x+=width};
  add(lb,lBoundary);add(left.pathWidth,lPath);add(left.natureWidth,lNature);add(kerbWidth,kerbHeight);add(roadHalf,0);add(roadHalf,crown);add(kerbWidth,0);add(right.natureWidth,kerbHeight);add(right.pathWidth,rNature);add(rb,rPath);points.push({x,z:rBoundary});
  return {points,width:x,crown};
}
function geometry(points:Point[],wse:number){
  let area=0,perimeter=0,topWidth=0;const wet:[Point,Point][]=[];
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,ba=a.z<wse,bb=b.z<wse;let p1:Point,p2:Point;
    if(ba&&bb){p1=a;p2=b}else if(ba!==bb){const t=(wse-a.z)/dz,c={x:a.x+t*dx,z:wse};[p1,p2]=ba?[a,c]:[c,b]}else continue;
    const width=Math.abs(p2.x-p1.x);area+=width*((wse-p1.z)+(wse-p2.z))/2;perimeter+=Math.hypot(p2.x-p1.x,p2.z-p1.z);topWidth+=width;wet.push([p1,p2]);
  }return {area,perimeter,topWidth,wet};
}
function Field({label,value,unit,onChange}:{label:string;value:string;unit:string;onChange:(v:string)=>void}){return <label className="calc-field"><span>{label}</span><input type="number" step="any" value={value} onChange={e=>onChange(e.target.value)}/><i>{unit}</i></label>}
function Section({number,title,children}:{number:number;title:string;children:React.ReactNode}){return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>}
function Metric({name,value}:{name:string;value:string}){return <div className="metric"><span>{name}</span><strong>{value}</strong></div>}

export function OverlandFlowTool(){
  const [design,setDesign]=useState("3.1"),[slope,setSlope]=useState("0.01"),[roughness,setRoughness]=useState("0.017");
  const [reserve,setReserve]=useState("16"),[pavement,setPavement]=useState("8"),[roadFall,setRoadFall]=useState("0.02"),[kerbHeight,setKerbHeight]=useState("0.15"),[kerbWidth,setKerbWidth]=useState("0.02");
  const [lnw,setLnw]=useState("2"),[lpw,setLpw]=useState("2"),[lnf,setLnf]=useState("0.03"),[lpf,setLpf]=useState("0.02"),[lbf,setLbf]=useState("0.02");
  const [rnw,setRnw]=useState("2"),[rpw,setRpw]=useState("2"),[rnf,setRnf]=useState("0.03"),[rpf,setRpf]=useState("0.02"),[rbf,setRbf]=useState("0.02");
  const result=useMemo(()=>{try{
    const values=[design,reserve,pavement,roadFall,kerbHeight,kerbWidth,slope,roughness,lnw,lpw,lnf,lpf,lbf,rnw,rpw,rnf,rpf,rbf].map(num);
    if(values.some(v=>!Number.isFinite(v)||v<0)||num(slope)<=0||num(roughness)<=0)return {error:"Enter valid non-negative dimensions, with slope and Manning’s n greater than zero."} as const;
    const p=profile(num(reserve),num(pavement),num(roadFall),num(kerbHeight),num(kerbWidth),{natureWidth:num(lnw),pathWidth:num(lpw),natureFall:num(lnf),pathFall:num(lpf),boundaryFall:num(lbf)},{natureWidth:num(rnw),pathWidth:num(rpw),natureFall:num(rnf),pathFall:num(rpf),boundaryFall:num(rbf)});
    const atLevel=(level:number)=>{const g=geometry(p.points,level),radius=g.perimeter?g.area/g.perimeter:0,velocity=radius?Math.pow(radius,2/3)*Math.sqrt(num(slope))/num(roughness):0;return {...g,radius,velocity,flow:velocity*g.area,vd:velocity*level}};
    const boundaryLevel=Math.min(p.points[0].z,p.points[p.points.length-1].z);
    const full=atLevel(boundaryLevel),target=num(design),contains=target<=full.flow+1e-9;
    let solvedWse=boundaryLevel;
    if(contains){let low=0,high=boundaryLevel;for(let i=0;i<80;i++){const mid=(low+high)/2;if(atLevel(mid).flow<target)low=mid;else high=mid}solvedWse=(low+high)/2}
    const solved=atLevel(solvedWse);
    return {...p,...solved,wse:solvedWse,boundaryLevel,totalCapacity:full.flow,contains,target,error:""};
  }catch(e){return {error:e instanceof Error?e.message:"Invalid geometry"} as const}},[design,slope,roughness,reserve,pavement,roadFall,kerbHeight,kerbWidth,lnw,lpw,lnf,lpf,lbf,rnw,rpw,rnf,rpf,rbf]);
  const r=result&&"flow" in result?result:null,pass=!!r&&r.contains;
  const download=()=>{if(!r)return;const rows=[["Road Overland Flow Calculation","Value","Unit"],["Design flow",design,"m3/s"],["Calculated WSE",r.wse,"m"],["Calculated flow",r.flow,"m3/s"],["Total contained capacity",r.totalCapacity,"m3/s"],["Area",r.area,"m2"],["Wetted perimeter",r.perimeter,"m"],["Hydraulic radius",r.radius,"m"],["Velocity",r.velocity,"m/s"],["v x d",r.vd,"m2/s"]];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.map(x=>x.join(",")).join("\n")],{type:"text/csv"}));a.download="road-overland-flow.csv";a.click();URL.revokeObjectURL(a.href)};
  return <div className="content calc-content"><p className="eyebrow">ROAD HYDRAULICS</p><h1>Overland Flow</h1><p className="subtitle">Road cross-section capacity using geometric integration and Manning’s equation.</p>
    {result&&"error" in result&&result.error&&<div className="error">⚠ {result.error}</div>}
    <div className="calc-layout"><div>
      <Section number={1} title="Flow and hydraulic parameters"><div className="calc-fields"><Field label="Design flow, Q" value={design} unit="m³/s" onChange={setDesign}/><Field label="Longitudinal channel slope" value={slope} unit="m/m" onChange={setSlope}/><Field label="Manning’s n" value={roughness} unit="–" onChange={setRoughness}/></div></Section>
      <Section number={2} title="Road geometry"><div className="calc-fields"><Field label="Road reserve width" value={reserve} unit="m" onChange={setReserve}/><Field label="Road pavement width" value={pavement} unit="m" onChange={setPavement}/><Field label="Road crossfall" value={roadFall} unit="m/m" onChange={setRoadFall}/><Field label="Kerb height" value={kerbHeight} unit="m" onChange={setKerbHeight}/><Field label="Kerb slope width" value={kerbWidth} unit="m" onChange={setKerbWidth}/></div></Section>
      <div className="overland-sides"><Section number={3} title="LHS — Left-hand side"><div className="calc-fields"><Field label="LHS nature strip width" value={lnw} unit="m" onChange={setLnw}/><Field label="LHS nature strip crossfall" value={lnf} unit="m/m" onChange={setLnf}/><Field label="LHS path width" value={lpw} unit="m" onChange={setLpw}/><Field label="LHS path crossfall" value={lpf} unit="m/m" onChange={setLpf}/><Field label="LHS boundary crossfall" value={lbf} unit="m/m" onChange={setLbf}/></div></Section><Section number={4} title="RHS — Right-hand side"><div className="calc-fields"><Field label="RHS nature strip width" value={rnw} unit="m" onChange={setRnw}/><Field label="RHS nature strip crossfall" value={rnf} unit="m/m" onChange={setRnf}/><Field label="RHS path width" value={rpw} unit="m" onChange={setRpw}/><Field label="RHS path crossfall" value={rpf} unit="m/m" onChange={setRpf}/><Field label="RHS boundary crossfall" value={rbf} unit="m/m" onChange={setRbf}/></div></Section></div>
    </div><aside className="calc-results"><p>LIVE RESULTS</p><div className="result-hero"><span>Calculated water-surface elevation</span><strong>{r?fmt(r.wse):"—"}<small>m</small></strong></div>{r&&<><div className="check-row"><span className={pass?"pass":"fail"}>{pass?"✓ Design flow contained":"✕ Design flow exceeds road-reserve capacity"}</span>{r.wse>=num(kerbHeight)&&<span className="warn">! Flow above kerb</span>}</div><Metric name="Design flow" value={fmt(num(design))+" m³/s"}/><Metric name="Calculated flow at WSE" value={fmt(r.flow)+" m³/s"}/><Metric name="Total contained capacity" value={fmt(r.totalCapacity)+" m³/s"}/><Metric name="Calculated WSE" value={fmt(r.wse)+" m"}/><Metric name="Flow area" value={fmt(r.area)+" m²"}/><Metric name="Wetted perimeter" value={fmt(r.perimeter)+" m"}/><Metric name="Hydraulic radius" value={fmt(r.radius)+" m"}/><Metric name="Velocity" value={fmt(r.velocity)+" m/s"}/><Metric name="Top width" value={fmt(r.topWidth)+" m"}/><Metric name="Hazard (v·d)" value={fmt(r.vd)+" m²/s"}/><RoadDiagram points={r.points} width={r.width} wse={r.wse} roadFall={num(roadFall)}/><button className="download-btn" onClick={download}>↓ Export CSV</button><p className="engine-note">Geometric profile method. Confirm survey levels, kerb detail, roughness and authority criteria before design use.</p></>}</aside></div>
  </div>
}
function RoadDiagram({points,width,wse,roadFall}:{points:Point[];width:number;wse:number;roadFall:number}){
  const all=points.map(p=>p.z).concat(wse),max=Math.max(...all,.3)+.03,min=Math.min(...all,0)-.02;
  const X=(x:number)=>38+x/width*324,Y=(z:number)=>150+(max-z)/(max-min)*95;
  const path=points.map((p,i)=>(i?"L":"M")+X(p.x)+" "+Y(p.z)).join(" ");
  const dim=(x1:number,x2:number,y:number,label:string)=><g><line x1={X(x1)} y1={y} x2={X(x2)} y2={y} className="dimension-line" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)"/><line x1={X(x1)} y1={y-5} x2={X(x1)} y2={y+5} className="dimension-tick"/><line x1={X(x2)} y1={y-5} x2={X(x2)} y2={y+5} className="dimension-tick"/><text x={(X(x1)+X(x2))/2} y={y-6} textAnchor="middle" className="dimension-label">{label}</text></g>;
  return <div className="cross-section overland-diagram"><h3>ROAD CROSS SECTION — INPUT MEASUREMENTS</h3><svg viewBox="0 0 400 300" role="img" aria-label="Road cross-section labelled with live LHS and RHS input measurements">
    <defs><marker id="dim-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L7,3.5 L0,7 Z" fill="#365b91"/></marker></defs>
    {dim(0,width,26,"Road reserve width: "+fmt(width,2)+" m")}
    {dim(points[3].x,points[7].x,58,"Road pavement width: "+fmt(points[7].x-points[3].x,2)+" m")}
    {dim(points[1].x,points[2].x,88,"LHS path: "+fmt(points[2].x-points[1].x,2)+" m")}
    {dim(points[2].x,points[3].x,116,"LHS nature strip: "+fmt(points[3].x-points[2].x,2)+" m")}
    {dim(points[7].x,points[8].x,116,"RHS nature strip: "+fmt(points[8].x-points[7].x,2)+" m")}
    {dim(points[8].x,points[9].x,88,"RHS path: "+fmt(points[9].x-points[8].x,2)+" m")}
    <path d={path} fill="none" stroke="#263746" strokeWidth="3" strokeLinejoin="round"/>
    <line x1={X(0)} y1={Y(wse)} x2={X(width)} y2={Y(wse)} stroke="#4f91bd" strokeWidth="2" strokeDasharray="6 4"/>
    <text x="200" y={Y(wse)-7} textAnchor="middle">WSE {fmt(wse)} m</text>
    <path d={"M"+X(points[5].x)+" "+(Y(points[5].z)-8)+" L"+(X(points[4].x)+18)+" "+(Y(points[4].z)-15)} className="crossfall-arrow" markerEnd="url(#dim-arrow)"/>
    <path d={"M"+X(points[5].x)+" "+(Y(points[5].z)-8)+" L"+(X(points[6].x)-18)+" "+(Y(points[6].z)-15)} className="crossfall-arrow" markerEnd="url(#dim-arrow)"/>
    <text x={X(points[5].x)} y={Y(points[5].z)-19} textAnchor="middle" className="crossfall-label">Road crossfall: {fmt(roadFall*100,2)}%</text>
    <text x={X(0)} y="282">LHS</text><text x={X(width/2)} y="282" textAnchor="middle">Road crown</text><text x={X(width)} y="282" textAnchor="end">RHS</text>
  </svg></div>
}
