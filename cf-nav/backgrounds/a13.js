#define TAU 6.28318530718
#define BPM 72.0
#define BPS (BPM/60.0)
#define LOOP_BEATS 24.0
#define LOOP_SECONDS (LOOP_BEATS/BPS)

float hash21(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3,p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

float noise21(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
        mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),
        mix(hash21(i+vec2(0.0,1.0)),hash21(i+1.0),f.x),
        f.y
    );
}

float fbm(vec2 p)
{
    float value = 0.0;
    float amplitude = 0.52;
    mat2 octave = mat2(1.72,1.18,-1.18,1.72);
    for(int i=0;i<5;i++)
    {
        value += amplitude*noise21(p);
        p = octave*p+5.7;
        amplitude *= 0.48;
    }
    return value;
}

mat2 rotate2D(float a)
{
    float c = cos(a);
    float s = sin(a);
    return mat2(c,-s,s,c);
}

// R = rest, H = hold. This is identical to the monophonic Sound pass.
float melodyCell(int index)
{
    const float R = -1.0;
    const float H = -2.0;
    float notes[48] = float[48](
        62.0,H,H, 64.0,H,66.0,
        69.0,H,H, 66.0,H,R,
        64.0,H,66.0, 69.0,H,71.0,
        69.0,H,H, 66.0,H,H,
        74.0,H,H, 71.0,H,69.0,
        66.0,H,69.0, 71.0,H,74.0,
        76.0,H,74.0, 71.0,H,69.0,
        66.0,H,64.0, 62.0,H,R
    );
    return notes[index];
}

vec3 ACESFilm(vec3 x)
{
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
}

vec3 starLayer(
    vec2 p,
    float scale,
    float seed,
    float density,
    float time
)
{
    vec2 grid = p*scale;
    vec2 cell = floor(grid);
    vec2 local = fract(grid)-0.5;

    float starHash = hash21(cell+seed);
    vec2 jitter = vec2(
        hash21(cell+seed+vec2(7.1,3.7)),
        hash21(cell+seed+vec2(2.4,9.3))
    )-0.5;
    local -= jitter*0.66;

    float exists = step(density,starHash);
    float size = mix(0.018,0.055,pow(starHash,10.0));
    float distanceToStar = length(local);
    float aa = max(fwidth(distanceToStar)*1.35,0.003);
    float core = 1.0-smoothstep(size,size+aa,distanceToStar);
    float glow = exp(-52.0*distanceToStar*distanceToStar)
        *pow(starHash,18.0);

    // A narrow peak and a unique phase keep the background stars independent.
    float twinkle = pow(
        0.5+0.5*sin(
            time*(0.48+1.21*starHash)+starHash*TAU+seed
        ),
        22.0
    );

    vec3 idleColor = mix(
        vec3(0.72,0.82,1.0),
        vec3(1.0,0.78,0.55),
        hash21(cell+seed+41.0)
    );

    float hero = pow(starHash,42.0);
    float rays = (
        exp(-90.0*abs(local.x))
        +exp(-90.0*abs(local.y))
    )*exp(-10.0*distanceToStar)*hero;

    return exists*idleColor*(
        core*(0.15+0.43*twinkle)
        +glow*(0.018+0.035*twinkle)
        +rays*0.030
    );
}

// Each real melody onset creates exactly one small star. It fades before
// the next note chooses a new procedural position.
vec3 melodySparkle(
    vec2 p,
    float pitchT,
    float notePhase,
    float noteOnset,
    float noteSeed
)
{
    // The visual uses the exact same 48-cell index as the Sound shader:
    // one procedural star for one real note onset, never extra subdivisions.
    float seed = noteSeed*19.17;

    vec2 randomPosition = vec2(
        hash21(vec2(seed,1.7)),
        hash21(vec2(seed,8.3))
    );
    vec2 center = vec2(
        mix(-0.55,0.55,pitchT)+(randomPosition.x-0.5)*0.28,
        mix(-0.38,0.38,randomPosition.y)
    );

    vec2 delta = p-center;
    float distanceToStar = length(delta);

    // A tiny one-to-two-pixel point with only a restrained soft halo.
    float radius = mix(
        0.0008,0.0017,
        hash21(vec2(seed,15.4))
    );
    float aa = max(fwidth(distanceToStar)*1.10,0.00055);
    float core = 1.0-smoothstep(radius,radius+aa,distanceToStar);
    float glow = exp(-14000.0*distanceToStar*distanceToStar);

    // Fast attack and gentle decay follow the audible note envelope.
    float envelope = noteOnset
        *smoothstep(0.0,0.070,notePhase)
        *exp(-4.2*notePhase);

    vec3 noteColor = mix(
        vec3(1.10,0.58,0.28),
        vec3(0.45,0.78,1.20),
        pitchT
    );
    return noteColor*envelope*(
        core*1.05+glow*0.11
    );
}

void mainImage(out vec4 fragColor,in vec2 fragCoord)
{
    vec2 uv = fragCoord/iResolution.xy;
    float aspect = iResolution.x/iResolution.y;
    vec2 p = (uv-0.5)*vec2(aspect,1.0);

    float loopT = mod(iTime,LOOP_SECONDS);
    float eighth = loopT*BPS*2.0;
    int stepIndex = int(floor(eighth))%48;
    float notePhase = fract(eighth);
    float currentCell = melodyCell(stepIndex);
    float noteOnset = step(0.0,currentCell);
    float pitchT = clamp((currentCell-62.0)/14.0,0.0,1.0);

    // A deep indigo-to-violet sky, with no horizon or ground plane.
    vec3 lowerSky = vec3(0.018,0.008,0.060);
    vec3 upperSky = vec3(0.002,0.006,0.028);
    vec3 col = mix(lowerSky,upperSky,smoothstep(0.0,1.0,uv.y));

    // A broad, slowly drifting Milky Way made only from procedural noise.
    vec2 nebulaP = rotate2D(-0.47)*p;
    nebulaP += vec2(iTime*0.003,-iTime*0.001);
    float bend = 0.10*sin(nebulaP.x*1.35-0.7);
    float bandDistance = abs(nebulaP.y+bend);
    float band = exp(-3.6*bandDistance*bandDistance);
    float largeCloud = fbm(nebulaP*1.55+4.1);
    float fineCloud = fbm(nebulaP*3.8-7.3);
    float nebula = band*smoothstep(
        0.29,0.82,largeCloud*0.68+fineCloud*0.42
    );

    float colorNoise = fbm(nebulaP*1.18+12.0);
    vec3 nebulaColor = mix(
        vec3(0.18,0.07,0.34),
        vec3(0.05,0.24,0.46),
        colorNoise
    );
    col += nebulaColor*nebula*0.70;

    // Dark dust gives the Milky Way depth instead of a flat cloudy stripe.
    float dust = band*smoothstep(0.52,0.78,fbm(nebulaP*5.2+2.0));
    col *= 1.0-0.34*dust;


    // Two quiet background grids create depth without synchronized flashes.
    col += starLayer(p,43.0,3.7,0.895,iTime);
    col += starLayer(p,91.0,17.2,0.967,iTime*1.07)*0.72;

    // The melody adds one clearly separated sparkle at a time.
    col += melodySparkle(
        p,pitchT,notePhase,noteOnset,float(stepIndex)
    );

    // Tiny unresolved stellar dust inside the galactic band.
    vec2 dustGrid = floor((p+0.003*iTime)*260.0);
    float dustHash = hash21(dustGrid+63.0);
    float stellarDust = step(0.992,dustHash)*band
        *(0.35+0.65*pow(dustHash,24.0));
    col += vec3(0.50,0.66,1.0)*stellarDust*0.38;

    // Subtle film grain keeps the dark gradients from looking synthetic.
    float grain = hash21(fragCoord+fract(iTime)*173.1)-0.5;
    col += grain*0.010;

    float vignette = uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
    vignette = pow(clamp(16.0*vignette,0.0,1.0),0.18);
    col *= mix(0.60,1.0,vignette);

    col = ACESFilm(max(col,0.0));
    col = pow(col,vec3(1.0/2.2));
    fragColor = vec4(col,1.0);
}




