/**
 * @file assets/js/main.js
 * @description Entry point for the application; initializes scene, controls, UI, and wires all modules.
 * @module main
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */
import { THREE } from './vendor/three.js';
import { initUI} from './ui/init.js';
import { initScene, startLoop, registerResizeHandler } from './core/scene.js';
import { initControls } from './core/controls.js';
import { updateSmokePuffs } from './animations/animations.js';
import { registerLevelHotkeys } from './core/level.js';
import { levelContainers } from './core/store.js';
import { setupRoomHover, registerMouseleaveHandler } from './ui/hoverLabel.js';
import { registerRecalculateExits } from './scene/exits.js';
import { updateRoomPosition } from './state/rooms.js';
import { initRoomFieldListeners } from './ui/inputs.js';
import { registerPointerupHandler } from './interaction/dragging.js';
import { registerLevelWheel } from './ui/levelWheel.js';
import { handlePointerDown } from './interaction/selection.js';
import { recalculateAvailableVnums } from './core/state.js';

window.addEventListener('load', () => {

  // Remove loading class to apply app reveal logic
  document.documentElement.classList.remove('loading');

  // --- Initialize UI ---
  initUI();

  // --- Initialize scene, camera, and renderer ---
  const { scene, camera, renderer } = initScene();

  // --- Add level containers to scene ---
  levelContainers.forEach(g => scene.add(g));

  // --- Initialize controls ---
  const controls = initControls(camera, renderer.domElement);

  startLoop(scene, camera, renderer, () => {
    controls.update();
    // --- Animate and clean up smoke puffs ---
    updateSmokePuffs(scene);
  });

  initRoomFieldListeners();

  // --- Interaction setup ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  setupRoomHover(renderer, camera, controls, raycaster, mouse, updateRoomPosition);

  // --- Track drag start position ---
  let dragStartPos = null;
  window.addEventListener('pointerdown', event =>
    handlePointerDown(event, mouse, camera, scene, raycaster, controls)
  );

  // --- Recalculate exits ---
  registerRecalculateExits();

  // --- Handle mouse leave to clear hover label ---
  registerMouseleaveHandler(renderer);

  // --- Register drag end (pointerup) handler ---
  registerPointerupHandler(controls, () => dragStartPos, v => { dragStartPos = v; });

  // --- Register level up/down hotkeys ---
  registerLevelHotkeys();

  // --- Register resize handler for camera and renderer ---
  registerResizeHandler(camera, renderer);

  // --- Register level wheel UI handler ---
  registerLevelWheel();

  // Recalculate available VNUMs after initialization
  recalculateAvailableVnums();

  // Hide loader and reveal app
  const loader = document.getElementById('loader-overlay');
  const app = document.getElementById('app');

  if (loader) {
    loader.style.transition = 'opacity 1s ease';
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  }

  if (app) {
    app.classList.remove('hidden');
    app.style.opacity = '0';
    app.style.transition = 'opacity 0.1s ease';
    requestAnimationFrame(() => {
      app.style.opacity = '1';
    });
  }

  // Add animated puff image sequence after sheepy spinner
  const puff = document.createElement('div');
  puff.className = 'puff-effect';
  document.body.appendChild(puff);
  puff.addEventListener('animationend', () => puff.remove());

});
