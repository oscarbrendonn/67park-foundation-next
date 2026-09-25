# Pet play preview

Isolated opt-in snapshot for mobile review, based on 4e5feeb3c11d9f3f1f99f51ad86a8b41d70f26fd. The normal game entry and runtime files are unchanged. Open `?pet=dog` or `?pet=cat`.

Commands are local visual prototypes. Petting, give-paw and feather contact need visual polish; this is not final-release approval. Existing game assets and the existing backend are reused, with a separate preview guest and pet selection key. No extra model downloads, servers, or tunnels.

Sit revision (`v=pet-preview-sit-2`): local companions no longer silently use the same idle crouch before receiving Sit. Sitting seats the rump, raises the chest and plants the paws without changing mesh data. Follow resets the idle-rest clock and releases the pose. Focused regression: `node --import ./qa/register-three.mjs --test qa/pet-sit.test.mjs`.
