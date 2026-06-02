// GameMode.h — the plugin contract.
//
// A "mode" is our unit of gameplay content (the equivalent of a plugin). Drop
// a new subclass in src/modes/, register it in ModeManager, and the core feeds
// it a clean stream of events. Modes never touch Metamod directly — they work
// through Player + util, so they stay small and portable.
#ifndef FORGE_GAMEMODE_H
#define FORGE_GAMEMODE_H

#include "Player.h"

class GameMode {
public:
    virtual ~GameMode() {}

    // Identity (id is used by the `forge_mode` command and votes).
    virtual const char* id()    const = 0;
    virtual const char* title() const = 0;
    virtual const char* blurb() const { return ""; }

    // Lifecycle — called when this mode becomes / stops being active.
    virtual void onLoad()   {}
    virtual void onUnload() {}

    // Match flow.
    virtual void onRoundStart() {}

    // Player flow.
    virtual void onConnect(Player& p)    {}
    virtual void onDisconnect(Player& p) {}
    virtual void onSpawn(Player& p)      {}
    virtual void onDeath(Player& victim, Player* attacker,
                         const char* weapon, bool headshot) {}

    // Per-client think (fires from PlayerPreThink). Keep it cheap.
    virtual void onThink(Player& p) {}

    // Chat command, already split. `argv[0]` is the command without the
    // leading '/' (e.g. "perk"). Return true if handled.
    virtual bool onCommand(Player& p, int argc, const char* argv[]) { return false; }
};

#endif // FORGE_GAMEMODE_H
