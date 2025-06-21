/**
 * @file assets/js/interaction/selection.js
 * @description Pointer event handlers for room selection, linking, and unlinking.
 * Drag-only logic has been moved to dragging.js. This file is now focused on selection and linking.
 * @module interaction/selection
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';

import { selectedFace, selectedRoom, setSelectedRoom, setSelectedFace } from '../core/state.js';
import { createRoomMesh, getRoomCenter } from '../utils/geometry.js';
import { updateRoomInfo } from '../ui/roomInfo.js';
import { rooms } from '../core/store.js';
import { currentLevel, updateFloorToLowestLevel } from '../core/level.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { levelContainers } from '../core/store.js';
import { getGridLocked } from '../ui/init.js';
import { getDirectionVectorKey } from '../utils/vectors.js';
import { createExitLine } from '../scene/exits.js';
import { animateRoomPopIn, animateBreakingLink } from '../animations/animations.js';
import { setRoomEmissive }from '../textures/surface.js';
import { pushHistory } from '../state/history.js';
import { getNextVnum } from '../state/rooms.js';
import { minVnum, maxVnum } from '../core/settings.js';
import { selectedRoomColor } from '../ui/buttons.js';
import { gridSize } from '../scene/grid.js';
import { handleRoomCreationPointerDown } from '../state/rooms.js';
import { handleLinkPointerDown } from '../interaction/linking.js';

// TODO: Modularize into interaction/selection.js
function handleSelectionPointerDown(event, context) {
  const {
    raycaster,
    rooms,
    currentLevel,
    LEVEL_OFFSET,
    selectedRoom,
    selectedFace,
    setSelectedRoom,
    setSelectedFace,
    updateRoomInfo,
    THREE,
    levelContainers,
    gridLocked,
    controls,
    getRoomCenter,
  } = context;
  const current = currentLevel + LEVEL_OFFSET;
  const candidates = [
    ...rooms[current],
    ...(rooms[current + 1] || []),
    ...(rooms[current - 1] || [])
  ];
  const intersects = raycaster.intersectObjects(candidates);
  if (intersects.length > 0) {
    const intersect = intersects[0];
    const room = intersect.object;
    const roomLevel = room.userData.level;
    const levelDiff = Math.abs(roomLevel - currentLevel);
    if (levelDiff > 1) {
      // Do not allow selection/toggle beyond ±1 level
      return;
    }
    if (!event.shiftKey) {
      // Restore previous logic: clicking toggles highlight (select/deselect) for rooms on current, +1, -1 level
      if (!selectedRoom || selectedRoom !== room) {
        // Remove previous outline mesh if any
        if (selectedRoom?.outlineMesh) {
          levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
          selectedRoom.outlineMesh.geometry.dispose();
          selectedRoom.outlineMesh.material.dispose();
          delete selectedRoom.outlineMesh;
        }
        setSelectedRoom(room);
        setSelectedFace({ object: room, point: getRoomCenter(room) });
        if (typeof updateRoomInfo === 'function') updateRoomInfo(room);
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.BackSide
        });
        const outlineMesh = new THREE.Mesh(room.geometry.clone(), outlineMaterial);
        outlineMesh.scale.multiplyScalar(1.05);
        outlineMesh.position.copy(room.position);
        levelContainers[room.userData.level + LEVEL_OFFSET].add(outlineMesh);
        room.outlineMesh = outlineMesh;
      } else {
        if (selectedRoom?.outlineMesh) {
          levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
          selectedRoom.outlineMesh.geometry.dispose();
          selectedRoom.outlineMesh.material.dispose();
          delete selectedRoom.outlineMesh;
        }
        setSelectedFace(null);
        setSelectedRoom(null);
      }
    }
  }
}

// TODO: Move handlePointerDown to interaction/selection.js (or split into selection.js, linking.js, and roomCreation.js as you modularize)
export function handlePointerDown(event, mouse, camera, scene, raycaster, controls) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // Defensive: If selectedRoom is gone but selectedFace remains, clear selection and abort
  if (!selectedRoom && selectedFace) {
    setSelectedFace(null);
    // Defensive: do not proceed with link logic if selection is gone
    return;
  }
  raycaster.setFromCamera(mouse, camera);

  // Gather shared state/context for handlers
  const context = {
    // Common dependencies
    mouse,
    raycaster,
    camera,
    scene,
    controls,
    THREE,
    // Room/selection state
    selectedRoom,
    selectedFace,
    setSelectedRoom,
    setSelectedFace,
    getRoomCenter,
    updateRoomInfo,
    // Room/link data
    rooms,
    currentLevel,
    LEVEL_OFFSET,
    levelContainers,
    gridLocked: getGridLocked(),
    // Selection handler dependencies
    // (already included above)
    // Linking handler dependencies
    getDirectionVectorKey,
    createExitLine,
    animateBreakingLink,
    setRoomEmissive,
    pushHistory,
    recalculateExits: typeof recalculateExits !== 'undefined' ? recalculateExits : () => {},
    drawLinks: typeof drawLinks !== 'undefined' ? drawLinks : null,
    // Room creation dependencies
    getNextVnum,
    minVnum,
    maxVnum,
    selectedRoomColor,
    createRoomMesh,
    animateRoomPopIn,
    updateFloorToLowestLevel,
    gridSize,
  };

  // ================== [Selection/Linking logic] ==================
  if (event.button === 0) {
    if (!event.shiftKey) {
      handleSelectionPointerDown(event, context);
    } else if (selectedFace) {
      handleLinkPointerDown(event, context);
    }
  }
  // ================== [Room Creation logic] ==================
  handleRoomCreationPointerDown(event, context);
}