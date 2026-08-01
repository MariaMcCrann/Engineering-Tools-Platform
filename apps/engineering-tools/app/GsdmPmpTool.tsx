"use client";

import { useMemo, useState } from "react";

const DURATIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6];
const AREA_BREAKS = [0,1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400,500,600,700,800,900,1000];
const SMOOTH = [
[250,245,235.5,229.9,225.7,222.3,219.4,217,215,213.1,211.5,200.2,192.9,187.4,182.8,178.9,175.4,172.4,169.7,167.2,150,139.3,131.4,124.9,119.4,114.6,110.3,106.4,103],
[360,350,340,333.7,329.1,325.2,321.9,319,316.4,314,311.8,295.3,284.2,275.7,268.1,263.2,258.4,253.9,249.4,245.4,219.9,204.5,193.2,184,176.3,169.6,163.7,158.5,154],
[460,440,429.4,422.4,417,412.4,408.5,405,401.9,398.9,396.3,375.9,361.5,350.4,341.2,333.5,326.8,320.9,315.7,311,279.7,260.9,246.9,235.6,226,217.9,210.9,205,200],
[570,510,498,490.3,484.6,479.8,475.7,472,468.6,465.6,462.7,441.9,428,417.1,408.2,400.5,393.7,387.6,382,376.9,340.4,316.8,299.1,284.8,272.9,262.6,253.7,245.9,238],
[640,580,568.7,559.7,552.8,547.1,542.3,538,534.3,530.9,527.7,505.2,489.7,477.2,466.6,457.3,449.1,441.7,435.1,429,387.6,363,345,330.4,317.9,306.9,297.3,289,282],
[710,647,633.9,624.8,618,612.3,607.4,603,598.9,595.2,591.7,566.3,549.2,535.9,524.8,515.3,506.8,499.2,492.3,486,441.2,413.2,392.5,375.9,362,349.9,339.2,329.7,321],
[760,690,675.2,665.6,658.3,652.2,646.8,642,637.6,633.5,629.8,602.9,585.2,571.5,560.2,550.4,541.7,534,526.9,520.4,475,447.3,427.3,411.6,398.4,387.1,377.1,368.1,360],
[810,727,711.9,701.2,693.1,686.3,680.3,675,670,665.6,661.5,632.3,613.9,600.2,589.2,580,571.9,564.7,558.2,552.3,510.9,484.9,465.8,450.6,438,427.23,417.8,409.5,402],
[900,793,778,767,758.6,751.8,746,741,736.5,732.4,728.7,701.7,683.5,669.4,657.5,647.5,638.7,631,623.9,617.6,573.6,546.2,525.9,509.3,495.4,483.3,472.6,463.3,455],
[960,856,839.6,827.5,818.2,810.5,803.9,798,792.9,788.3,784.1,755.3,736.8,722,709.8,699.8,690.4,681.7,674.3,667.6,619.3,589.6,567.9,550.4,535.6,522.7,511.4,501.5,493],
[1000,900,885.6,874.9,865.5,857.6,850.8,845,839.7,835.1,830.9,800.9,781,765.5,752.7,741.8,732.2,723.7,716,708.9,659.5,628.3,605.5,587.5,572.7,560,548.7,538.5,529]
];
const ROUGH = [
[250,245,235.5,229.9,225.7,222.3,219.4,217,215,213.1,211.5,200.2,192.9,187.4,182.8,178.9,175.4,172.4,169.7,167.2,150,139.3,131.4,124.9,119.4,114.6,110.3,106.4,103],
[360,350,340,333.7,329.1,325.2,321.9,319,316.4,314,311.8,295.3,284.2,275.7,269.1,263.2,258.4,253.9,249.4,245.4,219.9,204.5,193.2,184,176.3,169.6,163.7,158.5,154],
[460,440,429.4,422.4,417,412.4,408.5,405,401.9,398.9,396.3,375.9,361.5,350.4,341.2,333.5,326.8,320.9,315.7,311,279.7,260.9,246.9,235.6,226,217.9,210.9,205,200],
[570,510,498,490.3,484.6,479.8,475.7,472,468.6,465.6,462.7,441.9,428,417.1,408.2,400.5,393.7,387.6,382,376.9,340.4,316.8,299.1,284.8,272.9,262.6,253.7,245.9,238],
[740,656,642.7,632.5,624.2,617.3,610.9,605,600.3,596.2,591.7,566.3,549.2,535.9,524.8,515.3,506.8,499.2,492.3,486,441.2,413.2,392.5,376,362,349.9,339.2,329.7,321],
[880,770,751.4,739.6,730.1,722.1,715.2,709,703.5,698.5,693.9,660.8,638.7,621.7,607.6,595.5,584.9,575.5,567,559.2,506.2,474.6,452.3,435.1,421.1,409.5,399.4,390.7,383],
[990,852,830.2,815.8,804.7,795.6,787.8,781,774.9,769.5,764.6,730.9,709.8,693.5,680,668.3,657.9,648.5,639.9,632,575.5,539.7,513.4,492.4,474.7,459.6,446.5,435,425],
[1090,939,911.6,894.9,882.2,871.8,862.9,855,848.2,842,836.3,796.7,771.3,752.2,736.6,723.3,711.6,701.1,691.7,683.1,622.3,584,555.8,533.4,514.6,498.3,483.9,470.9,459],
[1250,1065,1040,1024,1010.6,999,988.9,980,971.9,964.6,957.9,909.9,878.4,854.3,834.7,818.2,803.9,791.3,780.1,770,702,661.1,630.5,605.7,584.3,565.4,548.6,533.5,520],
[1360,1178,1148,1127.5,1111.4,1098.2,1086.8,1077,1068.1,1060.1,1052.8,1000.2,965.3,938.6,916.8,898.2,882.1,867.8,854.9,843.2,761.9,711.2,674.1,644.9,620.9,601.2,584.5,570.3,558],
[1450,1242,1212.7,1192.8,1177.6,1164.8,1153.8,1144,1135.1,1127,1119.6,1065.8,1029.8,1001.9,978.8,958.9,941.4,925.8,911.7,898.9,810.6,757.7,719.7,689.6,664.3,642.2,622.4,604.5,588]
];
const DEFAULT_BOM = [
[26.9,30.4,35.6,39.9,44.4],[35.5,40.1,46.8,52.3,58.2],[40.7,46,53.5,59.7,66.3],
[44.6,50.3,58.5,65.2,72.3],[50.4,56.9,66.2,73.7,81.8],[55,62.1,72.3,80.6,89.5],
[58.9,66.6,77.6,86.6,96.2],[62.4,70.5,82.3,92,102],[68.5,77.5,90.6,101,113],
[73.7,83.6,97.9,110,122],[78.5,89,104,117,131]
];
const BASE_AEPS = [100,200,500,1000,2000];
const OUTPUT_AEPS = [100,200,500,1000,2000,5000,10000,100000,200000,500000,1000000,10000000];
const fmt = (n: number, d = 1) => Number.isFinite(n) ? n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}) : "—";
const interpolate = (area: number, row: number[]) => {
  const a = Math.max(0, Math.min(1000, area));
  let i = AREA_BREAKS.findIndex(v => v > a);
  if (i < 0) return row[row.length - 1];
  if (i === 0) return row[0];
  const x1=AREA_BREAKS[i-1],x2=AREA_BREAKS[i],y1=row[i-1],y2=row[i];
  return y1+(a-x1)*(y2-y1)/(x2-x1);
};
const extrapolate = (depth1000:number, depth2000:number, pmp:number, target:number) => {
  if(target<=2000) return NaN;
  const zd=Math.log10(10000000/2000);
  const gy=Math.log10(target/2000)/zd;
  const sgc=Math.log10(depth1000/depth2000)/(Math.log10(depth2000)*Math.log10(1000/2000));
  const sgap=(Math.log10(pmp)/Math.log10(depth2000)-1)/zd;
  const ry=1+sgc*gy*zd+(sgap-sgc)*zd*gy*gy;
  return Math.pow(10,ry*Math.log10(depth2000));
};

function Field({label,value,unit,kind,defaultText,onChange}:{label:string;value:string;unit?:string;kind:"project"|"assumption";defaultText:string;onChange:(v:string)=>void}) {
  return <label className={"calc-field gsdm-field "+kind}><span>{label}<em>{kind==="project"?"Modify":"Review assumption"}</em></span><small>Workbook default: {defaultText}</small><input type="number" min="0" step="any" value={value} onChange={e=>onChange(e.target.value)}/>{unit&&<i>{unit}</i>}</label>;
}
function Section({number,title,children}:{number:number;title:string;children:React.ReactNode}){return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>}
function Metric({name,value}:{name:string;value:string}){return <div className="metric"><span>{name}</span><strong>{value}</strong></div>}

export function GsdmPmpTool(){
  const [project,setProject]=useState("994 Leakes Road");
  const [area,setArea]=useState("2.338");
  const [smooth,setSmooth]=useState("1");
  const [elevation,setElevation]=useState("54");
  const [maf,setMaf]=useState("0.55");
  const [durationLimit,setDurationLimit]=useState("6");
  const [bom,setBom]=useState(DEFAULT_BOM.map(r=>[...r]));
  const results=useMemo(()=>{
    const a=Number(area),s=Math.max(0,Math.min(1,Number(smooth))),rough=1-s,elev=Number(elevation),m=Number(maf),limit=Number(durationLimit);
    const eaf=elev<1500?1:1-(elev-1500)/300*0.05;
    const rows=DURATIONS.map((duration,i)=>{
      const ds=interpolate(a,SMOOTH[i]),dr=interpolate(a,ROUGH[i]);
      const pmp=(ds*s+dr*rough)*m*eaf,rounded=Math.round(pmp/10)*10;
      const depths=OUTPUT_AEPS.map((aep,j)=>j<5?bom[i][j]:aep===10000000?rounded:extrapolate(bom[i][3],bom[i][4],rounded,aep));
      const intensities=depths.map(d=>d/duration);
      return {duration,ds,dr,pmp,rounded,depths,intensities,include:duration<=limit};
    });
    return {a,s,rough,elev,m,eaf,limit,rows,spatial:a>2.6};
  },[area,smooth,elevation,maf,durationLimit,bom]);

  const reset=()=>{setProject("994 Leakes Road");setArea("2.338");setSmooth("1");setElevation("54");setMaf("0.55");setDurationLimit("6");setBom(DEFAULT_BOM.map(r=>[...r]))};
  const updateBom=(r:number,c:number,value:string)=>setBom(current=>current.map((row,ri)=>ri===r?row.map((v,ci)=>ci===c?Number(value):v):row));
  const exportCsv=()=>{
    const lines=[["GSDM PMP Calculation",project],["Catchment area (km2)",results.a],["Smooth fraction",results.s],["Rough fraction",results.rough],["Mean elevation (m)",results.elev],["MAF",results.m],["EAF",results.eaf],[],["Duration (hr)","Smooth depth (mm)","Rough depth (mm)","PMP (mm)","Rounded PMP (mm)",...OUTPUT_AEPS.map(a=>"1 in "+a+" intensity (mm/hr)")]];
    results.rows.filter(r=>r.include).forEach(r=>lines.push([r.duration,r.ds,r.dr,r.pmp,r.rounded,...r.intensities] as (string|number)[]));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([lines.map(row=>row.join(",")).join("\n")],{type:"text/csv"}));a.download="gsdm-pmp-rorb-inputs.csv";a.click();URL.revokeObjectURL(a.href);
  };
  const maxPmp=Math.max(...results.rows.filter(r=>r.include).map(r=>r.rounded),1);

  return <div className="content calc-content">
    <p className="eyebrow">EXTREME RAINFALL CALCULATOR</p><h1>GSDM PMP</h1>
    <p className="subtitle">Generalised Short Duration Method PMP estimates and credible-limit rainfall inputs for RORB.</p>
    <section className="input-guide gsdm-guide"><div><strong>Input colours</strong><span><b className="guide-dot modify"></b><b>Blue — Modify</b> for the project</span><span><b className="guide-dot review"></b><b>Amber — Review assumption</b></span></div><button type="button" onClick={reset}>Reset workbook defaults</button></section>
    <div className="calc-layout"><div>
      <Section number={1} title="Project and catchment inputs"><div className="gsdm-project-name"><label>Project name <em>Modify</em><input value={project} onChange={e=>setProject(e.target.value)}/></label></div><div className="calc-fields">
        <Field label="Catchment area" value={area} unit="km²" kind="project" defaultText="2.338 km²" onChange={setArea}/>
        <Field label="Duration limit" value={durationLimit} unit="hr" kind="project" defaultText="6 hr" onChange={setDurationLimit}/>
        <Field label="Smooth terrain fraction" value={smooth} unit="0–1" kind="project" defaultText="1.0" onChange={setSmooth}/>
        <Field label="Mean elevation" value={elevation} unit="m AHD" kind="project" defaultText="54 m" onChange={setElevation}/>
        <Field label="Moisture adjustment factor" value={maf} unit="MAF" kind="assumption" defaultText="0.55" onChange={setMaf}/>
      </div><div className="check-row gsdm-checks"><span className={results.spatial?"warn":"pass"}>{results.spatial?"! Spatial pattern required (area > 2.6 km²)":"✓ No spatial pattern required"}</span><span className={results.eaf>0?"pass":"fail"}>EAF {fmt(results.eaf,3)}</span><span className={results.m>=0.4&&results.m<=1.1?"pass":"warn"}>{results.m>=0.4&&results.m<=1.1?"✓ MAF within 0.4–1.1":"! Review MAF range"}</span></div></Section>
      <Section number={2} title="BOM design rainfall depths"><p className="section-help">These blue cells are site-specific BOM inputs and should be replaced for each project. Values are rainfall depths in millimetres.</p><div className="gsdm-bom-table"><table><thead><tr><th>Duration</th>{BASE_AEPS.map(a=><th key={a}>1 in {a}</th>)}</tr></thead><tbody>{DURATIONS.map((d,r)=><tr key={d}><td>{d<1?d*60+" min":d+" hr"}</td>{BASE_AEPS.map((a,c)=><td key={a}><input aria-label={d+" hour 1 in "+a+" rainfall depth"} type="number" step="any" value={bom[r][c]} onChange={e=>updateBom(r,c,e.target.value)}/></td>)}</tr>)}</tbody></table></div></Section>
      <Section number={3} title="PMP depth results"><div className="gsdm-output-table"><table><thead><tr><th>Duration</th><th>Smooth Ds</th><th>Rough Dr</th><th>Calculated PMP</th><th>Rounded PMP</th></tr></thead><tbody>{results.rows.filter(r=>r.include).map(r=><tr key={r.duration}><td>{r.duration<1?r.duration*60+" min":r.duration+" hr"}</td><td>{fmt(r.ds)}</td><td>{fmt(r.dr)}</td><td>{fmt(r.pmp)}</td><td><strong>{fmt(r.rounded,0)} mm</strong></td></tr>)}</tbody></table></div></Section>
      <Section number={4} title="RORB rainfall intensity table"><div className="gsdm-output-table wide"><table><thead><tr><th>Duration</th>{OUTPUT_AEPS.map(a=><th key={a}>1:{a.toLocaleString()}</th>)}</tr></thead><tbody>{results.rows.filter(r=>r.include).map(r=><tr key={r.duration}><td>{r.duration<1?r.duration*60+"m":r.duration+"h"}</td>{r.intensities.map((v,i)=><td key={OUTPUT_AEPS[i]}>{fmt(v,1)}</td>)}</tr>)}</tbody></table></div><p className="engine-note">Intensities are mm/hr. AEPs above 1 in 2,000 use the ARR Book 8 credible-limit interpolation reproduced from the workbook.</p></Section>
    </div><aside className="calc-results"><p>LIVE RESULTS</p><div className="result-hero"><span>6-hour rounded PMP</span><strong>{fmt(results.rows[10].rounded,0)}<small>mm</small></strong></div>
      <Metric name="Catchment area" value={fmt(results.a,3)+" km²"}/><Metric name="Smooth / rough fractions" value={fmt(results.s,2)+" / "+fmt(results.rough,2)}/><Metric name="Elevation adjustment factor" value={fmt(results.eaf,3)}/><Metric name="Moisture adjustment factor" value={fmt(results.m,2)}/>
      <div className="gsdm-mini-chart">{results.rows.filter(r=>r.include).map(r=><div key={r.duration}><span>{r.duration<1?r.duration*60+"m":r.duration+"h"}</span><i><b style={{width:(r.rounded/maxPmp*100)+"%"}}></b></i><strong>{fmt(r.rounded,0)}</strong></div>)}</div>
      <button className="download-btn" onClick={exportCsv}>↓ Export GSDM / RORB CSV</button>
      <p className="engine-note">Preliminary calculation aid based on the supplied workbook. Confirm current ARR/BOM guidance, rainfall inputs, terrain classification, MAF, spatial pattern requirements and independent dams-engineer review before use.</p>
    </aside></div>
  </div>;
}
