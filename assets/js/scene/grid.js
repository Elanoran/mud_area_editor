 /**
 * @file assets/js/scene/grid.js
 * @module scene/grid
 * @description grid.
 * @author Elanoran
 */

import { THREE } from '../vendor/three.js';
import { floorMeshes, levelContainers } from '../core/store.js';
import { createSurfaceMaterial, loadSurfaceTextures } from '../textures/surface.js';
import { groundFloorVisible } from '../animations/animations.js';
import { currentLevel, updateFloorToLowestLevel } from '../core/level.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { updateCompassLabels } from '../scene/compass.js';

/* 
 * grass, asphalt, fabric, blue, sand, dirt, charcoal
 */
let currentSurface = 'charcoal';
let surfaceTextures = loadSurfaceTextures(currentSurface);

// grid
export let grid;
export let gridSize = { width: 20, height: 20 };

export function setGridSize(width, height) {
  gridSize.width = width;
  gridSize.height = height;
}
export function getGridSize() {
  return { ...gridSize };
}

export function setCurrentSurface(type) {
  currentSurface = type;
  surfaceTextures = loadSurfaceTextures(currentSurface);
}

export function getCurrentSurfaceTextures() {
  return surfaceTextures;
}

// Use surfaceTextures inside updateGrid or floor creation functions


export let gridVisible = true;

/**
 * Sets whether the grid is visible.
 * @param {boolean} val
 */
export function setGridVisible(val) {
  gridVisible = val;
}

/**
 * Returns whether the grid is visible.
 * @returns {boolean}
 */
export function getGridVisible() {
  return gridVisible;
}

export function updateGrid(width, height) {
  // Remove any previous grid
  if (grid) {
    levelContainers.forEach(g => g.remove(grid));
  }

  // Remove ALL previous floor meshes from ALL levels, not just the current
  for (let key in floorMeshes) {
    if (floorMeshes[key]) {
      levelContainers[key].remove(floorMeshes[key]);
      floorMeshes[key].geometry.dispose();
      floorMeshes[key].material.dispose();
      delete floorMeshes[key];
    }
  }

    // Create new floor mesh for the current level only
    // Use high subdivisions for detailed displacement
    const floorGeometry = new THREE.PlaneGeometry(width, height, 120, 120);
    const floorMaterial = createSurfaceMaterial(surfaceTextures);
    // If AO map is present, set uv2 for geometry (required for AO/displacement)
    if (floorMaterial.aoMap) {
      // Ensure geometry has uv2 (Three.js requires this for AO/displacement)
      if (!floorGeometry.attributes.uv2) {
        floorGeometry.setAttribute('uv2', new THREE.BufferAttribute(floorGeometry.attributes.uv.array, 2));
      }
    }
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    floorMesh.visible = groundFloorVisible;
    levelContainers[currentLevel + LEVEL_OFFSET].add(floorMesh);
    floorMeshes[currentLevel + LEVEL_OFFSET] = floorMesh;

    const spacing = 1;
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.3 });

    for (let i = 0; i <= height; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, i * spacing),
        new THREE.Vector3(width * spacing, 0, i * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    for (let j = 0; j <= width; j++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(j * spacing, 0, 0),
        new THREE.Vector3(j * spacing, 0, height * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    group.position.set(-width / 2, 0, -height / 2);

    // Add dummy geometry.parameters so compass can access dimensions
    group.geometry = { parameters: { width, height } };

    grid = group;
    levelContainers[currentLevel + LEVEL_OFFSET].add(grid);
    updateCompassLabels(grid, levelContainers);
    updateFloorToLowestLevel(width, height);
  }