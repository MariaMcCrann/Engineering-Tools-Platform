"use client";

import { useMemo, useState } from "react";

const fmt=(n:number,d=3)=>Number.isFinite(n)?n.toFixed(d):"—";
const ceil2=(n:number)=>Math.ceil(n*100)/100;
const LOAD_WIDTH=[0,1.25,2.5,6.25,7.5,8.75];
const S1600=[80,160,240,320,400,480];
const M1600=[120,240,360,480,600,720];
const interpolate=(x:number,xs:number[],ys:number[])=>{if(x<=xs[0])return ys[0];if(x>=xs[xs.length-1])return ys[ys.length-1];for(let i=0;i<xs.length-1;i++){if(x>=xs[i]&&x<=xs[i+1])return ys[i]+(x-xs[i])/(xs[i+1]-xs[i])*(ys[i+1]-ys[i]);}return ys[ys.length-1];};
const lowerLoadWidth=(x:number)=>LOAD_WIDTH.filter(v=>v<=x).at(-1)??0;

type BoxInputs={cells:number;unitsLong:number;linkSlabs:number;boxOuterWidth:number;linkWidth:number;unitLength:number;clearSpan:number;slabOverhang:number;soilCover:number;slabDepth:number;soilDensity:number;concreteDensity:number;boxMassKg:number;linkMassKg:number;kcs:number};
export type BoxLoadResult={slabWidth:number;slabLength:number;bearing:number;Mp:number;Mn:number;V:number;Msls:number;Vsls:number;ulsPressure:number;slsPressure:number;deadLoad:number;liveLoad:number;twoLaneLive:number;alpha:number;transverseReduction:number;longitudinalReduction:number};

export function calculateBoxCulvertLoading(i:BoxInputs):BoxLoadResult{
  const effectiveWidth=Math.round((i.cells*i.boxOuterWidth+i.linkSlabs*i.linkWidth)*100)/100;
  const slabWidth=ceil2(effectiveWidth+2*i.slabOverhang);
  const slabLength=i.unitsLong*i.unitLength+(Math.ceil(i.unitsLong)-1)*0.01;
  const soil=i.soilDensity*i.soilCover*effectiveWidth*i.unitLength;
  const culvert=i.boxMassKg*9.81/1000*i.cells+i.linkMassKg*9.81/1000*i.linkSlabs;
  const slab=i.concreteDensity*i.slabDepth*slabWidth*i.unitLength;
  const deadLoad=soil+culvert;
  const deadWithSlab=deadLoad+slab;
  const sAxle=interpolate(effectiveWidth,LOAD_WIDTH,S1600);
  const mAxle=interpolate(effectiveWidth,LOAD_WIDTH,M1600);
  const alpha=effectiveWidth<2.5?0.3-0.1*i.soilCover:0.35-0.125*i.soilCover;
  const transverseReduction=i.unitsLong<=2?1:Math.min(i.soilCover<0.2?(i.unitLength*1000)/(2400+i.soilCover*1000/4):(i.unitLength*1000)/(2500+1.2*(i.soilCover*1000-100)/2),1);
  const lw=lowerLoadWidth(effectiveWidth);
  const longitudinalReduction=Math.min(1,i.soilCover<0.2?(effectiveWidth*1000)/((lw*1000+200)+i.soilCover*1000/2):(effectiveWidth*1000)/((lw*1000+200)+100+1.2*(i.soilCover*1000-100)));
  const sUdl=24/3.2*effectiveWidth*i.unitLength;
  const mUdl=6/3.2*effectiveWidth*i.unitLength;
  const sSingle=sAxle*transverseReduction*longitudinalReduction+sUdl*transverseReduction;
  const mSingle=mAxle*(1+alpha)*transverseReduction*longitudinalReduction+mUdl*(1+alpha)*transverseReduction;
  const liveLoad=Math.max(sSingle,mSingle);
  // Workbook treats the two-lane case with no transverse reduction (H40/J40 = 1).
  const sTwo=2*sAxle*longitudinalReduction+(24/3.2*effectiveWidth*6.4);
  const mTwo=2*mAxle*(1+alpha)*longitudinalReduction+(6/3.2*effectiveWidth*6.4)*(1+alpha);
  const twoLaneLive=Math.max(sTwo,mTwo);
  const bearing=(deadWithSlab*i.unitsLong+twoLaneLive)/(slabWidth*slabLength);
  const ulsTotal=Math.max(1.2*deadLoad+1.5*liveLoad,1.35*deadLoad);
  const effectiveService=(1+i.kcs)*deadLoad+(1+0.6*i.kcs)*liveLoad;
  const slsTotal=deadLoad+liveLoad;
  const ulsPerLength=ulsTotal/i.unitLength;
  const slsPerLength=slsTotal/i.unitLength;
  const q=ulsPerLength/slabWidth;
  const qs=slsPerLength/slabWidth;
  const actions=(pressure:number,perLength:number)=>{
    if(i.cells<=1){const extV=pressure*i.slabOverhang;const extM=-extV*i.slabOverhang/2;const intV=perLength/2-extV;const midM=intV*i.clearSpan/4+extM;return{V:Math.max(extV,intV),Mp:Math.max(0,midM),Mn:extM};}
    if(i.cells===2){const vals=[{v:pressure*i.slabOverhang,m:-pressure*i.slabOverhang*i.slabOverhang/2},{v:pressure*i.clearSpan/2,m:-pressure*i.slabOverhang*i.slabOverhang/2},{v:pressure*i.clearSpan/7,m:pressure*i.clearSpan*i.clearSpan/11},{v:pressure*i.clearSpan*1.15/2,m:-pressure*i.clearSpan*i.clearSpan/9},{v:pressure*i.clearSpan*1.15/2,m:-pressure*i.clearSpan*i.clearSpan/9}];return{V:Math.max(...vals.map(x=>x.v)),Mp:Math.max(...vals.map(x=>x.m)),Mn:Math.min(...vals.map(x=>x.m))};}
    const vals=[{v:pressure*i.slabOverhang,m:-pressure*i.slabOverhang*i.slabOverhang/2},{v:pressure*i.clearSpan/2,m:-pressure*i.slabOverhang*i.slabOverhang/2},{v:pressure*i.clearSpan/7,m:pressure*i.clearSpan*i.clearSpan/11},{v:pressure*i.clearSpan*1.15/2,m:-pressure*i.clearSpan*i.clearSpan/10},{v:pressure*i.clearSpan/2,m:-pressure*i.clearSpan*i.clearSpan/10},{v:pressure*i.clearSpan/8,m:pressure*i.clearSpan*i.clearSpan/16},{v:pressure*i.clearSpan/2,m:-pressure*i.clearSpan*i.clearSpan/11}];return{V:Math.max(...vals.map(x=>x.v)),Mp:Math.max(...vals.map(x=>x.m)),Mn:Math.min(...vals.map(x=>x.m))};
  };
  const u=actions(q,ulsPerLength);const s=actions(qs,slsPerLength);
  void effectiveService; // retained because it is an explicit workbook deflection load output.
  return{slabWidth,slabLength,bearing,Mp:u.Mp,Mn:u.Mn,V:u.V,Msls:s.Mp,Vsls:s.V,ulsPressure:q,slsPressure:qs,deadLoad,liveLoad,twoLaneLive,alpha,transverseReduction,longitudinalReduction};
}

export function BoxCulvertLoadGenerator({onApply}:{onApply:(r:BoxLoadResult)=>void}){
  const [cells,setCells]=useState(1),[unitsLong,setUnitsLong]=useState(3),[linkSlabs,setLinkSlabs]=useState(0),[boxOuterWidth,setBoxOuterWidth]=useState(3.406),[linkWidth,setLinkWidth]=useState(1.524),[unitLength,setUnitLength]=useState(2.464),[clearSpan,setClearSpan]=useState(3.048),[slabOverhang,setSlabOverhang]=useState(0.25),[soilCover,setSoilCover]=useState(0.38),[slabDepth,setSlabDepth]=useState(0.3),[soilDensity,setSoilDensity]=useState(20),[boxMassKg,setBoxMassKg]=useState(9730),[kcs,setKcs]=useState(2);
  const r=useMemo(()=>calculateBoxCulvertLoading({cells,unitsLong,linkSlabs,boxOuterWidth,linkWidth,unitLength,clearSpan,slabOverhang,soilCover,slabDepth,soilDensity,concreteDensity:24.5,boxMassKg,linkMassKg:1930,kcs}),[cells,unitsLong,linkSlabs,boxOuterWidth,linkWidth,unitLength,clearSpan,slabOverhang,soilCover,slabDepth,soilDensity,boxMassKg,kcs]);
  return <section className="upload-card"><div className="card-head"><div><h2>Box Culvert Loading</h2><p>Workbook SM1600 loading chain → base-slab design actions</p></div><button className="export" onClick={()=>onApply(r)}>Use these actions ↓</button></div><div className="form-grid">
    <label>Cells across width<input type="number" min="1" value={cells} onChange={e=>setCells(+e.target.value)}/></label><label>Precast units along slab<input type="number" min="1" value={unitsLong} onChange={e=>setUnitsLong(+e.target.value)}/></label><label>Link slabs<input type="number" min="0" value={linkSlabs} onChange={e=>setLinkSlabs(+e.target.value)}/></label><label>Box outer width E (m)<input type="number" step="0.001" value={boxOuterWidth} onChange={e=>setBoxOuterWidth(+e.target.value)}/></label><label>Clear span A (m)<input type="number" step="0.001" value={clearSpan} onChange={e=>setClearSpan(+e.target.value)}/></label><label>Unit length (m)<input type="number" step="0.001" value={unitLength} onChange={e=>setUnitLength(+e.target.value)}/></label><label>Slab overhang (m)<input type="number" step="0.01" value={slabOverhang} onChange={e=>setSlabOverhang(+e.target.value)}/></label><label>Soil cover (m)<input type="number" step="0.01" value={soilCover} onChange={e=>setSoilCover(+e.target.value)}/></label><label>Slab depth (m)<input type="number" step="0.01" value={slabDepth} onChange={e=>setSlabDepth(+e.target.value)}/></label><label>Soil density (kN/m³)<input type="number" value={soilDensity} onChange={e=>setSoilDensity(+e.target.value)}/></label><label>Box mass (kg / unit)<input type="number" value={boxMassKg} onChange={e=>setBoxMassKg(+e.target.value)}/></label><label>kcs<input type="number" step="0.1" value={kcs} onChange={e=>setKcs(+e.target.value)}/></label>
  </div><section className="model-strip"><div><span>ULS M+</span><strong>{fmt(r.Mp)} kNm/m</strong></div><div><span>ULS M−</span><strong>{fmt(r.Mn)} kNm/m</strong></div><div><span>ULS shear</span><strong>{fmt(r.V)} kN/m</strong></div><div><span>SLS M+</span><strong>{fmt(r.Msls)} kNm/m</strong></div><div><span>Bearing</span><strong>{fmt(r.bearing)} kPa</strong></div><div><span>Slab</span><strong>{fmt(r.slabWidth,2)} × {fmt(r.slabLength,3)} m</strong></div></section><p className="subtitle">SM1600 S/M axle interpolation, dynamic allowance, depth reductions, dead load, two-lane bearing load and one/two/three-cell moment coefficients are ported from the supplied Box Culvert Loading sheet.</p></section>;
}

const U_RX=[1.1828,0.9335,0.5948,0.3699,0.0548,-0.0887];
const U_MX=[[0.2949,0.1046,0.0146,-0.0268,-0.0324,0],[0.2421,0.0873,0.0129,-0.0199,-0.0227,0],[0.1724,0.0643,0.0097,-0.0132,-0.0141,0],[0.1033,0.0384,0.0069,-0.0032,-0.0023,0],[0.0362,0.0152,0.009,0.0119,0.0159,0],[0,0.0072,0.0207,0.0345,0.0484,0]];
const U_MY=[[0,0,0,0,0,0],[0.0484,0.0159,-0.0023,-0.0141,-0.0227,-0.0324],[0.0345,0.0119,-0.0032,-0.0132,-0.0199,-0.0268],[0.0207,0.009,0.0069,0.0097,0.0129,0.0146],[0.0072,0.0152,0.0384,0.0643,0.0873,0.1046],[0,0.0362,0.1033,0.1724,0.2421,0.2949]];
const U_RY=[-0.0887,0.0548,0.3699,0.5948,0.9335,1.1828];
const V_RX=[0.1522,0.2785,0.3929,0.3794,0.1311,-0.0499];
const V_MX=[[0.0776,0.0375,0.0086,-0.0061,-0.0088,0],[0.0772,0.0318,0.0051,-0.0067,-0.0076,0],[0.0725,0.0216,-0.0016,-0.0096,-0.0085,0],[0.0542,0.0113,-0.0042,-0.0074,-0.0051,0],[0.0216,0.0042,0.0007,0.0027,0.0054,0],[0,0.0065,0.0145,0.0213,0.0275,0]];
const V_MY=[[0,0,0,0,0,0],[0.0154,0.0058,-0.0018,-0.0075,-0.0117,-0.0156],[0.0145,-0.0022,-0.0145,-0.0224,-0.0274,-0.0316],[0.0108,-0.0046,-0.0136,-0.0172,-0.0182,-0.0193],[0.0043,0.0036,0.0104,0.0201,0.0292,0.036],[0,0.0323,0.0725,0.1064,0.1375,0.1605]];
const V_RY=[-0.0199,0.1916,0.3934,0.5067,0.6597,0.7476];
export type HeadwallActionResult={hMp:number;hMn:number;hV:number;vMp:number;vMn:number;vV:number;ratio:number;deadPressure:number};
export function calculateHeadwallActions(length:number,height:number,soilHeight:number,waterHeight:number,soilDensity:number,waterDensity:number,livePressure:number):HeadwallActionResult{
  const buoyant=soilDensity-waterDensity;const deadPressure=buoyantant(buoyant)*soilHeight*0.5+waterDensity*waterHeight;const b=height;
  const rx=U_RX.map((c,k)=>c*livePressure*b+V_RX[k]*deadPressure*b);
  const ry=U_RY.map((c,k)=>c*livePressure*b+V_RY[k]*deadPressure*b);
  const mx=U_MX.flatMap((row,y)=>row.map((c,x)=>c*livePressure*b*b+V_MX[y][x]*deadPressure*b*b));
  const my=U_MY.flatMap((row,y)=>row.map((c,x)=>c*livePressure*b*b+V_MY[y][x]*deadPressure*b*b));
  return{hMp:Math.max(...mx),hMn:Math.min(...mx),hV:Math.max(...rx),vMp:Math.max(...my),vMn:Math.min(...my),vV:Math.max(...ry),ratio:length/height,deadPressure};
}
function buoyantant(n:number){return n;}

export function HeadwallLoadGenerator({onApply}:{onApply:(r:HeadwallActionResult)=>void}){
  const [length,setLength]=useState(4.61),[height,setHeight]=useState(4.13),[soilHeight,setSoilHeight]=useState(4.13),[waterHeight,setWaterHeight]=useState(4.13),[soilDensity,setSoilDensity]=useState(20),[waterDensity,setWaterDensity]=useState(9.1),[livePressure,setLivePressure]=useState(20);
  const r=useMemo(()=>calculateHeadwallActions(length,height,soilHeight,waterHeight,soilDensity,waterDensity,livePressure),[length,height,soilHeight,waterHeight,soilDensity,waterDensity,livePressure]);
  const ratioDelta=Math.abs(r.ratio-1.1162227603)/1.1162227603;
  return <section className="upload-card"><div className="card-head"><div><h2>USBR Headwall Plate Actions</h2><p>Case 4 coefficient set from the supplied workbook</p></div><button className="export" onClick={()=>onApply(r)}>Use these actions ↓</button></div><div className="form-grid"><label>Headwall length a (m)<input type="number" step="0.01" value={length} onChange={e=>setLength(+e.target.value)}/></label><label>Headwall height b (m)<input type="number" step="0.01" value={height} onChange={e=>setHeight(+e.target.value)}/></label><label>Soil height (m)<input type="number" step="0.01" value={soilHeight} onChange={e=>setSoilHeight(+e.target.value)}/></label><label>Water height (m)<input type="number" step="0.01" value={waterHeight} onChange={e=>setWaterHeight(+e.target.value)}/></label><label>Soil density (kN/m³)<input type="number" value={soilDensity} onChange={e=>setSoilDensity(+e.target.value)}/></label><label>Water density (kN/m³)<input type="number" step="0.1" value={waterDensity} onChange={e=>setWaterDensity(+e.target.value)}/></label><label>Uniform live pressure (kPa)<input type="number" value={livePressure} onChange={e=>setLivePressure(+e.target.value)}/></label></div><section className="model-strip"><div><span>Horizontal M+</span><strong>{fmt(r.hMp)} kNm/m</strong></div><div><span>Horizontal M−</span><strong>{fmt(r.hMn)} kNm/m</strong></div><div><span>Horizontal shear</span><strong>{fmt(r.hV)} kN/m</strong></div><div><span>Vertical M+</span><strong>{fmt(r.vMp)} kNm/m</strong></div><div><span>Vertical M−</span><strong>{fmt(r.vMn)} kNm/m</strong></div><div><span>Vertical shear</span><strong>{fmt(r.vV)} kN/m</strong></div></section>{ratioDelta>0.05&&<div className="warning"><div>!</div><p><strong>Aspect-ratio warning:</strong> the workbook contains the USBR Case 4 coefficient set for a/b ≈ 1.116. Your current a/b is {fmt(r.ratio,3)}. Update/interpolate the USBR coefficients before using these actions for final design.</p></div>}<p className="subtitle">The dead pressure follows the workbook: (γsoil−γwater)·Hsoil/2 + γwater·Hwater. The uniform and variable plate coefficient matrices are then scaled by p·b and p·b² and superimposed.</p></section>;
}
