/**
 * @file assets/js/scene/compass.js
 * @description Compass for scene.
 * @module scene/compass
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';
import { LEVEL_OFFSET } from '../constants/index.js';

// --- Compass label logic ---
export let compassLabels = null;

// Compass label meshes (Text Meshes or Sprites for N/S/E/W)
export function createCompassLabels() {
    // Helper to create a text mesh for a label
    function makeTextMesh(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        context.clearRect(0, 0, canvas.width, canvas.height); // ensure fully transparent

        context.font = 'bold 28px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = getCompassColor(text);
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,   // always draw above floor
        depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 1, 1);
        sprite.renderOrder = 999; // always on top!
        return sprite;
    }
    function getCompassColor(text) {
        if (text === 'N') {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-north-color').trim() || 'red';
        } else if (text === 'S') {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-south-color').trim() || 'green';
        } else {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-default-color').trim() || 'white';
        }
    }
    // Create meshes for each direction
    return {
        north: makeTextMesh('N'),
        south: makeTextMesh('S'),
        east:  makeTextMesh('E'),
        west:  makeTextMesh('W')
    };
}

export function updateCompassLabels(grid, levelContainers) {
    if (!grid?.geometry?.parameters) return;

    if (!compassLabels) {
      compassLabels = createCompassLabels();
    } else {
      for (const key of Object.keys(compassLabels)) {
        levelContainers[LEVEL_OFFSET].remove(compassLabels[key]);
      }
    }

    const { width, height } = grid.geometry.parameters;

    const COMPASS_Y = 0.51; // Just above the floor and rooms
    compassLabels.north.position.set(0, COMPASS_Y, -height / 2);
    compassLabels.south.position.set(0, COMPASS_Y, height / 2);
    compassLabels.east.position.set(width / 2, COMPASS_Y, 0);
    compassLabels.west.position.set(-width / 2, COMPASS_Y, 0);

    for (const key of Object.keys(compassLabels)) {
      levelContainers[LEVEL_OFFSET].add(compassLabels[key]);
    }
  }