/**
 * @file assets/js/animations/animations.js
 * @description Animations functions.
 * @module animations/animations
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */


import { updateRoomPosition } from '../state/rooms.js';
import { removeAllWallLabels, getCurrentFloorSize, updateFloorToLowestLevel } from '../core/level.js';


import { THREE } from '../vendor/three.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { floorMeshes } from '../core/store.js';
import { getMainLight } from '../core/scene.js';
import { updateFloorVisibilityButton } from '../ui/buttons.js';

let activePuffs = [];
export let groundFloorVisible = true;

export const floorToggleBtn = document.getElementById('floorToggleBtn');

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
export function animateSunAndFloor(show, duration = 1200, onDone) {
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
        floor.visible = true; // Always keep visible during animation
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Snap to final positions and values
        light.position.copy(to);
        affectedFloors.forEach(floor => {
          floor.material.opacity = show ? 1 : 0;
          // No longer set .visible here!
        });
        window.sunAnimationActive = false;
        if (typeof onDone === "function") onDone();
      }
    }

    requestAnimationFrame(step);
  }

// Function to show/hide the floor mesh with animation
export function setGroundFloorVisible(visible) {
  if (window.sunAnimationActive) return;

  if (visible) {
    // Always re-show (even if already flagged)
    for (let key in floorMeshes) {
      if (floorMeshes[key]) {
        floorMeshes[key].visible = true;      // Ensure visible
        floorMeshes[key].material.opacity = 0; // Start fade-in from 0 opacity
      }
    }
    groundFloorVisible = true;
    updateFloorVisibilityButton();
    animateSunAndFloor(true, undefined, () => {
      const [width, height] = getCurrentFloorSize();
      updateFloorToLowestLevel(width, height);
    });
  } else {
    if (groundFloorVisible === false) return;
    animateSunAndFloor(false, undefined, () => {
      for (let key in floorMeshes) {
        if (floorMeshes[key]) floorMeshes[key].visible = false;
      }
      groundFloorVisible = false;
      updateFloorVisibilityButton();
      removeAllWallLabels();
    });
  }
}

  // Set to hidden on start
  setGroundFloorVisible(true);

export function spawnSmokePuff(pos, scene, count = 6) {
  // Determine the actual THREE.Scene root from the provided container
  let targetScene = scene;
  while (targetScene && !targetScene.isScene) {
    targetScene = targetScene.parent;
  }
  if (!targetScene) targetScene = scene;
  // Smoke puffs only
  for (let i = 0; i < count; i++) {
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
    // Store puff speed for update
    mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5 };
    targetScene.add(mesh);
    activePuffs.push(mesh);
  }
  // Always run cleanup loop
  const sceneRef = targetScene;
  (function animateSmoke() {
    updateSmokePuffs(sceneRef);
    if (activePuffs.length > 0) {
      requestAnimationFrame(animateSmoke);
    }
  })();
}

/**
 * Animate a quick horizontal “throw-back” with smoke and a floor ripple.
 * @param {THREE.Object3D & { mesh?: THREE.Object3D }} room
 */
export function animateCollisionBounce(room) {
  // Record original position
  const origPos = room.position.clone();
  const bounceHeight = 0.3;
  const upDuration = 70;    // ms rising
  const downDuration = 300;  // ms falling
  // Animate rising
  const upStart = performance.now();
  function animateUp(now) {
    const t = Math.min(1, (now - upStart) / upDuration);
    const y = THREE.MathUtils.lerp(origPos.y, origPos.y + bounceHeight, t);
    updateRoomPosition(room, origPos.x, origPos.z, y);
    if (t < 1) {
      requestAnimationFrame(animateUp);
    } else {
      // Animate falling with bounce easing
      const downStart = performance.now();
      function bounceOut(t) {
        // simple easeOutBounce
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      }
      function animateDown(now2) {
        const t2 = Math.min(1, (now2 - downStart) / downDuration);
        const eased = bounceOut(t2);
        const y2 = THREE.MathUtils.lerp(origPos.y + bounceHeight, origPos.y, eased);
        updateRoomPosition(room, origPos.x, origPos.z, y2);
        if (t2 < 1) {
          requestAnimationFrame(animateDown);
        } else {
          // Effects at end of bounce
          // Spawn smoke
          if (typeof spawnSmokePuff === 'function') {
            spawnSmokePuff(origPos.clone(), room.parent, /*count=*/8);
          }
          // Ripple under room
          const ringGeo = new THREE.RingGeometry(0.3, 0.35, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          // Start ring hidden under the room
          ring.scale.set(0.001, 0.001, 1);
          ring.renderOrder = 0;
          ring.material.depthWrite = false;
          ring.material.depthTest = false;
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(origPos.x, origPos.y - 0.49, origPos.z);
          room.parent.add(ring);
          const rippleStart = performance.now();
          function animateRipple(now3) {
            const t3 = Math.min(1, (now3 - rippleStart) / 300);
            const scale = 3 * t3;
            ring.scale.set(scale, scale, 1);
            ring.material.opacity = 0.6 * (1 - t3);
            if (t3 < 1) {
              requestAnimationFrame(animateRipple);
            } else {
              room.parent.remove(ring);
              ring.geometry.dispose();
              ring.material.dispose();
            }
          }
          requestAnimationFrame(animateRipple);
        }
      }
      requestAnimationFrame(animateDown);
    }
  }
  requestAnimationFrame(animateUp);
}