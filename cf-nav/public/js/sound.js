// ── 悬停音效模块 ──────────────────────────────────────
// 对外暴露 playDing()，main.js 在 mouseenter 时调用

const toggle = document.getElementById('sound-toggle');

// 恢复开关状态
if (localStorage.getItem('soundEnabled') === 'false') toggle.checked = false;
toggle.addEventListener('change', () => {
  localStorage.setItem('soundEnabled', toggle.checked);
});

let audioCtx = null;

export function playDing() {
  if (!toggle.checked) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const c = audioCtx, t = c.currentTime;
    [[457.38, 0.25, 0.88], [914.76, 0.12, 0.45], [1829.52, 0.06, 0.18]].forEach(([f, v, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.start(t); o.stop(t + d);
    });
  } catch(e) {}
}
