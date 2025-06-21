/****
 * @file assets/js/interaction/dragging.js
 * @description Drag-and-drop support for moving rooms within the grid.
 * @module interaction/dragging
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { selectedRoom, setIsDragging } from '../core/state.js';
import { updateRoomInfo } from '../ui/roomInfo.js';
import { pushHistory } from '../state/history.js';
import { getGridLocked } from '../ui/init.js';
import { hoverRoom } from '../ui/hoverLabel.js';

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
      z: selectedRoom.position.z
    });
  });

  window.addEventListener('pointerup', () => {
    setIsDragging(false);
    // Re-enable OrbitControls rotation after dragging
    controls.enableRotate = true;
    // Re-enable OrbitControls panning after drag
    controls.enablePan = true;
    recalculateExits();
    if (typeof drawLinks === 'function') {
      drawLinks();
    }
    if (selectedRoom) {
      updateRoomInfo(selectedRoom);
    }
    // Only pushHistory if position changed during drag
    const dragStartPos = getDragStartPos();
    if (selectedRoom && dragStartPos) {
      if (
        selectedRoom.position.x !== dragStartPos.x ||
        selectedRoom.position.z !== dragStartPos.z
      ) {
        // Only after position is changed
        pushHistory();
      }
    }
    setDragStartPos(null);
  });
}