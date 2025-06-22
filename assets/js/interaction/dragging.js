/****
 * @file assets/js/interaction/dragging.js
 * @description Drag-and-drop support for moving rooms within the grid.
 * @module interaction/dragging
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { selectedRoom, setIsDragging, isDragging } from '../core/state.js';
import { updateRoomInfo } from '../ui/roomInfo.js';
import { pushHistory } from '../state/history.js';
import { getGridLocked } from '../ui/init.js';
import { hoverRoom } from '../ui/hoverLabel.js';
import { rooms } from '../core/store.js';
import { updateRoomPosition } from '../state/rooms.js';

// TODO: Move pointerup handler to interaction/dragging.js
export function registerPointerupHandler(controls, getDragStartPos, setDragStartPos) {
  // Begin dragging on pointerdown, unless the grid is locked
  window.addEventListener('pointerdown', event => {
    if (getGridLocked()) return;
    if (event.button !== 0) return;
    if (!selectedRoom) return;
    if (hoverRoom !== selectedRoom) return;
    setIsDragging(true);
    controls.enableRotate = false;
    controls.enablePan = false;
    setDragStartPos({
      x: selectedRoom.position.x,
      y: selectedRoom.position.y,
      z: selectedRoom.position.z
    });
  });

  window.addEventListener('pointerup', () => {
    // Only handle if a drag was in progress AND a room is selected
    if (!isDragging || !selectedRoom) {
      setDragStartPos(null);
      return;
    }
    // if (!isDragging) return;
    setIsDragging(false);
    const startPos = getDragStartPos();
    let didRevert = false;
    // If we don't have a start position, just end drag
    if (!startPos) {
      setDragStartPos(null);
      return;
    }
    // Collision check on drop: only same level
    const newX = selectedRoom.position.x;
    const newY = selectedRoom.position.y;
    const newZ = selectedRoom.position.z;
    // Determine current level index from rooms store
    const levelIndex = rooms.findIndex(levelArr => levelArr.includes(selectedRoom));
    const collision = levelIndex !== -1 && rooms[levelIndex].some(r => {
      if (r === selectedRoom || !r.position) return false;
      const dx = Math.abs(r.position.x - newX);
      const dz = Math.abs(r.position.z - newZ);
      const dy = Math.abs(r.position.y - newY);
      return dx < 0.5 && dz < 0.5 && dy < 0.1;
    });
    if (collision) {
      // Revert to original full start position
      updateRoomPosition(selectedRoom, startPos.x, startPos.z, startPos.y);
      didRevert = true;
    }
    // Re-enable OrbitControls rotation after dragging
    controls.enableRotate = true;
    // Re-enable OrbitControls panning after drag
    controls.enablePan = true;
    if (selectedRoom) {
      updateRoomInfo(selectedRoom);
    }
    // Push history if the room actually moved (and was not reverted)
    if (!didRevert && (
      selectedRoom.position.x !== startPos.x ||
      selectedRoom.position.z !== startPos.z
    )) {
      pushHistory();
    }
    setDragStartPos(null);
  });
}