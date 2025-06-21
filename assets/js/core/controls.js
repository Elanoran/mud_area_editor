/**
 * @file assets/js/core/controls.js
 * @description Initializes and configures camera controls (e.g., OrbitControls) and grid lock.
 * @module core/controls
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */
import { OrbitControls } from '../vendor/three.js';

/**
 * Initializes OrbitControls for the given camera and DOM element.
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @returns {OrbitControls}
 */
export function initControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 0, 0);
  controls.update();
  return controls;
}
