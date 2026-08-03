#define res iResolution
#define PI 3.14159

vec3 skyCol = vec3(135.f/255.f, 206.f/255.f, 235.f/255.f);
vec3 oceanColDeep = vec3(6.f/255.f,66.f/255.f,115.f/255.f);
vec3 oceanColShallow = vec3(127.f/255.f,205.f/255.f,1.f);
vec3 sandCol = vec3(203.f/255.f,189.4/255.f,147.f/255.f);
vec3 fieldCol = vec3(176.f/255.f,189.f/255.f,158.f/255.f);
vec3 mountainCol = vec3(129.f/255., 139./255., 153./255.);

float u, v;

// Thank you Inigo Quilez - https://iquilezles.org/articles/distfunctions/
float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

float hash( vec2 p ) {
    p = fract(p * vec2(443.8975, 397.2973));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
}

float heightOnPlanet( vec3 p ) {
    vec3 d = -p;
    u = .5 + (atan(d.z, d.x) / (2. * PI));
    v = .5 + (asin(d.y) / (1.*PI));
    
    u += mod(iTime * 0.05, 1.);
    
    float t = texture(iChannel0, vec2(u, v)).x;
    vec3 t2pre = texture(iChannel1, vec2(u, v)).xyz;
    float t2 = (t2pre.x + t2pre.y + t2pre.z) * .333;
    vec3 t3pre = texture(iChannel2, vec2(u+.5, v+.5)).xyy;
    float t3 = (t3pre.x + t3pre.y + t3pre.z) * .333;
    return t * .5 + t2 * .5 + t3 * .5;
}

vec3 colorOnPlanet( float c ) {
    vec3 col = (c < .35) ? mix(oceanColDeep, oceanColShallow, c * 2.) :
                (c < .41) ? sandCol : 
                (c < .5) ? fieldCol : 
                (c < .7) ? mix(mountainCol, vec3(1.), (c-.49)*3.) : vec3(1.);
    
    return col;
}

void mainImage( out vec4 color, in vec2 coord )
{
    vec2 uv = coord/res.xy;
    vec3 worldPos = vec3(res.x * .5, -res.y * .5, 0.);
    
    float worldSize = res.y;

    vec3 rayPos = vec3(coord.x, coord.y, 100000.) - worldPos;
    vec3 origPos = rayPos;
    
    vec3 rayDir = normalize(vec3(0., 0., 1.));
    
    vec3 col = vec3(0.);
    float epsilon = 1e-2;
    
    float prevDist = 10000000000000.f;
    
    float mHeight = worldSize / 15.;
    
    for (int i = 0; i < 500; i++) {
        float dist = sdSphere(rayPos, worldSize);
        prevDist = (dist < prevDist) ? dist : prevDist;
        
        float c = heightOnPlanet(normalize(rayPos));
        float planetHeight = (c < .35) ? .35 : c;
        
        if (dist <= epsilon + planetHeight * mHeight) {
            col = colorOnPlanet(c);
            color = vec4(col, 1.0);
            return;
        }
        
        rayPos -= (rayDir * dist * .1);
    }
    
    col = mix(vec3(1.), skyCol, prevDist * .04);
    
    float starVal = hash(uv);
    col = (starVal > 0.998) ? vec3(0.95, 0.90, 1.0) : col;
   
    color = vec4(col,1.0);
}