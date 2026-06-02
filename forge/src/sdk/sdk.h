// sdk.h — common include surface for the whole plugin.
//
// Pulls in the Half-Life SDK and the Metamod plugin API, and declares the
// globals that Metamod hands us at load time. Every translation unit in the
// project includes this first.
#ifndef FORGE_SDK_H
#define FORGE_SDK_H

#include <extdll.h>      // Half-Life SDK core (edict_t, entvars_t, Vector, ...)
#include <meta_api.h>    // Metamod plugin API (RETURN_META, META_FUNCTIONS, ...)

// Engine + game globals, populated in meta_api.cpp.
extern enginefuncs_t   g_engfuncs;     // engine functions (set in GiveFnptrsToDll)
extern globalvars_t   *gpGlobals;      // engine global state
extern meta_globals_t *gpMetaGlobals;  // Metamod per-call result block
extern gamedll_funcs_t*gpGamedllFuncs; // real game DLL function tables
extern mutil_funcs_t  *gpMetaUtilFuncs;// Metamod utility callbacks

#endif // FORGE_SDK_H
