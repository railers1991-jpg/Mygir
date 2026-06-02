// Util.h — thin, engine-only helpers. Everything here is built on top of
// g_engfuncs / pev fields only: no fragile private-data offsets, so it works
// on stock HLDS as well as ReHLDS without per-build tuning.
#ifndef FORGE_UTIL_H
#define FORGE_UTIL_H

#include "../sdk/sdk.h"

namespace util {

// ---- entity helpers -------------------------------------------------------
inline entvars_t* pev(edict_t* e) { return e ? &e->v : nullptr; }
inline int        indexOf(edict_t* e) { return (int)g_engfuncs.pfnIndexOfEdict(e); }
inline edict_t*   edictByIndex(int i) { return g_engfuncs.pfnPEntityOfEntIndex(i); }

// A real, in-game client (connected, has a player slot). Does not imply alive.
bool isClient(edict_t* e);
// A client that is currently alive and playing.
bool isAlive(edict_t* e);

const char* name(edict_t* e);

// ---- text output ----------------------------------------------------------
// Center screen, single line (HUD center print).
void center(edict_t* e, const char* fmt, ...);
// Chat line to one client.
void chat(edict_t* e, const char* fmt, ...);
// Chat line to everyone in the server.
void chatAll(const char* fmt, ...);
// Center print to everyone.
void centerAll(const char* fmt, ...);

// ---- cosmetic effects (pev-based, safe everywhere) ------------------------
// Bright glow shell around a player (used by the bounty system).
void glow(edict_t* e, int r, int g, int b, int amount);
void clearGlow(edict_t* e);

// ---- a tiny pop-up menu (engine ShowMenu user message) --------------------
// `keys` is a bitmask of valid slots (1<<0 = slot 1, etc.). Selections come
// back as the client command "menuselect <slot>".
void showMenu(edict_t* e, int keys, int time, const char* body);

} // namespace util

#endif // FORGE_UTIL_H
