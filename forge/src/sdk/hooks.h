// hooks.h — the export functions Metamod resolves through META_FUNCTIONS.
#ifndef FORGE_HOOKS_H
#define FORGE_HOOKS_H

#include "sdk.h"

// Game-DLL (entity) API — defined in dllapi.cpp.
int GetEntityAPI2(DLL_FUNCTIONS* pFunctionTable, int* interfaceVersion);

// Engine API — defined in engine_api.cpp. We use a pre table (message
// inspection) and a post table (reading RegUserMsg's assigned ids).
int GetEngineFunctions(enginefuncs_t* pengfuncsFromEngine, int* interfaceVersion);
int GetEngineFunctions_Post(enginefuncs_t* pengfuncsFromEngine, int* interfaceVersion);

#endif // FORGE_HOOKS_H
