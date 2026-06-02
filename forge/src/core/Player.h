// Player.h — the framework's view of a connected client.
//
// Wraps an edict and carries the small amount of per-player state that the
// core and the game modes share. Game modes read/write these fields directly;
// keeping them in one place avoids fragile per-mode bookkeeping.
#ifndef FORGE_PLAYER_H
#define FORGE_PLAYER_H

#include "../sdk/sdk.h"

// Perk picked for the current life (ClassicPlus). Kept here so the core can
// apply per-life effects (e.g. regen) without knowing the active mode.
enum Perk {
    PERK_NONE = 0,
    PERK_VANGUARD,   // +25 max HP on spawn
    PERK_SCOUT,      // +12% move speed
    PERK_JUGGERNAUT, // +50 armor on spawn
    PERK_MEDIC,      // slow health regeneration
    PERK_PHANTOM,    // lower gravity (longer jumps, quieter play)
    PERK_COUNT
};

class Player {
public:
    int      index = 0;
    edict_t* edict = nullptr;
    bool     inGame = false;

    // Liveness, tracked frame-to-frame so the core can synthesize a spawn
    // event the moment a client transitions dead -> alive.
    bool  alive = false;
    bool  wasAlive = false;
    float spawnTime = 0.0f;

    // Scoring / momentum.
    int totalKills = 0;
    int deaths = 0;
    int streak = 0;       // kills since last death (drives the bounty system)

    // Per-life loadout extras.
    int   perk = PERK_NONE;
    bool  perkChosen = false;
    bool  isBounty = false;
    float nextRegen = 0.0f;

    entvars_t* pev() const { return edict ? &edict->v : nullptr; }

    // Wipe everything except the slot wiring (index/edict). Used on connect.
    void resetStats() {
        totalKills = deaths = streak = 0;
        perk = PERK_NONE; perkChosen = false; isBounty = false;
        alive = wasAlive = false; spawnTime = nextRegen = 0.0f;
    }
};

#endif // FORGE_PLAYER_H
