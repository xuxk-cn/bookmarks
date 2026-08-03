/*
    The Lake of Ambjörn (Ambjörn's Reflection)
    
    A cinematic tribute to a summer, inspired by 
    as series of photos by my friend Ambjörn Lindalh's. 
    It captures post-rain sunshine, a glowing 
    horizon, and rainbow reflections across a 90-second camera loop.

    Not using the TinyShade conductor and sequencer in this version
    and there is no birds in the scene :-)
        
*/

float getGrain(vec2 uv, float time) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233)) + time) * 43758.5453) - 0.5;
}

vec4 fxaa(sampler2D tex, vec2 uv, vec2 texelSize) {
    const float span_max = 8.0;
    const float reduce_min = (1.0 / 128.0);
    const float reduce_mul = (1.0 / 32.0);
    const vec3 luma = vec3(0.299, 0.587, 0.114);
    
    vec3 rgbCC = texture(tex, uv).rgb;
    vec3 rgb00 = texture(tex, uv + vec2(-0.5, -0.5) * texelSize).rgb;
    vec3 rgb10 = texture(tex, uv + vec2(+0.5, -0.5) * texelSize).rgb;
    vec3 rgb01 = texture(tex, uv + vec2(-0.5, +0.5) * texelSize).rgb;
    vec3 rgb11 = texture(tex, uv + vec2(+0.5, +0.5) * texelSize).rgb;
    
    float lumaCC = dot(rgbCC, luma);
    float luma00 = dot(rgb00, luma);
    float luma10 = dot(rgb10, luma);
    float luma01 = dot(rgb01, luma);
    float luma11 = dot(rgb11, luma);
    
    vec2 dir;
    dir.x = (luma01 + luma11) - (luma00 + luma10);
    dir.y = (luma00 + luma01) - (luma10 + luma11);
    
    float dirReduce = max((luma00 + luma10 + luma01 + luma11) * reduce_mul, reduce_min);
    float rcpDir = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = clamp(dir * rcpDir, -span_max, span_max) * texelSize;
    
    vec4 sampleA = 0.5 * (
        texture(tex, uv - dir * (1.0 / 6.0)) +
        texture(tex, uv + dir * (1.0 / 6.0))
    );
    vec4 sampleB = sampleA * 0.5 + 0.25 * (
        texture(tex, uv - dir * 0.5) +
        texture(tex, uv + dir * 0.5)
    );
    
    float lumaMin = min(lumaCC, min(min(luma00, luma10), min(luma01, luma11)));
    float lumaMax = max(lumaCC, max(max(luma00, luma10), max(luma01, luma11)));
    float lumaB = dot(sampleB.rgb, luma);
    
    if (lumaB < lumaMin || lumaB > lumaMax) return sampleA;
    else return sampleB;
}


void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 texelSize = 1.0 / iResolution.xy;
    vec2 uv = fragCoord * texelSize;
    
    float targetAspect = 2.35;
    float screenAspect = iResolution.x / iResolution.y;
    float barHeight = max(0.0, (1.0 - (screenAspect / targetAspect)) / 2.0);

    if (uv.y < barHeight || uv.y > 1.0 - barHeight) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return; 
    }

    vec2 vUV = uv - 0.5;
    float distSq = dot(vUV, vUV);

  
    vec3 finalColor = fxaa(iChannel1, uv, texelSize).rgb;

    vec2 caOffset = vUV * 0.012 * distSq; 
    float r = texture(iChannel1, uv - caOffset).r;
    float b = texture(iChannel1, uv + caOffset).b;
    finalColor.r = mix(finalColor.r, r, 0.6);
    finalColor.b = mix(finalColor.b, b, 0.6);

    finalColor = max(finalColor, 0.0);

    finalColor = pow(finalColor, vec3(1.15)); 

    float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(luminance), finalColor, 1.35); 

    finalColor *= vec3(1.05, 0.98, 0.95);

    finalColor = (finalColor * (1.0 + finalColor * 0.05)) / (1.0 + finalColor * 0.2);

    float vignette = smoothstep(1.5, 0.3, length(vUV)); 
    finalColor *= mix(1.0, vignette, 0.35); 
    
    float grain = getGrain(uv, iTime);
    finalColor += grain * 0.035; 

    fragColor = vec4(finalColor, 1.0);
}