// 下雪背景动画（Canvas 2D）
let rafId = null, flakes = [];

export function start(canvas) {
  const ctx = canvas.getContext('2d');
  const count = 120;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  canvas._snowResize = resize;

  flakes = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 3 + 1,
    speed: Math.random() * 1.2 + 0.4,
    drift: (Math.random() - 0.5) * 0.6,
    opacity: Math.random() * 0.5 + 0.4,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    flakes.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.opacity})`;
      ctx.fill();
      f.y += f.speed;
      f.x += f.drift + Math.sin(f.y * 0.02) * 0.3;
      if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width; }
      if (f.x > canvas.width + 5)  f.x = -5;
      if (f.x < -5) f.x = canvas.width + 5;
    });
    rafId = requestAnimationFrame(draw);
  }
  rafId = requestAnimationFrame(draw);
}

export function stop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (this?._canvas?._snowResize) window.removeEventListener('resize', this._canvas._snowResize);
}
