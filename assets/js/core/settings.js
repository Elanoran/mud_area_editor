 /**
 * @file assets/js/core/settings.js
 * @module core/settings
 * @description Settings file for project.
 * @author Elanoran
 */

// Ground floor appearance settings
export let groundFloorThickness = 0.4;  // height of the ground mesh
export let groundFloorOffset = 0.01;     // distance between grid (y=0) and top of ground

// Default min and max vnums
export let minVnum = 100;
export let maxVnum = 199;

export function setMinVnum(val) {
  minVnum = val;
  document.dispatchEvent(new CustomEvent('vnumRangeChanged', { detail: { minVnum, maxVnum } }));
}

export function setMaxVnum(val) {
  maxVnum = val;
  document.dispatchEvent(new CustomEvent('vnumRangeChanged', { detail: { minVnum, maxVnum } }));
}



/**
 * Default keybinds for project actions.
 * Format: { actionName: 'Key' }
 */
export const keybinds = {
  moveUp:      'ArrowUp',
  moveDown:    'ArrowDown',
  moveLeft:    'ArrowLeft',
  moveRight:   'ArrowRight',
  nextLevel:   'PageUp',
  prevLevel:   'PageDown',
  save:        's',         // (suggested: use with ctrlKey)
  open:        'o',         // (suggested: use with ctrlKey)
  toggleFloor: 'f',         // (for toggling ground floor)
  showHelp:    'F1',
  delete:      'Delete',
  // ...add more as needed
};

/* 
 * Groundfloor options: grass, asphalt, fabric, blue, sand, dirt, charcoal
 */
let _currentSurface = 'grass';

export function getCurrentSurface() {
  return _currentSurface;
}

export function setCurrentSurface(value) {
  _currentSurface = value;
}