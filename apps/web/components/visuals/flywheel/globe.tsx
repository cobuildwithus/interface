"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import type { WorkerRequest, WorkerResponse } from "./globe.worker";
import { getPointScale, chooseDotCount } from "./globe/metrics";
import { buildRasterMain } from "./globe/raster";
import { fragmentShader, INITIAL_LONGITUDE_OFFSET, vertexShader } from "./globe/shaders";

interface Props {
  className?: string;
  fireworkTrigger?: number;
}

type ThreeModule = typeof import("three");
type SpawnFireworks = typeof import("./globe/fireworks").spawnFireworks;

export function Globe({ className = "", fireworkTrigger = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<ThreeModule | null>(null);
  const spawnFireworksRef = useRef<SpawnFireworks | null>(null);
  const globeGroupRef = useRef<Three.Group | null>(null);
  const tiltGroupRef = useRef<Three.Group | null>(null);
  const cameraRef = useRef<Three.PerspectiveCamera | null>(null);
  const landPositionsRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const three = threeRef.current;
    const spawnFireworks = spawnFireworksRef.current;
    if (
      fireworkTrigger === 0 ||
      !three ||
      !spawnFireworks ||
      !globeGroupRef.current ||
      !tiltGroupRef.current ||
      !cameraRef.current ||
      !landPositionsRef.current
    )
      return;

    spawnFireworks(three, {
      globeGroup: globeGroupRef.current,
      tiltGroup: tiltGroupRef.current,
      camera: cameraRef.current,
      landPositions: landPositionsRef.current,
    });
  }, [fireworkTrigger]);

  useEffect(() => {
    let isActive = true;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const [THREE, fireworks] = await Promise.all([import("three"), import("./globe/fireworks")]);
      const containerEl = containerRef.current;
      if (!isActive || !containerEl) return;
      threeRef.current = THREE;
      spawnFireworksRef.current = fireworks.spawnFireworks;

      const sizes = {
        width: containerEl.offsetWidth,
        height: containerEl.offsetHeight,
      };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 1, 1000);
      const distance = sizes.width > 700 ? 52 : 60;
      camera.position.set(0, -10, distance);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(sizes.width, sizes.height);
      const canvas = renderer.domElement;
      containerEl.appendChild(canvas);

      const tiltGroup = new THREE.Group();
      const globeGroup = new THREE.Group();
      tiltGroupRef.current = tiltGroup;
      globeGroupRef.current = globeGroup;
      tiltGroup.add(globeGroup);
      scene.add(tiltGroup);

      const baseSphere = new THREE.SphereGeometry(19.5, 64, 64);
      const baseMaterial = new THREE.MeshBasicMaterial({
        color: 0x0a1a0a,
      });
      const baseMesh = new THREE.Mesh(baseSphere, baseMaterial);
      globeGroup.add(baseMesh);

      globeGroup.rotation.y = INITIAL_LONGITUDE_OFFSET;
      globeGroup.rotation.x = 0.4;
      tiltGroup.rotation.z = 0.25;

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          u_timeSin: { value: 0.0 },
          u_timeCos: { value: 1.0 },
          u_maxExtrusion: { value: 1.0 },
          u_pointScale: { value: getPointScale() },
        },
        vertexShader,
        fragmentShader,
      });

      const geometry = new THREE.BufferGeometry();
      const pointsMesh = new THREE.Points(geometry, material);
      globeGroup.add(pointsMesh);

      const worker = new Worker(new URL("./globe.worker.ts", import.meta.url), {
        type: "module",
      });

      const imgUrl = window.location.origin + "/world_alpha_mini.jpg";
      const dotCount = chooseDotCount();
      const radius = 20;
      worker.postMessage({ imgUrl, dotCount, radius } satisfies WorkerRequest);

      worker.onmessage = ({ data }: MessageEvent<WorkerResponse | { status: string }>) => {
        if ("status" in data) {
          if (data.status === "no_offscreen") {
            buildRasterMain(imgUrl).then((raster) => {
              if (raster) {
                worker.postMessage({ raster, dotCount, radius });
              }
            });
          }
        } else {
          geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
          geometry.setAttribute("aSinOffset", new THREE.BufferAttribute(data.sinArr, 1));
          geometry.setAttribute("aCosOffset", new THREE.BufferAttribute(data.cosArr, 1));
          geometry.computeBoundingSphere();
          landPositionsRef.current = data.positions;
          startRendering();
        }
      };

      const updateSize = () => {
        const offsetWidth = containerEl.offsetWidth;
        const offsetHeight = containerEl.offsetHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        material.uniforms.u_pointScale.value = getPointScale();
        renderer.setSize(offsetWidth, offsetHeight);
        camera.aspect = offsetWidth / offsetHeight;
        camera.updateProjectionMatrix();
      };

      updateSize();

      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(containerEl);

      let animationFrameId: number | null = null;
      let isInViewport = true;

      const clock = new THREE.Clock();
      let elapsed = 0;

      const render = () => {
        const delta = clock.getDelta();
        elapsed += delta;

        material.uniforms.u_timeSin.value = Math.sin(elapsed);
        material.uniforms.u_timeCos.value = Math.cos(elapsed);

        globeGroup.rotation.y += 0.001;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(render);
      };

      const startRendering = () => {
        if (animationFrameId === null) animationFrameId = requestAnimationFrame(render);
      };

      const stopRendering = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      const visibilityHandler = () => {
        if (document.visibilityState === "hidden") {
          stopRendering();
        } else if (isInViewport) {
          clock.start();
          elapsed = 0;
          startRendering();
        }
      };

      document.addEventListener("visibilitychange", visibilityHandler);

      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === containerEl) {
              isInViewport = entry.isIntersecting;
              if (isInViewport && document.visibilityState === "visible") {
                startRendering();
              } else {
                stopRendering();
              }
            }
          });
        },
        { threshold: 0.1 }
      );

      intersectionObserver.observe(containerEl);

      cleanup = () => {
        document.removeEventListener("visibilitychange", visibilityHandler);
        intersectionObserver.disconnect();
        stopRendering();
        resizeObserver.disconnect();
        worker.terminate();
        if (renderer.domElement) {
          containerEl.removeChild(renderer.domElement);
        }
        renderer.dispose();
        baseSphere.dispose();
        baseMaterial.dispose();
        material.dispose();
        globeGroup.remove(pointsMesh);
        geometry.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) object.material.dispose();
          }
        });
      };
    };

    void init();

    return () => {
      isActive = false;
      threeRef.current = null;
      spawnFireworksRef.current = null;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
