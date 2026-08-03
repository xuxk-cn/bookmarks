/*

    golden helix ribbon sculpture
    -----------------------------

    - raymarched ribbon swept along an analytic, tapering spiral
    - rounded thick golden band on a marble plinth
    - PBR-ish gold material, soft shadows, AO, studio env lighting
    - auto orbit camera + mouse drag orbit

    mouse:
      hold + drag = rotate camera ( mouse up = also zoom )


    optimizations:

      - ground plane intersected analytically instead of marched
      - march, AO and shadows restricted to a bounding sphere
      - shadow rays skipped on faces the light cannot reach
      - shadow march exits early once it is effectively black
      - AO skipped on floor pixels no geometry can reach
      - adaptive anti-aliasing, switchable (AAA_ENABLE)

*/

const float tau  = atan( 1. )*8.;
const float pi   = tau/2.;
const float tauq = tau/4.;

#define ZERO ( min( iFrame, 0 ) )

// ------------------------------------------------------------
// QUALITY
// ------------------------------------------------------------
#define MAX_STEPS       128
#define MAX_DIST        13.5
#define SURF_EPS        0.00075

#define SHADOW_STEPS      70
#define SHADOW_STEP_SCALE 0.45
#define SHADOW_STEP_MAX   0.30
#define SHADOW_SOFT     1.0     // >1 softer and wider, <1 tighter and darker
#define SCENE_BOUND     2.9     // sphere holding sculpture + plinth (not the floor)
#define AO_FLOOR_R      1.6     // beyond this radius nothing can occlude the floor

// Adaptive anti-aliasing ( Fabrice Neyret's method ).
#define AAA_ENABLE      1       // 0 = one sample per pixel, no AA
#define AAA_GRID        2       // AAA_GRID^2 samples on pixels that need it
// 0.07 covers every silhouette edge; below ~0.04 the marble grain starts being
// supersampled too, which costs a lot for very little.
#define AAA_THRESHOLD   0.055    // lower = more pixels judged to be edges
#define AAA_DEBUG       0       // 1 = tint the supersampled pixels red
// Camera rays graze the thin band almost edge-on from steep angles. At 0.8 the
// march slips through it there and the upper coils break into fragments; 0.45
// holds together and is not slower -- a ray that leaks carries on through the
// whole scene instead of stopping at the hit, so the overshoot costs steps too.
#define STEP_SCALE      0.85

// One refinement is enough if any...
#define NEWTON_ITER     0

// The ground has no far edge, so it dissolves into the backdrop before
// MAX_DIST instead of ending on a hard line. Must complete before MAX_DIST.
#define GROUND_FADE_NEAR 8.5
#define GROUND_FADE_FAR  13.5

// Dragging above the middle of the screen pulls the camera in, continuously.
// The tip leaves the frame on the way in -- that is intended, the close view is
// meant to be a close view. Below about 0.35 the camera enters SCENE_BOUND
// itself; the march handles that, but the framing gets wild.
#define ZOOM_NEAR        0.45   // distance at the top, as a fraction of default

// ------------------------------------------------------------
// HELIX / RIBBON SHAPE
// ------------------------------------------------------------
#define HELIX_TURNS      4.0
#define HELIX_H          4.0
#define HELIX_Y0        -2.24
#define HELIX_PHASE     -1.25

// Radius profile of the spiral, as a function of the curve parameter only.
// Making it depend on the *curve* (and not, as before, on the query point)
// is what keeps the upper coils calm instead of flaring back out.
// HELIX_R_MAX is the span at the belly. FOOT and TIP are fractions of it and
// are set so those two ends keep their absolute radius when MAX changes.
// The outer edge of the band sits at HELIX_R_MAX + RIBBON_HALF_T; past
// PLINTH_R the belly overhangs the plinth, which is intended here.
#define HELIX_R_MAX      1.13
#define HELIX_R_FOOT     0.21   // fraction of max where the band leaves the plinth
#define HELIX_R_BELLY    0.30   // curve parameter of the widest point, in [0,1]
#define HELIX_R_TIP      0.40   // fraction of max at the very top

// The band is a flat strip. HALF_W is its height seen from the side (the
// visible face), HALF_T the sheet thickness from the inside out. The strip is
// tallest at mid sculpture and narrows to RIBBON_END_W at both tips.
#define RIBBON_HALF_L    0.032  // tangential half length of the swept slice
#define RIBBON_HALF_W    0.24   // half band height at mid sculpture
#define RIBBON_END_W     0.22   // fraction of that height left at the tips
#define RIBBON_HALF_T    0.042
#define RIBBON_ROUND     0.027
#define RIBBON_TIP_ROUND 0.040  // corner rounding at the ends; <= RIBBON_HALF_T
#define RIBBON_TAPER_LEN 0.40   // how far the end taper reaches, in curve fraction

const float HELIX_TOTAL = tau * HELIX_TURNS;
const float HELIX_PITCH = HELIX_H / (tau * HELIX_TURNS);

// ------------------------------------------------------------
// MATERIAL OPTIONS
// ------------------------------------------------------------
// Plinth material -- both variants are fully procedural, no channels needed:
//   0 = dark stone with warm veins
//   1 = bright veined marble, vein maths after Shane's "Extruded Packed
//       Circle Zoom", itself reworked from Belfry's "Marmot"
//       (shadertoy.com/view/3sfXzB)
#define MARBLE_VARIANT   1

// Larger SCALE = finer, busier veining.
#define MARBLE_SCALE     66.5   // vein density on the plinth (variant 1)
#define MARBLE_SHARP     8.0    // vein contrast; lower = wider, darker veins
#define MARBLE_GRAIN     9.0    // frequency of the fine surface grain

// Variant 1 colours: a bright polished field with dark veins running through
// it -- the vein routine returns ~1 across the field and dips at the veins.
const vec3 MARBLE_VEIN = vec3(0.085, 0.080, 0.076);
const vec3 MARBLE_BASE = vec3(0.95, 0.93, 0.88);

// ------------------------------------------------------------
// CUBEMAP REFLECTION  --  iChannel0
// ------------------------------------------------------------
// The gold already had a procedural studio environment (envColor). This keeps
// it as the base tone and blends the cubemap in on top, so the piece stays lit
// the way it was and only gains the reflected surroundings. Set ENV_MIX to 1
// for a pure cubemap reflection, or ENV_CUBEMAP 0 to go back to v3 exactly.
#define ENV_CUBEMAP     1       // 0 = procedural environment only, no channel
#define ENV_MIX         0.45    // share of the reflection taken from iChannel0
#define ENV_GAIN        1.10    // brightness of the cubemap contribution
#define ENV_LOD_BASE    0.0     // blur floor; see the note in envReflection()
#define ENV_LOD_ROUGH   3.0     // extra blur, scaled by surface roughness

// ------------------------------------------------------------
// SCENE LAYOUT
// ------------------------------------------------------------
#define FLOOR_Y         -2.48
#define PLINTH_Y        -2.245
#define PLINTH_HALF_H    0.225
#define PLINTH_R         0.900
#define DISK_Y          -1.975

// Studio key / fill light, shared by every material so the shadows agree.
// The key light is the one that casts the visible shadow. Pushing it sideways
// (larger |X|) and lower (smaller Y) throws the shadow further across the floor
// to the right instead of behind the piece, where the plinth hides it. Z is how
// far in front it stands; less of it also moves the shadow out of hiding.
#define KEY_LIGHT_X     -4.60
#define KEY_LIGHT_Y      3.60
// Z is the one that matters for how much shadow you see. The camera sits on
// +Z, so a light in front of the piece throws the shadow away from the viewer,
// where the plinth hides it. Bringing the light back past zero swings the
// shadow forward-right into view; much below -2 and the front goes backlit.
#define KEY_LIGHT_Z     -1.00

const vec3 KEY_LIGHT_POS  = vec3(KEY_LIGHT_X, KEY_LIGHT_Y, KEY_LIGHT_Z);
const vec3 FILL_LIGHT_POS = vec3( 3.80, 2.40, -3.30);

// ------------------------------------------------------------
// TURNTABLE
// ------------------------------------------------------------
// 0 = the CAMERA orbits the scene. Lights, cubemap and floor stand still and
//     you walk around the piece. The lit side turns away as you go.
// 1 = the OBJECT turns and the camera stands still, like a display turntable.
//     Lighting and framing stay put, the form rotates through them: the shadow
//     keeps its direction on screen and only changes shape, and the reflection
//     slides along the band instead of sitting still on it.
//
// Rotating the object is the same thing as rotating everything else the other
// way, so the SDF is never touched: the march stays in object space, and the
// lights, the environment and the backdrop are converted per pixel instead.
// That is three vector rotations, not one per distance sample.
//
// The one rule either mode has to obey: lights and environment belong to the
// ROOM. Let them rotate with the object and the reflection freezes onto the
// gold (which then reads as painted-on) and the shadow follows the object
// around like it is glued to it.
#define TURNTABLE       1

// Yaw the world has to be turned by to get into object space. Zero in orbit
// mode, so every conversion below folds away at compile time.
float gYaw = 0.0;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
float sat(float x) { return clamp(x, 0.0, 1.0); }

vec3 rotY(vec3 p, float a)
{
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

// world -> object (lights, and anything else the room owns)
vec3 toObject(vec3 v) { return rotY(v,  gYaw); }

// object -> world (reflection and view directions, before hitting the room)
vec3 toWorld(vec3 v)  { return rotY(v, -gYaw); }

float hash13(vec3 p3)
{
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Not called noise3: noise1..noise4 are built-in names in desktop GLSL, and
// redeclaring one with a different return type fails to compile there.
float valueNoise(vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash13(i + vec3(0,0,0));
    float n100 = hash13(i + vec3(1,0,0));
    float n010 = hash13(i + vec3(0,1,0));
    float n110 = hash13(i + vec3(1,1,0));
    float n001 = hash13(i + vec3(0,0,1));
    float n101 = hash13(i + vec3(1,0,1));
    float n011 = hash13(i + vec3(0,1,1));
    float n111 = hash13(i + vec3(1,1,1));

    float x00 = mix(n000, n100, f.x);
    float x10 = mix(n010, n110, f.x);
    float x01 = mix(n001, n101, f.x);
    float x11 = mix(n011, n111, f.x);

    float y0 = mix(x00, x10, f.y);
    float y1 = mix(x01, x11, f.y);

    return mix(y0, y1, f.z);
}

float fbm(vec3 p)
{
    float a = 0.5;
    float f = 0.0;

    for (int i = ZERO; i < 5; i++)
    {
        f += a * valueNoise(p);
        p = p * 2.03 + 17.17;
        a *= 0.5;
    }

    return f;
}

#if MARBLE_VARIANT == 1
// Bright marble, vein maths from Shane's "Extruded Packed Circle Zoom"

// Four independent noise values per lattice point (Dave Hoskins style hash).
vec4 hash43(vec3 p)
{
    vec4 p4 = fract(vec4(p.xyzx) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec4 valueNoise4(vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    vec4 x00 = mix(hash43(i + vec3(0,0,0)), hash43(i + vec3(1,0,0)), f.x);
    vec4 x10 = mix(hash43(i + vec3(0,1,0)), hash43(i + vec3(1,1,0)), f.x);
    vec4 x01 = mix(hash43(i + vec3(0,0,1)), hash43(i + vec3(1,0,1)), f.x);
    vec4 x11 = mix(hash43(i + vec3(0,1,1)), hash43(i + vec3(1,1,1)), f.x);

    return mix(mix(x00, x10, f.y), mix(x01, x11, f.y), f.z);
}

// Five octaves, amplitude growing as frequency drops -- as in the source.
vec4 marbleFbm(vec3 p)
{
    vec4 n = vec4(0.0);
    float a = 1.0;
    float t = 0.0;

    for (int i = ZERO; i < 5; i++)
    {
        n += valueNoise4(p / a) * a;
        t += a;
        a *= 2.0;
    }

    return n / t;
}

// Veins from the difference of two channel pairs, screen-blended and sharpened.
// Returns ~1 over most of the surface and drops towards 0 along the veins,
// i.e. bright stone with dark veining.
float marbleVein(vec3 p)
{
    vec4 n = marbleFbm(vec3(1.0, 1.5, 1.0) * p / 3.0);

    vec2 m = pow(abs(vec2(n.x - n.z, n.y - n.w)) * 3.0, vec2(0.15));

    float c = m.x + m.y - m.x * m.y;                    // Photoshop "screen"
    return pow(max(c * 0.9 + 0.1, 0.0), MARBLE_SHARP);  // sharpen into veins
}

// Fine grain: the source drove this from a second stone texture. One octave of
// the same noise stands in for it.
float marbleGrain(vec3 p)
{
    return valueNoise4(p).x;
}
#endif

// smoothstep together with its derivative, packed as (value, d/dx)
vec2 sstepD(float e0, float e1, float x)
{
    float k = 1.0 / (e1 - e0);
    float t = sat((x - e0) * k);
    return vec2(t * t * (3.0 - 2.0 * t), 6.0 * t * (1.0 - t) * k);
}

float sdRoundBox(vec3 p, vec3 b, float r)
{
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdCappedCylinder(vec3 p, float h, float r)
{
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdRoundedCylinder(vec3 p, float h, float r, float rr)
{
    return sdCappedCylinder(p, h - rr, r - rr) - rr;
}

vec2 opU(vec2 a, vec2 b)
{
    return (a.x < b.x) ? a : b;
}

// ------------------------------------------------------------
// HELIX RIBBON SDF
// ------------------------------------------------------------

// Spiral radius and d(radius)/du for the normalised curve parameter u.
// Opens out of the plinth, widest at HELIX_R_BELLY, then tapers to the tip.
vec2 helixRadius(float u)
{
    vec2 open  = sstepD(0.0, HELIX_R_BELLY, u);
    vec2 close = sstepD(HELIX_R_BELLY, 1.0, u);

    float a = mix(HELIX_R_FOOT, 1.0, open.x);
    float b = mix(1.0, HELIX_R_TIP, close.x);

    float da = (1.0 - HELIX_R_FOOT) * open.y;
    float db = (HELIX_R_TIP - 1.0) * close.y;

    return HELIX_R_MAX * vec2(a * b, da * b + a * db);
}

// Curve point, tangent and curvature term at parameter th.
// d2 drops the d2r/dth2 term; it only feeds the Newton denominator.
void helixAt(float th, out vec3 c, out vec3 d1, out vec3 d2)
{
    float a  = th + HELIX_PHASE;
    float ca = cos(a);
    float sa = sin(a);

    vec2  rr = helixRadius(th / HELIX_TOTAL);
    float r  = rr.x;
    float dr = rr.y / HELIX_TOTAL;              // dr/dth

    c  = vec3(r * ca, HELIX_Y0 + HELIX_PITCH * th, r * sa);
    d1 = vec3(dr * ca - r * sa, HELIX_PITCH, dr * sa + r * ca);
    d2 = vec3(-r * ca - 2.0 * dr * sa, 0.0, -r * sa + 2.0 * dr * ca);
}

// Rounded rectangular band swept along the spiral, tapered at both ends.
// Newton-refines the nearest curve parameter, then measures a rounded box
// in the local frame.
float helixBandDistance(vec3 p, float th)
{
    vec3 c, d1, d2;

    for (int i = 0; i < NEWTON_ITER; i++)
    {
        helixAt(th, c, d1, d2);

        float g  = dot(c - p, d1);
        float gp = dot(d1, d1) + dot(c - p, d2);

        th = clamp(th - g / max(abs(gp), 0.0001), 0.0, HELIX_TOTAL);
    }

    helixAt(th, c, d1, d2);

    vec3  d = p - c;
    float a = th + HELIX_PHASE;

    // Orthonormal frame: along the curve, across the band, through the band.
    vec3 T = normalize(d1);
    vec3 W = normalize(cross(vec3(cos(a), 0.0, sin(a)), T));
    vec3 N = cross(T, W);

    vec3 q = vec3(dot(d, T), dot(d, W), dot(d, N));

    // Soft taper from both ends: the band narrows and thins towards the tips.
    float u = th / HELIX_TOTAL;

    float taper = smoothstep(0.0, RIBBON_TAPER_LEN, u) *
                  smoothstep(0.0, RIBBON_TAPER_LEN, 1.0 - u);

    // Tip stays a slim blade rather than thinning out into a wire. Do not push
    // the thickness much below this: once the tip gets thinner than a couple
    // of march steps, rays start slipping through it and the edge breaks up.
    float widthScale = mix(RIBBON_END_W, 1.0, taper);
    float thickScale = mix(0.80, 1.0, taper);

    // Scaling the local space (not just the box extents) is what makes the
    // taper actually readable on screen.
    vec3 qs = vec3(q.x, q.y / widthScale, q.z / thickScale);

    // Rounding grows towards the ends. Since the box extents are reduced by rr,
    // the band keeps its size and only its corners and end cap get rounder --
    // the tip finishes as a dome rather than a flat cut.
    float rr = mix(RIBBON_TIP_ROUND, RIBBON_ROUND, taper);

    float dBox = sdRoundBox(
        qs,
        vec3(RIBBON_HALF_L, RIBBON_HALF_W - rr, RIBBON_HALF_T - rr),
        rr
    );

    // Undo the local stretch conservatively so the march stays stable.
    dBox *= min(widthScale, thickScale);

    // The ends need no extra treatment: th is clamped to the curve, so the
    // slice box runs out on its own and RIBBON_ROUND caps it. An earlier
    // version eroded the last few percent to soften that cut, which sharpened
    // the tip to a foil and made it break up under the march -- do not do that.
    return dBox;
}

// Picks the turn of the spiral nearest to p and measures the band there.
// Both neighbouring turns are evaluated: the turn index comes from a floor(),
// and that is a hard discontinuity in space. Taking only the rounded-to turn
// makes the field jump wherever the choice flips, which Newton cannot repair
// (it only refines within a turn) and which the shadow penumbra estimate
// amplifies into speckle. Evaluating both and taking the min is continuous.
float sdHelixRibbon(vec3 p)
{
    float ang    = atan(p.z, p.x) - HELIX_PHASE;
    float yGuess = (p.y - HELIX_Y0) / HELIX_PITCH;

    float kf   = (yGuess - ang) / tau + 0.5;
    float k0   = floor(kf);
    float frac = kf - k0;

    // Both candidate turns go through one call site: written as two calls, the
    // band SDF -- the largest function in the shader -- is inlined twice into
    // every place the scene is sampled.
    float k1 = k0 + (frac < 0.5 ? -1.0 : 1.0);

    float d = 1e9;

    for (int i = ZERO; i < 2; i++)
    {
        float k = (i == 0) ? k0 : k1;

        d = min(d, helixBandDistance(p, clamp(ang + tau * k, 0.0, HELIX_TOTAL)));

        // frac near 0.5 sits in the middle of a turn, far from the flip, where
        // the chosen turn is unambiguously the nearest one. Only near the
        // boundary is the second evaluation needed.
        if (abs(frac - 0.5) < 0.25) break;
    }

    return d;
}

// ------------------------------------------------------------
// SCENE MAP
// material IDs:
// 1 = gold spiral + gold disk
// 2 = marble plinth
// 3 = studio floor -- NOT in the map: it is a plane and is intersected
//     analytically. Marching a ground plane at grazing angles burns dozens
//     of steps per pixel, and it also cannot occlude anything in this scene,
//     so leaving it out makes every march, AO and shadow sample cheaper.
// ------------------------------------------------------------
vec2 mapSculpture(vec3 p)
{
    float dRibbon   = sdHelixRibbon(p);
    float dGoldDisk = sdRoundedCylinder(p - vec3(0.0, DISK_Y, 0.0), 0.045, 0.50, 0.025);

    vec2 res = vec2(min(dRibbon, dGoldDisk), 1.0);

    float dPlinth = sdRoundedCylinder(p - vec3(0.0, PLINTH_Y, 0.0), PLINTH_HALF_H, PLINTH_R, 0.052);

    return opU(res, vec2(dPlinth, 2.0));
}

// Entry/exit of the ray through the sphere that holds the whole sculpture.
// Returns an empty interval (x > y) when the ray misses it entirely.
vec2 sculptureBoundInterval(vec3 ro, vec3 rd)
{
    float b = dot(ro, rd);
    float c = dot(ro, ro) - SCENE_BOUND * SCENE_BOUND;
    float disc = b * b - c;

    if (disc < 0.0) return vec2(1.0, -1.0);

    float s = sqrt(disc);
    return vec2(-b - s, -b + s);
}

// ------------------------------------------------------------
// RAYMARCH / NORMAL / AO / SHADOW
// ------------------------------------------------------------
vec2 raymarch(vec3 ro, vec3 rd)
{
    // Ground plane, closed form.
    float tFloor = MAX_DIST;

    if (rd.y < -0.0001)
    {
        float tp = (FLOOR_Y - ro.y) / rd.y;
        if (tp > 0.0) tFloor = min(tp, MAX_DIST);
    }

    // March only the interval that can contain the sculpture, and never past
    // the ground hit -- a ray that misses the bound costs nothing at all.
    vec2 bound = sculptureBoundInterval(ro, rd);

    float tEnd = min(tFloor, bound.y);
    float t = max(bound.x, 0.0);

    if (bound.y > bound.x && t < tEnd)
    {
        for (int i = ZERO; i < MAX_STEPS; i++)
        {
            vec2 h = mapSculpture(ro + rd * t);

            float eps = SURF_EPS * (1.0 + 0.08 * t);

            if (h.x < eps) return vec2(t, h.y);

            // conservative step: the swept ribbon is an SDF-ish approximation
            t += max(h.x * STEP_SCALE, 0.0025);

            if (t > tEnd) break;
        }
    }

    if (tFloor < MAX_DIST) return vec2(tFloor, 3.0);

    return vec2(-1.0, -1.0);
}

// Same four tetrahedron taps as the usual unrolled form, but written as a loop.
// GLSL has no real function calls -- every one is inlined -- so four separate
// mapSculpture() calls put four copies of the whole scene SDF into the shader,
// and the HLSL optimiser's cost grows faster than linearly with that. Rolling
// them into a loop the compiler cannot unfold leaves one copy.
vec3 calcNormal(vec3 p)
{
    const float e = 0.0012;

    vec3 n = vec3(0.0);

    for (int i = ZERO; i < 4; i++)
    {
        // i = 0..3 -> (1,-1,-1), (-1,-1,1), (-1,1,-1), (1,1,1)
        vec3 k = 2.0 * vec3(float(((i + 3) >> 1) & 1),
                            float((i >> 1) & 1),
                            float(i & 1)) - 1.0;

        n += k * mapSculpture(p + k * e).x;
    }

    return normalize(n);
}

// AO does need the ground plane, unlike the march and the shadows: it is what
// darkens the foot of the plinth. Adding it back analytically costs one min
// per probe -- leaving it out lifts a visible bright ring around the base.
float calcAO(vec3 p, vec3 n)
{
    float occ = 0.0;
    float sca = 1.0;

    for (int i = ZERO; i < 6; i++)
    {
        float h = 0.018 + 0.085 * float(i);
        vec3 sp = p + n * h;
        float d = min(mapSculpture(sp).x, sp.y - FLOOR_Y);
        occ += (h - d) * sca;
        sca *= 0.68;
    }

    return sat(1.0 - 2.15 * occ);
}

// AO probes reach ~0.44 up from the floor, so only the plinth can darken it.
// Outside that radius the six probes are guaranteed to find nothing. This is a
// test rather than a wrapper calling calcAO, so that calcAO keeps exactly one
// call site and is inlined once.
bool floorNeedsAO(vec3 p)
{
    return dot(p.xz, p.xz) < AO_FLOOR_R * AO_FLOOR_R;
}

// Improved soft shadow after IQ. The y/d correction estimates how closely the
// ray passed an occluder *between* two samples, so the penumbra widens with
// distance from the caster instead of smearing everything by the same amount.
// The naive min(res, k*h/t) it replaces also had too short a reach: its step
// was capped at 0.15, so in SHADOW_STEPS it never got as far as the lights.
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k)
{
    k /= SHADOW_SOFT;

    // Spend the step budget only where casters can be. Without this the ray
    // wastes its steps crossing empty space and reports "lit" before it ever
    // reaches the sculpture -- which shows up as broad arcs of missing shadow.
    vec2 bound = sculptureBoundInterval(ro, rd);

    if (bound.y <= bound.x || bound.y <= mint) return 1.0;

    float tEnd = min(maxt, bound.y);

    float res = 1.0;
    float t = max(mint, bound.x);
    float ph = 1e20;    // previous sample distance; huge so the first y is ~0

    for (int i = ZERO; i < SHADOW_STEPS; i++)
    {
        float h = mapSculpture(ro + rd * t).x;

        if (h < 0.0008) return 0.0;

        // IQ's penumbra correction. It is only meaningful while y <= h; beyond
        // that the ray is pulling away from the occluder faster than the
        // triangulation assumes, d collapses to zero and stamps spurious black
        // dots into the penumbra. Those samples are simply skipped -- the
        // running minimum already holds the darker value from closer in.
        float y = h * h / (2.0 * ph);

        if (ph > 0.0 && y <= h)
        {
            float d = sqrt(h * h - y * y);
            res = min(res, k * d / max(t - y, 0.0001));
        }
        else
        {
            res = min(res, k * h / t);
        }

        // The ribbon is thin, so the step stays damped: at full sphere-trace
        // steps some rays skip it and others do not, which combs the penumbra.
        ph = h;
        t += clamp(h * SHADOW_STEP_SCALE, 0.012, SHADOW_STEP_MAX);

        // Already effectively black: nothing further can lighten a running min.
        if (res < 0.004 || t > tEnd) break;
    }

    return sat(res);
}

// ------------------------------------------------------------
// LIGHTING
// ------------------------------------------------------------
float DistributionGGX(float NoH, float rough)
{
    float a  = rough * rough;
    float a2 = a * a;
    float d  = NoH * NoH * (a2 - 1.0) + 1.0;
    return a2 / max(pi * d * d, 0.00001);
}

float GeometrySchlickGGX(float NoV, float rough)
{
    float r = rough + 1.0;
    float k = (r * r) / 8.0;
    return NoV / max(NoV * (1.0 - k) + k, 0.00001);
}

float GeometrySmith(float NoV, float NoL, float rough)
{
    return GeometrySchlickGGX(NoV, rough) * GeometrySchlickGGX(NoL, rough);
}

vec3 FresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - sat(cosTheta), 5.0);
}

// The procedural studio is part of the room just as much as the cubemap is, so
// the lookup direction is converted here, once, where nobody can forget it.
vec3 envColor(vec3 r)
{
    r = toWorld(r);

    float t = sat(r.y * 0.5 + 0.5);

    vec3 low  = vec3(0.13, 0.12, 0.115);
    vec3 mid  = vec3(0.50, 0.455, 0.40);
    vec3 high = vec3(0.86, 0.78, 0.64);

    vec3 col = mix(low, mid, smoothstep(0.0, 0.78, t));
    col = mix(col, high, smoothstep(0.68, 1.0, t));

    // warm studio hotspot
    float hot = pow(sat(dot(r, normalize(vec3(-0.35, 0.75, 0.55)))), 12.0);
    col += vec3(1.0, 0.74, 0.42) * hot * 0.65;

    return col;
}

// Environment seen in direction r on a surface of the given roughness.
// The procedural studio gradient stays underneath, so the piece keeps its
// lighting even where the cubemap is dark, and the reflection rides on top.
vec3 envReflection(vec3 r, float rough)
{
    vec3 col = envColor(r);

#if ENV_CUBEMAP
    // textureLod, not texture: this runs inside a material branch, and an
    // implicit-LOD fetch in divergent control flow is undefined in GLSL ES --
    // compilers react by flattening the branch, which makes every pixel in the
    // frame pay for it. The explicit level also lets roughness blur the
    // reflection: rough gold should not mirror the room sharply.
    //
    // NOTE: levels above 0 need the channel's filter set to "mipmap" in
    // Shadertoy. With a plain linear filter, keep ENV_LOD_ROUGH at 0.
    float lod = ENV_LOD_BASE + rough * ENV_LOD_ROUGH;

    // toWorld, not r: the cubemap hangs in the room. Sampling it with the
    // object-space direction would glue the reflection to the surface.
    vec3 cube = textureLod(iChannel0, toWorld(r), lod).rgb * ENV_GAIN;

    col = mix(col, cube, ENV_MIX);
#endif

    return col;
}

vec3 evalPBR(
    vec3 baseColor,
    float metallic,
    float rough,
    vec3 n,
    vec3 v,
    vec3 l,
    vec3 radiance
)
{
    vec3 h = normalize(v + l);

    float NoV = max(dot(n, v), 0.001);
    float NoL = max(dot(n, l), 0.0);
    float NoH = max(dot(n, h), 0.0);
    float VoH = max(dot(v, h), 0.0);

    vec3 F0 = mix(vec3(0.045), baseColor, metallic);
    vec3 F  = FresnelSchlick(VoH, F0);

    float D = DistributionGGX(NoH, rough);
    float G = GeometrySmith(NoV, NoL, rough);

    vec3 spec = (D * G * F) / max(4.0 * NoV * NoL, 0.001);

    // Slightly non-physical diffuse kept for artistic readable gold.
    vec3 kD = (1.0 - F) * (1.0 - metallic);
    vec3 diff = kD * baseColor / pi;

    return (diff + spec) * radiance * NoL;
}

// The shadow factors come in precomputed. Each softShadow() call site inlines
// another copy of the shadow march *and* of the scene SDF inside it; with one
// call per light per material that was five copies, and the HLSL optimiser
// charges dearly for it. render() now marches them once and passes them down.
vec3 shadeGold(vec3 p, vec3 n, vec3 rd, float ao, float shKey, float shFill)
{
    vec3 v = normalize(-rd);

    float swirl = atan(p.z, p.x);
    float grain = fbm(p * 20.0 + n * 2.0);
    float fine  = sin(swirl * 42.0 + p.y * 12.0 + grain * 3.0);

    vec3 gold = vec3(1.00, 0.59, 0.18);
    gold *= 0.92 + 0.12 * grain + 0.025 * fine;

    float rough = 0.18 + 0.08 * fbm(p * 8.0);
    float metal = 0.93;

    vec3 col = vec3(0.0);

    // warm key light
    vec3 l1 = normalize(toObject(KEY_LIGHT_POS) - p);
    col += evalPBR(gold, metal, rough, n, v, l1, vec3(7.4, 5.0, 2.75)) * shKey;

    // softer front/fill light
    vec3 l2 = normalize(toObject(FILL_LIGHT_POS) - p);
    col += evalPBR(gold, metal, rough + 0.12, n, v, l2, vec3(1.3, 1.05, 0.78)) * shFill;

    // cool very soft overhead -- a room light as well, so it converts too
    vec3 l3 = normalize(toObject(vec3(0.15, 1.0, -0.25)));
    col += evalPBR(gold, metal, rough + 0.18, n, v, l3, vec3(0.35, 0.39, 0.48));

    // environment reflection -- cubemap on iChannel0 blended over the
    // procedural studio, weighted by Fresnel so it rides the grazing angles
    vec3 r = reflect(rd, n);
    float NoV = max(dot(n, v), 0.0);
    vec3 F0 = mix(vec3(0.045), gold, metal);
    vec3 F = FresnelSchlick(NoV, F0);

    col += envReflection(r, rough) * F * (0.95 - rough * 0.35);

    // warm grazing rim
    float rim = pow(1.0 - NoV, 2.7);
    col += vec3(1.0, 0.58, 0.20) * rim * 0.95;

    // tiny warm bounce from floor/base
    col += gold * vec3(0.18, 0.11, 0.04) * ao;

    return col * ao;
}

// Variant 0: dark stone with warm veins.
vec3 shadeMarbleDark(vec3 p, vec3 n, vec3 rd, float ao, float shKey)
{
    vec3 v = normalize(-rd);

    float veins = fbm(vec3(p.xz * 3.6, p.y * 0.9));
    float line = sin((p.x * 11.7 + p.y * 9.4) + veins * 9.0);
    float veinMask = smoothstep(0.86, 0.985, line * 0.5 + 0.5);

    vec3 base = vec3(0.025, 0.023, 0.021);
    base += vec3(0.19, 0.125, 0.055) * veinMask * 0.55;

    vec3 col = base * 0.18;

    vec3 l = normalize(toObject(KEY_LIGHT_POS) - p);

    float diff = max(dot(n, l), 0.0);
    float sh = shKey;
    vec3 h = normalize(l + v);
    float spec = pow(max(dot(n, h), 0.0), 55.0);

    col += base * diff * vec3(2.3, 1.8, 1.35) * sh;
    col += vec3(0.75, 0.55, 0.34) * spec * sh * 0.65;
    col += envColor(reflect(rd, n)) * 0.09;

    return col * ao;
}

#if MARBLE_VARIANT == 1
// Variant 1: polished marble. Shane's vein pattern, lit by this scene's own
// studio rig rather than his -- his lighting lives in a Common tab that is
// not part of this shader, and the plinth has to match the gold beside it.
vec3 shadeMarbleBright(vec3 p, vec3 n, vec3 rd, float ao, float shKey, float shFill)
{
    vec3 v = normalize(-rd);

    float marb = marbleVein(p * MARBLE_SCALE);
    float grain = marbleGrain(p * MARBLE_GRAIN);

    vec3 base = mix(MARBLE_VEIN, MARBLE_BASE, marb);
    base *= 0.82 + 0.36 * grain;

    // Polished stone: veins read slightly duller than the field.
    float rough = clamp(0.12 + grain * 0.30 + marb * 0.10, 0.06, 0.65);

    vec3 col = vec3(0.0);

    vec3 l1 = normalize(toObject(KEY_LIGHT_POS) - p);
    col += evalPBR(base, 0.0, rough, n, v, l1, vec3(5.2, 4.5, 3.7)) * shKey;

    vec3 l2 = normalize(toObject(FILL_LIGHT_POS) - p);
    col += evalPBR(base, 0.0, rough + 0.15, n, v, l2, vec3(0.95, 0.88, 0.78)) * shFill;

    // Sheen of a polished surface. The plinth keeps the procedural environment
    // on purpose: mirroring the room in the stone as well pulls attention off
    // the gold, which is what the cubemap is there for.
    float NoV = max(dot(n, v), 0.0);
    vec3 F = FresnelSchlick(NoV, vec3(0.05));
    col += envColor(reflect(rd, n)) * F * 1.5;

    // Marble is faintly translucent, so it never goes fully black.
    col += base * 0.09;

    return col * ao;
}
#endif

// Plinth entry point: switched at compile time by MARBLE_VARIANT.
vec3 shadeMarble(vec3 p, vec3 n, vec3 rd, float ao, float shKey, float shFill)
{
#if MARBLE_VARIANT == 1
    return shadeMarbleBright(p, n, rd, ao, shKey, shFill);
#else
    return shadeMarbleDark(p, n, rd, ao, shKey);
#endif
}

vec3 shadeFloor(vec3 p, vec3 n, vec3 rd, float ao, float shKey)
{
    vec3 v = normalize(-rd);

    // The floor does not sit on the turntable, so its grain is evaluated in
    // world space -- otherwise the ground would quietly turn with the piece.
    vec3 pw = toWorld(p);

    vec3 base = vec3(0.42, 0.39, 0.35);
    base *= 0.90 + 0.08 * fbm(vec3(pw.xz * 2.0, 0.0));

    vec3 l = normalize(toObject(KEY_LIGHT_POS) - p);

    float diff = max(dot(n, l), 0.0);
    float sh = shKey;

    vec3 h = normalize(l + v);
    float spec = pow(max(dot(n, h), 0.0), 40.0) * 0.12;

    vec3 col = base * 0.33;
    col += base * diff * vec3(2.2, 1.85, 1.45) * sh;
    col += vec3(1.0, 0.82, 0.55) * spec * sh;

    return col * ao;
}

// ------------------------------------------------------------
// CAMERA / BACKGROUND
// ------------------------------------------------------------
mat3 setCamera(vec3 ro, vec3 ta, float cr)
{
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// The backdrop is the room too. In turntable mode this keeps it dead still
// behind the piece, which is the whole point of that mode.
vec3 background(vec3 rd)
{
    rd = toWorld(rd);

    float t = sat(rd.y * 0.5 + 0.5);

    vec3 top = vec3(0.52, 0.49, 0.45);
    vec3 bot = vec3(0.14, 0.13, 0.125);

    vec3 col = mix(bot, top, pow(t, 0.85));

    // central warm studio glow
    float glow = pow(sat(dot(rd, normalize(vec3(0.0, 0.08, 1.0)))), 3.2);
    col += vec3(0.56, 0.45, 0.34) * glow * 0.22;

    return col;
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
vec3 render(vec3 ro, vec3 rd)
{
    vec2 hit = raymarch(ro, rd);

    vec3 col = background(rd);

    if (hit.x > 0.0)
    {
        vec3 p = ro + rd * hit.x;
        float mat = hit.y;

        // Ground beyond the fade is pure backdrop, so skip shading it.
        float ground = smoothstep(GROUND_FADE_NEAR, GROUND_FADE_FAR, hit.x);

        if (mat > 2.5 && ground > 0.995) return col;

        bool isFloor = mat > 2.5;

        vec3 n = isFloor ? vec3(0.0, 1.0, 0.0) : calcNormal(p);

        float ao = (!isFloor || floorNeedsAO(p)) ? calcAO(p, n) : 1.0;

        // Both shadow marches happen here, once, for whichever material was
        // hit -- the penumbra hardness is the only per-material difference and
        // it is just a parameter. Doing it inside the material functions put
        // five inlined copies of the shadow march into the shader; the loop
        // then folds the remaining two into one.
        // Penumbra hardness stays per-material because it is visible. The ray
        // bias and mint do not: reinstating the three slightly different values
        // the separate call sites used changed the image by nothing measurable
        // (mean pixel delta 0.792 vs 0.793), so the single values stay.
        float kKey = (mat < 1.5) ? 13.0 : (mat < 2.5 ? 11.0 : 9.0);
        float bias = 0.006;

        vec2 sh = vec2(0.0);

        for (int i = ZERO; i < 2; i++)
        {
            // The floor is lit by the key light only, so it skips the fill.
            if (i == 1 && isFloor) break;

            vec3 lp = toObject((i == 0) ? KEY_LIGHT_POS : FILL_LIGHT_POS);
            vec3 lv = lp - p;
            float ld = length(lv);
            vec3 l = lv / ld;

            if (dot(n, l) <= 0.0) continue;

            sh[i] = softShadow(p + n * bias, l,
                               (i == 0) ? 0.04 : 0.05, ld,
                               (i == 0) ? kKey : 8.0);
        }

        float shKey  = sh.x;
        float shFill = sh.y;

        if (mat < 1.5)
        {
            // Sculpture and plinth stay perfectly crisp: no haze on them.
            col = shadeGold(p, n, rd, ao, shKey, shFill);
        }
        else if (mat < 2.5)
        {
            col = shadeMarble(p, n, rd, ao, shKey, shFill);
        }
        else
        {
            col = mix(shadeFloor(p, n, rd, ao, shKey), col, ground);
        }
    }

    return col;
}

// One fully shaded sample at the given pixel coordinate, tone mapped and
// vignetted. Split out of mainImage so the anti-aliasing below can call it
// several times per pixel.
vec4 renderPixel(vec2 fragCoord)
{
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Framing: fit plinth base to ribbon tip, centred, with a small margin.
    const float PIECE_LOW  = FLOOR_Y + 0.01;
    const float PIECE_HIGH = HELIX_Y0 + HELIX_H;
    const float PIECE_MID  = 0.5 * (PIECE_LOW + PIECE_HIGH);

    // Distance is derived from the height of the piece, so re-tuning the
    // helix keeps the composition instead of cropping it.
    const float CAM_LENS = 2.05;
          float CAM_DIST = ( CAM_LENS * (PIECE_HIGH - PIECE_LOW) * 1.24 );

    // Below PITCH_MIN the camera would drop under the studio floor, which
    // then occludes the whole scene, so the drag maps onto the usable range.
    const float PITCH_MIN = -0.15;
    const float PITCH_MAX =  0.85;

    // camera orbit
    float yaw   = iTime * 0.19 + 0.45;
    float pitch = 0.19 + 0.06 * sin(iTime * 0.17);

    if (iMouse.z > 0.0)
    {
        float mv = sat(iMouse.y / iResolution.y);

        yaw   = (iMouse.x / iResolution.x - 0.5) * tau * 1.25;
        pitch = mix(PITCH_MIN, PITCH_MAX, mv);

        // Lower half: framing as before. Upper half: move in, continuously.
        // smoothstep rather than a straight ramp so that dragging through the
        // middle has no kink -- the zoom eases in instead of switching on.
        CAM_DIST *= mix(1.0, ZOOM_NEAR, smoothstep(0.5, 1.0, mv));
    }

    pitch = clamp(pitch, PITCH_MIN, PITCH_MAX);

    // Turntable: the camera below still swings by yaw, but that swing is now
    // read as the object turning underneath a fixed camera. Setting gYaw is
    // what converts the room (lights, environment, backdrop, floor grain) into
    // that turning frame -- everything else in the shader stays as it is.
#if TURNTABLE
    gYaw = yaw;
#endif

    vec3 target = vec3(0.0, PIECE_MID, 0.0);

    vec3 ro = target + CAM_DIST * vec3(
        sin(yaw) * cos(pitch),
        sin(pitch),
        cos(yaw) * cos(pitch)
    );

    mat3 cam = setCamera(ro, target, 0.0);

    vec3 rd = normalize(cam * vec3(uv, CAM_LENS));

    vec3 col = render(ro, rd);

    // filmic-ish tone mapping
    col *= 1.08;
    col = col / (1.0 + col);

    // warm contrast
    col = pow(col, vec3(0.4545));
    col *= vec3(1.035, 1.00, 0.955);

    // vignette
    vec2 q = fragCoord / iResolution.xy;
    float vig = q.x * q.y * (1.0 - q.x) * (1.0 - q.y);
    vig = pow(16.0 * vig, 0.18);
    col *= mix(0.72, 1.06, vig);

    return vec4(col, 1.0);
}

// ------------------------------------------------------------
// ADAPTIVE ANTI-ALIASING
// Fabrice Neyret's method
// ------------------------------------------------------------
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
#if AAA_ENABLE
    vec4 c = renderPixel(fragCoord);

    if (fwidth(length(c)) > AAA_THRESHOLD)
    {
        vec4 sum = vec4(0.0);

        for (int x = ZERO; x < AAA_GRID; x++)
        for (int y = ZERO; y < AAA_GRID; y++)
        {
            vec2 o = (vec2(float(x), float(y)) + 0.5) / float(AAA_GRID) - 0.5;
            sum += renderPixel(fragCoord + o);
        }

        c = sum / float(AAA_GRID * AAA_GRID);

    #if AAA_DEBUG
        c.rgb += vec3(1.0, 0.0, 0.0);   // shows which pixels were supersampled
    #endif
    }

    fragColor = c;
#else
    fragColor = renderPixel(fragCoord);
#endif
}//aladiN