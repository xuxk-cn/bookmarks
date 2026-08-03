vec2 hash12(float t) {
    float x = fract(sin(t * 12.9898) * 43758.5453);
    float y = fract(sin(t * 78.233) * 43758.5453);
    return vec2(x, y) * 2.0 - 1.0;
}

// 解析与 Sound 中完全一致的主旋律逻辑
float getMelody(int s) {
    int m = (s / 8) % 4;
    int step = s % 8;
    if((m==0 && step==0) || (m==0 && step==6) || 
       (m==1 && step==0) || (m==1 && step==5) || 
       (m==2 && step==0) || 
       (m==3 && step==0) || (m==3 && step==4)) return 1.0;
    return 0.0;
}

// 高级音频视觉回溯算法：渲染属于音乐节拍的水波
float getWaterHeight(vec2 p, float time) {
    float height = 0.0;
    float bps = 3.5;
    float stepF = time * bps;
    int currentStep = int(floor(stepF));

    // 回溯过去 12 个音符，让画面上的水波能存活 3-4 秒
    for(int i = 0; i < 12; i++) {
        int s = currentStep - i;
        if(s < 0) continue;
        
        float age = float(i) / bps + fract(stepF) / bps;
        int beat = s % 8;

        // 根据音符类型判定水花的大小和强度
        float intensity = 0.0;
        float baseRadius = 0.0;
        
        float isMelody = getMelody(s);
        if (isMelody > 0.5) {
            // 主旋律重音：极强、极大的连绵波纹
            intensity = 1.2;
            baseRadius = age * 0.5;
        } else if (beat == 3 || beat == 6) {
            // 水滴配角：清脆的中型波纹
            intensity = 0.6;
            baseRadius = age * 0.4;
        } else {
            // 背景竖琴：泛起微弱密集的细小波光
            intensity = 0.15;
            baseRadius = age * 0.3;
        }

        // 根据节拍 ID 获取涟漪的屏幕随机位置
        vec2 pos = hash12(float(s));
        pos.x *= iResolution.x / iResolution.y;

        // 水波物理扩散计算 (Sine Wave + Envelope)
        float dist = length(p - pos);
        float wave = sin((dist - baseRadius) * (40.0 + intensity * 10.0));
        float envelope = smoothstep(0.1, 0.0, abs(dist - baseRadius)) * exp(-age * (2.0 - intensity*0.5));

        height += wave * envelope * intensity;
    }

    // 全局极其轻柔的水面起伏
    height += sin(p.x * 2.0 + time * 0.5) * cos(p.y * 2.0 + time * 0.3) * 0.005;
    return height;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = -1.0 + 2.0 * uv;
    p.x *= iResolution.x / iResolution.y;
    float time = iTime;

    // 1. 提取法线 (计算折射)
    vec2 eps = vec2(0.015, 0.0);
    float h0 = getWaterHeight(p, time);
    float hX = getWaterHeight(p + eps.xy, time);
    float hY = getWaterHeight(p + eps.yx, time);
    vec3 normal = normalize(vec3(h0 - hX, h0 - hY, 0.06));

    // 2. 模拟水的光学折射
    vec2 refUv = uv + normal.xy * 0.15;

    // 3. 动态呼吸的水池颜色 (随着 4 个和弦推进，池水变换不同情感的色彩)
    float bps = 3.5;
    int currentStep = int(floor(time * bps));
    int m = (currentStep / 8) % 4;
    
    vec3 colA, colB;
    if(m == 0)      { colA = vec3(0.0, 0.4, 0.55); colB = vec3(0.3, 0.8, 0.9); } // Fmaj7 (晴空青蓝)
    else if(m == 1) { colA = vec3(0.05, 0.45, 0.5); colB = vec3(0.4, 0.9, 0.8); } // G6 (温润湖绿)
    else if(m == 2) { colA = vec3(0.0, 0.3, 0.6);  colB = vec3(0.2, 0.7, 0.95); } // Em7 (悲伤深蓝)
    else            { colA = vec3(0.1, 0.25, 0.6); colB = vec3(0.4, 0.6, 0.95); } // Am9 (空灵紫蓝)
    
    vec3 bgCol = mix(colA, colB, refUv.y);
    
    // 水底清澈见底的瓷砖网格
    vec2 grid = fract(refUv * 8.0);
    float lines = smoothstep(0.95, 1.0, grid.x) + smoothstep(0.95, 1.0, grid.y);
    bgCol = mix(bgCol, vec3(0.8, 1.0, 1.0), lines * 0.15);

    // 4. 水底焦散 (Caustics 光影)
    vec2 cp = refUv * 6.0;
    float c = 0.0;
    for(int i = 0; i < 3; i++) {
        cp += sin(cp.yx * 1.2 + time * 0.4);
        c += sin(cp.x) * cos(cp.y);
        cp *= 1.3;
    }
    bgCol += vec3(0.3, 0.8, 0.9) * smoothstep(0.0, 1.5, c) * 0.6;

    // 5. 波光粼粼的镜面高光 (Specular)
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);

    float spec = pow(max(dot(normal, halfVec), 0.0), 300.0);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);

    // 合成并加暗角、Gamma增强通透感
    vec3 finalCol = mix(bgCol, vec3(0.9, 0.95, 1.0), fresnel * 0.6) + spec * 2.5;
    finalCol *= 1.0 - 0.25 * length(p); // 电影感暗角
    finalCol = pow(finalCol, vec3(0.85)); // 提亮水质

    fragColor = vec4(finalCol, 1.0);
}