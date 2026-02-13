import type * as Three from "three";

type ThreeModule = typeof import("three");

type FireworkInput = {
  globeGroup: Three.Group;
  tiltGroup: Three.Group;
  camera: Three.PerspectiveCamera;
  landPositions: Float32Array;
};

export const spawnFireworks = (
  THREE: ThreeModule,
  { globeGroup, tiltGroup, camera, landPositions }: FireworkInput
) => {
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);

  const visibleLandPositions: Three.Vector3[] = [];
  const tempPos = new THREE.Vector3();
  const worldMatrix = new THREE.Matrix4();
  worldMatrix.multiplyMatrices(tiltGroup.matrixWorld, globeGroup.matrix);

  for (let i = 0; i < landPositions.length; i += 3) {
    tempPos.set(landPositions[i], landPositions[i + 1], landPositions[i + 2]);
    tempPos.applyMatrix4(worldMatrix);
    const normal = tempPos.clone().normalize();
    if (normal.dot(cameraDir.clone().negate()) > 0.3) {
      visibleLandPositions.push(
        new THREE.Vector3(landPositions[i], landPositions[i + 1], landPositions[i + 2])
      );
    }
  }

  if (visibleLandPositions.length === 0) return;

  const numBlips = Math.min(3 + Math.floor(Math.random() * 3), visibleLandPositions.length);
  const shuffled = visibleLandPositions.sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, numBlips);

  chosen.forEach((pos) => {
    const normal = pos.clone().normalize();
    const pulsePos = pos.clone().add(normal.clone().multiplyScalar(0.3));

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([pulsePos.x, pulsePos.y, pulsePos.z]), 3)
    );

    const dotMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      uniforms: {
        u_color: { value: new THREE.Color(0x00d4ff) },
        u_opacity: { value: 1.0 },
      },
      vertexShader: `
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = 5.0;
          }
        `,
      fragmentShader: `
          uniform vec3 u_color;
          uniform float u_opacity;
          void main() {
            if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
            gl_FragColor = vec4(u_color, u_opacity);
          }
        `,
    });

    const dot = new THREE.Points(dotGeometry, dotMaterial);
    globeGroup.add(dot);

    const ringGeometry = new THREE.RingGeometry(0.01, 0.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: false,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(pulsePos);
    ring.lookAt(pulsePos.clone().add(normal));
    globeGroup.add(ring);

    const duration = 2500;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const scale = 1 + progress * 10;
      ring.scale.set(scale, scale, 1);

      ringMaterial.opacity = 0.9 * (1 - progress);

      if (progress > 0.5) {
        dotMaterial.uniforms.u_opacity.value = 1 - (progress - 0.5) * 2;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        globeGroup.remove(dot);
        globeGroup.remove(ring);
        dotGeometry.dispose();
        dotMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      }
    };
    animate();
  });
};
