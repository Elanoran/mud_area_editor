/**
 * @file assets/js/ui/roomInfo.js
 * @description We have a lot of Room.
 * @module ui/RoomInfo
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';

import { getDirectionName } from '../utils/vectors.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { levelContainers } from '../core/store.js';
import { animateStreak } from '../animations/animations.js';


export function updateRoomInfo(room) {
    if (!room || !room.id) return;
    const coordField = document.getElementById('roomVnumCoords');
    if (coordField) {
    coordField.value = `(${room.position.x.toFixed(1)}, ${room.position.z.toFixed(1)}, ${room.position.y.toFixed(1)})`;
    }

    const exitsList = document.getElementById('roomExitsList');
    if (exitsList) {
    exitsList.innerHTML = '';

    // Read only from userData.exits now
    const exitsData = room.userData.exits || {};
    for (const [vecKey, { room: target }] of Object.entries(exitsData)) {
        const li = document.createElement('li');
        li.textContent = `${getDirectionName(vecKey)} to Room ${target.userData.id}`;
        // --- Pulsing streak effect on hover for exit line ---
        let pulseInterval = null;
        let lastStreakTimeout = null;
        li.addEventListener('mouseenter', () => {
        if (pulseInterval !== null) return; // Already running
        if (room.userData.exitLinks && target) {
            // Find the line that connects this room to the target
            const line = room.userData.exitLinks.find(l =>
            (l.userData.fromRoom === room && l.userData.toRoom === target) ||
            (l.userData.fromRoom === target && l.userData.toRoom === room)
            );
            if (line && line.geometry && line.geometry.attributes && line.geometry.attributes.position) {
            const pos = line.geometry.attributes.position.array;
            let from, to;
            // Animate in the direction: from this room toward the exit
            if (line.userData.fromRoom === room) {
                from = new THREE.Vector3(pos[0], pos[1], pos[2]);
                to   = new THREE.Vector3(pos[3], pos[4], pos[5]);
            } else {
                from = new THREE.Vector3(pos[3], pos[4], pos[5]);
                to   = new THREE.Vector3(pos[0], pos[1], pos[2]);
            }
            // Find the actual level container this line is in
            let levelIdx = LEVEL_OFFSET;
            for (let i = 0; i < levelContainers.length; i++) {
                if (levelContainers[i].children.includes(line)) {
                levelIdx = i;
                break;
                }
            }
            animateStreak(from, to, levelIdx, levelContainers);
            pulseInterval = setInterval(() => {
                animateStreak(from, to, levelIdx, levelContainers);
            }, 350);
            }
        }
        });
        li.addEventListener('mouseleave', () => {
        if (pulseInterval !== null) {
            clearInterval(pulseInterval);
            pulseInterval = null;
        }
        });
        exitsList.appendChild(li);
    }
    }
    // Update room fields: VNUM, Name, Description
    const vnumField = document.getElementById('roomVnum');
    const nameField = document.getElementById('roomName');
    const descField = document.getElementById('roomDesc');
    if (vnumField) vnumField.value = room?.userData?.id ?? '';
    if (nameField) nameField.value = room?.userData?.name ?? '';
    if (descField) descField.value = room?.userData?.desc ?? '';
    // Update active tab height (for dynamic sidebar resizing)
    const areaInfoContainer = document.getElementById('areaInfoContainer');
    const activeTab = areaInfoContainer?.querySelector('.tab-content.active');
    if (activeTab) {
    areaInfoContainer.style.height = activeTab.scrollHeight + 'px';
    }
}