// Keep donor catalogues/models intact: their clothes are still used by Gorilla.
export const PLAYABLE_BASE = 'goril';
export const EQUIPMENT_KEY = '67park-feel-lab.character.v3';
export const PREVIOUS_CHARACTER_KEY = '67park-feel-lab.character.before-gorilla-only.v1';
const PROFILE_KEY = '67park-feel-lab.player-profile.v1';

export function gorillaEquipment(equipment) {
  if (equipment?.base === PLAYABLE_BASE) return equipment;
  // A donor face is a character, not clothing. Preserve the fitted glasses.
  return {...equipment, base: PLAYABLE_BASE,
    head: equipment?.head === 'friendsie_26:90' ? equipment.head : null};
}

export function adoptPlayableCharacter(equipment, storage) {
  const next = gorillaEquipment(equipment);
  if (next === equipment) return next;
  try {
    storage ??= globalThis.localStorage;
    if (!storage) return next;
    if (!storage.getItem(PREVIOUS_CHARACTER_KEY))
      storage.setItem(PREVIOUS_CHARACTER_KEY, JSON.stringify(equipment));
    storage.setItem(EQUIPMENT_KEY, JSON.stringify(next));
    const profile = JSON.parse(storage.getItem(PROFILE_KEY) || 'null');
    if (profile?.version === 1 && profile.base === equipment?.base)
      storage.setItem(PROFILE_KEY, JSON.stringify({...profile, base: PLAYABLE_BASE}));
  } catch { /* In-memory selection must work even when storage is unavailable. */ }
  return next;
}
