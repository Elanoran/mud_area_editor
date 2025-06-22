/**
 * @file assets/js/ui/hoverLabel.js
 * @module ui/hoverLabel
 * @description labels.
 * @author Elanoran
 */

import { THREE } from '../vendor/three.js';

import { rooms, levelContainers } from '../core/store.js';
import { currentLevel } from '../core/level.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { isDragging, selectedRoom } from '../core/state.js';

// --- Hover label state ---
export let hoverLabel = null;
export let hoverRoom = null;

export function setHoverRoom(val) {
  hoverRoom = val;
}

export function setupRoomHover(renderer, camera, controls, raycaster, mouse, updateRoomPosition) {
    // --- Room hover label logic (deduplicated, robust) ---
   renderer.domElement.addEventListener('pointermove', function (event) {
     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
     raycaster.setFromCamera(mouse, camera);
     // Lock camera controls if dragging
     const dragging = isDragging && !!selectedRoom;
     controls.enableRotate = !dragging;
     controls.enablePan   = !dragging;
 
     // Only show label for rooms on currentLevel, currentLevel+1, currentLevel-1
     const levelRange = [currentLevel + LEVEL_OFFSET, currentLevel + 1 + LEVEL_OFFSET, currentLevel - 1 + LEVEL_OFFSET];
     const candidates = [];
     for (const idx of levelRange) {
       if (rooms[idx]) candidates.push(...rooms[idx]);
     }
     const intersects = raycaster.intersectObjects(candidates);
     if (intersects.length > 0) {
       const room = intersects[0].object;
       if (hoverRoom !== room) {
         // Remove any previous label
         if (hoverLabel) {
           if (hoverLabel.parent) hoverLabel.parent.remove(hoverLabel);
           hoverLabel.material.map.dispose();
           hoverLabel.material.dispose();
           hoverLabel = null;
         }
         hoverRoom = room;
         const name = room.userData.name || '';
         const vnum = room.userData.id != null ? String(room.userData.id) : '';
         hoverLabel = makeRoomLabel(vnum, name);
         hoverLabel.position.copy(room.position);
         hoverLabel.position.y += 1.2; // raise label above room
         levelContainers[room.userData.level + LEVEL_OFFSET].add(hoverLabel);
       }
     } else {
       // Pointer is not over any room
       if (hoverLabel) {
         if (hoverLabel.parent) hoverLabel.parent.remove(hoverLabel);
         hoverLabel.material.map.dispose();
         hoverLabel.material.dispose();
         hoverLabel = null;
       }
       hoverRoom = null;
     }
     // If we're in drag mode, move the room via shared utility
     if (isDragging && selectedRoom) {
       // Cast to plane
       const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
       const point = new THREE.Vector3();
       if (raycaster.ray.intersectPlane(plane, point)) {
         const newX = Math.floor(point.x) + 0.5;
         const newZ = Math.floor(point.z) + 0.5;
         updateRoomPosition(selectedRoom, newX, newZ);
       }
     }
   });
}

// TODO: Move mouseleave handler to ui/hoverLabel.js
export function registerMouseleaveHandler(renderer) {
  renderer.domElement.addEventListener('mouseleave', () => {
    if (hoverLabel) {
      if (hoverLabel.parent)
        hoverLabel.parent.remove(hoverLabel);
      hoverLabel.material.map.dispose();
      hoverLabel.material.dispose();
      hoverLabel = null;
    }
    setHoverRoom(null);
  });
}

// --- Utility: create a floating label (sprite) for a room ---
  function makeRoomLabel(vnum, name) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = 'bold 24px sans-serif';
  const label = name ? `(${vnum}) ${name}` : `(${vnum})`;
  const textWidth = context.measureText(label).width;
  const padding = 48;
  canvas.width = Math.max(320, textWidth + padding);
  canvas.height = 64;
  context.font = 'bold 24px sans-serif';
  context.textAlign = 'center';
  context.fillStyle = '#fff';
  context.shadowColor = 'black';
  context.shadowBlur = 4;
  context.textBaseline = 'middle';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 160, 0.6, 1); // adjust width scaling for bigger canvases
  sprite.renderOrder = 9999;
  return sprite;
}