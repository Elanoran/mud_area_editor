/**
 * @file assets/js/core/level.js
 * @module core/level
 * @description Lets level up.
 * @author Elanoran
 */

import { THREE } from '../vendor/three.js';

// Fade control state
export let fadeLevelIndex = 0;
export const MAX_FADE_STEPS = 4;
export const FADE_INCREMENT = 1 / MAX_FADE_STEPS;

/**
 * Cycle through fade levels (0 = no fade → MAX_FADE_STEPS)
 * Returns the new fadeLevelIndex.
 */
export function cycleFadeLevel() {
  fadeLevelIndex = (fadeLevelIndex + 1) % (MAX_FADE_STEPS + 1);
  return fadeLevelIndex;
}

// Helper: Remove all wall label meshes from all levels
export function removeAllWallLabels() {
  const wallLabelPrefix = 'wallLabel_';
  levelContainers.forEach(container => {
    container.children
      .filter(obj => obj.name && obj.name.startsWith(wallLabelPrefix))
      .forEach(obj => {
        container.remove(obj);
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      });
  });
}
// Wall label color name mapping
const WALL_LABEL_COLORS = {
  'red': 0xff4b4b,
  'blue': 0x4b82ff,
  'green': 0x33dd77,
  'yellow': 0xffe44b,
  'purple': 0xcc44ff,
  'orange': 0xffa500,
  'white': 0xffffff,
  'gray': 0x888888,
  'default': 0xffffff
};
// --- Add a 3D text label to the south wall of the ground floor ---
import { FontLoader } from '../vendor/three.js';
import { TextGeometry } from '../vendor/three.js';

import { selectedRoom, setSelectedRoom, areaNameInput } from '../core/state.js';
import { groundFloorThickness, groundFloorOffset } from '../core/settings.js';
import { rooms, levelContainers, floorMeshes } from '../core/store.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { updateGrid, grid, getCurrentSurfaceTextures, getGridVisible, setGridVisible } from '../scene/grid.js';
import { updateCompassLabels, compassLabels } from '../scene/compass.js';
import { createSurfaceMaterial, setRoomEmissive } from '../textures/surface.js';
import { groundFloorVisible } from '../animations/animations.js';
import { SURFACE_MATERIALS } from '../textures/surface.js';

export let currentLevel = 0;

export function switchLevel(newLevel, deselect = true) {
    if (deselect) {
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
      // Show all levels (we'll fade rooms based on distance)
      g.visible = true;
      g.position.y = (levelIndex - currentLevel) * 2;
      g.traverse(obj => {
        // Skip non-visual groups
        if (!obj.material) return;
        // Compute fade strength: current level fully opaque, others fade by distance
        const fadeStrength = Math.min(1.0, distance * fadeLevelIndex * FADE_INCREMENT);
        // Support single or multi-material
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          mat.transparent = true;
          mat.opacity = 1 - fadeStrength;
          mat.needsUpdate = true;
        }
      });
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
    // Toggle grid visibility if it was previously hidden when switching levels
    if (!getGridVisible()) {
      setGridVisible(!getGridVisible());
    }
    updateGrid(rows, cols);
    if (grid) {
      updateCompassLabels(grid, levelContainers);
    }
    // Reposition and fade exit lines in world space
    rooms.forEach(level =>
      level.forEach(room =>
        (room.userData.exitLinks || []).forEach(line => {
          // -- reposition
          const posAttr = line.geometry?.attributes?.position;
          if (posAttr && posAttr.array) {
            const fromRoom = line.userData.fromRoom;
            const toRoom   = line.userData.toRoom;
            const worldFrom = new THREE.Vector3();
            const worldTo   = new THREE.Vector3();
            fromRoom.getWorldPosition(worldFrom);
            toRoom.getWorldPosition(worldTo);
            const pos = posAttr.array;
            pos[0] = worldFrom.x; pos[1] = worldFrom.y; pos[2] = worldFrom.z;
            pos[3] = worldTo.x;   pos[4] = worldTo.y;   pos[5] = worldTo.z;
            posAttr.needsUpdate = true;
          }
          // -- directional fade based on link midpoint level
          if (line.material) {
            const materials = Array.isArray(line.material) ? line.material : [line.material];
            const fromLevel = line.userData.fromRoom.userData.level;
            const toLevel   = line.userData.toRoom.userData.level;
            const midLevel  = (fromLevel + toLevel) / 2;
            const distance  = Math.abs(midLevel - currentLevel);
            // Compute base fade by level distance and fade step
            const baseFade = distance * fadeLevelIndex * FADE_INCREMENT;
            // If the link is horizontal (same-level) on a non-current floor, fade it more aggressively
            const isHorizontal = (fromLevel === toLevel);
            const fadeMultiplier = isHorizontal ? 2.0 : 1.5;
            const fadeStrength = Math.min(1.0, baseFade * fadeMultiplier);
            materials.forEach(mat => {
              mat.transparent = true;
              mat.opacity     = 1 - fadeStrength;
              mat.needsUpdate = true;
            });
          }
        })
      )
    );
}

/**
 * Returns the current grid width and height as [width, height].
 * It uses the current grid selection or defaults to 20x20 if not set.
 */
export function getCurrentFloorSize() {
  let rows = 20, cols = 20;
  if (typeof gridSelect !== "undefined" && gridSelect?.value) {
    const [w, h] = gridSelect.options[gridSelect.selectedIndex].textContent.split('x').map(s => parseInt(s.trim()));
    rows = w;
    cols = h;
  }
  return [rows, cols];
}

/**
 * Adds all wall labels for the ground floor.
 * @param {number} width - Ground/floor width.
 * @param {number} wallHeight - Wall/ground height.
 * @param {number} height - Grid height.
 * @param {number} lowestIdx - Level index for placement.
 * @param {number} floorTopY - Y position of floor top.
 * @param {boolean} useBoxLabels - If true, use box label placement logic (non-displacement ground).
 */
export function addGroundWallLabels(width, wallHeight, height, lowestIdx, floorTopY, useBoxLabels = false) {
  const areaNameElem = document.getElementById('areaName');
  const areaNameText = areaNameElem?.value || areaNameElem?.textContent || 'Area Name';
  addWallLabel(areaNameText, width, wallHeight, width, height, "south", lowestIdx, {
    align: "left",
    fontSize: 0.2,
    sideMargin: 0.4,
    fromTop: true,
    topMargin: useBoxLabels ? 0.7 : 0.4,
    baseY: floorTopY,
    labelYOffset: 0.15
  });

  addWallLabel('North', width, wallHeight, width, height, "north", lowestIdx, {
    align: "center",
    fontSize: 0.2,
    baseY: floorTopY,
    labelYOffset: 0.15,
    labelColor: "red"
  });

  addWallLabel('South', width, wallHeight, width, height, "south", lowestIdx, {
      align: "center",
      fontSize: 0.2,
      baseY: floorTopY,
      labelYOffset: 0.15,
      labelColor: "green"
    });
    addWallLabel('West', width, wallHeight, width, height, "west", lowestIdx, {
      align: "center",
      fontSize: 0.2,
      baseY: floorTopY,
      labelYOffset: 0.15
    });
    addWallLabel('East', width, wallHeight, width, height, "east", lowestIdx, {
      align: "center",
      fontSize: 0.2,
      baseY: floorTopY,
      labelYOffset: 0.15
    });

  if (!useBoxLabels) {
    
  }
}

// --- Ground Floor follows lowest room level ---
export function updateFloorToLowestLevel(width, height) {
  //console.log('updateFloorToLowestLevel called');
  // Ground thickness and vertical offset from the grid plane
  const thickness = groundFloorThickness;  // fixed base floor thickness
  const offset = groundFloorOffset;        // vertical offset from grid

  let wallHeight = 0;

  // Remove any existing floor meshes and skirts
  for (let key in floorMeshes) {
    if (floorMeshes[key]) {
      const containerKey = key.replace('_skirt', '');
      levelContainers[containerKey]?.remove(floorMeshes[key]);
      floorMeshes[key].geometry.dispose();
      floorMeshes[key].material.dispose();
      delete floorMeshes[key];
    }
  }

  // Remove any previous wall label meshes on ALL levels to avoid overlap
  const wallLabelPrefix = 'wallLabel_';
  levelContainers.forEach(container => {
    container.children
      .filter(obj => obj.name && obj.name.startsWith(wallLabelPrefix))
      .forEach(obj => {
        container.remove(obj);
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      });
  });

  // Find lowest level with rooms
  let lowestIdx = null;
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].length > 0) {
      lowestIdx = i;
      break;
    }
  }
  // If no rooms found, default to level 0 with LEVEL_OFFSET applied
  if (lowestIdx === null) {
    lowestIdx = 0 + LEVEL_OFFSET;
  } 

  const floorMaterial = createSurfaceMaterial(getCurrentSurfaceTextures());
  const hasDisplacement = !!floorMaterial.displacementMap;

  const surfaceName = (() => {
    const textures = getCurrentSurfaceTextures();
    if (textures && textures.base) {
      for (const key in SURFACE_MATERIALS) {
        if (textures.base.startsWith(SURFACE_MATERIALS[key].base)) {
          return key;
        }
      }
    }
    return 'grass';
  })();

  const surfaceMaterial = SURFACE_MATERIALS[surfaceName] || {};
  const dispRaw = floorMaterial.displacementScale !== undefined
  ? floorMaterial.displacementScale
  : (surfaceMaterial.displacementScale || 0);

  const disp = Math.min(dispRaw, 0.1); // max bump height 0.1

  const totalHeight = thickness + 2 * disp;
  wallHeight = totalHeight;

  if (hasDisplacement) {
    const subdivisions = 120;

    const planeGeo = new THREE.PlaneGeometry(width, height, subdivisions, subdivisions);
    if (floorMaterial.aoMap && !planeGeo.attributes.uv2) {
      planeGeo.setAttribute('uv2', new THREE.BufferAttribute(planeGeo.attributes.uv.array, 2));
    }
    const plane = new THREE.Mesh(planeGeo, floorMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -(offset + wallHeight / 2), 0);
    plane.receiveShadow = true;
    plane.visible = groundFloorVisible;
    levelContainers[lowestIdx].add(plane);
    floorMeshes[lowestIdx] = plane;

    const floorTopY = -(offset + disp / 2);
    //console.log('floorTopY:', floorTopY, 'totalHeight:', totalHeight, 'offset:', offset);

    const skirtOverlap = disp;
    const skirtHeight = totalHeight;
    const skirtMat = floorMaterial.clone();
    skirtMat.displacementMap = null;
    skirtMat.bumpMap = null;
    skirtMat.normalMap = null;
    skirtMat.aoMap = null;
    skirtMat.roughnessMap = null;
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(width, skirtHeight, height),
      skirtMat
    );
    skirt.position.set(0, -(offset + disp + skirtHeight / 2 - skirtOverlap), 0);
    skirt.receiveShadow = true;
    skirt.visible = groundFloorVisible;
    levelContainers[lowestIdx].add(skirt);
    floorMeshes[lowestIdx + '_skirt'] = skirt;

    if (groundFloorVisible) {
      addGroundWallLabels(width, wallHeight, height, lowestIdx, floorTopY, /*useBoxLabels=*/ false);
    }
  } else {
    const boxGeo = new THREE.BoxGeometry(width, wallHeight, height);
    const box = new THREE.Mesh(boxGeo, floorMaterial);
    box.position.set(0, -(offset + wallHeight / 2), 0);
    box.receiveShadow = true;
    box.visible = groundFloorVisible;
    levelContainers[lowestIdx].add(box);
    floorMeshes[lowestIdx] = box;

    const floorTopY = -(offset + disp / 2);
    //console.log('floorTopY:', floorTopY, 'totalHeight:', totalHeight, 'offset:', offset);

    if (groundFloorVisible) {
      addGroundWallLabels(width, wallHeight, height, lowestIdx, floorTopY, /*useBoxLabels=*/ true);
    }
  }
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

export function addWallLabel(
  text,            // The label text to render
  wallWidth,       // The width of the wall the label is placed on (horizontal axis of the wall)
  wallHeight,      // The height of the wall (vertical axis of the wall)
  gridWidth,       // The full ground/grid width (for east/west wall positioning and font scaling)
  gridHeight,      // The full ground/grid height (for north/south wall positioning and font scaling)
  wall = "south",  // Which wall ("south", "north", "east", "west")
  levelIdx = null, // Which level/group to attach the text mesh to
  options = {}     // Alignment, font size, margin etc.
) {
  //console.log('addWallLabel called with baseY:', options?.baseY, 'wallHeight:', wallHeight, 'text:', text);
  if (levelIdx === null) {
    levelIdx = 0;
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].length > 0) {
        levelIdx = i;
        break;
      }
    }
  }

  const align = options.align || "center"; // "center", "left", or "right"
  const sideMargin = options.sideMargin !== undefined ? options.sideMargin : wallWidth * 0.03;
  const fontSize = options.fontSize || Math.min(gridWidth, wallHeight) / 6;
  const topMargin = options.topMargin !== undefined ? options.topMargin : 0;
  const margin = options.margin !== undefined ? options.margin : 0;
  const baseY = options.baseY !== undefined ? options.baseY : 0;

  const labelYOffset = options.labelYOffset !== undefined ? options.labelYOffset : 0.1; // fixed offset above floor surface
  let y = baseY + labelYOffset - 0.5;

  const fontLoader = new FontLoader();
  fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.157.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const textGeo = new TextGeometry(text, {
      font: font,
      size: fontSize,
      height: 0,
    });
    const labelColorName = options.labelColor || options.labelClass || "default";
    const labelColor = WALL_LABEL_COLORS[labelColorName] || WALL_LABEL_COLORS["default"];
    const labelOpacity = options.opacity !== undefined ? options.opacity : 1.0;
    const textMat = new THREE.MeshBasicMaterial({
      color: labelColor,
      transparent: labelOpacity < 1.0,
      opacity: labelOpacity
    });
    const textMesh = new THREE.Mesh(textGeo, textMat);

    textGeo.computeBoundingBox();
    const bbox = textGeo.boundingBox;
    const textWidth = bbox.max.x - bbox.min.x;

    // Default: center vertically on the wall side
    // let y = 0;
    // if (options.fromTop) {
    //     y = baseY - (options.topMargin || 0);
    //   } else {
    //     y = baseY - wallHeight + (options.margin || 0);
    //   }

    // Horizontal alignment offset
    let alignOffset = 0;
    if (align === "center") alignOffset = -textWidth / 2;
    else if (align === "left") alignOffset = -wallWidth / 2 + sideMargin;
    else if (align === "right") alignOffset = wallWidth / 2 - textWidth - sideMargin;

    let x = 0, z = 0;
    let rotationY = 0;

    switch (wall) {
      case "north":
        z = -gridHeight / 2 - 0.01;
        x = alignOffset;
        rotationY = Math.PI;
        break;
      case "south":
        z = gridHeight / 2 + 0.01;
        x = alignOffset;
        rotationY = 0;
        break;
      case "east":
        x = gridWidth / 2 + 0.01;
        z = alignOffset;
        rotationY = Math.PI / 2;
        break;
      case "west":
        x = -gridWidth / 2 - 0.01;
        z = alignOffset;
        rotationY = -Math.PI / 2;
        break;
      default:
        z = gridHeight / 2 + (wallHeight / 2);
        x = alignOffset;
        rotationY = 0;
    }

    textMesh.position.set(x, y, z);
    textMesh.rotation.y = rotationY;
    textMesh.name = `wallLabel_${wall}`;
    levelContainers[levelIdx].add(textMesh);
  });
}