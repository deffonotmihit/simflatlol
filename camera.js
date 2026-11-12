// ---------- Camera system (visual only: reads the vehicle state `s`, never writes it) ----------
// Modes:  CHASE (original camera + drag-to-look, springs back)  ·  FREE (orbit / pan / zoom around the car)  ·  CINEMATIC (rolling shots, flyby, drone, driver view)
// Keys:   C mode · V next cinematic shot · 1-7 pick shot · R reset view · B letterbox · H clean screen (hide HUD)
// Mouse:  left-drag orbit · right-/middle-/shift-drag pan · wheel zoom · double-click reset.   Touch: 1 finger orbit · 2 fingers pan + pinch.
(function(){
const V=THREE.Vector3,UP=new V(0,1,0);
const SHOTS=['Front roller','Side roller','Rear roller','Trackside pan','Drone orbit','Driver view','Auto director'];
const MODES=['CHASE','FREE','CINEMATIC'];
const cs={mode:0,shot:0,autoShot:0,autoT:0,orbYaw:0,orbPitch:0,zoom:1,idle:0,
 fy:0,fp:0.3,fr:9,pan:new V(0,1,0),
 off:new V(),loff:new V(),hd:0,hdInit:false,fov:60,
 ts:new V(),tsOn:false,orbA:0,bars:true,clean:false,dragging:false};
const P=new V(),Lk=new V(),T=new V(),T2=new V(),fw=new V(),lf=new V(),bq=new THREE.Quaternion();
const damp=(l,dt)=>1-Math.exp(-l*dt);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const $c=id=>document.getElementById(id);

function orbitVec(v,dy,dp,z){ // rotate v about the origin: yaw about world Y, then pitch, then scale
 const r=v.length()||1,yaw=Math.atan2(v.x,v.z)+dy,pit=clamp(Math.asin(clamp(v.y/r,-1,1))+dp,-0.15,1.5),rr=r*z;
 v.set(rr*Math.cos(pit)*Math.sin(yaw),rr*Math.sin(pit),rr*Math.cos(pit)*Math.cos(yaw));
}
function resetView(){cs.orbYaw=cs.orbPitch=0;cs.zoom=1;cs.pan.set(0,1,0);if(cs.mode===1)enterFree(true);}
function enterFree(keepTarget){ // start the free camera exactly where the current camera is, so there is no jump
 if(!keepTarget)cs.pan.set(0,1,0);
 T.set(s.X+cs.pan.x,cs.pan.y,s.Z+cs.pan.z);T2.copy(cam.position).sub(T);
 cs.fr=clamp(T2.length(),2,150);cs.fy=Math.atan2(T2.x,T2.z);cs.fp=clamp(Math.asin(clamp(T2.y/cs.fr,-1,1)),-0.05,1.5);
}
function setMode(m){
 cs.mode=m;cs.last=null;cam.up.copy(UP);cs.hdInit=false;cs.tsOn=false;
 if(m===1)enterFree(false);
 if(m===0){cs.orbYaw=cs.orbPitch=0;cs.zoom=1;}
 if(m===2)cutTo(cs.shot);
 label();
}
function cutTo(i){cs.last=null;cs.shot=i;cs.hdInit=false;cs.tsOn=false;cs.off.set(0,0,0);cs.loff.set(0,0,0);cs.autoT=0;cam.up.copy(UP);if(i===6)cs.autoShot=0;label();}
function label(){
 const e=$c('cam');if(!e)return;
 e.textContent=MODES[cs.mode]==='CINEMATIC'?'🎬 '+(cs.shot+1)+' '+SHOTS[cs.shot]:MODES[cs.mode]==='FREE'?'FREE CAM':'';
 document.body.classList.toggle('cine',cs.mode===2&&cs.bars);
 layoutBars();
}
// 2.39:1 letterbox for the cinematic mode
const bars=[0,1].map(i=>{const d=document.createElement('div');d.style.cssText='position:fixed;left:0;right:0;'+(i?'bottom':'top')+':0;height:0;background:#000;pointer-events:none;transition:height .35s;z-index:5';document.body.appendChild(d);return d;});
function layoutBars(){const h=cs.mode===2&&cs.bars?Math.max(0,(innerHeight-innerWidth/2.39)/2):0;bars.forEach(b=>b.style.height=h+'px');}
addEventListener('resize',layoutBars);

// ---------- input ----------
addEventListener('keydown',e=>{
 if(e.repeat)return;const k=e.code;
 if(k==='KeyC')setMode((cs.mode+1)%3);
 else if(k==='KeyV'){if(cs.mode!==2){cs.shot=(cs.shot+0);setMode(2);}else cutTo((cs.shot+1)%SHOTS.length);}
 else if(/^Digit[1-7]$/.test(k)){cs.mode=2;cutTo(+k.slice(5)-1);label();}
 else if(k==='KeyR')resetView();
 else if(k==='KeyB'){cs.bars=!cs.bars;label();}
 else if(k==='KeyH'){cs.clean=!cs.clean;document.body.classList.toggle('clean',cs.clean);}
});
const el=renderer.domElement,ptr=new Map();let pinch=0;
const dragLook=(dx,dy)=>{
 cs.idle=0;
 if(cs.mode===0){cs.orbYaw-=dx*0.006;cs.orbPitch+=dy*0.005;}
 else if(cs.mode===1){cs.fy-=dx*0.006;cs.fp=clamp(cs.fp+dy*0.005,-0.05,1.5);}
};
const dragPan=(dx,dy)=>{
 if(cs.mode!==1){ // panning from chase promotes to the free camera
  if(cs.mode===0){setMode(1);}else return;
 }
 const m=cam.matrixWorld.elements,k=cs.fr*0.0016;
 cs.pan.x+=(-m[0]*dx+m[4]*dy)*k;cs.pan.y=Math.max(0,cs.pan.y+(-m[1]*dx+m[5]*dy)*k);cs.pan.z+=(-m[2]*dx+m[6]*dy)*k;
};
const zoomBy=f=>{cs.idle=0;if(cs.mode===0)cs.zoom=clamp(cs.zoom*f,0.35,5);else if(cs.mode===1)cs.fr=clamp(cs.fr*f,2,150);};
el.addEventListener('pointerdown',e=>{try{el.setPointerCapture(e.pointerId);}catch(_){}
 ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button===2||e.button===1||e.shiftKey});cs.dragging=true;cs.idle=0;
 if(ptr.size===2){const [a,b]=[...ptr.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
el.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ptr.size===1){if(p.pan)dragPan(dx,dy);else dragLook(dx,dy);}
 else if(ptr.size===2){const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
  if(pinch>0&&d>0)zoomBy(pinch/d);pinch=d;dragPan(dx/2,dy/2);}});
const up=e=>{ptr.delete(e.pointerId);pinch=0;if(!ptr.size)cs.dragging=false;};
el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
el.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(clamp(e.deltaY,-120,120)*0.0012));},{passive:false});
el.addEventListener('dblclick',resetView);
el.addEventListener('contextmenu',e=>e.preventDefault());

// ---------- per-frame ----------
function chase(sp){
 const dist=6.8+sp*0.03,sy=Math.sin(camYaw),cy=Math.cos(camYaw);
 P.set(s.X-sy*dist,2.4+sp*0.01,s.Z-cy*dist);Lk.set(s.X+sy*3,1.1,s.Z+cy*3);
 if(cs.orbYaw||cs.orbPitch||cs.zoom!==1){T.copy(P).sub(Lk);orbitVec(T,cs.orbYaw,cs.orbPitch,cs.zoom);P.copy(Lk).add(T);}
 cam.up.copy(UP);return 60+sp*0.25;
}
function free(){
 Lk.set(s.X+cs.pan.x,cs.pan.y,s.Z+cs.pan.z);
 P.set(cs.fr*Math.cos(cs.fp)*Math.sin(cs.fy),cs.fr*Math.sin(cs.fp),cs.fr*Math.cos(cs.fp)*Math.cos(cs.fy)).add(Lk);
 cam.up.copy(UP);return 60;
}
// cinematic shots work on camera offsets relative to the car (so there is no speed-dependent lag), damped for a rig-like feel
function cine(fd,sp,shot){
 const X=s.X,Z=s.Z;let fovT=40,lam=6,llam=10;
 // heading used by the "camera car": direction of travel when moving, body heading when stopped
 const vx=s.u*Math.sin(s.psi)+s.v*Math.cos(s.psi),vz=s.u*Math.cos(s.psi)-s.v*Math.sin(s.psi);
 const th=sp>2.5?Math.atan2(vx,vz):s.psi;
 if(!cs.hdInit){cs.hd=th;cs.hdInit=true;}else cs.hd=wrap(cs.hd+wrap(th-cs.hd)*damp(2.5,fd));
 const fx=Math.sin(cs.hd),fz=Math.cos(cs.hd),lx=Math.cos(cs.hd),lz=-Math.sin(cs.hd); // forward / left in the world
 let po=T,lo=T2;po.set(0,0,0);lo.set(0,0.6,0);let absolute=false,snap=false;
 if(shot===0){po.set(fx*7.2-lx*3.4,0.55,fz*7.2-lz*3.4);lo.set(fx*0.4,0.62,fz*0.4);fovT=36;}                 // front-quarter roller, low, looking back at the car
 else if(shot===1){po.set(lx*5.4+fx*0.3,0.75,lz*5.4+fz*0.3);lo.set(0,0.6,0);fovT=33;}                       // side roller, wheels in profile
 else if(shot===2){po.set(-fx*6.2+lx*1.9,0.42,-fz*6.2+lz*1.9);lo.set(fx*1.5,0.7,fz*1.5);fovT=44;lam=7;}     // low rear tracking
 else if(shot===3){ // trackside: a locked-off long lens placed ahead, panning as the car passes; relocates once the car is past
  const d=Math.hypot(X-cs.ts.x,Z-cs.ts.z),ahead=(cs.ts.x-X)*fx+(cs.ts.z-Z)*fz;
  if(!cs.tsOn||ahead<-14||d>70+sp*3){const dd=sp>3?28+sp*1.1:11,side=((Math.random()<0.5)?1:-1)*(sp>3?6.5:5);
   cs.ts.set(X+fx*dd+lx*side,1.15,Z+fz*dd+lz*side);cs.tsOn=true;snap=true;}
  P.copy(cs.ts);Lk.set(X,0.75,Z);absolute=true;
  const dist=Math.hypot(X-P.x,Z-P.z);fovT=clamp(2*Math.atan(7/Math.max(dist,4))*57.2958,14,50);cs.fov+=(fovT-cs.fov)*damp(8,fd);
 }
 else if(shot===4){cs.orbA+=fd*(0.22+Math.min(sp,40)*0.003);const r=15+sp*0.12,h=6.5+sp*0.06;po.set(Math.sin(cs.orbA)*r,h,Math.cos(cs.orbA)*r);lo.set(0,0.7,0);fovT=48;lam=3;llam=6;}
 else if(shot===5){ // driver view, mounted on the body (rolls and pitches with it)
  body.updateMatrixWorld(true);body.getWorldQuaternion(bq);
  P.set(-0.36,1.2,0.28);body.localToWorld(P);Lk.set(-0.36,1.1,12);body.localToWorld(Lk);
  cam.up.copy(UP).applyQuaternion(bq);absolute=true;fovT=72;snap=true;
 }
 if(!absolute){
  if(cs.last!==shot||snap){cs.off.copy(po);cs.loff.copy(lo);}cs.last=shot;
  cs.off.lerp(po,damp(lam,fd));cs.loff.lerp(lo,damp(llam,fd));
  P.set(X+cs.off.x,Math.max(0.2,cs.off.y),Z+cs.off.z);Lk.set(X+cs.loff.x,cs.loff.y,Z+cs.loff.z);
  cs.fov+=(fovT-cs.fov)*damp(5,fd);
 }
 if(shot===5)cs.fov=fovT;
 if(shot!==5)cam.up.copy(UP);
 return cs.fov;
}
window.updateCamera=function(fd,sp){
 let fov;
 if(!cs.dragging&&cs.mode===0&&(cs.orbYaw||cs.orbPitch||cs.zoom!==1)){ // ease back to the normal chase view after a while
  cs.idle+=fd;if(cs.idle>2.5){const k=damp(2.2,fd);cs.orbYaw*=1-k;cs.orbPitch*=1-k;cs.zoom+=(1-cs.zoom)*k;
   if(Math.abs(cs.orbYaw)<1e-3&&Math.abs(cs.orbPitch)<1e-3&&Math.abs(cs.zoom-1)<1e-3)cs.orbYaw=cs.orbPitch=0,cs.zoom=1;}
 }
 if(cs.mode===2&&cs.shot===6){ // auto director: cut between shots every few seconds
  cs.autoT+=fd;if(cs.autoT>5.5){cs.autoT=0;cs.autoShot=(cs.autoShot+1)%6;cs.hdInit=false;cs.tsOn=false;cs.last=null;}
 }
 if(cs.mode===0){fov=chase(sp);cs.fov=fov;}
 else if(cs.mode===1){fov=free();cs.fov=fov;}
 else fov=cine(fd,sp,cs.shot===6?cs.autoShot:cs.shot);
 P.y=Math.max(0.12,P.y);
 cam.position.copy(P);cam.lookAt(Lk);cam.fov=fov;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
};
label();
})();
