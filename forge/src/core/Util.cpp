#include "Util.h"
#include "Forge.h"   // for user-message ids (no Util include in Forge.h => no cycle)

#include <cstdarg>
#include <cstdio>
#include <cstring>

namespace util {

bool isClient(edict_t* e) {
    if (!e || e->free) return false;
    int i = indexOf(e);
    if (i < 1 || i > gpGlobals->maxClients) return false;
    return (e->v.flags & FL_CLIENT) != 0;
}

bool isAlive(edict_t* e) {
    if (!isClient(e)) return false;
    return e->v.deadflag == DEAD_NO && e->v.health > 0;
}

const char* name(edict_t* e) {
    if (!e) return "?";
    const char* n = g_engfuncs.pfnInfoKeyValue(g_engfuncs.pfnGetInfoKeyBuffer(e), "name");
    return (n && *n) ? n : "player";
}

static void vformat(char* out, size_t n, const char* fmt, va_list ap) {
    vsnprintf(out, n, fmt, ap);
    out[n - 1] = '\0';
}

void center(edict_t* e, const char* fmt, ...) {
    if (!isClient(e)) return;
    char buf[256]; va_list ap; va_start(ap, fmt); vformat(buf, sizeof(buf), fmt, ap); va_end(ap);
    g_engfuncs.pfnClientPrintf(e, print_center, buf);
}

void chat(edict_t* e, const char* fmt, ...) {
    if (!isClient(e)) return;
    char buf[256]; va_list ap; va_start(ap, fmt); vformat(buf, sizeof(buf), fmt, ap); va_end(ap);

    int msg = Forge::instance().msgId("SayText");
    if (msg > 0) {
        char line[300];
        snprintf(line, sizeof(line), "\x04[Forge] \x01%s\n", buf); // green tag, normal text
        g_engfuncs.pfnMessageBegin(MSG_ONE, msg, nullptr, e);
        g_engfuncs.pfnWriteByte(indexOf(e));
        g_engfuncs.pfnWriteString(line);
        g_engfuncs.pfnMessageEnd();
    } else {
        g_engfuncs.pfnClientPrintf(e, print_chat, buf);
    }
}

void chatAll(const char* fmt, ...) {
    char buf[256]; va_list ap; va_start(ap, fmt); vformat(buf, sizeof(buf), fmt, ap); va_end(ap);
    for (int i = 1; i <= gpGlobals->maxClients; ++i) {
        edict_t* e = edictByIndex(i);
        if (isClient(e)) chat(e, "%s", buf);
    }
}

void centerAll(const char* fmt, ...) {
    char buf[256]; va_list ap; va_start(ap, fmt); vformat(buf, sizeof(buf), fmt, ap); va_end(ap);
    for (int i = 1; i <= gpGlobals->maxClients; ++i) {
        edict_t* e = edictByIndex(i);
        if (isClient(e)) center(e, "%s", buf);
    }
}

void glow(edict_t* e, int r, int g, int b, int amount) {
    if (!isClient(e)) return;
    e->v.renderfx   = kRenderFxGlowShell;
    e->v.rendermode = kRenderNormal;
    e->v.rendercolor = Vector((float)r, (float)g, (float)b);
    e->v.renderamt  = (float)amount;
}

void clearGlow(edict_t* e) {
    if (!isClient(e)) return;
    e->v.renderfx   = kRenderFxNone;
    e->v.rendermode = kRenderNormal;
    e->v.renderamt  = 0;
    e->v.rendercolor = Vector(0, 0, 0);
}

void showMenu(edict_t* e, int keys, int time, const char* body) {
    if (!isClient(e)) return;
    int msg = Forge::instance().msgId("ShowMenu");
    if (msg <= 0) return; // game hasn't registered the menu message yet
    g_engfuncs.pfnMessageBegin(MSG_ONE, msg, nullptr, e);
    g_engfuncs.pfnWriteShort(keys);
    g_engfuncs.pfnWriteChar(time);
    g_engfuncs.pfnWriteByte(0); // not multi-part
    g_engfuncs.pfnWriteString(body);
    g_engfuncs.pfnMessageEnd();
}

} // namespace util
