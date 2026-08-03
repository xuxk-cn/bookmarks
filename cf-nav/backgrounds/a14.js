//------SCENE--------------------------------------------------
vec4 scene( in vec3 p, in float dist )
{
    vec4 d = vec4(0.0);
    d.x = 1e10;

    float noise = sin(p.x*5.0+iTime)*sin(p.z*3.0+iTime)*0.1+
    sin(-p.x*4.0+iTime*2.0)*sin(p.z*7.0-iTime*4.2)*0.05+
    sin(-p.x*13.0+iTime*3.0)*sin(p.z*17.0-iTime*3.2)*0.0125;
    d.x = d_roundBox(p+vec3(0.0,4.0,0.0), vec3(47.0,2.0,5.6), 0.01);
    d.x = max(d.x,-d_roundBox(p+vec3(0.0,2.0,0.0), vec3(46.1,1.9,5.5), 0.01));
    d.x += pNoise31i(p*5.0, 374.324, 3.0, 0.6, 1.8)*0.005;
    d.x *= 0.99;
    d.y = 1.0;
    
    d = min_(
        d,
        vec4(
            abs(d_roundBox(p+vec3(0.0,6.4,0.0), vec3(49.0,4.01,6.0), 0.02)+
            noise*0.05),
            2.0,0.0,0.0
        )
    );
    d.x *= 0.95;
    return d;
}
vec3 normal( vec3 p )
{
    vec3 e; vec4 f;
    for( int i=0, j=4; i<4; i++, j/=2)
    {
        e = vec3(j&1,(j&2)>>1,(j&4)>>2)*MarchNormalPrecision;
        f[i] = scene(p+e,0.0).x;
    }
    return normalize(vec3(f[2]-f[3],f[1]-f[3],f[0]-f[3]));
}
vec3 marching( in vec3 pos, in vec3 dir, out float d, out bool r, out float steps, out float dd, out float closest )
{
    float track, depth;
    closest = MarchMaxDistance;
    dd = 0.0;
    r = true;
    vec3 p=pos;
    vec4 s;
    d = s.x;
    steps = 0.0;
    for(int i=1; i<=MarchSteps; i++){
        s = scene(p, dd);
        d = s.x;
        closest = min(closest, d);
        if(abs(d) <= MarchThreshold){
            r = true;
            return p;
        }
        if(dd >= MarchInfinity){
            r = false;
            return p;
        }
        d;
        p += dir*d;
        dd += d;
        steps++;
        if(dd>=MarchMaxDistance){
            r = false;
            return p;
        }
    }
    r = false;
    return p;
}

//===================MICE ACCESS===============================
vec2 getMice()
{
    if(iMouse.xy==vec2(0.0)) return vec2(0.175,0.0);
    return vec2(iMouse.x/iResolution.x-.5,iMouse.y/iResolution.y-.5);
}
//=============================================================

vec3 getFar( vec3 lookAtvector, samplerCube map )
{   
    return tan(texture(map, lookAtvector).rgb*3.141592654*0.47);
}

vec3 textured(vec3 p){
    vec3 c = vec3(0.0);
    vec3 c1 = vec3(0.501960784, 0.478431373, 0.478431373)*1.55;
    vec3 c2 = vec3(0.321568627, 0.298039216, 0.298039216)*2.15;
    c = mix(c1, c2, pNoise31i(p*10.0, 34.34, 5.0, 0.9, 1.3));
    if(p.y<-2.3){
        if(mod(floor(p.x*5.0)+floor(p.y*5.0-0.5)+floor(p.z*5.0),2.0)==0.0){
            c = vec3(0.5,0.8,0.9);
        }else{
            c = vec3(0.95,0.95,0.95);
        }
        if(mod(p.x*5.0, 1.0)<0.1 || mod(p.y*5.0-0.5, 1.0)<0.1 || mod(p.z*5.0, 1.0)<0.1){
            c = vec3(0.3,0.5,0.7);
        }
    }
    mat4 mosaic = mat4(
        1.0,1.0,1.0,0.0,
        1.0,0.0,1.0,0.0,
        1.0,0.0,0.0,0.0,
        1.0,1.0,1.0,1.0
    );
    if(p.y> -2.3 && p.y< -2.001){
        vec3 pp = p+2.0;
        pp *= 13.0;
        pp = mod(floor(pp), vec3(4.0));
        if(mosaic[3-int(pp.y)][3-int(pp.x)]==0.0){
            c = vec3(1.0);
        }else{
            c = vec3(0.3,0.5,0.7);
        }
    }
    return c;
}

vec3 frameSubProcessing( vec2 uv ){
    vec2 mice = getMice();
    vec3 v, n, p, c = vec3(0.0);
    float d = 3.0, r = 3.0, far, w;
    cam.zoom = CameraZoom;
    cam.up = vec3(0.0,1.0,0.0);
    cam.target = vec3(0.0,0.0,0.0);
    cam.position = vec3(0.0,0.0,-0.01);
    cam.position.yz = rotMatx2(mice.y*miceFactor.y)*cam.position.yz;
    cam.position.xz = rotMatx2(mice.x*miceFactor.x)*cam.position.xz;
    
    v = uvToSpace(cam, uv);
    c = getFar(v, iChannel0);
    
    bool reached;
    float steps, dist, pathLen, closest;
    
 // in vec3 pos, in vec3 dir, out float d, out bool r, out float steps, out float dd, out float closest     
    p = marching(cam.position, v, dist, reached, steps, pathLen, closest);
    if(reached){
        float sl = 1.8;
        n = normal(p);

        c *= smoothstep(32.0, 0.0, abs(p.z-1.0));
        float obj = scene(p, 0.0).y;
        if(obj==1.0){
            c = textured(p);
            c *= lightness (n, vec3(0.0, -1.0, 0.0), 1.1);
            c *= sl;
        }
        if(obj==2.0){
            float f = fresnel(v, n, 1.0, 1.33);
            vec3 refl = getFar(reflect(v,n), iChannel0);
            v = refract_(v, n, 1.0, 1.33);
            p = marching(p-n*0.01, v, dist, reached, steps, pathLen, closest);
            if(reached){
                n = normal(p);
                obj = scene(p, 0.0).y;
                c = textured(p)*lightness (n, vec3(0.0, -1.0, 0.0), 1.7)*0.9;
                vec3 wc = vec3(0.972,0.978,0.976);
                c *= exp(-pathLen*(vec3(1.0)-wc)*9.5);
            }
            c *= sl;
            c = mix(c, refl, f);
        }
        c *= smoothstep(29.0,0.0,abs(p.z-1.0));
    }
    
    
    float g = 1.35;
    c = 1.0-exp(-c*0.75);
    c = pow(c,vec3(g));
    return c;
}

vec3 frameProcessing( vec2 uv ){
    vec3 c = vec3(0.0);
    vec4 data;
    float delta = 1.0/(AA+1.0), pixSize = 1.0/iResolution.x;
    vec2 rand;
    delta *= pixSize;
    float dx, dy;

    dy = 0.0;
    for(float y=0.0; y<AA; y++){
        dy += delta;
        dx = 0.0;
        for(float x=0.0; x<AA; x++){
            dx += delta;
            rand = AAjitterFactor*(hash33(vec3(uv+vec2(dx,dy), iTime*45.1541),789.457).xy-0.5)*pixSize*2.0;
            c += frameSubProcessing(uv+vec2(dx,dy)+rand);
        }
    }
    return c/float(AA*AA);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = translateCoo(fragCoord, iResolution);
    vec3 c;
    c = frameProcessing(uv);
    fragColor = vec4(c,1.0);
}