float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), 
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.866, -0.5, 0.5, 0.866);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy / iResolution.xy;
    
    // 隐藏左下角存储像素
    if (uv.x < 2.0/iResolution.x && uv.y < 2.0/iResolution.y) uv += vec2(0.01); 

    vec4 inkData = texture(iChannel0, uv);
    float thick = inkData.r; 
    float thin  = inkData.g; 

    // 1. 宣纸底色
    vec3 paperColor = vec3(0.96, 0.94, 0.91);
    float grain = fbm(uv * 200.0); 
    float macro = fbm(uv * 4.0);   
    vec3 paper = paperColor * (0.92 + 0.1 * grain) * (0.9 + 0.12 * macro);

    // 2. 右起远景山水
    vec2 st = uv;
    st.x *= iResolution.x / iResolution.y; 
    float h1 = fbm(vec2(st.x * 1.8, 1.1)) * 0.35 + 0.35;
    float mnt1 = smoothstep(0.02, -0.05, st.y - h1) * smoothstep(h1 - 0.4, h1, st.y);
    float h2 = fbm(vec2(st.x * 1.2 + 5.0, 2.3)) * 0.4 + 0.25;
    float mnt2 = smoothstep(0.015, -0.04, st.y - h2) * smoothstep(h2 - 0.35, h2, st.y);
    
    float mountainMask = max(mnt1 * 0.5, mnt2 * 0.7);
    mountainMask *= 0.6 + 0.4 * fbm(st * 15.0 + fbm(st * 30.0));
 
    mountainMask *= smoothstep(0.2, 0.6, uv.x); 

    vec3 thinInk  = vec3(0.25, 0.32, 0.38); 
    vec3 thickInk = vec3(0.08, 0.07, 0.07); 
    paper = mix(paper, thinInk * 0.85, mountainMask * 0.35); 

    // 3. 互动水墨映射
    float waterEdge = smoothstep(0.0, 0.6, thin) - smoothstep(0.4, 0.9, thin);
    vec3 finalCol = mix(paper, thinInk * 0.8, waterEdge * 0.3); 
    finalCol = mix(finalCol, thinInk, smoothstep(0.1, 0.9, thin));
    finalCol = mix(finalCol, thickInk, smoothstep(0.1, 0.8, thick));

    // 4. 【古法排版】
    float col1 = smoothstep(0.005, 0.001, abs(uv.x - 0.15)) * smoothstep(0.85, 0.82, uv.y) * smoothstep(0.25, 0.35, uv.y);
    float col2 = smoothstep(0.005, 0.001, abs(uv.x - 0.10)) * smoothstep(0.85, 0.82, uv.y) * smoothstep(0.55, 0.60, uv.y);
    
    // 极具骨感的极细噪波频率
    float blocks = smoothstep(0.2, 0.6, fbm(vec2(uv.y * 40.0, uv.x * 100.0)));
    float strokes = smoothstep(0.4, 0.7, fbm(uv * 400.0));
    float alphaText = (col1 + col2) * blocks * strokes;
    
    finalCol = mix(finalCol, vec3(0.2, 0.2, 0.25), alphaText * 0.45); 

    // 5. 【款尾印】篆刻印章紧跟在第二列(落款)的末尾
    vec2 sealPos = vec2(0.10, 0.47); 
    vec2 su = (uv - sealPos) * vec2(iResolution.x / iResolution.y, 1.0);
    vec2 abs_su = abs(su);
    
    float radius = 0.0015;
    vec2 q = abs_su - vec2(0.02) + radius;
    float boxDist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
    
    float border = smoothstep(0.0, -0.001, boxDist) - smoothstep(-0.0025, -0.0035, boxDist);
    
    // 完美的九叠篆质感
    vec2 su2 = su * 800.0;
    float pattern = sin(su2.x) * cos(su2.y * 1.5) + sin(su2.y * 1.8 + su2.x);
    float chars = smoothstep(0.1, -0.1, abs(pattern) - 0.45);
    chars *= smoothstep(-0.0035, -0.0045, boxDist);
    
    float seal = max(border, chars);
    // 印泥斑驳感
    float pasteErosion = fbm(uv * 400.0);
    seal *= smoothstep(0.2, 0.75, pasteErosion + 0.15); 
    
    vec3 sealColor = vec3(0.68, 0.15, 0.12);
    finalCol = mix(finalCol, sealColor, seal * 0.95);

    // 6. 轻微暗角 
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vig = pow(vig * 9.0, 0.01);
    finalCol *= vig; 

    // 边界钳制
    finalCol = clamp(finalCol, 0.0, 1.0);

    fragColor = vec4(finalCol, 1.0);
}