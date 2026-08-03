
#define MAX_STEPS 128
#define SURF_EPS  0.001
#define STEP_FACTOR 0.5

vec3 P[36];

// ---------- 更新控制点 (6x6 网格) ----------
void updateControlPoints(float time) {
    for (int j = 0; j < 6; j++) {
        for (int i = 0; i < 6; i++) {
            float x = mix(-1.5, 1.5, float(i) / 5.0);
            float y = mix(-1.5, 1.5, float(j) / 5.0);
            float z = 0.6 * sin(x * 2.5 + time) * cos(y * 2.5 + time * 0.7);
            P[j * 6 + i] = vec3(x, y, z);
        }
    }
}

// ---------- 五次贝塞尔求值 (德卡斯特里奥) ----------
vec3 bezier5(vec3 p[6], float t) {
    vec3 q[6];
    for (int i = 0; i < 6; i++) q[i] = p[i];
    for (int level = 1; level <= 5; level++) {
        for (int i = 0; i < 6 - level; i++) {
            q[i] = mix(q[i], q[i+1], t);
        }
    }
    return q[0];
}

// ---------- 贝塞尔曲面求值 ----------
vec3 bezierSurface(float u, float v) {
    vec3 col[6];
    for (int j = 0; j < 6; j++) {
        vec3 row[6];
        for (int i = 0; i < 6; i++) {
            row[i] = P[j * 6 + i];
        }
        col[j] = bezier5(row, v);
    }
    return bezier5(col, u);
}

// ---------- SDF ----------
float sdSurface(vec3 pos) {
    float u = (pos.x + 1.5) / 3.0;
    float v = (pos.y + 1.5) / 3.0;
    if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return 1.0;
    float h = bezierSurface(u, v).z;
    return pos.z - h;
}

// ---------- 光线步进 ----------
bool marchSurface(vec3 ro, vec3 rd, out float t, out float u, out float v) {
    t = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 pos = ro + rd * t;
        float d = sdSurface(pos);
        if (abs(d) < SURF_EPS) {
            u = (pos.x + 1.5) / 3.0;
            v = (pos.y + 1.5) / 3.0;
            return true;
        }
        t += max(abs(d) * STEP_FACTOR, 0.002);
        if (t > 20.0) break;
    }
    return false;
}

// ---------- 曲面法线 ----------
vec3 surfaceNormal(vec3 pos) {
    float eps = 0.01;
    float d = sdSurface(pos);
    return normalize(vec3(
        sdSurface(pos + vec3(eps, 0.0, 0.0)) - d,
        sdSurface(pos + vec3(0.0, eps, 0.0)) - d,
        sdSurface(pos + vec3(0.0, 0.0, eps)) - d
    ));
}

// ---------- 主函数 ----------
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float time = iTime;
    updateControlPoints(time);

    // 固定俯视相机
    vec3 ro = vec3(0.0, 0.0, 3.5);
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    float tMin = 1e10;
    float uHit = 0.0, vHit = 0.0;
    bool hitSurface = false;

    // 仅曲面步进
    float tTest, uTest, vTest;
    if (marchSurface(ro, rd, tTest, uTest, vTest)) {
        tMin = tTest;
        uHit = uTest;
        vHit = vTest;
        hitSurface = true;
    }

    vec3 col;
    vec3 bgColor = vec3(0.25, 0.3, 0.4);
    vec3 L = normalize(vec3(0.8, 1.0, 1.2));

    if (!hitSurface) {
        col = bgColor;
    } else {
        vec3 pos = ro + rd * tMin;
        vec3 N = surfaceNormal(pos);
        if (dot(N, -rd) < 0.0) N = -N;

        float diff = max(dot(N, L), 0.0);
        float amb = 0.4;
        vec3 baseColor = vec3(0.35, 0.65, 0.95);
        col = baseColor * (amb + diff * 0.8);

        vec3 V = normalize(ro - pos);
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 80.0);
        col += vec3(0.6) * spec;

        // 等参线 (每 0.2 一条)
        float lw = 0.006;
        float uDist = 1.0;
        for (float f = 0.0; f <= 1.001; f += 0.2) {
            uDist = min(uDist, abs(uHit - f));
        }
        float vDist = 1.0;
        for (float f = 0.0; f <= 1.001; f += 0.2) {
            vDist = min(vDist, abs(vHit - f));
        }
        if (min(uDist, vDist) < lw) {
            col = mix(col, vec3(0.0), 0.7);
        }
    }

    col = mix(col, bgColor, 1.0 - exp(-0.25 * tMin));
    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}