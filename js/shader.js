// Fondo con shader WebGL: brillo amarillo muy sutil que fluye despacio sobre negro.
// Respeta "reducir movimiento", se pausa con la pestaña oculta y usa baja resolución para ahorrar batería.
const FRAG = `precision mediump float;
uniform vec2 r; uniform float t; uniform float s;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=uv*vec2(r.x/r.y,1.)*1.5+vec2(0.,s);
  float tt=t*.035;
  vec2 q=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt));
  float f=fbm(p+2.*q+tt*.6);
  float g=smoothstep(.38,.95,f)*(.35+.65*(uv.x*.5+(1.-uv.y)*.5));
  float vig=smoothstep(.95,.15,length(uv-vec2(.5,.45)));
  vec3 col=vec3(1.,.84,.04)*g*(.05+.12*(1.-vig));
  float gr=(h(gl_FragCoord.xy+floor(t*8.))-.5)*.018;
  gl_FragColor=vec4(col+gr,1.);
}`;
export function startShader(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); document.documentElement.classList.add('no-gl'); return; }
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.remove(); document.documentElement.classList.add('no-gl'); return; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = { r: gl.getUniformLocation(pr, 'r'), t: gl.getUniformLocation(pr, 't'), s: gl.getUniformLocation(pr, 's') };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const size = () => { const k = Math.min(devicePixelRatio || 1, 2) * 0.5; canvas.width = Math.max(2, innerWidth * k); canvas.height = Math.max(2, innerHeight * k); gl.viewport(0, 0, canvas.width, canvas.height); };
  const draw = (ms) => { gl.uniform2f(U.r, canvas.width, canvas.height); gl.uniform1f(U.t, ms / 1000); gl.uniform1f(U.s, (scrollY || 0) * 0.0006); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  let last = 0, raf = 0;
  const loop = (ms) => { raf = requestAnimationFrame(loop); if (ms - last < 33) return; last = ms; draw(ms); }; // ~30 fps
  const run = () => { cancelAnimationFrame(raf); if (reduce.matches || document.hidden) draw(0); else raf = requestAnimationFrame(loop); };
  addEventListener('resize', () => { size(); run(); });
  document.addEventListener('visibilitychange', run);
  reduce.addEventListener?.('change', run);
  size(); run();
}
