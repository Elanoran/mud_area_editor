/**
 * @file assets/js/animations/animations.js
 * @description Animations functions.
 * @module animations/animations
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { floorMeshes } from '../core/store.js';
import { getMainLight } from '../core/scene.js';
import { updateFloorVisibilityButton } from '../ui/buttons.js';

let activePuffs = [];
export let groundFloorVisible = false;

/**
 * Updates and cleans up all active smoke and fire puffs.
 * @function updateSmokePuffs
 * @param {THREE.Scene} scene - The Three.js scene to remove faded puffs from.
 */
export function updateSmokePuffs(scene) {
  for (let i = activePuffs.length - 1; i >= 0; i--) {
    const puff = activePuffs[i];
    // fade opacity and rise
    puff.material.opacity *= 0.92;
    puff.position.y += puff.userData.isFire ? 0.02 : 0.01;
    if (puff.material.opacity < 0.05) {
      scene.remove(puff);
      puff.geometry.dispose();
      puff.material.dispose();
      activePuffs.splice(i, 1);
    }
  }
}

/**
 * Spawns smoke puff meshes at the given position and tracks them for cleanup.
 * @param {THREE.Vector3} position - World position for puff origin.
 * @param {THREE.Scene} scene - The Three.js scene to add puffs to.
 */
export function spawnFireAndSmoke_MARKED_FOR_DELETE(position, scene) {
  for (let i = 0; i < 12; i++) {
    const geometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 1
    });
    const puff = new THREE.Mesh(geometry, material);
    puff.position.copy(position);
    scene.add(puff);
    activePuffs.push(puff);
  }
}

// --- Animate a light streak between two points (exit link effect) ---
export function animateStreak(from, to, levelIndex, levelContainers) {
    const streakMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff33,
      transparent: true,
      opacity: 1
    });
    const streakGeom = new THREE.SphereGeometry(0.13, 10, 10);
    const streak = new THREE.Mesh(streakGeom, streakMaterial);
    streak.position.copy(from);
    levelContainers[levelIndex].add(streak);

    let t = 0;
    const duration = 0.4; // seconds
    const start = performance.now();

    function animate() {
      const elapsed = (performance.now() - start) / 1000;
      t = Math.min(1, elapsed / duration);
      streak.position.lerpVectors(from, to, t);
      streak.material.opacity = 1 - t;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        levelContainers[levelIndex].remove(streak);
        streak.geometry.dispose();
        streak.material.dispose();
      }
    }
    animate();
}

export function spawnFireAndSmoke(pos, scene, fireCount = 6, smokeCount = 6) {
  // Fire puffs
  for (let i = 0; i < fireCount; i++) {
    const geo = new THREE.SphereGeometry(0.09 + Math.random() * 0.10, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08 + 0.10 * Math.random(), 1, 0.55 + Math.random() * 0.15),
      transparent: true,
      opacity: 0.8,
      emissive: 0xff6600,
      emissiveIntensity: 1.1,
      roughness: 0.5,
      metalness: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.20;
    mesh.position.y += 0.38 + Math.random() * 0.16;
    mesh.position.z += (Math.random() - 0.5) * 0.20;
    mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: true };

    scene.add(mesh);
    activePuffs.push(mesh);
  }
  // Smoke puffs
  for (let i = 0; i < smokeCount; i++) {
    const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.45 + Math.random() * 0.25,
      roughness: 1,
      metalness: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.25;
    mesh.position.y += 0.44 + Math.random() * 0.23;
    mesh.position.z += (Math.random() - 0.5) * 0.25;
    mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: false };

    scene.add(mesh);
    activePuffs.push(mesh);
  }
}

// --- Animate room falling and explosion effect ---
export function animateRoomFallAndExplode(roomMesh, levelContainer, scene) {
    levelContainer.remove(roomMesh);
    levelContainer.add(roomMesh);

    // Start at current y
    let startY = roomMesh.position.y;
    let targetY = startY - 1; // Always fall one full unit
    let velocity = 0;
    let gravity = -0.040; // lower = slower fall (changed from -0.020)
    let frame = 0;
    let maxFrames = 120; // changed from 240

    function fallFrame() {
      velocity += gravity;
      if (velocity < -0.20) velocity = -0.20; // limit max fall speed
      roomMesh.position.y += velocity;
      frame++;
      if (roomMesh.position.y <= targetY || frame >= maxFrames) {
        roomMesh.position.y = targetY;
        spawnFireAndSmoke(roomMesh.position.clone(), levelContainer);
        setTimeout(() => {
          levelContainer.remove(roomMesh);
          roomMesh.geometry.dispose();
          roomMesh.material.dispose();
        }, 400); // changed from 700
        return;
      }
      requestAnimationFrame(fallFrame);
    }
    fallFrame();
  }

// --- Animate room falling with a funny cartoon explosion effect ---
export function animateRoomExplode(roomMesh, levelContainer, scene) {
  // Capture the room's world position
  const origin = roomMesh.position.clone();

  // Remove and dispose of the room mesh immediately
  levelContainer.remove(roomMesh);
  roomMesh.geometry.dispose();
  roomMesh.material.dispose();

  // Create and animate a quick cartoon explosion at the former room position
  const particles = [];
  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const size = 0.2 + Math.random() * 0.2;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      emissive: new THREE.Color(
        Math.random() * 0.7,
        Math.random() * 0.7,
        Math.random() * 0.7
      ),
      opacity: 1,
      transparent: true
    });
    const cube = new THREE.Mesh(geo, mat);
    cube.position.copy(origin);
    levelContainer.add(cube);
    particles.push(cube);

    // Animate each cube
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.7 + 0.3,
      Math.random() - 0.5
    ).normalize();
    const speed = 0.05 + Math.random() * 0.1;
    let age = 0;
    function explodeFrame() {
      age++;
      cube.position.addScaledVector(dir, speed);
      cube.rotation.x += 0.2;
      cube.rotation.y += 0.2;
      cube.material.opacity = 1 - age / 25;
      if (cube.material.opacity > 0) {
        requestAnimationFrame(explodeFrame);
      } else {
        levelContainer.remove(cube);
        cube.geometry.dispose();
        cube.material.dispose();
      }
    }
    requestAnimationFrame(explodeFrame);
  }
}

// --- Animate breaking link effect ---
export function animateBreakingLink(positionArray, levelContainers) {
    // positionArray: [from.x, from.y, from.z, to.x, to.y, to.z]
    const [x1, y1, z1, x2, y2, z2] = positionArray;
    // Create particles along the line that break apart and fade out
    const numParticles = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numParticles; i++) {
      const t = i / (numParticles - 1);
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.13;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 0.13;
      const z = z1 + (z2 - z1) * t + (Math.random() - 0.5) * 0.13;
      const particleGeom = new THREE.SphereGeometry(0.10 + Math.random() * 0.06, 8, 8);
      const particleMat = new THREE.MeshStandardMaterial({
        color: 0xffff33,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.set(x, y, z);

      // Find the most appropriate level for the animation (use the fromRoom's level if possible)
      let levelIdx = LEVEL_OFFSET; // default
      if (Array.isArray(positionArray) && positionArray.length >= 6) {
        // Try to find a room at this position
        // We'll use y1 as the level indicator, assuming rooms are offset by (level * 2) in y
        // So estimate the level:
        let approxLevel = Math.round(y1 / 2);
        let possibleIdx = approxLevel + LEVEL_OFFSET;
        if (levelContainers[possibleIdx]) {
          levelIdx = possibleIdx;
        }
      }
      levelContainers[levelIdx].add(particle);

      // Animate each particle to "break away"
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.13,
        0.05 + Math.random() * 0.13,
        (Math.random() - 0.5) * 0.13
      );
      let age = 0;
      const lifetime = 0.4 + Math.random() * 0.5;
      function animateParticle() {
        age += 0.018;
        particle.position.add(velocity);
        particle.material.opacity *= 0.86;
        if (age < lifetime && particle.material.opacity > 0.04) {
          requestAnimationFrame(animateParticle);
        } else {
          levelContainers[levelIdx].remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        }
      }
      animateParticle();
    }
}

// --- Animate a room "pop-in" effect on creation ---
export function animateRoomPopIn(roomMesh) {
  roomMesh.scale.set(0.1, 0.1, 0.1);
  const targetScale = { x: 1, y: 1, z: 1 };
  let t = 0;
  function popFrame() {
    t += 0.08;
    // Optional: Ease-out and bounce
    const eased = t < 1 ? (1 - Math.pow(1 - t, 3)) : 1;
    let overshoot = 1 + 0.12 * Math.sin(10 * t) * (1 - t); // Small bounce
    roomMesh.scale.set(
      THREE.MathUtils.lerp(0.1, targetScale.x * overshoot, eased),
      THREE.MathUtils.lerp(0.1, targetScale.y * overshoot, eased),
      THREE.MathUtils.lerp(0.1, targetScale.z * overshoot, eased)
    );
    if (t < 1) {
      requestAnimationFrame(popFrame);
    } else {
      roomMesh.scale.set(1, 1, 1);
    }
  }
  popFrame();
}

// --- Animate sun (directional light) up/down and fade floor in/out ---
export function animateSunAndFloor(show, duration = 1200) {
    const light = getMainLight();
    if (!light) return;
    if (window.sunAnimationActive) return;
    window.sunAnimationActive = true;
    const startTime = performance.now();

    // Sun positions
    const east = new THREE.Vector3(15, 2, 0);                  // sunrise
    const mid = new THREE.Vector3(7, 12, 7);                   // noon (highest)
    const west = new THREE.Vector3(-15, 2, 0);                 // sunset

    // Floor fade
    let affectedFloors = [];
    for (let key in floorMeshes) {
      if (floorMeshes[key]) affectedFloors.push(floorMeshes[key]);
    }
    affectedFloors.forEach(floor => {
      if (!floor.material.transparent) floor.material.transparent = true;
    });

    // Animate: Show (east→mid), Hide (mid→west)
    const from = show ? east : mid;
    const to   = show ? mid  : west;

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);

      // Animate sun
      light.position.lerpVectors(from, to, t);

      // Animate floor opacity even faster in/out (10% at start/end)
      let opacity = 1;
      if (show) {
        // Fade in extremely fast (first 10%)
        opacity = t < 0.1 ? (t / 0.1) : 1;
      } else {
        // Stay fully visible until last 10%, then fade fast
        opacity = t < 0.9 ? 1 : 1 - ((t - 0.9) / 0.1);
      }
      opacity = Math.max(0, Math.min(1, opacity));

      affectedFloors.forEach(floor => {
        floor.material.opacity = opacity;
        floor.visible = opacity > 0.01;
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Snap to final positions and values
        light.position.copy(to);
        affectedFloors.forEach(floor => {
          floor.material.opacity = show ? 1 : 0;
          floor.visible = show;
        });
        window.sunAnimationActive = false;
      }
    }

    requestAnimationFrame(step);
  }

  // Function to show/hide the floor mesh with animation
 export function setGroundFloorVisible(visible) {
    // Only run animation if visibility changes
    if (groundFloorVisible === visible) return;
    if (window.sunAnimationActive) return;
    groundFloorVisible = visible;
    // For fade in: make sure all are visible at start
    if (visible) {
      for (let key in floorMeshes) {
        if (floorMeshes[key]) {
          floorMeshes[key].visible = true;
        }
      }
    }
    animateSunAndFloor(visible);
    updateFloorVisibilityButton();
  }

  // Set to hidden on start
  setGroundFloorVisible(false);

 export function spawnSmokePuff(pos, scene, count = 6) {
    // Fire puffs
    for (let i = 0; i < fireCount; i++) {
      const geo = new THREE.SphereGeometry(0.09 + Math.random() * 0.10, 10, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08 + 0.10 * Math.random(), 1, 0.55 + Math.random() * 0.15),
        transparent: true,
        opacity: 0.8,
        emissive: 0xff6600,
        emissiveIntensity: 1.1,
        roughness: 0.5,
        metalness: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.20;
      mesh.position.y += 0.38 + Math.random() * 0.16;
      mesh.position.z += (Math.random() - 0.5) * 0.20;
      mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: true };

      scene.add(mesh);
      activePuffs.push(mesh);
    }
    // Smoke puffs
    for (let i = activePuffs.length - 1; i >= 0; i--) {
      const puff = activePuffs[i];
      puff.userData.puffLife += 0.016;
      if (puff.userData.isFire) {
        // Fire puffs: fast, fade+shrink+orange
        puff.material.opacity *= 0.84;
        puff.material.emissiveIntensity *= 0.90;
        puff.scale.multiplyScalar(1.09 + 0.01 * Math.random());
        puff.position.y += 0.016 * puff.userData.puffSpeed;
      } else {
        // Smoke puffs: slow, fade+grow+drift
        puff.material.opacity *= 0.93;
        puff.scale.multiplyScalar(1.04 + 0.01 * Math.random());
        puff.position.y += 0.012 * puff.userData.puffSpeed;
      }
      if (puff.material.opacity < 0.05) {
        scene.remove(puff);
        puff.geometry.dispose();
        puff.material.dispose();
        activePuffs.splice(i, 1);
      }
    }
}