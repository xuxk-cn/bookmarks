// 通用 WebGL2 Shader Runner
// 驱动 ShaderToy 风格的 GLSL fragment shader（mainImage 接口）
// 使用方式：createShaderRunner(canvas, fragmentShaderCode) → { start, stop }

const VERT_SRC = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// 常用工具函数（供 shader 直接用）
mat2 rotMatx2(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float d_roundBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;}
vec3 hash33(vec3 p,float seed){p=fract(p*vec3(.1031,.1030,.9730));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
vec2 translateCoo(vec2 fragCoord,vec3 res){return (fragCoord-0.5*res.xy)/res.y;}
`;

const FRAG_MAIN = `
void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    mainImage(fragColor, fragCoord);
}`;

export function createShaderRunner(canvas, fragCode) {
  const gl = canvas.getContext('webgl2');
  if (!gl) { console.warn('WebGL2 不可用'); return null; }

  // 编译 shader
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader 编译失败:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const fullFrag = FRAG_HEADER + '\n' + fragCode + FRAG_MAIN;
  const vert = compile(gl.VERTEX_SHADER, VERT_SRC);
  const frag = compile(gl.FRAGMENT_SHADER, fullFrag);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert); gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program 链接失败:', gl.getProgramInfoLog(prog));
    return null;
  }

  // 全屏三角形
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const uRes   = gl.getUniformLocation(prog, 'iResolution');
  const uTime  = gl.getUniformLocation(prog, 'iTime');
  const uMouse = gl.getUniformLocation(prog, 'iMouse');

  let rafId = null, startTime = null;
  const mouse = [0, 0, 0, 0];

  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(ts) {
    if (startTime === null) startTime = ts;
    const t = (ts - startTime) / 1000;
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform3f(uRes, canvas.width, canvas.height, 1.0);
    gl.uniform1f(uTime, t);
    gl.uniform4fv(uMouse, mouse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(render);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse[0] = e.clientX - r.left;
    mouse[1] = canvas.height - (e.clientY - r.top);
  });

  return {
    start() {
      resize();
      startTime = null;
      rafId = requestAnimationFrame(render);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      window.removeEventListener('resize', onResize);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    }
  };
}
