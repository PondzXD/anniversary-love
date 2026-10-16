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
  photoFiles.forEach((file,i)=>{const card=document.createElement("div");card.className="floating-photo";const img=document.createElement("img");img.src=file;img.alt="รูปคู่ของเรา";const heart=document.createElement("span");heart.className="photo-heart";heart.textContent="♡";const duration=24+Math.random()*18;const leftSide=i%2===0;card.style.left=leftSide?(1+Math.random()*7)+"%":(92+Math.random()*6)+"%";card.style.top=(8+(i%5)*18+Math.random()*5)+"%";card.style.setProperty("--duration",duration+"s");card.style.setProperty("--delay",(-Math.random()*duration)+"s");card.style.setProperty("--tilt",(Math.random()*8-4)+"deg");card.style.setProperty("--dx",(Math.random()*12-6)+"px");card.append(img,heart);field.appendChild(card);img.addEventListener("error",()=>card.remove());});
  const song=$("love-song");
  // Background music: do not call song.load() here because it can restart/interupt
  // a play request while the browser is already trying to begin playback.
  song.volume = 0.35;
  let audioStarted = false;
  let retrying = false;

  async function tryStartAudio() {
    if (!song || retrying || (!song.paused && !song.ended)) return;
    retrying = true;
    try {
      await song.play();
      audioStarted = true;
    } catch (error) {
      // Browsers may block autoplay until a real user gesture.
    } finally {
      retrying = false;
    }
  }

  // Try immediately, then retry after a user gesture if autoplay was blocked.
  tryStartAudio();
  ["pointerdown", "touchstart", "click", "keydown"].forEach(type => {
    document.addEventListener(type, tryStartAudio, { capture: true, passive: true });
  });

  // Recover if the browser pauses the audio after tab/app switching or buffering.
  song.addEventListener("ended", () => {
    song.currentTime = 0;
    tryStartAudio();
  });
  song.addEventListener("pause", () => {
    if (!document.hidden && !song.ended) {
      window.setTimeout(() => {
        if (song.paused && !document.hidden) tryStartAudio();
      }, 700);
    }
  });
  song.addEventListener("stalled", () => {
    if (song.paused && !document.hidden) tryStartAudio();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && song.paused) tryStartAudio();
  });
  window.addEventListener("pageshow", () => {
    if (song.paused) tryStartAudio();
  });

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