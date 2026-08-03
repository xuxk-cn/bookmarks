void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = fragCoord/iResolution.xy;

    vec3 col = texture( iChannel0, p ).xyz;
  //vec3 col = texelFetch( iChannel0, ivec2(fragCoord-0.5), 0 ).xyz;

    col *= 0.5 + 0.5*pow( 16.0*p.x*p.y*(1.0-p.x)*(1.0-p.y), 0.05 );
         
    fragColor = vec4( col, 1.0 );
}
// 1. 噪声与分形函数 (Noise & FBM)
// 用于生成自然的地形高度、树木分布和云层纹理
float hash( float n ) { ... }
float noise( in vec3 x ) { ... }
float fbm( in vec3 p ) { ... }

// 2. 场景符号距离场 (Scene SDF)
// 定义场景中每个点到最近表面的距离。
// 包含地面起伏、程序化生成的树木（通常是圆柱与圆锥的组合）以及云层。
float map( in vec3 p ) {
    // 地面距离场
    float ground = p.y - fbm(p.xz * 0.1); 
    // 树木距离场 (通过空间哈希或网格实例化生成)
    float tree = ...; 
    // 组合场景 (取最小值)
    return min(ground, tree);
}

// 3. 光线步进 (Raymarching)
// 从相机原点 (ro) 沿射线方向 (rd) 步进，直到与场景相交或超出最大距离
float raycast( in vec3 ro, in vec3 rd, out vec4 material ) {
    float t = 0.0;
    for( int i=0; i<MAX_STEPS; i++ ) {
        vec3 p = ro + t * rd;
        float d = map(p);
        if( d < EPSILON || t > MAX_DIST ) break;
        t += d;
    }
    return t;
}

// 4. 法线计算 (Normal Calculation)
// 通过对 map 函数进行中心差分采样来计算表面法线
vec3 calcNormal( in vec3 p ) { ... }

// 5. 主图像函数 (Main Image)
// Shadertoy 的入口点，处理每个像素的颜色计算
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // 归一化像素坐标 (从 -1 到 1)
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // 相机设置 (原点、目标点、构建相机矩阵)
    vec3 ro = ...; // 相机位置 (通常随 iTime 移动)
    vec3 rd = ...; // 射线方向

    // 渲染循环
    vec4 material;
    float t = raycast(ro, rd, material);
    
    if( t < MAX_DIST ) {
        // 计算光照：环境光遮蔽 (AO)、漫反射、高光
        vec3 pos = ro + t * rd;
        vec3 normal = calcNormal(pos);
        vec3 color = shade(pos, normal, rd, material);
        
        // 添加体积雾效 (Fog) 以增强雨林氛围
        color = mix(color, fogColor, 1.0 - exp(-t * fogDensity));
        
        fragColor = vec4(color, 1.0);
    } else {
        // 背景天空颜色
        fragColor = vec4(skyColor, 1.0);
    }
}