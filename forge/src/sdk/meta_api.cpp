// meta_api.cpp — Metamod entry point and plugin wiring.
#include "sdk.h"
#include "hooks.h"

#include <cstring>

// ---- globals handed to us by the engine / Metamod ------------------------
enginefuncs_t    g_engfuncs;
globalvars_t    *gpGlobals       = nullptr;
meta_globals_t  *gpMetaGlobals   = nullptr;
gamedll_funcs_t *gpGamedllFuncs  = nullptr;
mutil_funcs_t   *gpMetaUtilFuncs = nullptr;

// ---- plugin identity ------------------------------------------------------
plugin_info_t Plugin_info = {
    META_INTERFACE_VERSION,
    "Forge",
    "0.1.0",
    __DATE__,
    "Forge contributors",
    "https://github.com/railers1991-jpg/mygir",
    "FORGE",
    PT_ANYTIME,   // can be loaded at any time
    PT_ANYPAUSE,  // can be unloaded/paused at any time
};

// The engine hands the game DLL its function pointers through this export;
// Metamod intercepts it and forwards it to plugins. We keep a copy.
C_DLLEXPORT void GiveFnptrsToDll(enginefuncs_t* pengfuncsFromEngine,
                                 globalvars_t* pGlobals) {
    memcpy(&g_engfuncs, pengfuncsFromEngine, sizeof(enginefuncs_t));
    gpGlobals = pGlobals;
}

// Which tables we provide. We hook the entity API (player lifecycle) plus the
// engine API in both pre and post phases.
static META_FUNCTIONS gMetaFunctionTable = {
    nullptr,                  // pfnGetEntityAPI
    nullptr,                  // pfnGetEntityAPI_Post
    GetEntityAPI2,            // pfnGetEntityAPI2
    nullptr,                  // pfnGetEntityAPI2_Post
    nullptr,                  // pfnGetNewDLLFunctions
    nullptr,                  // pfnGetNewDLLFunctions_Post
    GetEngineFunctions,       // pfnGetEngineFunctions
    GetEngineFunctions_Post,  // pfnGetEngineFunctions_Post
};

C_DLLEXPORT int Meta_Query(const char* /*ifvers*/, plugin_info_t** pPlugInfo,
                           mutil_funcs_t* pMetaUtilFuncs) {
    *pPlugInfo = &Plugin_info;
    gpMetaUtilFuncs = pMetaUtilFuncs;
    return TRUE;
}

C_DLLEXPORT int Meta_Attach(PLUG_LOADTIME /*now*/, META_FUNCTIONS* pFunctionTable,
                            meta_globals_t* pMGlobals, gamedll_funcs_t* pGamedllFuncs) {
    if (!pMGlobals || !pFunctionTable) return FALSE;
    gpMetaGlobals = pMGlobals;
    memcpy(pFunctionTable, &gMetaFunctionTable, sizeof(META_FUNCTIONS));
    gpGamedllFuncs = pGamedllFuncs;
    return TRUE;
}

C_DLLEXPORT int Meta_Detach(PLUG_LOADTIME /*now*/, PL_UNLOAD_REASON /*reason*/) {
    return TRUE;
}
