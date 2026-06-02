// Forge.h — the core. Owns players, the active mode, and the user-message
// table, and turns raw Metamod/engine callbacks into clean framework events.
//
// The SDK hook layer (src/sdk/*) does nothing but translate engine calls into
// the methods below; all logic lives here and in the modes.
#ifndef FORGE_FORGE_H
#define FORGE_FORGE_H

#include "Player.h"
#include "ModeManager.h"

class Forge {
public:
    static Forge& instance();

    // ---- server lifecycle (from dllapi hooks) ----------------------------
    void serverActivate(int maxClients);
    void serverDeactivate();
    void onFrame();

    // ---- client lifecycle -------------------------------------------------
    void onClientPutInServer(edict_t* e);
    void onClientDisconnect(edict_t* e);
    void onPlayerThink(edict_t* e);
    // Returns true if the command was a Forge chat command and should be eaten.
    bool onClientCommand(edict_t* e);

    // ---- decoded engine messages (from engine_api hooks) ------------------
    void onKill(int killerIdx, int victimIdx, bool headshot, const char* weapon);
    void onRoundDetected();
    void registerUserMsg(const char* name, int id);
    int  msgId(const char* name) const;

    // ---- accessors --------------------------------------------------------
    ModeManager& modes() { return m_modes; }
    int   maxClients() const { return m_maxClients; }
    Player& player(int idx) { return m_players[idx]; }
    Player* playerByEdict(edict_t* e);

private:
    Forge() {}
    void detectSpawn(Player& p);

    static const int kMaxSlots = 33; // index 0 unused; clients are 1..32

    Player       m_players[kMaxSlots];
    ModeManager  m_modes;
    int          m_maxClients = 0;
    bool         m_active = false;
    float        m_lastRoundFire = 0.0f;

    struct MsgEntry { char name[24]; int id; };
    MsgEntry m_msgs[64];
    int      m_msgCount = 0;
};

#endif // FORGE_FORGE_H
