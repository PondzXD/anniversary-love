(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const status = $("status");
  // Fixed meeting date: after 31 January 2027 (B.E. 2570), at midnight on 1 February, local time.
  const target = new Date(2027, 1, 1, 0, 0, 0, 0);
  function render() {
    if (!target) {
      ["days","hours","minutes","seconds"].forEach(id => $(id).textContent = "--");
      status.textContent = "เรากำลังนับถอยหลังสู่หลังวันที่ 31 มกราคม 2570 ♡";
      return;
    }
    let diff = target.getTime() - Date.now();
    if (diff <= 0) {
      ["days","hours","minutes","seconds"].forEach(id => $(id).textContent = "00");
      status.textContent = "วันนี้แล้ว! ขอให้การเจอกันของเราเป็นวันที่แสนพิเศษ ♡";
      return;
    }
    const d = Math.floor(diff / 86400000); diff %= 86400000;
    const h = Math.floor(diff / 3600000); diff %= 3600000;
    const m = Math.floor(diff / 60000); diff %= 60000;
    const s = Math.floor(diff / 1000);
    $("days").textContent = String(d).padStart(2,"0");
    $("hours").textContent = String(h).padStart(2,"0");
    $("minutes").textContent = String(m).padStart(2,"0");
    $("seconds").textContent = String(s).padStart(2,"0");
    status.textContent = "เจอกันหลังวันที่ 31 มกราคม 2570 · เหลือเวลาอีกนิดเดียวแล้ว ♡";
  }
  render(); setInterval(render, 1000);


  // Floating uploaded couple photos
  const photoFiles=["LINE_ALBUM_%E5%B0%8F%E7%8B%97_260902_9.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_260902_21.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_260902_39.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_260902_55.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_260902_87.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_2.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_6.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_8.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_11.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_14.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_20.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_23.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_27.jpg","LINE_ALBUM_%E5%B0%8F%E7%8B%97_261016_28.jpg"];
  const field=$("photo-field");
  photoFiles.forEach(file=>{const card=document.createElement("div");card.className="floating-photo";const img=document.createElement("img");img.src=file;img.alt="รูปคู่ของเรา";const heart=document.createElement("span");heart.className="photo-heart";heart.textContent="♡";const duration=14+Math.random()*16;card.style.left=(3+Math.random()*90)+"%";card.style.top=(8+Math.random()*75)+"%";card.style.setProperty("--duration",duration+"s");card.style.setProperty("--delay",(-Math.random()*duration)+"s");card.style.setProperty("--tilt",(Math.random()*20-10)+"deg");card.style.setProperty("--dx",(Math.random()*80-40)+"px");card.append(img,heart);field.appendChild(card);img.addEventListener("error",()=>card.remove());});
  const song=$("love-song"),play=$("music-toggle"),mute=$("music-mute"),musicStatus=$("music-status");
  // Try audible autoplay on page load; browsers may block it until a user gesture.
  window.addEventListener("load",()=>{song.play().then(()=>{play.textContent="Ⅱ";musicStatus.textContent="กำลังเล่นเพลงของเรา ♡";}).catch(()=>{musicStatus.textContent="ถ้าเพลงยังไม่เล่น ให้แตะ ▶ หนึ่งครั้งนะ ♡";});},{once:true});
    play.addEventListener("click",async()=>{if(song.paused){try{await song.play();play.textContent="Ⅱ";musicStatus.textContent="กำลังเล่นเพลงของเรา ♡";}catch(e){musicStatus.textContent="แตะอีกครั้งเพื่อเล่นเพลง ♡";}}else{song.pause();play.textContent="▶";musicStatus.textContent="หยุดเพลงชั่วคราว ♡";}});
  mute.addEventListener("click",()=>{song.muted=!song.muted;mute.textContent=song.muted?"♪̸":"♫";musicStatus.textContent=song.muted?"ปิดเสียงอยู่":"I Love You 3000 · วนซ้ำ ♡";});

  // Lightweight animated starfield and drifting hearts; no external images or assets.
  const canvas = $("sky"), ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, stars = [], hearts = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
    canvas.style.width = w+"px"; canvas.style.height = h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length: Math.min(180, Math.floor(w*h/6500))}, () => ({
      x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.35+.25,
      a:Math.random()*.65+.15,s:Math.random()*.012+.003,p:Math.random()*Math.PI*2
    }));
    hearts = Array.from({length:14}, () => ({
      x:Math.random()*w,y:Math.random()*h,size:Math.random()*9+4,
      speed:Math.random()*.22+.08,alpha:Math.random()*.22+.05,drift:Math.random()*1.2-.6
    }));
  }
  function frame() {
    ctx.clearRect(0,0,w,h);
    const t = performance.now()*.001;
    for (const s of stars) {
      const a = s.a*(.65+.35*Math.sin(t*s.s*80+s.p));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = "rgba(255,220,238,"+a+")"; ctx.fill();
    }
    for (const heart of hearts) {
      heart.y -= heart.speed; heart.x += Math.sin(t+heart.size)*.12+heart.drift*.025;
      if (heart.y < -20) { heart.y=h+20; heart.x=Math.random()*w; }
      ctx.save(); ctx.translate(heart.x,heart.y); ctx.scale(heart.size/18,heart.size/18);
      ctx.fillStyle = "rgba(255,111,152,"+heart.alpha+")";
      ctx.beginPath(); ctx.moveTo(0,6); ctx.bezierCurveTo(-18,-5,-10,-15,0,-7); ctx.bezierCurveTo(10,-15,18,-5,0,6); ctx.fill(); ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize, {passive:true}); resize(); requestAnimationFrame(frame);
})();