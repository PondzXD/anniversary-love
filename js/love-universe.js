(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  // ---------- page state ----------
  const pages = [$("#page1"), $("#page2")];
  let page = 0, busy = false;
  function showPage(n) {
    n = Math.max(0, Math.min(1, n));
    if (n === page || busy) return;
    busy = true;
    const old = pages[page], next = pages[n];
    old.classList.remove("active");
    old.classList.add("fade-out");
    next.classList.add("active");
    page = n;
    setTimeout(() => { old.classList.remove("fade-out"); busy = false; }, 860);
  }
  $("#enterBtn").onclick = () => { burst(28); setTimeout(() => showPage(1), 180); };
  $("#prevBtn")?.addEventListener("click", () => showPage(0));
  $("#finishBtn").onclick = () => $("#finish").classList.remove("hidden");
  $("#replayBtn").onclick = () => { $("#finish").classList.add("hidden"); showPage(0); resetView(); };
  document.addEventListener("keydown", e => {
    if(e.key==="ArrowRight") showPage(page+1);
    if(e.key==="ArrowLeft") showPage(page-1);
    if(e.key==="Escape"){ $("#modal").classList.add("hidden"); $("#finish").classList.add("hidden"); }
  });

  // ---------- clickable memory modal ----------
  const modal = $("#modal");
  document.querySelectorAll(".memory-card").forEach(card => card.addEventListener("click", e => {
    e.stopPropagation();
    $("#modalVisual").textContent = card.querySelector(".memory-card") ? "" : card.querySelector(".memory-image")?.textContent || "01";
    $("#modalVisual").textContent = card.dataset.theme === "rose" ? "01" : card.dataset.theme === "pink" ? "02" : card.dataset.theme === "plum" ? "03" : "04";
    $("#modalTitle").textContent = card.dataset.title;
    $("#modalText").textContent = card.dataset.text;
    modal.classList.remove("hidden");
  }));
  function closeModal(){ modal.classList.add("hidden"); }
  $("#closeModal").onclick=closeModal; $("#modalBack").onclick=closeModal;
  modal.onclick=e=>{if(e.target===modal)closeModal()};

  // ---------- music/fullscreen ----------
  const audio=$("#audio");
  if (audio) audio.volume = 0.25;
  let playing=false;
  $("#musicBtn").onclick=async()=>{
    try{
      if(!playing){await audio.play();playing=true;$("#musicBtn").textContent="PAUSE";toast("music on")}
      else{audio.pause();playing=false;$("#musicBtn").textContent="MUSIC"}
    }catch{toast("กด MUSIC อีกครั้งเพื่อเปิดเพลง")}
  };
  $("#fullBtn").onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}};

  // ---------- canvas setup ----------
  const canvas=$("#universeCanvas"), ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
  let W=innerWidth,H=innerHeight,DPR=1;
  function resize(){
    W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,1.25);
    canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    canvas.style.width=W+"px";canvas.style.height=H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  addEventListener("resize",resize,{passive:true}); resize();

  // ---------- volumetric heart points ----------
  const N = W < 700 ? 720 : 1200;
  const particles=[];
  for(let i=0;i<N;i++){
    const t=Math.random()*Math.PI*2;
    const rr=Math.sqrt(Math.random()); // fills surface rather than outline
    const x=16*Math.pow(Math.sin(t),3)*rr;
    const y=(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*rr;
    const z=(Math.random()*2-1)*Math.sqrt(Math.max(.05,1-rr*rr))*8.5;
    const a=Math.random()*Math.PI*2,r=180+Math.random()*Math.max(W,H)*.78;
    particles.push({
      x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r*.62,
      tx:x,ty:y,tz:z,px:0,py:0,pz:0,
      size:.6+Math.random()*1.8,t:Math.random()*6.28,
      pink:Math.random()<.38,depth:Math.random()
    });
  }

  let startedAt=performance.now(), elapsed=0, yaw=0,pitch=0,targetYaw=0,targetPitch=0;
  let dragging=false,lastPX=0,lastPY=0;
  canvas.addEventListener("pointerdown",e=>{if(page!==1)return;dragging=true;lastPX=e.clientX;lastPY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(!dragging)return;targetYaw+= (e.clientX-lastPX)*.008;targetPitch=Math.max(-.7,Math.min(.7,targetPitch+(e.clientY-lastPY)*.005));lastPX=e.clientX;lastPY=e.clientY});
  canvas.addEventListener("pointerup",()=>dragging=false);canvas.addEventListener("pointercancel",()=>dragging=false);

  $("#resetView").onclick=()=>resetView();
  function resetView(){targetYaw=0;targetPitch=0};

  // Perspective projection. This is actual 3D coordinate math rendered on canvas.
  function project(x,y,z){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
    const x1=x*cy-z*sy,z1=x*sy+z*cy;
    const y1=y*cx-z1*sx,z2=y1*sx+z1*cx;
    const distance=30,scale=distance/(distance-z2);
    return {x:W/2+x1*scale*1.0,y:H*.43-y1*scale*.96,s:scale};
  }

  let lastFrame=performance.now();
  function render(now){
    const dt=Math.min(34,now-lastFrame);lastFrame=now;elapsed+=dt*.001;
    ctx.fillStyle="#030207";ctx.fillRect(0,0,W,H);

    // birth sequence only progresses when page 2 has been entered
    const activeTime=page===1 ? (now-startedAt)/1000 : 0;
    const form=Math.min(1,Math.max(0,(activeTime-.1)/4.5));
    const ease=form*form*(3-2*form);

    yaw += (targetYaw-yaw)*.045;
    pitch += (targetPitch-pitch)*.045;

    ctx.globalCompositeOperation="lighter";

    for(let i=0;i<N;i++){
      const p=particles[i];
      const spiral=elapsed*1.55+p.t+i*.0027;
      const stormRadius=155+(1-ease)*Math.max(W,H)*.42;
      const sx=W/2+Math.cos(spiral)*stormRadius;
      const sy=H/2+Math.sin(spiral)*stormRadius*.56;

      // Heart gets real depth after the storm collapses.
      const localX=p.tx* (Math.min(W,H)/31);
      const localY=p.ty* (Math.min(W,H)/31);
      const localZ=p.tz;
      const targetX=W/2+localX;
      const targetY=H*.43-localY;

      p.x+=(sx*(1-ease)+targetX*ease-p.x)*.052;
      p.y+=(sy*(1-ease)+targetY*ease-p.y)*.052;

      const depth=(Math.sin(spiral+i*.015)+1)/2;
      const rotatedZ=localZ*Math.cos(yaw)-localX*Math.sin(yaw);
      const px=p.x + Math.sin(yaw)*localZ*24 + targetYaw*7*depth;
      const py=p.y + Math.sin(pitch)*localZ*12 + targetPitch*5*depth;
      const size=p.size*(.68+depth*.88);

      ctx.globalAlpha=.25+.62*depth;
      ctx.fillStyle=p.pink?"rgba(255,101,146,.95)":"rgba(247,221,230,.84)";
      ctx.beginPath();ctx.arc(px,py,size,0,Math.PI*2);ctx.fill();

      // sparse near-camera highlights create thickness
      if(i%17===0 && depth>.87){
        ctx.globalAlpha=.065;
        ctx.beginPath();ctx.arc(px,py,size*5.5,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.globalAlpha=1;

    // thick 3D shell lines + equatorial halo
    if(ease>.5){
      const cx=W/2+targetYaw*8,cy=H*.43+targetPitch*6;
      for(let layer=0;layer<10;layer++){
        const q=layer/9;
        const rx=Math.min(W,H)*(.12+.13*q);
        const ry=Math.min(W,H)*(.06+.055*q);
        ctx.save();
        ctx.translate(cx+Math.sin(yaw)*(q-.5)*40,cy+Math.cos(pitch)*(q-.5)*22);
        ctx.rotate(yaw*.55);
        ctx.strokeStyle=`rgba(255,${86+Math.round(48*q)},${132+Math.round(40*q)},${.045+.035*q})`;
        ctx.lineWidth=1+q*1.7;
        ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
      const glow=ctx.createRadialGradient(cx,cy,2,cx,cy,Math.min(W,H)*.31);
      glow.addColorStop(0,"rgba(255,78,128,.18)");
      glow.addColorStop(.35,"rgba(255,58,116,.07)");
      glow.addColorStop(1,"rgba(255,58,116,0)");
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,Math.min(W,H)*.31,0,Math.PI*2);ctx.fill();
    }

    // 3D orbiting cards: DOM buttons, projected by depth and kept clickable.
    const cards=[...document.querySelectorAll(".memory-card")];
    cards.forEach((el,i)=>{
      const a=elapsed*.25+i*(Math.PI/2)+yaw*.22;
      const depth=(Math.sin(a)+1)/2;
      const rx=Math.min(W,H)*.29,ry=Math.min(W,H)*.23;
      const x=W/2+Math.cos(a)*rx;
      const y=H*.43+Math.sin(a)*ry;
      const scale=.68+.38*depth;
      el.style.left=(x-el.offsetWidth/2)+"px";
      el.style.top=(y-el.offsetHeight/2)+"px";
      el.style.transform=`scale(${scale}) rotate(${Math.sin(a)*4}deg)`;
      el.style.opacity=page===1 ? .28+.72*depth : 0;
      el.style.zIndex=10+Math.round(depth*35);
      el.style.pointerEvents=page===1 ? "auto" : "none";
      el.style.filter=`brightness(${.75+.3*depth}) blur(${(1-depth)*.45}px)`;
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function burst(n){
    for(let i=0;i<n;i++)setTimeout(()=>{
      const el=document.createElement("i");
      el.textContent=["*","·","+"][Math.floor(Math.random()*3)];
      el.style.cssText=`position:absolute;left:${44+Math.random()*12}%;top:${44+Math.random()*12}%;z-index:40;color:#ff7697;font-size:${14+Math.random()*22}px;animation:burst ${1.1+Math.random()*1.5}s ease-out forwards`;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(),3200);
    },i*18);
  }
  const style=document.createElement("style");
  style.textContent="@keyframes burst{to{transform:translateY(-55vh) scale(.2) rotate(30deg);opacity:0}}";document.head.appendChild(style);

  function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("toast-show");clearTimeout(window.__t);window.__t=setTimeout(()=>x.classList.remove("toast-show"),1800)}
})();
