// 风吹森林落叶背景（Canvas 2D）
let rafId = null, leaves = [], _canvas = null;

const COLORS = ['#4ade80','#86efac','#bbf7d0','#fde68a','#fca5a5','#fdba74'];

export function start(canvas) {
  _canvas = canvas;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  canvas._forestResize = resize;

  function newLeaf(fromTop = false) {
    return {
      x: Math.random() * canvas.width,
      y: fromTop ? -10 : Math.random() * canvas.height,
      vx: (Math.random() - 0.3) * 1.5,
      vy: Math.random() * 1.5 + 0.5,
      r: Math.random() * 6 + 3,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.08,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.4 + 0.4,
      swing: Math.random() * Math.PI * 2,
      swingSpeed: Math.random() * 0.02 + 0.01,
    };
  }

  leaves = Array.from({ length: 60 }, () => newLeaf(false));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    leaves.forEach(l => {
      l.swing += l.swingSpeed;
      l.x += l.vx + Math.sin(l.swing) * 0.8;
      l.y += l.vy;
      l.rot += l.rotV;

      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = l.opacity;
      // 椭圆叶片
      ctx.beginPath();
      ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.fill();
      ctx.restore();

      if (l.y > canvas.height + 10 || l.x < -20 || l.x > canvas.width + 20) {
        Object.assign(l, newLeaf(true));
      }
    });
    rafId = requestAnimationFrame(draw);
  }
  rafId = requestAnimationFrame(draw);
}

export function stop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (_canvas?._forestResize) window.removeEventListener('resize', _canvas._forestResize);
  leaves = []; _canvas = null;
}
