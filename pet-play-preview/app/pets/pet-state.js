// Cosmetic companions use the existing bounded avatar profile, not another socket.
export const PETS = Object.freeze([
  Object.freeze({id:'cat', name:'Mochi', label:'Cat', color:'#c4c3cc', accent:'#9bcab7'}),
  Object.freeze({id:'dog', name:'Biscuit', label:'Dog', color:'#e5b479', accent:'#eaac99'}),
]);
export const PET_KEY = '67park.feel-lab.pet-preview.v1';
export const validPet = value => value === 'cat' || value === 'dog' ? value : '';

export function petFromCombo(combo) {
  if (typeof combo !== 'string' || combo.length > 700) return '';
  try { return validPet(JSON.parse(combo)?.pet); } catch { return ''; }
}
export function comboWithPet(combo, pet) {
  if (typeof combo !== 'string' || combo.length > 700) return combo;
  try {
    const data = JSON.parse(combo);
    if (!data || Array.isArray(data) || typeof data.base !== 'string') return combo;
    delete data.pet;
    if (validPet(pet)) data.pet = pet;
    const result = JSON.stringify(data);
    return result.length <= 700 ? result : combo;
  } catch { return combo; }
}
export function createPetSelection(storage) {
  let selected = '';
  try { selected = validPet(storage?.getItem(PET_KEY)); } catch {}
  const listeners = new Set();
  return {
    get: () => selected,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    select(value) {
      if (value !== '' && !validPet(value)) return false;
      if (selected === value) return true;
      selected = value;
      try { storage?.setItem(PET_KEY, selected); } catch {}
      for (const listener of listeners) listener();
      return true;
    },
  };
}
let storage;
try { storage = globalThis.localStorage; } catch {}
export const petSelection = createPetSelection(storage);
