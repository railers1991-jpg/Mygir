// engine_api.cpp — engine-function hooks.
//
// Two jobs, both done without AMX or ReGameDLL so it runs on stock HLDS:
//   1. Learn user-message ids by watching RegUserMsg (post phase).
//   2. Decode DeathMsg / RoundTime as the game sends them, turning them into
//      Forge::onKill / Forge::onRoundDetected. DeathMsg is captured with a
//      small state machine across MessageBegin -> Write* -> MessageEnd.
#include "sdk.h"
#include "hooks.h"
#include "../core/Forge.h"

#include <cstring>

namespace {
enum Capture { CAP_NONE, CAP_KILL };
Capture g_cap = CAP_NONE;
int     g_killBytes[4];
int     g_killByteCount = 0;
char    g_weapon[32];

void MessageBegin(int /*msg_dest*/, int msg_type, const float* /*pOrigin*/, edict_t* /*ed*/) {
    g_cap = CAP_NONE;
    Forge& f = Forge::instance();
    int death = f.msgId("DeathMsg");
    int round = f.msgId("RoundTime");
    if (death > 0 && msg_type == death) {
        g_cap = CAP_KILL;
        g_killByteCount = 0;
        g_weapon[0] = '\0';
    } else if (round > 0 && msg_type == round) {
        f.onRoundDetected();
    }
    RETURN_META(MRES_IGNORED);
}

void WriteByte(int value) {
    if (g_cap == CAP_KILL && g_killByteCount < 4) g_killBytes[g_killByteCount++] = value;
    RETURN_META(MRES_IGNORED);
}

void WriteString(const char* sz) {
    if (g_cap == CAP_KILL && sz) {
        strncpy(g_weapon, sz, sizeof(g_weapon) - 1);
        g_weapon[sizeof(g_weapon) - 1] = '\0';
    }
    RETURN_META(MRES_IGNORED);
}

void MessageEnd() {
    if (g_cap == CAP_KILL && g_killByteCount >= 2) {
        int killer   = g_killBytes[0];
        int victim   = g_killBytes[1];
        bool headshot = (g_killByteCount >= 3 && g_killBytes[2] != 0);
        Forge::instance().onKill(killer, victim, headshot, g_weapon);
    }
    g_cap = CAP_NONE;
    RETURN_META(MRES_IGNORED);
}

// Post phase: the engine has assigned the message its id (the return value).
int RegUserMsg_Post(const char* pszName, int /*iSize*/) {
    int id = META_RESULT_ORIG_RET(int);
    Forge::instance().registerUserMsg(pszName, id);
    RETURN_META_VALUE(MRES_IGNORED, 0);
}
} // namespace

int GetEngineFunctions(enginefuncs_t* pengfuncsFromEngine, int* /*interfaceVersion*/) {
    static enginefuncs_t tbl;
    memset(&tbl, 0, sizeof(tbl));
    tbl.pfnMessageBegin = MessageBegin;
    tbl.pfnWriteByte    = WriteByte;
    tbl.pfnWriteString  = WriteString;
    tbl.pfnMessageEnd   = MessageEnd;
    memcpy(pengfuncsFromEngine, &tbl, sizeof(enginefuncs_t));
    return TRUE;
}

int GetEngineFunctions_Post(enginefuncs_t* pengfuncsFromEngine, int* /*interfaceVersion*/) {
    static enginefuncs_t tbl;
    memset(&tbl, 0, sizeof(tbl));
    tbl.pfnRegUserMsg = RegUserMsg_Post;
    memcpy(pengfuncsFromEngine, &tbl, sizeof(enginefuncs_t));
    return TRUE;
}
