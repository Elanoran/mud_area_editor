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
}

export function setMaxVnum(val) {
  maxVnum = val;
}

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