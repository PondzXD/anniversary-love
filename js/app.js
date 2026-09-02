(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let page = 0, busy = false, threeReady = false;
  let renderer, scene, camera, controls;
  let heartGroup, heartCloud;
  let targetPositions, stormPositions, particleSeed;
  let universeStart = 0, forming = false;
  let lastTime = performance.now();
  const memories = [
    {
      title:"ไปดูหนังด้วยกัน",
      n:"01",
      text:"นั่งดูหนังด้วยกัน กินขนมไปด้วย และมีความสุขกับช่วงเวลาง่าย ๆ ที่ได้อยู่ข้างกัน",
      images:[
        "assets/photo1/first.jpg",
        "assets/photo1/1786186572485.jpg",
        "assets/photo1/1786186572901.jpg",
        "assets/photo1/1786186573656.jpg"
      ]
    },
    {
      title:"ไปกินของอร่อยด้วยกัน",
      n:"02",
      text:"ออกไปหาอะไรอร่อย ๆ กินด้วยกัน เพราะมื้อธรรมดาก็กลายเป็นมื้อพิเศษได้เมื่อมีเราอยู่ด้วยกัน",
      images:[
        "assets/photo2/first.jpg",
        "assets/photo2/LINE_ALBUM_%23U5c0f%23U72d7_260902_1.jpg",
        "assets/photo2/LINE_ALBUM_%23U5c0f%23U72d7_260902_2.jpg",
        "assets/photo2/LINE_ALBUM_%23U5c0f%23U72d7_260902_4.jpg",
        "assets/photo2/LINE_ALBUM_%23U5c0f%23U72d7_260902_9.jpg"
      ]
    },
    {
      title:"ไปเที่ยวด้วยกัน",
      n:"03",
      text:"ออกไปเที่ยวด้วยกัน เก็บทั้งรูปและช่วงเวลาดี ๆ กลับมาเป็นความทรงจำของเรา",
      images:[
        "assets/photo3/first.jpg",
        "assets/photo3/LINE_ALBUM_%23U5c0f%23U72d7_260902_37.jpg",
        "assets/photo3/LINE_ALBUM_%23U5c0f%23U72d7_260902_39.jpg",
        "assets/photo3/LINE_ALBUM_%23U5c0f%23U72d7_260902_40.jpg",
        "assets/photo3/LINE_ALBUM_%23U5c0f%23U72d7_260902_43.jpg"
      ]
    },
    {
      title:"ไปนั่งเล่นด้วยกัน",
      n:"04",
      text:"นั่งเล่นด้วยกัน คุยกันสบาย ๆ และใช้เวลาธรรมดา ๆ ให้กลายเป็นช่วงเวลาที่น่าจำ",
      images:[
        "assets/photo4/first.jpg",
        "assets/photo4/LINE_ALBUM_%23U5c0f%23U72d7_260902_61.jpg",
        "assets/photo4/LINE_ALBUM_%23U5c0f%23U72d7_260902_73.jpg",
        "assets/photo4/LINE_ALBUM_%23U5c0f%23U72d7_260902_76.jpg",
        "assets/photo4/LINE_ALBUM_%23U5c0f%23U72d7_260902_79.jpg"
      ]
    }
  ];

  const pages = [$("#page1"), $("#page2")];
  let gamePassed = false;
  function switchPage(n) {
    n = clamp(n, 0, 1);
    if (n === 1 && !gamePassed) { toast("ต่อจิ๊กซอว์ให้เสร็จก่อนนะ"); return; }
    if (n === page || busy) return;
    busy = true;
    const old = pages[page], next = pages[n];
    old.classList.remove("active"); old.classList.add("leaving");
    next.classList.add("active");
    page = n;
    setTimeout(() => { old.classList.remove("leaving"); busy = false; }, 880);
  }

  /* ------------------------------------------------------------
     Puzzle gate: 12 draggable tiles cut from the uploaded photo.
     Completing the board automatically opens the universe page.
  ------------------------------------------------------------ */
  const gameScoreEl = $("#gameScore");
  const gameTimeEl = $("#gameTime");
  const gameMessageEl = $("#gameMessage");
  const startGameBtn = $("#startGameBtn");
  const gameArena = $("#gameArena");
  let gameScore = 0;
  let gameRunning = false;
  let puzzleTiles = [];
  const PUZZLE_COLS = 4;
  const PUZZLE_ROWS = 3;
  const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS;
  const puzzleImage = "assets/anniversary-puzzle.jpg";

  function updatePuzzleHud() {
    if (gameScoreEl) gameScoreEl.textContent = `${gameScore} / ${PUZZLE_TOTAL}`;
    if (gameTimeEl) gameTimeEl.textContent = gameRunning ? "PLAYING" : (gamePassed ? "DONE" : "READY");
  }

  function clearPuzzle() {
    puzzleTiles.forEach(t => t.remove());
    puzzleTiles = [];
    if (gameArena) gameArena.querySelectorAll(".puzzle-slot").forEach(s => s.remove());
  }

  function makePuzzleSlots() {
    for (let row = 0; row < PUZZLE_ROWS; row++) {
      for (let col = 0; col < PUZZLE_COLS; col++) {
        const slot = document.createElement("div");
        slot.className = "puzzle-slot";
        slot.dataset.index = String(row * PUZZLE_COLS + col);
        slot.style.setProperty("--col", col);
        slot.style.setProperty("--row", row);
        gameArena.appendChild(slot);
      }
    }
  }

  function getBoardMetrics() {
    const w = gameArena.clientWidth;
    const h = gameArena.clientHeight;
    const boardW = Math.min(w * 0.32, 250);
    const boardH = boardW * (1494 / 1096);
    const clampedH = Math.min(boardH, h * 0.86);
    const clampedW = clampedH * (1096 / 1494);
    const finalW = Math.min(boardW, clampedW);
    const finalH = finalW * (1494 / 1096);
    const left = w * 0.5 - finalW * 0.5;
    const top = h * 0.5 - finalH * 0.5;
    return { w, h, boardW: finalW, boardH: finalH, left, top, tileW: finalW / PUZZLE_COLS, tileH: finalH / PUZZLE_ROWS };
  }

  function positionSlots() {
    if (!gameArena) return;
    const m = getBoardMetrics();
    gameArena.querySelectorAll(".puzzle-slot").forEach(slot => {
      const col = Number(slot.dataset.index) % PUZZLE_COLS;
      const row = Math.floor(Number(slot.dataset.index) / PUZZLE_COLS);
      slot.style.left = `${m.left + col * m.tileW}px`;
      slot.style.top = `${m.top + row * m.tileH}px`;
      slot.style.width = `${m.tileW + 1}px`;
      slot.style.height = `${m.tileH + 1}px`;
    });
    puzzleTiles.forEach(tile => {
      if (tile.dataset.locked === "true") snapTileToSlot(tile, Number(tile.dataset.index));
    });
  }

  function shufflePositions() {
    const m = getBoardMetrics();
    const leftZoneW = Math.max(120, m.left - 10);
    const rightStart = m.left + m.boardW + 10;
    const rightZoneW = Math.max(120, m.w - rightStart - 10);
    puzzleTiles.forEach((tile, i) => {
      tile.dataset.locked = "false";
      const tileW = m.tileW * 0.92;
      const tileH = m.tileH * 0.92;
      tile.style.width = `${tileW}px`;
      tile.style.height = `${tileH}px`;
      const side = i % 2 === 0 ? "left" : "right";
      const zoneW = side === "left" ? leftZoneW : rightZoneW;
      const x0 = side === "left" ? 8 : rightStart;
      const maxX = Math.max(x0 + 4, x0 + zoneW - tileW);
      const y = 18 + Math.random() * Math.max(10, m.h - tileH - 36);
      const x = x0 + Math.random() * Math.max(6, maxX - x0);
      tile.style.left = `${x}px`;
      tile.style.top = `${y}px`;
      tile.dataset.baseLeft = `${x}px`;
      tile.dataset.baseTop = `${y}px`;
      tile.style.transform = `rotate(${(-7 + Math.random() * 14).toFixed(1)}deg)`;
      tile.style.zIndex = String(10 + i);
    });
  }

  function tileCenter(tile) {
    return { x: tile.offsetLeft + tile.offsetWidth / 2, y: tile.offsetTop + tile.offsetHeight / 2 };
  }

  function slotCenter(index) {
    const slot = gameArena.querySelector(`.puzzle-slot[data-index="${index}"]`);
    if (!slot) return { x: 0, y: 0 };
    return { x: slot.offsetLeft + slot.offsetWidth / 2, y: slot.offsetTop + slot.offsetHeight / 2 };
  }

  function snapTileToSlot(tile, index) {
    const m = getBoardMetrics();
    const col = index % PUZZLE_COLS;
    const row = Math.floor(index / PUZZLE_COLS);
    tile.style.width = `${m.tileW + 1}px`;
    tile.style.height = `${m.tileH + 1}px`;
    tile.style.left = `${m.left + col * m.tileW}px`;
    tile.style.top = `${m.top + row * m.tileH}px`;
    tile.style.transform = "rotate(0deg)";
    tile.style.zIndex = String(30 + index);
  }

  function onPuzzlePointerDown(tile, event) {
    if (!gameRunning || tile.dataset.locked === "true") return;
    event.preventDefault();
    event.stopPropagation();
    const arenaRect = gameArena.getBoundingClientRect();
    const startLeft = tile.offsetLeft;
    const startTop = tile.offsetTop;
    const offsetX = event.clientX - arenaRect.left - startLeft;
    const offsetY = event.clientY - arenaRect.top - startTop;
    tile.classList.add("dragging");
    tile.setPointerCapture?.(event.pointerId);
    tile.style.zIndex = "100";

    const move = (e) => {
      const x = e.clientX - arenaRect.left - offsetX;
      const y = e.clientY - arenaRect.top - offsetY;
      const pad = 4;
      const nx = clamp(x, pad, gameArena.clientWidth - tile.offsetWidth - pad);
      const ny = clamp(y, pad, gameArena.clientHeight - tile.offsetHeight - pad);
      tile.style.left = `${nx}px`;
      tile.style.top = `${ny}px`;
      tile.style.transform = "rotate(0deg) scale(1.025)";
      e.preventDefault();
    };

    const end = (e) => {
      tile.releasePointerCapture?.(event.pointerId);
      tile.removeEventListener("pointermove", move);
      tile.removeEventListener("pointerup", end);
      tile.removeEventListener("pointercancel", end);
      tile.classList.remove("dragging");
      tile.style.transform = "rotate(0deg)";

      const index = Number(tile.dataset.index);
      const tc = tileCenter(tile);
      const sc = slotCenter(index);
      const dist = Math.hypot(tc.x - sc.x, tc.y - sc.y);
      const snapThreshold = Math.max(tile.offsetWidth, tile.offsetHeight) * 0.48;
      if (dist <= snapThreshold) {
        tile.dataset.locked = "true";
        snapTileToSlot(tile, index);
        gameScore++;
        updatePuzzleHud();
        if (gameScore === PUZZLE_TOTAL) completePuzzle();
      } else {
        tile.style.left = tile.dataset.baseLeft;
        tile.style.top = tile.dataset.baseTop;
        tile.style.transform = `rotate(${(-7 + Math.random() * 14).toFixed(1)}deg)`;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    tile.addEventListener("pointermove", move);
    tile.addEventListener("pointerup", end);
    tile.addEventListener("pointercancel", end);
  }

  function createPuzzleTiles() {
    clearPuzzle();
    makePuzzleSlots();
    puzzleTiles = [];
    for (let i = 0; i < PUZZLE_TOTAL; i++) {
      const col = i % PUZZLE_COLS;
      const row = Math.floor(i / PUZZLE_COLS);
      const tile = document.createElement("div");
      tile.className = "puzzle-tile";
      tile.dataset.index = String(i);
      tile.dataset.locked = "false";
      tile.style.setProperty("--col", col);
      tile.style.setProperty("--row", row);
      tile.style.backgroundImage = `url("${puzzleImage}")`;
      tile.style.backgroundSize = `${PUZZLE_COLS * 100}% ${PUZZLE_ROWS * 100}%`;
      tile.style.backgroundPosition = `${(col / (PUZZLE_COLS - 1)) * 100}% ${(row / (PUZZLE_ROWS - 1)) * 100}%`;
      tile.addEventListener("pointerdown", e => onPuzzlePointerDown(tile, e));
      tile.title = `ชิ้นที่ ${i + 1}`;
      gameArena.appendChild(tile);
      puzzleTiles.push(tile);
    }
    positionSlots();
    shufflePositions();
  }

  function startPuzzle() {
    gamePassed = false;
    gameRunning = true;
    gameScore = 0;
    if (gameMessageEl) gameMessageEl.textContent = "ลากชิ้นส่วนให้ตรงตำแหน่งของมัน";
    if (startGameBtn) startGameBtn.classList.add("hidden");
    updatePuzzleHud();
    createPuzzleTiles();
  }

  function completePuzzle() {
    gameRunning = false;
    gamePassed = true;
    if (gameMessageEl) gameMessageEl.textContent = "ภาพของเรากลับมาเป็นภาพเดียวกันแล้ว";
    if (gameTimeEl) gameTimeEl.textContent = "COMPLETE";
    gameArena.classList.add("puzzle-complete");
    toast("ต่อครบแล้ว — กำลังเปิดจักรวาลของเรา");
    setTimeout(() => {
      resetBirth(true);
      switchPage(1);
      soundToggle?.classList.add("visible");
      toggleMusic(true);
      gameArena.classList.remove("puzzle-complete");
    }, 900);
  }

  startGameBtn?.addEventListener("click", startPuzzle);
  // Auto-start the puzzle so the pieces are visible immediately on the opening screen.
  window.setTimeout(() => { if (!gameRunning && !gamePassed) startPuzzle(); }, 350);
  window.addEventListener("resize", () => { if (gameRunning || gamePassed) { positionSlots(); } });

  const resetBtn = $("#resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => { resetView(); resetBirth(true); toast("เริ่มกำเนิดจักรวาลอีกครั้ง"); });
  const finishBtn = $("#finishBtn");
  if (finishBtn) finishBtn.addEventListener("click", () => $("#finishOverlay").classList.remove("hidden"));
  const replayBtn = $("#replayBtn");
  if (replayBtn) replayBtn.addEventListener("click", () => { $("#finishOverlay").classList.add("hidden"); switchPage(0); resetBirth(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") switchPage(page + 1);
    if (e.key === "ArrowLeft") switchPage(page - 1);
    if (e.key === "Escape") { $("#finishOverlay").classList.add("hidden"); closeMemory(); }
  });

  const modal = $("#memoryModal");
  function closeMemory() { modal.classList.add("hidden"); modal.setAttribute("aria-hidden", "true"); }
  $("#closeMemory")?.addEventListener("click", closeMemory);
  $("#backUniverse")?.addEventListener("click", closeMemory);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeMemory(); });

  let audioPlaying = false;
  const audio = $("#audio");
  if (audio) audio.volume = 0.25;
  const soundToggle = $("#soundToggle");
  async function toggleMusic(forceOn=false){
    if(!audio || !soundToggle) return;
    try{
      if(forceOn || !audioPlaying){
        await audio.play(); audioPlaying=true; soundToggle.classList.add("playing"); soundToggle.querySelector(".sound-label").textContent="MUSIC ON";
      }else{
        audio.pause(); audioPlaying=false; soundToggle.classList.remove("playing"); soundToggle.querySelector(".sound-label").textContent="MUSIC";
      }
    }catch{ toast("กด MUSIC เพื่อเริ่มเพลง"); }
  }
  soundToggle?.addEventListener("click", (e)=>{e.preventDefault();e.stopPropagation();toggleMusic(false);});
  $("#fullBtn")?.addEventListener("click", async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch {}
  });

  function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030207);
    scene.fog = new THREE.FogExp2(0x030207, 0.012);

    camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 260);
    camera.position.set(0, 2.0, 22.5);

    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
    renderer.setSize(innerWidth, innerHeight);
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    $("#webgl-wrap").appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.rotateSpeed = .63;
    controls.zoomSpeed = .42;
    controls.minDistance = 10;
    controls.maxDistance = 39;
    controls.minPolarAngle = .05;
    controls.maxPolarAngle = Math.PI - .05;
    controls.target.set(0, 1.5, 0);
    controls.update();
    // Make rotation unmistakably mouse-driven and keep the renderer interactive.
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.touchAction = "none";
    controls.listenToKeyEvents(window);

    scene.add(new THREE.AmbientLight(0xffd4e0, .42));
    const key = new THREE.PointLight(0xff5b8a, 7.0, 58, 2.0); key.position.set(0, 5, 6); scene.add(key);
    const rim = new THREE.PointLight(0x956bff, 2.8, 46, 2.0); rim.position.set(-9, 2, -9); scene.add(rim);
    const fill = new THREE.PointLight(0xffc3d4, 1.4, 36, 2.0); fill.position.set(7, -1, 3); scene.add(fill);

    createBackgroundStars();
    createNebulaDust();
    createHeart();
    createGalaxyRings();
    createCosmicDecorations();
    createConstellationSatellites();
    createShootingStars();
    createCards();

    threeReady = true;
    $("#loading").classList.add("hidden");
    resetBirth(false);
    requestAnimationFrame(animate);
  }

  function makePoints(points, size, color, opacity) {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => { arr[i*3]=p.x; arr[i*3+1]=p.y; arr[i*3+2]=p.z; });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({size,color,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  }

  function createBackgroundStars() {
    const n = innerWidth < 700 ? 1300 : 2200;
    const p = [];
    for (let i=0;i<n;i++) {
      const r=24+Math.random()*75, a=Math.random()*Math.PI*2;
      p.push({x:Math.cos(a)*r,y:(Math.random()-.5)*46,z:Math.sin(a)*r});
    }
    scene.add(makePoints(p,.034,0xe8d9ff,.65));
  }

  function createNebulaDust() {
    const n = innerWidth < 700 ? 900 : 1500;
    const p=[];
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2, r=7+Math.random()*23, band=(Math.random()-.5)*3.3;
      p.push({x:Math.cos(a)*r,y:band+(Math.random()-.5)*2,z:Math.sin(a)*r*.72});
    }
    const dust=makePoints(p,.028,0xff6f99,.24); dust.rotation.x=.28; scene.add(dust);
    const dust2=dust.clone(); dust2.material=dust.material.clone(); dust2.material.color.set(0x8f75ff); dust2.material.opacity=.11; dust2.rotation.x=-.34; dust2.rotation.z=.18; scene.add(dust2);
  }

  function createHeart() {
    // The heart itself is made from particles sampled INSIDE a real heart outline.
    // There is deliberately no flat heart image or solid heart plate in the middle.
    const n = innerWidth < 700 ? 4200 : 7000;
    const pos = new Float32Array(n * 3);
    const tgt = new Float32Array(n * 3);
    const storm = new Float32Array(n * 3);
    const seed = new Float32Array(n);

    // Build a strong, unmistakable 2D heart silhouette.
    const outline = [];
    const scale = 0.42;
    for (let i = 0; i < 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      outline.push(new THREE.Vector2(
        16 * Math.pow(Math.sin(t), 3) * scale,
        (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale
      ));
    }

    const minX = -6.72, maxX = 6.72, minY = -7.1, maxY = 5.46;
    const inside = (x, y) => {
      let hit = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const xi = outline[i].x, yi = outline[i].y;
        const xj = outline[j].x, yj = outline[j].y;
        const cross = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-8) + xi);
        if (cross) hit = !hit;
      }
      return hit;
    };

    // Nearest outline radius is approximated from the center so particles get a thick 3D body,
    // while remaining faithful to the heart silhouette.
    const center = new THREE.Vector2(0, 0.05);
    const edgeFactor = (x, y) => {
      const dx = x - center.x, dy = y - center.y;
      const ang = Math.atan2(dy, dx);
      let best = 999;
      for (let i = 0; i < outline.length; i += 4) {
        const p = outline[i];
        const a = Math.atan2(p.y - center.y, p.x - center.x);
        let da = Math.abs(a - ang);
        da = Math.min(da, Math.PI * 2 - da);
        if (da < 0.055) {
          const rr = Math.hypot(p.x - center.x, p.y - center.y);
          best = Math.min(best, rr);
        }
      }
      const r = Math.hypot(dx, dy);
      return clamp(r / (best === 999 ? 1 : best), 0, 1);
    };

    for (let i = 0; i < n; i++) {
      const j = i * 3;
      let x, y;
      // Rejection sampling guarantees particles remain inside the heart silhouette.
      do {
        x = minX + Math.random() * (maxX - minX);
        y = minY + Math.random() * (maxY - minY);
      } while (!inside(x, y));

      const edge = edgeFactor(x, y);
      const depth = Math.sqrt(Math.max(0.04, 1 - edge));
      const z = (Math.random() * 2 - 1) * (1.35 + 4.25 * depth);

      tgt[j] = x;
      tgt[j + 1] = y + 1.35;
      tgt[j + 2] = z;

      // Storm state: particles begin as a wide, energetic cloud surrounding the final heart.
      const a = Math.random() * Math.PI * 2;
      const band = 11 + Math.random() * 25;
      storm[j] = Math.cos(a) * band + (Math.random() - .5) * 7;
      storm[j + 1] = 2.2 + Math.sin(a * 1.7) * band * .45 + (Math.random() - .5) * 9;
      storm[j + 2] = Math.sin(a * .82 + i * .0017) * band + (Math.random() - .5) * 12;

      pos[j] = storm[j];
      pos[j + 1] = storm[j + 1];
      pos[j + 2] = storm[j + 2];
      seed[i] = Math.random();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: innerWidth < 700 ? .065 : .075,
      color: 0xff9fba,
      transparent: true,
      opacity: .98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    heartCloud = new THREE.Points(g, mat);

    const glowMat = new THREE.PointsMaterial({
      size: innerWidth < 700 ? .024 : .028,
      color: 0xffeef5,
      transparent: true,
      opacity: .45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const glow = new THREE.Points(g.clone(), glowMat);

    heartGroup = new THREE.Group();
    heartGroup.add(heartCloud, glow);
    heartGroup.position.set(0, 0, 0);
    scene.add(heartGroup);

    targetPositions = tgt;
    stormPositions = storm;
    particleSeed = seed;
  }

  function createCosmicDecorations(){
    const decor = new THREE.Group();
    // Wide spiral dust lanes to fill the outer space without making the center messy.
    for(let band=0; band<3; band++){
      const count = innerWidth < 700 ? 480 : 820;
      const pts=[];
      for(let i=0;i<count;i++){
        const q=i/count, a=q*Math.PI*7 + band*2.1;
        const r=12 + q*17 + Math.sin(a*1.7+band)*1.2;
        const spread=(Math.random()-.5)*(1.4+q*2.8);
        pts.push({
          x:Math.cos(a)*r + Math.cos(a+Math.PI/2)*spread,
          y:(Math.random()-.5)*8.5 + Math.sin(q*Math.PI*2+band)*1.2,
          z:Math.sin(a)*r*.64 + Math.sin(a+Math.PI/2)*spread
        });
      }
      const dust=makePoints(pts, innerWidth<700?.034:.045, band===1?0xd9a7ff:0xff8baa, .12-band*.018);
      dust.rotation.x=.34 + band*.08; dust.rotation.z=band*.22; decor.add(dust);
    }

    // Small glowing planets and rings placed far outside the heart.
    const planets=[];
    for(let i=0;i<7;i++){
      const g=new THREE.Group();
      const radius=.16+Math.random()*.26;
      const palette=[0xff90ad,0xb58cff,0xffd8e1,0x9a83ff,0xffa3c0];
      const sphere=new THREE.Mesh(
        new THREE.SphereGeometry(radius,12,12),
        new THREE.MeshBasicMaterial({color:palette[i%palette.length],transparent:true,opacity:.72,blending:THREE.AdditiveBlending})
      );
      g.add(sphere);
      const halo=new THREE.Mesh(new THREE.TorusGeometry(radius*1.8,.012,6,40),new THREE.MeshBasicMaterial({color:palette[(i+2)%palette.length],transparent:true,opacity:.3,blending:THREE.AdditiveBlending}));
      halo.rotation.x=Math.PI/2 + (Math.random()-.5)*.8; halo.rotation.z=(Math.random()-.5)*.8; g.add(halo);
      g.userData={phase:Math.random()*Math.PI*2,speed:.035+Math.random()*.045,radius:13+i*1.35,height:(Math.random()-.5)*8.5,tilt:(Math.random()-.5)*.5};
      planets.push(g); decor.add(g);
    }
    decor.userData.planets=planets;

    // A few bright constellation knots on the perimeter.
    for(let k=0;k<9;k++){
      const knot=new THREE.Group();
      const pts=[];
      for(let j=0;j<8;j++){
        const a=Math.random()*Math.PI*2, r=.18+Math.random()*.8;
        const v=new THREE.Vector3(Math.cos(a)*r,(Math.random()-.5)*r,Math.sin(a)*r);
        pts.push(v);
        const star=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.03,6,6),new THREE.MeshBasicMaterial({color:j%3===0?0xffd5e2:0xd2b9ff,transparent:true,opacity:.85,blending:THREE.AdditiveBlending}));
        star.position.copy(v); knot.add(star);
      }
      for(let j=0;j<3;j++){
        const a=pts[j], b=pts[(j+2)%pts.length];
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:0xffb1c8,transparent:true,opacity:.18,blending:THREE.AdditiveBlending}));
        knot.add(line);
      }
      const aa=Math.random()*Math.PI*2, rr=17+Math.random()*8;
      knot.position.set(Math.cos(aa)*rr,(Math.random()-.5)*10,Math.sin(aa)*rr*.72);
      decor.add(knot);
    }
    scene.userData.cosmicDecor=decor;
    scene.add(decor);
  }

  function createGalaxyRings() {
    const g=new THREE.Group();
    const ringSpecs=[[6.2,.035,.34,0xff89aa,.33],[7.6,.025,-.28,0xd18fff,.24],[9.2,.016,.55,0xffc1d2,.18]];
    ringSpecs.forEach(([r,t,tilt,c,o])=>{
      const tor=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,280),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending}));
      tor.rotation.x=Math.PI/2+tilt; tor.rotation.z=tilt*.75; tor.position.y=1.05; g.add(tor);
    });
    const bandGeo=new THREE.TorusGeometry(10.7,.007,6,320);
    const band=new THREE.Mesh(bandGeo,new THREE.MeshBasicMaterial({color:0xffd6e2,transparent:true,opacity:.12,blending:THREE.AdditiveBlending}));
    band.rotation.x=Math.PI/2-.34; band.rotation.z=.42; g.add(band);
    scene.userData.rings=g; scene.add(g);
  }

  function createConstellationSatellites(){
    const group=new THREE.Group();
    for(let k=0;k<5;k++){
      const cluster=new THREE.Group();
      cluster.userData={phase:Math.random()*Math.PI*2, speed:.04+Math.random()*.035, radius:8.2+Math.random()*3.2, height:(Math.random()-.5)*4.5, tilt:(Math.random()-.5)*.7};
      for(let i=0;i<6;i++){
        const a=Math.random()*Math.PI*2,r=.35+Math.random()*.85;
        const s=new THREE.Mesh(new THREE.SphereGeometry(.035+Math.random()*.045,7,7),new THREE.MeshBasicMaterial({color:i%2?0xffb1c5:0xc6b2ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
        s.position.set(Math.cos(a)*r,Math.sin(a)*r*.7,(Math.random()-.5)*.35); cluster.add(s);
      }
      for(let i=0;i<2;i++){
        const a=i*Math.PI*2/2; const pts=[new THREE.Vector3(Math.cos(a)*.78,Math.sin(a)*.62,(Math.random()-.5)*.2),new THREE.Vector3(Math.cos(a+.9)*.55,Math.sin(a+.9)*.5,(Math.random()-.5)*.2)];
        const lg=new THREE.BufferGeometry().setFromPoints(pts); cluster.add(new THREE.Line(lg,new THREE.LineBasicMaterial({color:0xffb2c8,transparent:true,opacity:.3,blending:THREE.AdditiveBlending})));
      }
      group.add(cluster);
    }
    scene.userData.constellations=group; scene.add(group);
  }

  function createShootingStars(){
    const group=new THREE.Group();
    for(let i=0;i<4;i++){
      const pts=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.5,0,0),new THREE.Vector3(1.5,0,0)]);
      const line=new THREE.Line(pts,new THREE.LineBasicMaterial({color:0xff9fb5,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));
      line.userData={delay:Math.random()*9,duration:1.8+Math.random()*1.2}; group.add(line);
    }
    scene.userData.shooters=group; scene.add(group);
  }

  let currentMemory = 0;
  let currentPhoto = 0;

  function createCards(){
    const layer=$("#memoryLayer"); layer.innerHTML="";
    memories.forEach((m,i)=>{
      const b=document.createElement("button"); b.className="memory-card"; b.type="button";
      const cover = m.images?.[0] || m.image;
      const visual=cover
        ? `<img src="${cover}" alt="${m.title}">`
        : `<div class="${m.theme}" aria-hidden="true"></div>`;
      b.innerHTML=`<div class="memory-image">${visual}</div><div class="card-meta"><span class="card-num">${m.n}</span><span class="card-open">OPEN</span></div><strong>${m.title}</strong><small>${m.images?.length || 1} PHOTOS</small>`;
      b.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();openMemory(i)});
      layer.appendChild(b);
    });
  }

  function renderMemoryPhoto(){
    const m=memories[currentMemory];
    const photos=m.images || (m.image ? [m.image] : []);
    const v=$("#memoryVisual");
    const img=photos[currentPhoto];
    v.innerHTML=img
      ? `<img src="${img}" alt="${m.title} รูปที่ ${currentPhoto+1}">`
      : `<div class="${m.theme}" style="width:100%;height:100%"></div>`;
    $("#memoryPhotoCount").textContent = `${currentPhoto + 1} / ${photos.length}`;
    $("#memoryPrev").disabled = photos.length <= 1;
    $("#memoryNext").disabled = photos.length <= 1;
  }

  function openMemory(i){
    const m=memories[i];
    currentMemory=i;
    currentPhoto=0;
    $("#memoryNumber").textContent=m.n;
    $("#memoryTitle").textContent=m.title;
    $("#memoryText").textContent=m.text;
    renderMemoryPhoto();
    modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
  }

  function nextMemoryPhoto(){
    const photos=memories[currentMemory].images || [];
    if(!photos.length) return;
    currentPhoto=(currentPhoto+1)%photos.length;
    renderMemoryPhoto();
  }

  function prevMemoryPhoto(){
    const photos=memories[currentMemory].images || [];
    if(!photos.length) return;
    currentPhoto=(currentPhoto-1+photos.length)%photos.length;
    renderMemoryPhoto();
  }

  $("#memoryPrev")?.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();prevMemoryPhoto()});
  $("#memoryNext")?.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();nextMemoryPhoto()});
  document.addEventListener("keydown",(e)=>{
    if(modal.classList.contains("hidden")) return;
    if(e.key==="ArrowRight") nextMemoryPhoto();
    if(e.key==="ArrowLeft") prevMemoryPhoto();
  });

  function showCards(show){
    document.querySelectorAll(".memory-card").forEach(c=>{c.style.opacity=show?"1":"0";c.style.pointerEvents=show?"auto":"none"});
  }

  function resetView(){
    if(!controls)return;
    controls.target.set(0,1.5,0); controls.reset(); controls.update();
  }

  function resetBirth(replay){
    if(!heartCloud)return;
    universeStart=performance.now(); forming=true;
    const arr=heartCloud.geometry.attributes.position.array;
    for(let i=0;i<particleSeed.length;i++){const j=i*3;arr[j]=stormPositions[j];arr[j+1]=stormPositions[j+1];arr[j+2]=stormPositions[j+2];}
    heartCloud.geometry.attributes.position.needsUpdate=true;
    if(replay) resetView();
    showCards(false);
  }

  function animate(now){
    requestAnimationFrame(animate);
    const dt=Math.min(50,now-lastTime); lastTime=now;
    const t=now*.001;
    if(!renderer)return;

    const birth=Math.min(1,Math.max(0,(now-universeStart-80)/4800));
    const ease=birth*birth*(3-2*birth);
    const arr=heartCloud.geometry.attributes.position.array;
    for(let i=0;i<particleSeed.length;i++){
      const j=i*3, a=t*(1.1+.18*particleSeed[i])+particleSeed[i]*6.283+i*.0019;
      const r=10+(1-ease)*(10+particleSeed[i]*24);
      const sx=Math.cos(a)*r, sy=1.8+Math.sin(a*1.04)*r*.55, sz=Math.sin(a*.84+i*.0013)*r;
      const live = ease * (0.045 + 0.035 * particleSeed[i]);
      const microX = Math.sin(t * 1.7 + particleSeed[i] * 17.0 + i * 0.013) * live;
      const microY = Math.cos(t * 1.35 + particleSeed[i] * 11.0 + i * 0.009) * live;
      const microZ = Math.sin(t * 1.55 + particleSeed[i] * 23.0 + i * 0.007) * live;
      arr[j] += (sx*(1-ease)+targetPositions[j]*ease+microX-arr[j])*.055;
      arr[j+1] += (sy*(1-ease)+targetPositions[j+1]*ease+microY-arr[j+1])*.055;
      arr[j+2] += (sz*(1-ease)+targetPositions[j+2]*ease+microZ-arr[j+2])*.055;
    }
    heartCloud.geometry.attributes.position.needsUpdate=true;
    // Living-heart motion: a slow heartbeat, tiny 3D sway, and per-particle shimmer.
    // This keeps the formed heart visibly alive without turning it into an obvious spin animation.
    const pulseWave = Math.sin(t * 2.15);
    const pulse = 1 + 0.022 * pulseWave + 0.007 * Math.sin(t * 4.3);
    heartGroup.scale.set(pulse, pulse, pulse);
    heartGroup.rotation.y = 0.035 * Math.sin(t * 0.72) + 0.015 * Math.sin(t * 1.47);
    heartGroup.rotation.x = 0.018 * Math.sin(t * 0.91);
    heartGroup.position.y = 0.06 * Math.sin(t * 1.18);

    // Gentle internal flow so the heart does not look frozen after formation.
    const tintPulse = 0.94 + 0.06 * (0.5 + 0.5 * pulseWave);
    heartCloud.material.opacity = 0.91 * tintPulse;

    const rings=scene.userData.rings; if(rings){rings.rotation.y=t*.045;rings.rotation.z=Math.sin(t*.21)*.05;}
    const cosmic=scene.userData.cosmicDecor;
    if(cosmic){
      cosmic.rotation.y=Math.sin(t*.09)*.06;
      cosmic.rotation.x=Math.sin(t*.07)*.03;
      cosmic.userData.planets?.forEach((g,i)=>{
        const u=g.userData, a=t*u.speed+u.phase;
        g.position.set(Math.cos(a)*u.radius, u.height+Math.sin(a*1.3+u.phase)*.8, Math.sin(a)*u.radius*.72);
        g.rotation.y=a*.55; g.rotation.z=u.tilt;
      });
    }
    const constellations=scene.userData.constellations;
    if(constellations) constellations.children.forEach((c)=>{const u=c.userData,a=t*u.speed+u.phase;c.position.set(Math.cos(a)*u.radius,u.height+Math.sin(a*1.3)*.45,Math.sin(a)*u.radius*.72);c.rotation.y=a*.3;c.rotation.z=u.tilt;});
    const shooters=scene.userData.shooters;
    if(shooters) shooters.children.forEach((s,i)=>{const cycle=((t+s.userData.delay)%9);const p=cycle/s.userData.duration;if(p>=0&&p<=1){s.visible=true;s.position.set(-15+p*30,8-i*3,-10+i*5);s.rotation.z=-.2-i*.08;s.material.opacity=.5*Math.sin(Math.PI*p);}else{s.visible=false;}});

    const cards=[...document.querySelectorAll(".memory-card")];
    const formationAlpha=birth>=1?1:0;
    cards.forEach((el,i)=>{
      // Each memory is attached to a real 3D orbit around the heart.
      // The DOM card is projected from world space so it follows camera rotation too.
      const phase=i*(Math.PI*2/cards.length)+0.18;
      const speed=.24 + i*.012;
      const a=t*speed+phase;
      const radius=10.2 + (i%2)*1.05;
      const orbitTilt=-0.30 + i*0.16;
      const ox=Math.cos(a)*radius;
      const oz=Math.sin(a)*radius*.78;
      const oy=1.35 + Math.sin(a*1.55+phase)*1.45 + (i-1.5)*.12;

      // Tilt the orbit plane around X to make the path feel truly 3D.
      const cy=Math.cos(orbitTilt), sy=Math.sin(orbitTilt);
      const wx=ox;
      const wy=oy*cy-oz*sy;
      const wz=oy*sy+oz*cy;
      const projected=new THREE.Vector3(wx,wy,wz).project(camera);
      const sx=(projected.x*.5+.5)*innerWidth;
      const syScreen=(-projected.y*.5+.5)*innerHeight;
      const depth=clamp((1-projected.z)/2,0,1);
      const inView=projected.z<1.02;
      const s=.70+.42*depth;
      const bob=Math.sin(t*1.7+phase)*2.2;
      const tilt=Math.sin(a)*7 + orbitTilt*9;

      el.style.left=sx+"px";
      el.style.top=(syScreen+bob)+"px";
      el.style.transform=`translate(-50%,-50%) scale(${s}) rotate(${tilt}deg)`;
      el.style.zIndex=20+Math.round(depth*35);
      el.style.filter=`brightness(${.86+.34*depth}) saturate(${1.0+.20*depth}) blur(${(1-depth)*.20}px)`;
      el.style.opacity=(page===1&&formationAlpha&&inView)?String(.31+.69*depth):"0";
      el.style.pointerEvents=(page===1&&formationAlpha&&inView)?"auto":"none";
    });
    if(birth>=1&&forming){forming=false;showCards(true);toast("จักรวาลของเราสมบูรณ์แล้ว");}

    controls.update();
    renderer.render(scene,camera);
  }

  window.addEventListener("resize",()=>{
    if(!renderer)return;
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
  },{passive:true});

  function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("toast-show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("toast-show"),1900);}

  function boot(){
    if(window.THREE&&window.THREE.OrbitControls) createScene();
    else setTimeout(boot,180);
  }
  boot();
})();
