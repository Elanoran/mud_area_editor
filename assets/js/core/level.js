/**
 * @file assets/js/core/level.js
 * @module core/level
 * @description Lets level up.
 * @author Elanoran
 */

import { THREE } from '../vendor/three.js';

import { selectedRoom, setSelectedRoom } from '../core/state.js';
import { rooms, levelContainers, floorMeshes } from '../core/store.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { updateGrid, grid, getCurrentSurfaceTextures } from '../scene/grid.js';
import { updateCompassLabels, compassLabels } from '../scene/compass.js';
import { createSurfaceMaterial, setRoomEmissive } from '../textures/surface.js';
import { groundFloorVisible } from '../animations/animations.js';

export let currentLevel = 0;

export function switchLevel(newLevel) {
    // Clear selected room and remove any highlight outline
    if (selectedRoom) {
      if (selectedRoom.outlineMesh) {
        levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
        selectedRoom.outlineMesh.geometry.dispose();
        selectedRoom.outlineMesh.material.dispose();
        delete selectedRoom.outlineMesh;
      }
      setSelectedRoom(null);
    }
    // Clear any highlighted room from all levels
    for (const level of rooms) {
      for (const room of level) {
        setRoomEmissive(room?.material, 0x000000);
      }
    }

    currentLevel = newLevel;
    levelContainers.forEach((g, i) => {
      const levelIndex = i - LEVEL_OFFSET;
      const distance = Math.abs(levelIndex - currentLevel);
      if (distance <= 20) {
        g.visible = true;
        g.position.y = (levelIndex - currentLevel) * 2;
        g.traverse(obj => {
          if (obj.type === 'Line') return;
          if (obj.material && obj.material instanceof THREE.Material) {
            if (!obj.material.transparent) {
              obj.material.transparent = true;
            }
            // Always restore room color from userData.color, not from current color picker
            if (obj.material.color && obj.material.color instanceof THREE.Color) {
              // Use room.userData.color if present, else fallback to '#cccccc'
              const targetColor = obj.userData?.color || '#cccccc';
              obj.material.color.set(targetColor);
              // Optionally fade color toward 0x8888ff for distant levels (keep fade logic)
              const fadeFactor = Math.min(1.0, distance * 0.2);
              if (fadeFactor > 0.0) {
                obj.material.color.lerp(new THREE.Color(0x8888ff), fadeFactor);
              }
            }
          }
        });
      } else {
        g.visible = false;
      }
    });
    // Move grid to current level container and update its size
    let rows = 20, cols = 20;
    if (gridSelect?.value) {
      const [w, h] = gridSelect.options[gridSelect.selectedIndex].textContent.split('x').map(s => parseInt(s.trim()));
      rows = w;
      cols = h;
    }
    if (grid) {
      levelContainers.forEach(g => g.remove(grid));
      levelContainers[currentLevel + LEVEL_OFFSET].add(grid);
    }
    updateGrid(rows, cols);
    if (grid) {
      updateCompassLabels(grid, levelContainers);
      for (const key of Object.keys(compassLabels)) {
        levelContainers.forEach(g => g.remove(compassLabels[key]));
        levelContainers[currentLevel + LEVEL_OFFSET].add(compassLabels[key]);
      }
    }
}

// --- Floor follows lowest room level ---
 export function updateFloorToLowestLevel(width, height) {
    // Remove any existing floor meshes
    for (let key in floorMeshes) {
      if (floorMeshes[key]) {
        levelContainers[key].remove(floorMeshes[key]);
        floorMeshes[key].geometry.dispose();
        floorMeshes[key].material.dispose();
        delete floorMeshes[key];
      }
    }
    // Find lowest level with rooms
    let lowestIdx = null;
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].length > 0) {
        lowestIdx = i;
        break;
      }
    }
    if (lowestIdx === null) return; // no rooms anywhere

    // Create and add new floor mesh at the lowest room level
    // Use high subdivisions for displacement realism
    const floorGeometry = new THREE.PlaneGeometry(width, height, 120, 120);
    const floorMaterial = createSurfaceMaterial(getCurrentSurfaceTextures());
    // If AO map is present, set uv2 for geometry (required for AO/displacement)
    if (floorMaterial.aoMap) {
      if (!floorGeometry.attributes.uv2) {
        floorGeometry.setAttribute('uv2', new THREE.BufferAttribute(floorGeometry.attributes.uv.array, 2));
      }
    }
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    floorMesh.visible = groundFloorVisible;
    levelContainers[lowestIdx].add(floorMesh);
    floorMeshes[lowestIdx] = floorMesh;
  }

  // TODO: Move level hotkeys to core/level.js
export function registerLevelHotkeys() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'PageUp' && currentLevel < 20) {
      switchLevel(currentLevel + 1);
    } else if (e.code === 'PageDown' && currentLevel > -20) {
      switchLevel(currentLevel - 1);
    }
  });
}