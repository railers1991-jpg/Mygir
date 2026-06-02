#include "Forge.h"
#include "Util.h"

#include <cstring>
#include <cstdlib>
#include <strings.h> // strcasecmp

Forge& Forge::instance() {
    static Forge s;
    return s;
}

// ---- cvars ---------------------------------------------------------------
// Registered once; modes read them by name via g_engfuncs.pfnCVarGetFloat.
static void registerCvars() {
    static bool done = false;
    if (done) return;
    done = true;

    static cvar_t cvars[] = {
        { "forge_version",        "0.1.0", FCVAR_SERVER },
        { "forge_bounty_streak",  "4",     0 }, // kills to become Most Wanted
        { "forge_bounty_glow",    "1",     0 }, // glow shell on the bounty
        { "forge_reward_armor",   "50",    0 }, // armor for claiming a bounty
        { "forge_firstblood_armor","25",   0 }, // armor for first blood
        { "forge_headshot_armor", "10",    0 },
        { "forge_adrenaline_hp",  "25",    0 }, // heal for a low-HP clutch kill
    };
    for (auto& c : cvars) g_engfuncs.pfnCVarRegister(&c);
}

// ---- lifecycle -----------------------------------------------------------
void Forge::serverActivate(int maxClients) {
    m_maxClients = maxClients;
    if (m_maxClients > kMaxSlots - 1) m_maxClients = kMaxSlots - 1;
    m_active = true;
    m_msgCount = 0; // the game re-registers user messages every map load

    for (int i = 0; i < kMaxSlots; ++i) {
        m_players[i].index = i;
        m_players[i].edict = util::edictByIndex(i);
        m_players[i].inGame = false;
        m_players[i].resetStats();
    }

    registerCvars();
    m_modes.registerAll();

    g_engfuncs.pfnServerPrint("[Forge] online — mode: ");
    g_engfuncs.pfnServerPrint(m_modes.current() ? m_modes.current()->title() : "none");
    g_engfuncs.pfnServerPrint("\n");
}

void Forge::serverDeactivate() {
    m_modes.shutdown();
    m_active = false;
}

void Forge::onFrame() {
    // Reserved for time-based mode logic; per-player work happens in think.
}

Player* Forge::playerByEdict(edict_t* e) {
    if (!e) return nullptr;
    int i = util::indexOf(e);
    if (i < 1 || i > m_maxClients) return nullptr;
    return &m_players[i];
}

void Forge::onClientPutInServer(edict_t* e) {
    Player* p = playerByEdict(e);
    if (!p) return;
    p->edict = e;
    p->inGame = true;
    p->resetStats();
    if (m_modes.current()) m_modes.current()->onConnect(*p);
}

void Forge::onClientDisconnect(edict_t* e) {
    Player* p = playerByEdict(e);
    if (!p || !p->inGame) return;
    util::clearGlow(e);
    if (m_modes.current()) m_modes.current()->onDisconnect(*p);
    p->inGame = false;
}

void Forge::detectSpawn(Player& p) {
    p.spawnTime = gpGlobals->time;
    p.streak = p.streak; // streak carries across respawns; reset only on death
    if (m_modes.current()) m_modes.current()->onSpawn(p);
}

void Forge::onPlayerThink(edict_t* e) {
    Player* p = playerByEdict(e);
    if (!p || !p->inGame) return;

    bool nowAlive = util::isAlive(e);
    p->alive = nowAlive;
    if (nowAlive && !p->wasAlive) detectSpawn(*p);
    if (m_modes.current()) m_modes.current()->onThink(*p);
    p->wasAlive = nowAlive;
}

// ---- chat / console commands --------------------------------------------
static int tokenize(char* s, const char* out[], int maxTokens) {
    int n = 0;
    while (*s && n < maxTokens) {
        while (*s == ' ') *s++ = '\0';
        if (!*s) break;
        out[n++] = s;
        while (*s && *s != ' ') ++s;
    }
    return n;
}

bool Forge::onClientCommand(edict_t* e) {
    Player* p = playerByEdict(e);
    if (!p || !p->inGame) return false;
    const char* cmd = g_engfuncs.pfnCmd_Argv(0);
    if (!cmd) return false;

    // Engine menu selection -> "menu <slot>" command for the mode.
    if (strcmp(cmd, "menuselect") == 0) {
        const char* slot = g_engfuncs.pfnCmd_Argv(1);
        const char* argv[2] = { "menu", slot ? slot : "0" };
        if (m_modes.current() && m_modes.current()->onCommand(*p, 2, argv)) return true;
        return false;
    }

    bool say = (strcmp(cmd, "say") == 0) || (strcmp(cmd, "say_team") == 0);
    if (!say) return false;

    const char* args = g_engfuncs.pfnCmd_Args();
    if (!args || !*args) return false;

    char buf[256];
    strncpy(buf, args, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';
    char* text = buf;
    if (*text == '"') { ++text; char* q = strrchr(text, '"'); if (q) *q = '\0'; }
    if (*text != '/' && *text != '!') return false; // ordinary chat
    ++text; // drop the prefix

    const char* argv[8];
    int argc = tokenize(text, argv, 8);
    if (argc == 0) return true;

    // Core commands available in every mode.
    if (strcasecmp(argv[0], "modes") == 0) {
        util::chat(e, "Modes available:");
        for (int i = 0; i < m_modes.count(); ++i)
            util::chat(e, "  %s - %s", m_modes.at(i)->id(), m_modes.at(i)->title());
        util::chat(e, "Active: %s", m_modes.current() ? m_modes.current()->title() : "none");
        return true;
    }
    if (strcasecmp(argv[0], "mode") == 0 && argc >= 2) {
        if (!m_modes.switchTo(argv[1])) util::chat(e, "Unknown mode: %s", argv[1]);
        return true;
    }

    if (m_modes.current()) m_modes.current()->onCommand(*p, argc, argv);
    return true; // a '/'-command is always eaten so it never hits public chat
}

// ---- decoded engine messages --------------------------------------------
void Forge::onKill(int killerIdx, int victimIdx, bool headshot, const char* weapon) {
    if (victimIdx < 1 || victimIdx > m_maxClients) return;
    Player& victim = m_players[victimIdx];
    victim.deaths++;
    victim.alive = false;

    Player* attacker = nullptr;
    if (killerIdx >= 1 && killerIdx <= m_maxClients && killerIdx != victimIdx) {
        attacker = &m_players[killerIdx];
        attacker->totalKills++;
        attacker->streak++;
    }

    if (m_modes.current())
        m_modes.current()->onDeath(victim, attacker, weapon ? weapon : "", headshot);

    // Death always ends the victim's streak and any bounty glow.
    victim.streak = 0;
    victim.isBounty = false;
    util::clearGlow(victim.edict);
}

void Forge::onRoundDetected() {
    float now = gpGlobals->time;
    if (now - m_lastRoundFire < 3.0f) return; // RoundTime can repeat; debounce
    m_lastRoundFire = now;
    if (m_modes.current()) m_modes.current()->onRoundStart();
}

void Forge::registerUserMsg(const char* name, int id) {
    if (!name) return;
    for (int i = 0; i < m_msgCount; ++i)
        if (strcmp(m_msgs[i].name, name) == 0) { m_msgs[i].id = id; return; }
    if (m_msgCount < (int)(sizeof(m_msgs) / sizeof(m_msgs[0]))) {
        strncpy(m_msgs[m_msgCount].name, name, sizeof(m_msgs[0].name) - 1);
        m_msgs[m_msgCount].name[sizeof(m_msgs[0].name) - 1] = '\0';
        m_msgs[m_msgCount].id = id;
        m_msgCount++;
    }
}

int Forge::msgId(const char* name) const {
    for (int i = 0; i < m_msgCount; ++i)
        if (strcmp(m_msgs[i].name, name) == 0) return m_msgs[i].id;
    return -1;
}
