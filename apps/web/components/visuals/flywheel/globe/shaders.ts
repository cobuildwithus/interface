export const vertexShader = `
  precision mediump float;
  attribute float aSinOffset;
  attribute float aCosOffset;
  uniform float u_timeSin;
  uniform float u_timeCos;
  uniform float u_maxExtrusion;
  uniform float u_pointScale;
  varying float vPct;
  void main() {
    float sine = u_timeSin * aCosOffset + u_timeCos * aSinOffset;
    vPct = abs(sine);
    vec3 newPosition = position;
    if (u_maxExtrusion > 1.0) {
      newPosition = newPosition * u_maxExtrusion;
      vec3 direction = normalize(newPosition);
      newPosition += direction * sine;
    } else {
      newPosition = newPosition * u_maxExtrusion;
    }
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = u_pointScale * (1.0 / -mvPosition.z);
  }
`;

export const fragmentShader = `
  precision mediump float;
  varying float vPct;
  void main() {
    vec3 colorA = vec3(0.1, 0.8, 0.5);
    vec3 colorB = vec3(0.05, 0.5, 0.3);
    vec3 color = mix(colorA, colorB, vPct);
    if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const BASE_POINT_SCALE = 50.0;
// Start over Europe/Scandinavia
export const INITIAL_LONGITUDE_OFFSET = -Math.PI * 0.85;
