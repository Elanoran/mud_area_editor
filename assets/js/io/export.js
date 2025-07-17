/**
 * @file assets/js/io/export.js
 * @description Map data export logic and template filling functions.
 * @module io/export
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

export function exportMapData() {
    const areaName = document.getElementById('areaName')?.value.trim();
    const filename = document.getElementById('filename')?.value.trim();

    if (!areaName || !filename) {
        alert('Please provide both Area Name and Filename before exporting.');
        return;
    }

    const formatName = document.getElementById('exportFormat')?.value || 'ROM';
    const format = formats[formatName];
    if (!format) {
        alert(`Unknown format: ${formatName}`);
        return;
    }

    let output = '';
    rooms.forEach((level, levelIndex) => {
        level.forEach(room => {
        // Substitute default name/desc for empty values
        const name = room.userData.name?.trim() ? room.userData.name.trim() : `Room ${room.userData.id}`;
        const desc = room.userData.desc?.trim() ? room.userData.desc.trim() : `${room.userData.id}`;
        const roomStr = format.room
            .replace('%ROOM_VNUM%', room.userData.id)
            .replace('%ROOM_NAME%', name)
            .replace('%ROOM_DESC%', desc)
            .replace('%FLAGS%', '0') // Placeholder
            .replace('%SECTOR%', room.userData.sector ?? 0)
            .replace('%ZONE%', '0') // Placeholder
            .replace('%EXTRA_FLAGS%', '0'); // Placeholder

        let exits = '';
        // Remove vector-based key output for ROM-style export
        Object.entries(room.userData.exits || {}).forEach(([dir, data]) => {
            if (!data.room || typeof data.room.userData.id === 'undefined') return;
            // Map direction to ROM index, including diagonals (normalize to lowercase)
            let exitDir = dir;
            if (!dirKeyToIndex.hasOwnProperty(exitDir.toLowerCase())) {
            exitDir = getDirectionBetweenRooms(room, data.room);
            }
            const dirIndex = dirKeyToIndex[exitDir.toLowerCase()];
            if (dirIndex === undefined) {
            // Optionally log a warning:
            // console.warn(`Skipping exit with invalid direction: ${exitDir}`);
            return; // Skip invalid direction
            }
            exits += `D${dirIndex}\n~\n~\n0 ${data.room.userData.id} 0\n`;
        });

        output += roomStr.replace('%EXITS%', exits);
        });
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rooms.txt';
    a.click();
    URL.revokeObjectURL(url);
}

    // --- Improved direction utility: strict axis-aligned and diagonal direction calculation ---
function getDirectionBetweenRooms(from, to) {
    // Accepts either mesh or plain object with x, z, level/position.y
    const getX = (room) => room.x !== undefined ? room.x : (room.position?.x ?? 0);
    const getZ = (room) => room.z !== undefined ? room.z : (room.position?.z ?? 0);
    const getLevel = (room) =>
        room.level !== undefined ? room.level
        : (room.position?.y !== undefined
            ? (typeof room.userData?.level === 'number' ? room.userData.level : room.position.y)
            : (room.userData?.level ?? 0));
    const dx = Math.round(getX(to) - getX(from));
    const dz = Math.round(getZ(to) - getZ(from));
    const dy = Math.round(getLevel(to) - getLevel(from));

    if (dx === 0 && dz === -1 && dy === 0) return 'n';
    if (dx === 1 && dz === 0 && dy === 0) return 'e';
    if (dx === 0 && dz === 1 && dy === 0) return 's';
    if (dx === -1 && dz === 0 && dy === 0) return 'w';
    if (dx === 0 && dz === 0 && dy === 1) return 'u';
    if (dx === 0 && dz === 0 && dy === -1) return 'd';

    // Diagonal directions (fallback if not strictly cardinal)
    if (dx === 1 && dz === -1 && dy === 0) return 'ne';
    if (dx === -1 && dz === -1 && dy === 0) return 'nw';
    if (dx === 1 && dz === 1 && dy === 0) return 'se';
    if (dx === -1 && dz === 1 && dy === 0) return 'sw';

    // Fallback for unknown direction
    return '?';
}