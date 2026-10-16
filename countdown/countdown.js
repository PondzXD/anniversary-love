(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const dateInput = $("meetDate"), status = $("status");
  const KEY = "our-little-universe-meeting-date";
  let target = null;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && Number.isFinite(new Date(saved).getTime())) {
      target = new Date(saved);
      dateInput.value = toLocalInput(target);
    }
  } catch (_) {}
  function toLocalInput(date) {
    const pad = n => String(n).padStart(2, "0");
    return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+"T"+pad(date.getHours())+":"+pad(date.getMinutes());
  }
  function saveDate() {
    const next = new Date(dateInput.value);
    if (!dateInput.value || !Number.isFinite(next.getTime())) {
      status.textContent = "เลือกวันและเวลาที่ถูกต้องก่อนนะ ♡";
      return;
    }
    if (next.getTime() <= Date.now()) {
      status.textContent = "วันที่นี้ผ่านไปแล้ว ลองเลือกวันในอนาคตนะ ♡";
      return;
    }
    target = next;
    try { localStorage.setItem(KEY, target.toISOString()); } catch (_) {}
    status.textContent = "บันทึกวันของเราแล้ว รอวันที่จะได้กอดกันนะ ♡";
    render();
  }
  $("saveDate").addEventListener("click", saveDate);
  dateInput.addEventListener("keydown", e => { if (e.key === "Enter") saveDate(); });
  function render() {
    if (!target) {
      ["days","hours","minutes","seconds"].forEach(id => $(id).textContent = "--");
      status.textContent = "ตั้งวันที่เราจะได้เจอกันไว้ตรงนี้นะ ♡";
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
    status.textContent = "เหลือเวลาอีกนิดเดียว เราก็จะได้เจอกันแล้ว ♡";
  }
  render(); setInterval(render, 1000);

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