/**
 * @file assets/js/core/scene.js
 * @description Sets up Three.js scene, camera, renderer, lights, and animation loop.
 * @module core/scene
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */


import { THREE } from '../vendor/three.js';

let scene = null;
let light = null;

export function initScene(container = document.body, lightSetup = 'default') {
  // Assign to module-level scene so getScene() works
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 7, 10);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // --- Lighting setups ---
  if (lightSetup === 'default') {
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    // Assign to module-level light so getMainLight() works
    light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(5, 10, 7);
    scene.add(light);
    light.castShadow = true;
    light.shadow.mapSize.width  = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.left    = -50;
    light.shadow.camera.right   = 50;
    light.shadow.camera.top     = 50;
    light.shadow.camera.bottom  = -50;
    light.shadow.camera.near    = 1;
    light.shadow.camera.far     = 100;
  }
  // Placeholder for other lighting configs, e.g.:
  // else if (lightSetup === 'noon') { ... }
  // else if (lightSetup === 'night') { ... }

  return { scene, camera, renderer };
}

export function getMainLight() {
  return light;
}

// Export a getter
export function getScene() {
  return scene;
}

/**
 * Starts the render loop.  
 * @param {THREE.Scene} scene  
 * @param {THREE.Camera} camera  
 * @param {THREE.Renderer} renderer  
 * @param {Function} onFrame  Callback for per-frame updates (e.g. controls.update(), effects)
 */
export function startLoop(scene, camera, renderer, onFrame) {
  function animate() {
    requestAnimationFrame(animate);
    onFrame();
    renderer.render(scene, camera);
  }
  animate();
}

// TODO: Move resize handler to core/scene.js
export function registerResizeHandler(camera, renderer) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}