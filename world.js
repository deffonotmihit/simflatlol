// ---------- 3 km x 3 km UK-style car park (visual only: the physics only sees the wall at +-HW) ----------
// Layout: the whole ground is a repeating tile of 12 bays x 2 rows (bays 2.5 m x 4.8 m, 6.025 m two-way aisle, back-to-back rows),
// crossed by a grid of 7 m two-lane circulation roads every 250 m with centre/edge lines, STOP + give-way junctions and zebra crossings.
(function(){
const BAY_W=2.5,BAY_L=4.8,AISLE=6.025,TILE_X=BAY_W*12,TILE_Z=AISLE+2*BAY_L; // 30 x 15.625 m
const RW=7.0,PITCH=250,NR=12,C0=-HW+125+(HW*2-NR*PITCH)/2;               // road width, spacing, number of roads, first road centre
const WHITE='#e9e9e4',cen=i=>C0+PITCH*i;
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(rep)t.repeat.set(rep[0],rep[1]);return t;}
function asphalt(x,w,h,base,a){x.fillStyle=base;x.fillRect(0,0,w,h);for(let i=0;i<w*h/70;i++){const g=a+Math.random()*34|0;x.fillStyle=`rgb(${g},${g+2},${g+4})`;x.fillRect(Math.random()*w,Math.random()*h,2,2);}}
const fr=(x,px,x0,y0,x1,y1)=>x.fillRect(x0*px,y0*px,(x1-x0)*px,(y1-y0)*px); // rectangle in metres

// ---- ground tile: bays ----
const PX=2048/TILE_X,PY=1024/TILE_Z;
const bayTex=tex(2048,1024,(x,w,h)=>{
 asphalt(x,w,h,'#585b5e',68);x.fillStyle=WHITE;const lw=0.08;
 const y1=AISLE,y2=AISLE+BAY_L,y3=TILE_Z;
 for(let k=0;k<=12;k++){const px=k*BAY_W;[[y1,y2],[y2,y3]].forEach(([a,b])=>{x.fillRect((px-lw/2)*PX,a*PY,lw*PX,(b-a)*PY);});}
 x.fillRect(0,(y2-lw/2)*PY,w,lw*PY);                       // back-of-bay line shared by the back-to-back rows
 x.fillRect(0,(y3-lw/2)*PY,w,lw*PY*0.0);
},[HW*2/TILE_X,HW*2/TILE_Z]);
ground.material.map=bayTex;ground.material.needsUpdate=true;

// ---- road strip (repeats every 9 m: 2 m line / 7 m gap centre line, 100 mm edge lines) ----
const SPX=80,stripTex=tex(720,560,(x,w,h)=>{asphalt(x,w,h,'#45484b',54);x.fillStyle=WHITE;
 fr(x,SPX,0,0.15,9,0.25);fr(x,SPX,0,RW-0.25,9,RW-0.15);fr(x,SPX,0,RW/2-0.05,2,RW/2+0.05);});
const asphTex=tex(256,256,(x,w,h)=>asphalt(x,w,h,'#45484b',54));

// ---- approach caps (16 m long, +u end = the junction; approach lane is the TOP half = driver's left of +u) ----
const CL=16;
function capBase(draw){return tex(CL*SPX,RW*SPX,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle=WHITE;x.strokeStyle=WHITE;draw(x);});}
const stopTex=capBase(x=>{
 fr(x,SPX,0,RW/2-0.05,CL,RW/2+0.05);                              // solid centre line on the approach
 fr(x,SPX,CL-1.2,0.25,CL-1.0,RW/2);                               // 200 mm stop line, 1 m short of the major road
 x.save();x.translate((CL-5.2)*SPX,1.9*SPX);x.rotate(Math.PI/2);x.scale(1,5.2);x.font='bold 70px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('STOP',0,0);x.restore();
});
const giveTex=capBase(x=>{
 fr(x,SPX,0,RW/2-0.05,CL,RW/2+0.05);
 [CL-1.0,CL-1.5].forEach(xe=>{for(let y=0.25;y<RW/2;y+=0.9)fr(x,SPX,xe-0.2,y,xe,Math.min(y+0.6,RW/2));}); // double broken give-way line
 x.lineWidth=0.14*SPX;x.beginPath();x.moveTo((CL-8.5)*SPX,1.9*SPX);x.lineTo((CL-3.5)*SPX,0.65*SPX);x.lineTo((CL-3.5)*SPX,3.15*SPX);x.closePath();x.stroke(); // apex toward the driver
});
// ---- zebra crossing (24 m): 4 m of 500 mm stripes, zig-zags, give-way lines ----
const ZL=24,zebraTex=tex(ZL*SPX,RW*SPX,(x,w,h)=>{asphalt(x,w,h,'#45484b',54);x.fillStyle=WHITE;x.strokeStyle=WHITE;
 fr(x,SPX,0,0.15,ZL,0.25);fr(x,SPX,0,RW-0.25,ZL,RW-0.15);
 for(let i=0;i<14;i+=2)fr(x,SPX,ZL/2-2,i*0.5,ZL/2+2,i*0.5+0.5);
 fr(x,SPX,0,RW/2-0.05,ZL/2-2,RW/2+0.05);fr(x,SPX,ZL/2+2,RW/2-0.05,ZL,RW/2+0.05);
 x.lineWidth=0.1*SPX;[0.75,RW-0.75].forEach(yc=>[[1,ZL/2-2.5],[ZL/2+2.5,ZL-1]].forEach(([a,b])=>{x.beginPath();let up=true;x.moveTo(a*SPX,(yc+0.3)*SPX);
  for(let u=a+0.6;u<=b;u+=0.6,up=!up)x.lineTo(u*SPX,(yc+(up?-0.3:0.3))*SPX);x.stroke();}));
 [ZL/2-3.2,ZL/2+3.2].forEach((xe,k)=>{const y0=k?RW/2:0.25,y1=k?RW-0.25:RW/2;for(let y=y0;y<y1-0.1;y+=0.9)fr(x,SPX,xe-0.1,y,xe+0.1,Math.min(y+0.6,y1));});
});

// ---- merged quad geometry (world-space vertices; v increases to the LEFT of +u, matching the texture's top edge) ----
function Quads(){return{p:[],uv:[],n:[],i:[]};}
function quad(g,cx,cz,ax,az,L,Wd,ur,vr){const bx=az,bz=-ax,k=g.p.length/3,h=L/2,w=Wd/2;
 [[-h,-w,0,0],[h,-w,ur,0],[h,w,ur,vr],[-h,w,0,vr]].forEach(([a,b,u,v])=>{g.p.push(cx+ax*a+bx*b,0,cz+az*a+bz*b);g.uv.push(u,v);g.n.push(0,1,0);});
 g.i.push(k,k+1,k+2,k,k+2,k+3);}
function mesh(g,map,over){if(!g.i.length)return null;const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(g.uv,2));geo.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3));geo.setIndex(g.i);
 const m=new THREE.MeshStandardMaterial({map,roughness:1,polygonOffset:true,polygonOffsetFactor:over?-4:-2,polygonOffsetUnits:over?-4:-2});
 if(over){m.transparent=true;m.depthWrite=false;}
 addBeam(m);const o=new THREE.Mesh(geo,m);o.receiveShadow=true;o.renderOrder=over?2:1;o.frustumCulled=false;scene.add(o);return o;}

const road=Quads(),junc=Quads(),stopQ=Quads(),giveQ=Quads(),zebraQ=Quads();
const signs=[]; // {x,z,ax,az,stop}
const SEG=PITCH-RW,STUB=PITCH/2-RW/2+(HW*2-NR*PITCH)/4; // full segment / end stub (centre of road C0 to the wall)
for(let j=0;j<NR;j++){
 const rc=cen(j);
 // full segments + end stubs, for both directions (x-roads: ax=(1,0) at z=rc;  z-roads: ax=(0,1) at x=rc)
 for(let d=0;d<2;d++){
  const ax=d?0:1,az=d?1:0,at=(t,o)=>d?[o,t]:[t,o];
  for(let i=0;i<NR-1;i++){const m=cen(i)+PITCH/2;let[cx,cz]=at(m,rc);quad(road,cx,cz,ax,az,SEG,RW,SEG/9,1);
   if(((i+j)%3)===(d?1:0)){[cx,cz]=at(m,rc);quad(zebraQ,cx,cz,ax,az,ZL,RW,1,1);}}
  const sl=cen(0)-RW/2+HW,sc=-HW+sl/2;                       // stub from the wall to the first junction
  let[cx,cz]=at(sc,rc);quad(road,cx,cz,ax,az,sl,RW,sl/9,1);
  [cx,cz]=at(-sc,rc);quad(road,cx,cz,ax,az,sl,RW,sl/9,1);
 }
 for(let i=0;i<NR;i++){
  const jx=cen(i),jz=rc;quad(junc,jx,jz,1,0,RW,RW,1,1);
  // priority is on the x-roads; the z-road approaches (both directions) give way or stop, alternating
  const stop=((i+j)&1)===0;
  [1,-1].forEach(sg=>{const ax=0,az=sg,cx=jx-ax*(RW/2+CL/2),cz=jz-az*(RW/2+CL/2);
   quad(stop?stopQ:giveQ,cx,cz,ax,az,CL,RW,1,1);
   // sign on the driver's left (verge side) beside the stop line: left of (ax,az) is (az,-ax)
   signs.push({x:jx-ax*(RW/2+1.6)+az*(RW/2+0.7),z:jz-az*(RW/2+1.6)-ax*(RW/2+0.7),ax,az,stop});});
 }
}
mesh(road,stripTex,false);mesh(junc,asphTex,false);mesh(zebraQ,zebraTex,true);mesh(stopQ,stopTex,true);mesh(giveQ,giveTex,true);

// ---- road signs (instanced; octagonal STOP and inverted-triangle GIVE WAY on poles) ----
function signTex(stop){return tex(128,128,(x)=>{x.clearRect(0,0,128,128);x.fillStyle='#c8102e';x.strokeStyle='#fff';
 const poly=(n,r,rot,off)=>{x.beginPath();for(let k=0;k<n;k++){const a=rot+k*Math.PI*2/n;x[k?'lineTo':'moveTo'](64+Math.cos(a)*r,64+off+Math.sin(a)*r);}x.closePath();};
 if(stop){poly(8,62,Math.PI/8,0);x.fill();x.lineWidth=5;poly(8,55,Math.PI/8,0);x.stroke();x.fillStyle='#fff';x.font='bold 36px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('STOP',64,66);}
 else{x.fillStyle='#fff';poly(3,62,Math.PI/2,0);x.fill();x.fillStyle='#c8102e';poly(3,48,Math.PI/2,6);x.fill();x.fillStyle='#fff';poly(3,26,Math.PI/2,12);x.fill();}
});}
[true,false].forEach(stop=>{const L=signs.filter(q=>q.stop===stop),n=L.length;if(!n)return;
 const face=new THREE.InstancedMesh(stop?new THREE.CircleGeometry(0.3,8,Math.PI/8):new THREE.CircleGeometry(0.4,3,Math.PI/2),
  new THREE.MeshStandardMaterial({map:signTex(stop),transparent:true,alphaTest:0.4,roughness:0.5,emissive:0x331111,emissiveMap:null}),n);
 const pole=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,2.1,6),new THREE.MeshStandardMaterial({color:0x8d9296,roughness:0.6,metalness:0.5}),n);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),sc=new THREE.Vector3(1,1,1);
 L.forEach((o,k)=>{q.setFromAxisAngle(Y,Math.atan2(-o.ax,-o.az));m.compose(new THREE.Vector3(o.x,2.0,o.z),q,sc);face.setMatrixAt(k,m);
  m.compose(new THREE.Vector3(o.x,1.05,o.z),q,sc);pole.setMatrixAt(k,m);});
 face.frustumCulled=pole.frustumCulled=false;face.castShadow=false;scene.add(face,pole);});
})();
