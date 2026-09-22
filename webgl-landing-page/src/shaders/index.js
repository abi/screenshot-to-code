// Vertex Shader - Particle System
export const particleVertexShader = `
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uMouse;
uniform float uProgress;
attribute float aSize;
attribute vec3 aColor;
attribute float aRandom;
varying vec3 vColor;
varying float vAlpha;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 pos = position;
  
  // Noise-based movement
  float noise = snoise(pos * 0.5 + uTime * 0.1);
  float noise2 = snoise(pos * 2.0 - uTime * 0.05);
  
  // Mouse attraction
  vec3 toMouse = uMouse - pos;
  float mouseDist = length(toMouse);
  float mouseInfluence = smoothstep(0.0, 50.0, 50.0 - mouseDist);
  pos += normalize(toMouse) * mouseInfluence * 2.0;
  
  // Organic movement
  pos += vec3(
    sin(uTime * 0.5 + aRandom * 10.0) * 0.5,
    cos(uTime * 0.3 + aRandom * 20.0) * 0.5,
    sin(uTime * 0.7 + aRandom * 30.0) * 0.5
  ) * noise;
  
  // Progress-based morphing
  pos = mix(pos, normalize(pos) * 3.0, uProgress * 0.5);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPosition.z) * uPixelRatio;
  gl_Position = projectionMatrix * mvPosition;
  
  vColor = aColor;
  vAlpha = 1.0 - smoothstep(0.0, 100.0, -mvPosition.z);
}
`;

// Fragment Shader - Particle System
export const particleFragmentShader = `
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  
  // Soft circular particle with glow
  float alpha = smoothstep(0.5, 0.0, dist);
  alpha = pow(alpha, 2.0);
  
  // Add pulsing glow
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + vColor.x * 10.0);
  alpha *= 0.5 + 0.5 * pulse;
  
  // Color with intensity variation
  vec3 color = vColor * (0.5 + 0.5 * pulse);
  
  // Add chromatic aberration at edges
  if (dist > 0.4) {
    color.r *= 1.2;
    color.b *= 0.8;
  }
  
  gl_FragColor = vec4(color, alpha * vAlpha);
  
  // Discard invisible fragments
  if (gl_FragColor.a < 0.01) discard;
}
`;

// Post-processing Shaders
export const chromaticAberrationShader = `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float offset = uIntensity * 0.005;
  
  // Chromatic aberration based on time
  float rOffset = sin(uTime * 2.0) * offset;
  float bOffset = cos(uTime * 2.0) * offset;
  
  vec3 color;
  color.r = texture2D(tDiffuse, uv + vec2(rOffset, 0.0)).r;
  color.g = texture2D(tDiffuse, uv).g;
  color.b = texture2D(tDiffuse, uv + vec2(-bOffset, 0.0)).b;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const bloomShader = `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uStrength;
uniform float uRadius;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);
  
  // Extract bright areas
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  
  if (luminance > uThreshold) {
    // Simple gaussian-like blur for bloom
    vec3 bloom = vec3(0.0);
    float totalWeight = 0.0;
    
    for (int x = -4; x <= 4; x++) {
      for (int y = -4; y <= 4; y++) {
        vec2 offset = vec2(float(x), float(y)) * uRadius / 512.0;
        vec4 sampleColor = texture2D(tDiffuse, uv + offset);
        float sampleLum = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        
        if (sampleLum > uThreshold) {
          float weight = exp(-(float(x*x + y*y)) / (2.0 * uRadius * uRadius));
          bloom += sampleColor.rgb * weight;
          totalWeight += weight;
        }
      }
    }
    
    if (totalWeight > 0.0) {
      bloom /= totalWeight;
      color.rgb += bloom * uStrength * smoothstep(uThreshold, 1.0, luminance);
    }
  }
  
  gl_FragColor = color;
}
`;

export const volumetricLightShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec3 uLightPosition;
uniform vec3 uCameraPosition;
uniform float uTime;
varying vec2 vUv;

float radialBlur(vec2 uv, vec2 center, float radius) {
  vec3 color = vec3(0.0);
  float totalWeight = 0.0;
  int samples = 16;
  
  for (int i = 0; i < samples; i++) {
    float t = float(i) / float(samples);
    vec2 sampleUv = mix(center, uv, t);
    vec4 sample = texture2D(tDiffuse, sampleUv);
    float weight = 1.0 - t;
    color += sample.rgb * weight;
    totalWeight += weight;
  }
  
  return color / totalWeight;
}

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);
  
  // Calculate light rays from center
  vec2 center = vec2(0.5, 0.5);
  vec2 toCenter = center - uv;
  float dist = length(toCenter);
  
  // Volumetric light rays
  float rayIntensity = 1.0 / (1.0 + dist * 5.0);
  rayIntensity *= smoothstep(1.0, 0.0, abs(toCenter.x) * 10.0);
  
  // Animated light shafts
  float shaft = sin(uTime * 2.0 + uv.y * 20.0) * 0.5 + 0.5;
  rayIntensity *= shaft * 0.3 + 0.7;
  
  // Apply volumetric lighting
  vec3 volumetric = vec3(1.0, 0.8, 0.4) * rayIntensity * 0.15;
  
  // Add lens flare at bright spots
  float bright = max(max(color.r, color.g), color.b);
  if (bright > 0.9) {
    float flare = (bright - 0.9) * 10.0;
    vec2 flareDir = normalize(uv - center);
    for (int i = 1; i <= 6; i++) {
      vec2 flareUv = uv - flareDir * 0.05 * float(i);
      vec4 flareColor = texture2D(tDiffuse, flareUv);
      color.rgb += flareColor.rgb * 0.1 * (1.0 - float(i) * 0.15);
    }
  }
  
  color.rgb += volumetric;
  
  // Vignette
  float vignette = 1.0 - dist * 0.5;
  color.rgb *= vignette;
  
  gl_FragColor = vec4(color.rgb, 1.0);
}
`;

// Post-processing vertex shader (shared)
export const postVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// HUD/Interface Shader
export const hudScanlineShader = `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);
  
  // Horizontal scanlines
  float scanline = sin(uv.y * 800.0 + uTime * 50.0) * 0.5 + 0.5;
  scanline = pow(scanline, 3.0);
  color.rgb *= mix(1.0, 0.95, scanline * uIntensity * 0.1);
  
  // Vignette
  float vignette = 1.0 - length(uv - 0.5) * 0.8;
  color.rgb *= vignette;
  
  // Subtle noise
  float noise = fract(sin(dot(vUv.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color.rgb += noise * 0.01 * uIntensity;
  
  gl_FragColor = vec4(color.rgb, 1.0);
}
`;