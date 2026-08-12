# define res iResolution.xy
# define N normalize
# define PI 3.1415

int Gid;

vec3 camPath() {
    if(length(iMouse.xy) < 0.01) return vec3(0.3,0.5,2);
    
    vec2 m = (iMouse.xy - 0.5 * res) / res.y;
    m = clamp(m, vec2(-1.0, 0.0), vec2(1.0, 0.9)) * 1.5;
    
    float theta = m.x * PI;
    float phi = m.y * PI/2.0;
    vec3 camPos = vec3(
                        cos(phi) * sin(theta) ,
                        sin(phi) + 0.07       ,
                        cos(phi) * cos(theta) );
    
    camPos.x = clamp(camPos.x, -1.0, 1.0);

    return 5.5 * camPos;
}

float map(vec3 p) {
    return p.y - tanh(texture(iChannel0, (p.xz * 35.0 + res * 0.5) / res).y * 2.0) * 0.1;
}

vec3 getNormal(vec3 p) {
    float e = 0.07;
    float d = map(p);
    return N(vec3( d - map(p + vec3(e,0,0)),
                   d - map(p + vec3(0,e,0)),
                   d - map(p + vec3(0,0,e))  ) / -e);
}

// Raymarching !
vec2 rmf(vec3 ro, vec3 rd) {
    float td = 0.0;
    bool hit = false;
    for(int i = 0; i < 350; i++) {
        float d = map(ro + rd * td);
        
        if(d < 0.0001) { hit = true; break; }
        
        td += d * 0.9;
        if(td > 50.0) { td = 50.0; break; }
    }
    
    return vec2(hit, td);
}

void mainImage( out vec4 O, in vec2 I )
{
    vec2 p = (I - 0.5 * res) / res.y;
    
    vec3 co = camPath();
    vec3 cd = N(-co);
    
    vec3 cr = N(vec3(-cd.z, 0, cd.x)), cu = cross(cr, cd); float ta = tan(0.78 * 0.5);
    vec3 ro = co;
    vec3 rd = N(cd + ta * (p.x * cr + p.y * cu));
    
    vec2 rm = rmf(ro, rd); float td = rm.y; bool hit = rm.x > 0.5; int i = Gid;
    
    vec3 col;
    
    if(hit) {
        // Geometry
        vec3 hitPoint = ro + rd * td;
        vec3 normal = getNormal(hitPoint);
        
        vec3 lightDir = N(vec3(1));
        vec2 srm = rmf(hitPoint + 0.001 * normal, lightDir);

        vec3 light = texture(iChannel2, reflect(rd, normal)).xyz * 0.3 +
                     texture(iChannel1, normal).xyz * 0.7; light;
        
        vec3 color;
        color = vec3(0.9,0.5,0.4);
        col = color * light;
    }
    else {
        col = vec3(1);
    }
    
    O = vec4(col, 1);
}