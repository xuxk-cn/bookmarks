/*
    yasinxdxd
*/

#define NUM_PARTICLES 20.
#define NUM_FIREWORKS 20.

float sample_at(float f) {
    return texture(iChannel0, vec2(f / 16.0, 0.)).x;
}

float sample_multiple(float f) {
    float delta = .1;
    return 0.2 * (sample_at(f - 2. * delta) + sample_at(f - delta) + sample_at(f) + sample_at(f + delta) + sample_at(f + 2. * delta));
}

float hash11(float t) {
    float y = fract(sin(t*6420.) + 15460.);
    return y;
}

vec2 hash12(float t) {
    float x = fract(sin(t*64878.) + 37955.);
    float y = fract(sin(t+x*466420.) + 95460.);
    return vec2(x, y);
}

vec3 explode(vec2 uv, float t, vec2 pos, vec2 dir) {
    float ft = fract(t);
    float ft0 = fract(t)*ft;
    vec3 col = vec3(0.);
    for (float i = 1.; i <= NUM_PARTICLES; i++) {
        vec2 p = hash12(1. + i) - 0.5 + dir;
        p = normalize(p)*i/10.;
        float d = length(uv - p*ft0 - pos);
        float c = (1.-ft*exp(ft)+i/50.);
        float brightness = 0.0005*c;
        if (sin(t) > 0.8) {
            brightness += sin(t*(30. + hash11(i)*10.)) * 0.001;
        }
        else if (sin(t) > -0.5) {
            brightness += sin(t*(30. + hash11(i)*10.)) * 0.0005 + dir.x*0.001;
        }
        col += vec3(brightness/d)*(vec3(uv, 0.)*0.4 + 0.6);
    }
    return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord.xy / iResolution.xy * 2. - 1.;
    uv.x *= iResolution.x / iResolution.y;

    float t = iTime;
    vec3 col = vec3(0.);    
    
    bool isMouseDown = iMouse.z > 0.;
    vec2 m = (iMouse.xy / iResolution.xy * 2. - 1.);
    m.x *= iResolution.x / iResolution.y;

    
    //col += explode(uv, t, m);

    for (float i = 1.; i <= NUM_FIREWORKS; i++) {
        vec2 p = hash12(-0.5 + i)-0.5;
        p = p*2.*i/12.;
        
        float amplitudex = sample_multiple(p.x + i*2.)*10.;
        float amplitudey = sample_multiple(p.y + i*2.)*10.;
        vec2 dir = vec2(sin(amplitudex), cos(amplitudey));
        
        col += explode(uv, fract(t)+i*3.14, p+dir*0.1, dir);
        // col += vec3(dir*0.01, 0.0);
    }    
    
    fragColor = vec4(col, 1.);
    fragColor = clamp(fragColor, vec4(0.05), vec4(1.0));
}