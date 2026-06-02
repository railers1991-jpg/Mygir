// dllapi.cpp — game-DLL (entity API) hooks. These translate engine callbacks
// into Forge events and otherwise stay out of the way (MRES_IGNORED).
#include "sdk.h"
#include "hooks.h"
#include "../core/Forge.h"

#include <cstring>
#include <cstdio> // snprintf

// `forge_mode <id>` server console command: switch the active mode.
static void Cmd_ForgeMode() {
    const char* id = g_engfuncs.pfnCmd_Argv(1);
    ModeManager& mm = Forge::instance().modes();
    if (!id || !*id) {
        g_engfuncs.pfnServerPrint("Usage: forge_mode <id>. Available:\n");
        for (int i = 0; i < mm.count(); ++i) {
            char line[128];
            snprintf(line, sizeof(line), "  %s - %s\n", mm.at(i)->id(), mm.at(i)->title());
            g_engfuncs.pfnServerPrint(line);
        }
        return;
    }
    if (!mm.switchTo(id)) g_engfuncs.pfnServerPrint("[Forge] unknown mode id\n");
}

static void ServerActivate(edict_t* /*pEdictList*/, int /*edictCount*/, int clientMax) {
    static bool cmdReg = false;
    if (!cmdReg) { cmdReg = true; g_engfuncs.pfnAddServerCommand("forge_mode", Cmd_ForgeMode); }
    Forge::instance().serverActivate(clientMax);
    RETURN_META(MRES_IGNORED);
}

static void ServerDeactivate() {
    Forge::instance().serverDeactivate();
    RETURN_META(MRES_IGNORED);
}

static void ClientPutInServer(edict_t* pEntity) {
    Forge::instance().onClientPutInServer(pEntity);
    RETURN_META(MRES_IGNORED);
}

static void ClientDisconnect(edict_t* pEntity) {
    Forge::instance().onClientDisconnect(pEntity);
    RETURN_META(MRES_IGNORED);
}

static void ClientCommand(edict_t* pEntity) {
    bool eaten = Forge::instance().onClientCommand(pEntity);
    // Eat handled "/"-commands so they never reach public chat or the game DLL.
    RETURN_META(eaten ? MRES_SUPERCEDE : MRES_IGNORED);
}

static void PlayerPreThink(edict_t* pEntity) {
    Forge::instance().onPlayerThink(pEntity);
    RETURN_META(MRES_IGNORED);
}

static void StartFrame() {
    Forge::instance().onFrame();
    RETURN_META(MRES_IGNORED);
}

int GetEntityAPI2(DLL_FUNCTIONS* pFunctionTable, int* interfaceVersion) {
    if (*interfaceVersion != INTERFACE_VERSION) {
        *interfaceVersion = INTERFACE_VERSION;
        return FALSE;
    }
    static DLL_FUNCTIONS tbl;
    memset(&tbl, 0, sizeof(tbl));
    tbl.pfnServerActivate    = ServerActivate;
    tbl.pfnServerDeactivate  = ServerDeactivate;
    tbl.pfnClientPutInServer = ClientPutInServer;
    tbl.pfnClientDisconnect  = ClientDisconnect;
    tbl.pfnClientCommand     = ClientCommand;
    tbl.pfnPlayerPreThink    = PlayerPreThink;
    tbl.pfnStartFrame        = StartFrame;
    memcpy(pFunctionTable, &tbl, sizeof(DLL_FUNCTIONS));
    return TRUE;
}
