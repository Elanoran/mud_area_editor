/**
 * @file assets/js/constants/index.js
 * @module constants/index
 * @description Project-wide constants including level offsets, maximum levels, and random area names.
 * @author Elanoran
 */

// --- Level offset constant (so level 0 is index 20) ---
export const LEVEL_OFFSET = 20;
export const MAX_LEVELS   = 41;

// --- Random names for areaName and filename, paired by index ---
export const areaNames = [
  { area: "The Dank Cavern",           file: "dankness"     },
  { area: "Bacon Village",             file: "bacon"        },
  { area: "Meme Plains",               file: "memezone"     },
  { area: "Secret Cow Level",          file: "cows"         },
  { area: "Damp Catacombs",            file: "secretz"      },
  { area: "Ankh-Morpork",              file: "ankhmorpork"  },
  { area: "Unseen University",         file: "unseenuni"    },
  { area: "The Luggage's Lair",        file: "luggage"      },
  { area: "Moist von Lipwig's Market", file: "moistlipwig"  },
  { area: "Nanny Ogg's Kitchen",       file: "nannyogg"     }
];