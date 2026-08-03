vec4 TRANSLATOR_RT_fragColor;
vec2 TRANSLATOR_RT_fragCoord;
vec2 iTRANSLATOR_RT_Mouse;
//@width: 540
//@height: 960




//region options

//Camera options
#define CAMERA_SPEED 4.0
#define CAMERA_HEIGHT 5.00
#define CAMERA_X_ROTATION 1
#define CAMERA_Y_ROTATION 1

//Graphical features
#define DO_BIG_WAVES 1
#define DO_SMALL_WAVES 1
#define BIG_WAVE_SPEED 0.7
#define SMALL_WAVE_SPEED 0.8
#define WAVE_SIZE 0.2
#define DO_FOG 1
#define FOG_FACTOR 4.0
#define DO_LIGHTING 1
#define DO_SUN 1

//Graphical features, decorations
#define DECORATE_SEA 1
#define DECORATE_SKY 1

//Raymarching options
#define RAY_MIN_DIST 0.005
#define RAY_MAX_DIST 200.0
#define RAY_MAX_ITERATIONS 100
#define RAY_FUDGE_FACTOR 0.75

//Terrain generation features
#define OCTAVES 4
//endregion

//Colors
const vec3 COLOR_SKY = vec3(0.161, 0.541, 1);
const vec3 COLOR_SEA = vec3(0, 0.325, 0.686);
const vec3 COLOR_WAVES = vec3(0.816, 0.875, 0.906);

//region math
#define PI 3.14159265
#define TWOPI 6.28318531

//region rotations
vec3 rot3(vec3 p, vec3 axis, float angle){
	return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}

vec3 rot2X(vec3 p, float angle){ //rotates on x axis
	float s = sin(angle);
	float c = cos(angle);
	mat2 m = mat2(c, -s, s, c);
	p.yz *= m;
	return p;
}

vec3 rot2Y(vec3 p, float angle){ //rotates on y axis
	float s = sin(angle);
	float c = cos(angle);
	mat2 m = mat2(c, -s, s, c);
	p.zx *= m;
	return p;
}

vec3 rot2Z(vec3 p, float angle){ //rotates on z axis
	float s = sin(angle);
	float c = cos(angle);
	mat2 m = mat2(c, -s, s, c);
	p.yx *= m;
	return p;
}
//endregion

//linear step
float linstep(float a, float b, float t){
	return clamp((t - a) / (b - a), 0.0, 1.0);
}

vec2 fade(vec2 t){
	return t*t*(3.0 - 2.0*t);
	//return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float interpolate(float value1, float value2, float value3, float value4, vec2 t){
    return mix(mix(value1, value2, t.x), mix(value3, value4, t.x), t.y);
}

//region badperlin
float hash(vec2 p){
	vec2 uv = 50.0 * fract(p / PI) + vec2(23.7, -202.9);
	
	return uv.x*uv.y*(uv.x+uv.y);
	//return fract(uv.x*uv.y*(uv.x+uv.y));
}

vec2 gradient(vec2 p){
    float a = TWOPI * hash(p);
    return vec2(cos(a), sin(a));
}

float perlinNoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = p - i;

    vec2 g00 = gradient(i);
    vec2 g10 = gradient(i + vec2(1.0, 0.0));
    vec2 g01 = gradient(i + vec2(0.0, 1.0));
    vec2 g11 = gradient(i + vec2(1.0, 1.0));

    float v00 = dot(g00, f);
    float v10 = dot(g10, f - vec2(1.0, 0.0));
    float v01 = dot(g01, f - vec2(0.0, 1.0));
    float v11 = dot(g11, f - vec2(1.0, 1.0));

    vec2 u = fade(f);

    return 1.45 * interpolate(v00, v10, v01, v11, u);
}

float perlinNoiseOctaves(vec2 position, int octaveCount, float persistence, float lacunarity){
    float value = 0.0;
    float amplitude = 1.0;
    for(int i = 0; i < octaveCount; i++){
        value += perlinNoise(position) * amplitude;
        amplitude *= persistence;
        position *= lacunarity;
    }
    return value;
}
//endregion

float pow128(float x){
	x *= x;
	x *= x;
	x *= x;
	x *= x;
	x *= x;
	x *= x;
	return x * x;
}
//endregion

//region map
float groundElevation(vec2 coords){
	coords *= 0.2;
	
	float height = perlinNoise(coords * 0.2) + 0.5 * perlinNoiseOctaves(coords * 0.1, OCTAVES, 0.5, 2.0);
	
	return height;
}

float seaElevation(vec2 coords, float groundElevation){
	#if DO_BIG_WAVES
		float perlin1 = perlinNoise((coords + iTime * BIG_WAVE_SPEED * vec2(0.5, 0.8)) * 0.25) + 0.5 * perlinNoise((coords + iTime * BIG_WAVE_SPEED * vec2(0.8, 0.5) + vec2(-270.87272, 36.221)) * 0.5);
		perlin1 *= smoothstep(0.4, 0.9, groundElevation);
		
		#if DO_SMALL_WAVES
			float perlin2 = 0.1 * perlinNoise((coords + vec2(223.3, 123.2) + SMALL_WAVE_SPEED * iTime) * 1.5);
			perlin2 *= sin(iTime * SMALL_WAVE_SPEED + 5.0*coords.x + 5.0*coords.y);
			perlin1 += perlin2;
		#endif
		
		return WAVE_SIZE * perlin1;
	#elif DO_SMALL_WAVES
		float perlin2 = 0.1 * perlinNoise((coords + vec2(223.3, 123.2) + SMALL_WAVE_SPEED * iTime) * 1.5);
		perlin2 *= sin(iTime * SMALL_WAVE_SPEED + 5.0*coords.x + 5.0*coords.y);
		return WAVE_SIZE * perlin2;
	#else
		return 0.0;
	#endif
}

float map(vec3 p){
	return p.y - seaElevation(p.xz, groundElevation(p.xz)); //sea
}

/* vec3 getNormal(vec3 p){
	vec2 d = vec2(0.01, 0.0);
	float gx = map(p+d.xyy) - map (p - d.xyy);
	float gy = map(p + d.yxy) - map(p - d.yxy);
	float gz = map(p + d.yyx) - map (p - d.yyx);
	vec3 normal = vec3(gx, gy, gz);
	return normalize(normal);
} */

vec3 getNormal(vec3 pos){ //Faster i think
	vec3 n = vec3(0.0);
    for(int i = 0; i < 4; i++){
        vec3 e = 0.5773*(2.0*vec3((((i+3)>>1)&1),((i>>1)&1),(i&1))-1.0);
        n += e*map(pos+0.0005*e);
      //if( n.x+n.y+n.z>100.0 ) break;
    }
    return normalize(n);
}
//endregion

//region colors
vec3 skyColor(float ypos){
	#if DECORATE_SKY
		return mix(vec3(1.0), COLOR_SKY * (1.1 * linstep(2.1, -0.2, ypos) + 0.15), smoothstep(-0.6, 0.5, ypos));
	#else
		return COLOR_SKY;
	#endif
}

vec3 seaColor(vec3 normal){
	return mix(COLOR_WAVES, COLOR_SEA, linstep(pow(0.999, 2.0/WAVE_SIZE), pow(0.9999, 2.0/WAVE_SIZE), dot(normal, vec3(0.0, 1.0, 0.0))));
}

vec3 showSun(vec3 rd, vec3 sunDir, vec3 sunColor){
	return sunColor * linstep(0.999, 1.000, dot(rd, sunDir));
}
//endregion

//region lighting
#if DO_LIGHTING

vec3 doLightingSea(vec3 lightColor, vec3 lightDir, vec3 selectedColor, vec3 normal, vec3 rayPos, vec3 rayOrigin){
	//Ambient component
	vec3 ambient = 0.2 * lightColor * selectedColor;
	
	//Diffuse component
	float diff = max(dot(normal, lightDir), 0.0);
	vec3 diffuse = diff * lightColor * selectedColor;
	
	//Specular component
	vec3 specular = vec3(0.0);
	
	vec3 viewDir = normalize(rayOrigin - rayPos);
	vec3 halfwayDir = normalize(lightDir + viewDir);
	float spec = pow128(max(dot(normal, halfwayDir), 0.0));
	specular = lightColor * spec * lightColor;
	
	return ambient + diffuse + specular;
}
#endif
//endregion

void mainMethod(){
	vec2 fragPos = vec2(TRANSLATOR_RT_fragCoord.x * iResolution.x/iResolution.y, TRANSLATOR_RT_fragCoord.y);
	
	vec3 ro = vec3(iTime * CAMERA_SPEED, CAMERA_HEIGHT * 2.0, 0.0); //cam pos, ray origin
	vec3 rd = normalize(vec3(fragPos, 1)); //ray direction
	
	vec2 mouse = iTRANSLATOR_RT_Mouse;
	mouse.x *= iResolution.x / iResolution.y;
	
	#if CAMERA_Y_ROTATION
		rd = rot2X(rd, -mouse.y * PI / 2.0);
	#endif
	
	#if CAMERA_X_ROTATION
		rd = rot2Y(rd, mouse.x * PI);
	#endif
	
	float t = 0.0; //distance
	
	for(int i = 0; i < RAY_MAX_ITERATIONS; i++){
		vec3 p = ro + t * rd; //position
		
		float d = RAY_FUDGE_FACTOR * map(p);
		
		t += d;
		
		if(d < RAY_MIN_DIST || t > RAY_MAX_DIST){
			break;
		}
	}
	
	vec3 rayPos = ro + t * rd;
	
	vec3 sunDir = normalize(vec3(2.0, 1.0, 0.0));
	
	if(t > RAY_MAX_DIST){
		vec3 col = skyColor(rd.y);
		#if DO_SUN
			col += showSun(rd, sunDir, vec3(1.0, 1.0, 0.9));
		#endif
		TRANSLATOR_RT_fragColor = vec4(col, 1.0); //sky
	}else{		
		vec3 col = vec3(0.0);
		vec2 coords = rayPos.xz;
		float height = rayPos.y;
		
		#if DECORATE_SEA
			vec3 normal = getNormal(rayPos);
			col = seaColor(normal);
		#else
			col = COLOR_SEA;
			#if DO_LIGHTING
				vec3 normal = getNormal(rayPos);
			#endif
		#endif
		
		#if DO_LIGHTING
			col = doLightingSea(vec3(1.0), sunDir, col, normal, rayPos, ro);
		#endif
		
		#if DO_FOG
			TRANSLATOR_RT_fragColor = vec4(mix(col, skyColor(rd.y), exp(FOG_FACTOR * linstep(0.0, RAY_MAX_DIST, t) - FOG_FACTOR)), 1.0);
		#else
			TRANSLATOR_RT_fragColor = vec4(col, 1.0);
		#endif
	}
}
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    iTRANSLATOR_RT_Mouse = (iMouse.xy / iResolution.xy) * 2.0 - 1.0;
    TRANSLATOR_RT_fragCoord = (fragCoord / iResolution.xy) * 2.0 - 1.0;
    mainMethod();
    fragColor = TRANSLATOR_RT_fragColor;
}