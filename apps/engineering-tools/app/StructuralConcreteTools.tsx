"use client";

import { useMemo, useState } from "react";

const PI = Math.PI;
const ES = 200000;
const FC_EC: Record<number, number> = {20:24000,25:26700,32:30100,40:32800,50:34800,65:37400,80:39600,100:42200,120:44400};
const BARS = [0,8,10,12,16,20,24,28,32,36];
const MESH: Record<string,{pri:number;priS:number;sec:number;secS:number}> = {
  None:{pri:0,priS:0,sec:0,secS:0}, SL81:{pri:7.6,priS:100,sec:7.6,secS:100}, SL102:{pri:9.5,priS:200,sec:9.5,secS:200},
  SL92:{pri:8.55,priS:200,sec:8.55,secS:200}, SL82:{pri:7.6,priS:200,sec:7.6,secS:200}, SL72:{pri:6.75,priS:200,sec:6.75,secS:200},
  SL62:{pri:6,priS:200,sec:6,secS:200}, RL1218:{pri:11.9,priS:100,sec:7.6,secS:200}, RL1118:{pri:10.65,priS:100,sec:7.6,secS:200},
  RL1018:{pri:9.5,priS:100,sec:7.6,secS:200}, RL918:{pri:8.55,priS:100,sec:7.6,secS:200}, RL818:{pri:7.6,priS:100,sec:7.6,secS:200}, RL718:{pri:6.75,priS:100,sec:7.6,secS:200}
};
const area = (db:number, spacing:number) => db>0 && spacing>0 ? PI*db*db/4*1000/spacing : 0;
const meshArea = (name:string, dir:"pri"|"sec") => { const m=MESH[name]??MESH.None; const d=dir==="pri"?m.pri:m.sec; const s=dir==="pri"?m.priS:m.secS; return area(d,s); };
const fmt=(n:number,d=1)=>Number.isFinite(n)?n.toFixed(d):"—";

type Check={label:string; demand:number; capacity:number; unit:string; pass:boolean};
function sectionChecks(D:number,cover:number,db:number,spacing:number,mesh:string,meshDir:"pri"|"sec",fc:number,fsy:number,moment:number,serviceMoment:number,shrinkMu:number){
  const meshDb = meshDir==="pri" ? (MESH[mesh]?.pri??0) : (MESH[mesh]?.sec??0);
  const effectiveDb = meshDb>0 ? meshDb : db;
  const d = Math.max(1,D-cover-effectiveDb/2);
  const Ast = area(db,spacing)+meshArea(mesh,meshDir);
  const alpha2=Math.max(0.67,0.85-0.0015*fc*0.9);
  const gamma=Math.max(0.67,0.97-0.0025*fc*0.9);
  const a=Ast*fsy/(alpha2*fc*1000);
  const ku=a/(gamma*d);
  const phi=0.65;
  const Muo=Ast*fsy*(d-a/2)/1e6;
  const fctf=0.6*Math.sqrt(fc);
  const Mmin=1.2*(1000*D*D/6)*fctf/1e6;
  const AstMin=0.2*Math.pow(D/d,2)*(fctf/fsy)*1000*d;
  const shrinkMin=shrinkMu*1000*D*1e-3;
  const Ec=FC_EC[fc]??(0.043*Math.pow(2400,1.5)*Math.sqrt(fc));
  const p=Ast/(1000*d);
  const n=ES/Ec;
  const np=n*p;
  const k=Math.sqrt(np*np+2*np)-np;
  const kd=k*d;
  const Icr=1000*Math.pow(kd,3)/3+n*Ast*Math.pow(d-kd,2);
  const fscr=Icr>0?n*(Math.abs(serviceMoment)*1e6)*(d-kd)/Icr:Infinity;
  return {d,Ast,alpha2,gamma,a,ku,phi,Muo,phiMuo:phi*Muo,fctf,Mmin,AstMin,shrinkMin,Ec,fscr};
}

function ReinforcementFields({prefix,db,setDb,spacing,setSpacing,mesh,setMesh}:{prefix:string;db:number;setDb:(n:number)=>void;spacing:number;setSpacing:(n:number)=>void;mesh:string;setMesh:(s:string)=>void}){
  return <>
    <label>{prefix} N-bar<select value={db} onChange={e=>setDb(+e.target.value)}>{BARS.map(x=><option key={x} value={x}>{x?`N${x}`:"None"}</option>)}</select></label>
    <label>{prefix} bar spacing (mm)<input type="number" value={spacing} onChange={e=>setSpacing(+e.target.value)}/></label>
    <label>{prefix} mesh<select value={mesh} onChange={e=>setMesh(e.target.value)}>{Object.keys(MESH).map(x=><option key={x}>{x}</option>)}</select></label>
  </>;
}
function CheckTable({checks}:{checks:Check[]}){return <div className="table-card"><table><thead><tr><th>Check</th><th>Demand / provided</th><th>Capacity / required</th><th>Status</th></tr></thead><tbody>{checks.map(c=><tr key={c.label}><td><strong>{c.label}</strong></td><td>{fmt(c.demand)} {c.unit}</td><td>{fmt(c.capacity)} {c.unit}</td><td><span className={`status ${c.pass?"ok":"incomplete"}`}>{c.pass?"PASS":"CHECK"}</span></td></tr>)}</tbody></table></div>}

export function HeadwallStructuralTool(){
  const [L,setL]=useState(4610),[H,setH]=useState(4130),[D,setD]=useState(350),[fc,setFc]=useState(40),[fsy,setFsy]=useState(500),[cover,setCover]=useState(50);
  const [hMp,setHMp]=useState(180.1396),[hMn,setHMn]=useState(20.07265),[hV,setHV]=useState(146.6396),[vMp,setVMp]=useState(265.1100),[vMn,setVMn]=useState(41.5317),[vV,setVV]=useState(283.2371);
  const [hMsls,setHMsls]=useState(126.10),[vMsls,setVMsls]=useState(185.58);
  const [db,setDb]=useState(20),[spacing,setSpacing]=useState(300),[mesh,setMesh]=useState("SL81");
  const r=useMemo(()=>sectionChecks(D,cover,db,spacing,mesh,"pri",fc,fsy,Math.max(hMp,vMp),Math.max(hMsls,vMsls),1.75),[D,cover,db,spacing,mesh,fc,fsy,hMp,vMp,hMsls,vMsls]);
  const neg=useMemo(()=>sectionChecks(D,cover,0,300,mesh,"pri",fc,fsy,Math.max(hMn,vMn),Math.max(hMsls*0.12,vMsls*0.16),1.75),[D,cover,mesh,fc,fsy,hMn,vMn,hMsls,vMsls]);
  const phiVucApprox=0.7*0.16*1000*(0.9*r.d)*Math.sqrt(fc)/1000;
  const checks:Check[]=[
    {label:"Horizontal +ve bending φMuo",demand:hMp,capacity:r.phiMuo,unit:"kNm/m",pass:hMp<=r.phiMuo},
    {label:"Vertical +ve bending φMuo",demand:vMp,capacity:r.phiMuo,unit:"kNm/m",pass:vMp<=r.phiMuo},
    {label:"Horizontal -ve bending φMuo",demand:hMn,capacity:neg.phiMuo,unit:"kNm/m",pass:hMn<=neg.phiMuo},
    {label:"Vertical -ve bending φMuo",demand:vMn,capacity:neg.phiMuo,unit:"kNm/m",pass:vMn<=neg.phiMuo},
    {label:"Minimum bending steel",demand:r.Ast,capacity:r.AstMin,unit:"mm²/m",pass:r.Ast>=r.AstMin},
    {label:"Temperature / shrinkage steel",demand:r.Ast,capacity:r.shrinkMin,unit:"mm²/m",pass:r.Ast>=r.shrinkMin},
    {label:"Horizontal shear screening",demand:hV,capacity:phiVucApprox,unit:"kN/m",pass:hV<=phiVucApprox},
    {label:"Vertical shear screening",demand:vV,capacity:phiVucApprox,unit:"kN/m",pass:vV<=phiVucApprox},
  ];
  return <div className="content"><div className="title-row"><div><p className="eyebrow">STRUCTURES · AS 3600 WORKBOOK PORT</p><h1>Headwall Concrete</h1><p className="subtitle">Reinforced-concrete headwall checks using the design actions from the USBR plate analysis and the equations in the supplied AS 3600:2018 workbook.</p></div></div>
    <div className="form-grid"><label>Wall length (mm)<input type="number" value={L} onChange={e=>setL(+e.target.value)}/></label><label>Wall height (mm)<input type="number" value={H} onChange={e=>setH(+e.target.value)}/></label><label>Wall thickness D (mm)<input type="number" value={D} onChange={e=>setD(+e.target.value)}/></label><label>Concrete f'c (MPa)<select value={fc} onChange={e=>setFc(+e.target.value)}>{Object.keys(FC_EC).map(x=><option key={x}>{x}</option>)}</select></label><label>Steel fsy (MPa)<input type="number" value={fsy} onChange={e=>setFsy(+e.target.value)}/></label><label>Cover (mm)<input type="number" value={cover} onChange={e=>setCover(+e.target.value)}/></label><ReinforcementFields prefix="Inside face" db={db} setDb={setDb} spacing={spacing} setSpacing={setSpacing} mesh={mesh} setMesh={setMesh}/></div>
    <h2>Design actions</h2><div className="form-grid"><label>Horizontal M+ (kNm/m)<input type="number" value={hMp} onChange={e=>setHMp(+e.target.value)}/></label><label>Horizontal M− (kNm/m)<input type="number" value={hMn} onChange={e=>setHMn(+e.target.value)}/></label><label>Horizontal V* (kN/m)<input type="number" value={hV} onChange={e=>setHV(+e.target.value)}/></label><label>Vertical M+ (kNm/m)<input type="number" value={vMp} onChange={e=>setVMp(+e.target.value)}/></label><label>Vertical M− (kNm/m)<input type="number" value={vMn} onChange={e=>setVMn(+e.target.value)}/></label><label>Vertical V* (kN/m)<input type="number" value={vV} onChange={e=>setVV(+e.target.value)}/></label><label>Horizontal service M (kNm/m)<input type="number" value={hMsls} onChange={e=>setHMsls(+e.target.value)}/></label><label>Vertical service M (kNm/m)<input type="number" value={vMsls} onChange={e=>setVMsls(+e.target.value)}/></label></div>
    <section className="model-strip"><div><span>Effective depth</span><strong>{fmt(r.d)} mm</strong></div><div><span>Positive Ast</span><strong>{fmt(r.Ast)} mm²/m</strong></div><div><span>φMuo</span><strong>{fmt(r.phiMuo)} kNm/m</strong></div><div><span>Ast,min</span><strong>{fmt(r.AstMin)} mm²/m</strong></div><div><span>Wall volume</span><strong>{fmt(L*H*D/1e9,2)} m³</strong></div></section>
    <div className="warning"><div>i</div><p><strong>Workbook basis:</strong> AS 3600:2018. The bending/minimum-steel equations are ported directly. The shear value shown here is a screening check; where V* exceeds it, use the workbook’s full variable-angle shear procedure and design transverse reinforcement.</p></div>
    <CheckTable checks={checks}/>
  </div>;
}

export function BaseSlabStructuralTool(){
  const [length,setLength]=useState(7412),[width,setWidth]=useState(3910),[D,setD]=useState(300),[fc,setFc]=useState(40),[fsy,setFsy]=useState(500),[cover,setCover]=useState(50);
  const [Mp,setMp]=useState(121.3060),[Mn,setMn]=useState(2.9897),[V,setV]=useState(163.1177),[Msls,setMsls]=useState(85.064),[bearing,setBearing]=useState(60.637);
  const [db,setDb]=useState(16),[spacing,setSpacing]=useState(400),[mesh,setMesh]=useState("RL1218");
  const r=useMemo(()=>sectionChecks(D,cover,db,spacing,mesh,"pri",fc,fsy,Mp,Msls,1.75),[D,cover,db,spacing,mesh,fc,fsy,Mp,Msls]);
  const neg=useMemo(()=>sectionChecks(D,cover,db,spacing,mesh,"pri",fc,fsy,Mn,Math.abs(Mn)*0.7,1.75),[D,cover,db,spacing,mesh,fc,fsy,Mn]);
  const phiVucApprox=0.7*0.16*1000*(0.9*r.d)*Math.sqrt(fc)/1000;
  const checks:Check[]=[
    {label:"Positive bending φMuo",demand:Mp,capacity:r.phiMuo,unit:"kNm/m",pass:Mp<=r.phiMuo},
    {label:"Negative bending φMuo",demand:Mn,capacity:neg.phiMuo,unit:"kNm/m",pass:Mn<=neg.phiMuo},
    {label:"Minimum strength Muo",demand:r.Muo,capacity:r.Mmin,unit:"kNm/m",pass:r.Muo>=r.Mmin},
    {label:"Minimum bending steel",demand:r.Ast,capacity:r.AstMin,unit:"mm²/m",pass:r.Ast>=r.AstMin},
    {label:"Temperature / shrinkage steel",demand:r.Ast,capacity:r.shrinkMin,unit:"mm²/m",pass:r.Ast>=r.shrinkMin},
    {label:"Shear screening",demand:V,capacity:phiVucApprox,unit:"kN/m",pass:V<=phiVucApprox},
  ];
  return <div className="content"><div className="title-row"><div><p className="eyebrow">STRUCTURES · AS 3600 WORKBOOK PORT</p><h1>Base Slab Concrete</h1><p className="subtitle">Base-slab reinforcement checks using the supplied slab workbook. Defaults reproduce its 300 mm slab / RL1218 + N16 reinforcement example.</p></div></div>
    <div className="form-grid"><label>Slab length (mm)<input type="number" value={length} onChange={e=>setLength(+e.target.value)}/></label><label>Slab width (mm)<input type="number" value={width} onChange={e=>setWidth(+e.target.value)}/></label><label>Slab depth D (mm)<input type="number" value={D} onChange={e=>setD(+e.target.value)}/></label><label>Concrete f'c (MPa)<select value={fc} onChange={e=>setFc(+e.target.value)}>{Object.keys(FC_EC).map(x=><option key={x}>{x}</option>)}</select></label><label>Steel fsy (MPa)<input type="number" value={fsy} onChange={e=>setFsy(+e.target.value)}/></label><label>Cover (mm)<input type="number" value={cover} onChange={e=>setCover(+e.target.value)}/></label><ReinforcementFields prefix="Top / bottom face" db={db} setDb={setDb} spacing={spacing} setSpacing={setSpacing} mesh={mesh} setMesh={setMesh}/></div>
    <h2>Design actions</h2><div className="form-grid"><label>Positive M* (kNm/m)<input type="number" value={Mp} onChange={e=>setMp(+e.target.value)}/></label><label>Negative M* (kNm/m)<input type="number" value={Mn} onChange={e=>setMn(+e.target.value)}/></label><label>V* (kN/m)<input type="number" value={V} onChange={e=>setV(+e.target.value)}/></label><label>Service M (kNm/m)<input type="number" value={Msls} onChange={e=>setMsls(+e.target.value)}/></label><label>Required soil bearing (kPa)<input type="number" value={bearing} onChange={e=>setBearing(+e.target.value)}/></label></div>
    <section className="model-strip"><div><span>Effective depth</span><strong>{fmt(r.d)} mm</strong></div><div><span>Ast provided</span><strong>{fmt(r.Ast)} mm²/m</strong></div><div><span>φMuo</span><strong>{fmt(r.phiMuo)} kNm/m</strong></div><div><span>Ast,min</span><strong>{fmt(r.AstMin)} mm²/m</strong></div><div><span>Concrete volume</span><strong>{fmt(length*width*D/1e9,2)} m³</strong></div><div><span>Bearing demand</span><strong>{fmt(bearing,1)} kPa</strong></div></section>
    <div className="warning"><div>i</div><p><strong>Scope:</strong> this page checks the reinforced-concrete slab section. The separate box-culvert loading sheet (SM1600/T44, soil cover, cell geometry and bearing pressure) will feed these actions in the next integration step rather than being hidden inside the concrete check.</p></div>
    <CheckTable checks={checks}/>
  </div>;
}
