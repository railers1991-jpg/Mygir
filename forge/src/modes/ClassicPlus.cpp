#include "ClassicPlus.h"
#include "../core/Util.h"
#include "../core/Forge.h"

#include <cstring>
#include <cstdlib>
#include <strings.h> // strcasecmp

static float cvar(const char* n) { return g_engfuncs.pfnCVarGetFloat((char*)n); }
static float capf(float v, float hi) { return v > hi ? hi : v; }

void ClassicPlus::onLoad() {
    util::chatAll("Now playing %s", title());
    util::chatAll("Type /perk to choose your buff, /modes to see game modes.");
}

void ClassicPlus::onRoundStart() {
    m_firstBlood = false;
    // Fresh life next round: everyone re-picks a perk and bounties are cleared.
    for (int i = 1; i <= Forge::instance().maxClients(); ++i) {
        Player& p = Forge::instance().player(i);
        if (!p.inGame) continue;
        p.perkChosen = false;
        p.isBounty = false;
        util::clearGlow(p.edict);
    }
    util::centerAll("CLASSIC+  -  pick your perk with /perk");
}

void ClassicPlus::onConnect(Player& p) {
    util::chat(p.edict, "Welcome to Classic+! /perk to pick a buff each round.");
}

void ClassicPlus::onSpawn(Player& p) {
    p.nextRegen = gpGlobals->time + 1.0f;
    if (p.perkChosen) applyPerk(p);
    else              showPerkMenu(p);
}

void ClassicPlus::onDeath(Player& victim, Player* attacker,
                          const char* weapon, bool headshot) {
    if (!attacker) return; // suicide / world kill: nothing to reward

    entvars_t* a = attacker->pev();

    // First blood of the round.
    if (!m_firstBlood) {
        m_firstBlood = true;
        a->armorvalue = capf(a->armorvalue + cvar("forge_firstblood_armor"), 100.0f);
        util::chatAll("FIRST BLOOD: %s", util::name(attacker->edict));
        util::center(attacker->edict, "FIRST BLOOD!");
    }

    // Headshot kicker.
    if (headshot) {
        a->armorvalue = capf(a->armorvalue + cvar("forge_headshot_armor"), 100.0f);
    }

    // Adrenaline: reward a clutch kill made while nearly dead.
    if (attacker->alive && a->health > 0 && a->health <= 35) {
        a->health = capf(a->health + cvar("forge_adrenaline_hp"), 100.0f);
        util::center(attacker->edict, "ADRENALINE  +%d HP", (int)cvar("forge_adrenaline_hp"));
    }

    // Bounty claimed?
    if (victim.isBounty) {
        a->armorvalue = capf(a->armorvalue + cvar("forge_reward_armor"), 100.0f);
        util::chatAll("BOUNTY CLAIMED: %s dropped %s",
                      util::name(attacker->edict), util::name(victim.edict));
        util::center(attacker->edict, "BOUNTY CLAIMED!");
    }

    // Did the attacker just earn a bounty on their own head?
    int need = (int)cvar("forge_bounty_streak");
    if (need > 0 && attacker->streak >= need && !attacker->isBounty) {
        attacker->isBounty = true;
        if (cvar("forge_bounty_glow") > 0)
            util::glow(attacker->edict, 255, 40, 40, 25);
        util::chatAll("MOST WANTED: %s is on a %d-kill streak!",
                      util::name(attacker->edict), attacker->streak);
    } else if (attacker->streak == 2 || attacker->streak == 3) {
        util::center(attacker->edict, "%d kill streak", attacker->streak);
    }
}

void ClassicPlus::onThink(Player& p) {
    if (!p.alive) return;
    // Medic perk: slow regeneration up to full health.
    if (p.perk == PERK_MEDIC && gpGlobals->time >= p.nextRegen) {
        entvars_t* pv = p.pev();
        if (pv->health < 100) pv->health = capf(pv->health + 2.0f, 100.0f);
        p.nextRegen = gpGlobals->time + 1.0f;
    }
}

bool ClassicPlus::onCommand(Player& p, int argc, const char* argv[]) {
    if (strcasecmp(argv[0], "perk") == 0) {
        if (argc >= 2) {
            if      (strcasecmp(argv[1], "vanguard")   == 0) setPerk(p, PERK_VANGUARD);
            else if (strcasecmp(argv[1], "scout")      == 0) setPerk(p, PERK_SCOUT);
            else if (strcasecmp(argv[1], "juggernaut") == 0) setPerk(p, PERK_JUGGERNAUT);
            else if (strcasecmp(argv[1], "medic")      == 0) setPerk(p, PERK_MEDIC);
            else if (strcasecmp(argv[1], "phantom")    == 0) setPerk(p, PERK_PHANTOM);
            else util::chat(p.edict, "Unknown perk. Try: vanguard scout juggernaut medic phantom");
        } else {
            showPerkMenu(p);
        }
        return true;
    }

    // Selection coming back from the on-screen menu.
    if (strcasecmp(argv[0], "menu") == 0 && m_perkMenuOpen[p.index]) {
        int slot = (argc >= 2) ? atoi(argv[1]) : 0;
        if (slot >= 1 && slot <= 5) {
            m_perkMenuOpen[p.index] = false;
            setPerk(p, PERK_VANGUARD + (slot - 1));
            return true;
        }
    }
    return false;
}

// ---- perks ----------------------------------------------------------------
const char* ClassicPlus::perkName(int perk) {
    switch (perk) {
        case PERK_VANGUARD:   return "Vanguard (+25 HP)";
        case PERK_SCOUT:      return "Scout (+12% speed)";
        case PERK_JUGGERNAUT: return "Juggernaut (+50 armor)";
        case PERK_MEDIC:      return "Medic (regen)";
        case PERK_PHANTOM:    return "Phantom (low gravity)";
        default:              return "None";
    }
}

void ClassicPlus::showPerkMenu(Player& p) {
    m_perkMenuOpen[p.index] = true;
    static const char* body =
        "\\wForge \\y/ \\wPick a Perk\n\n"
        "\\y1.\\w Vanguard  \\r(+25 HP)\n"
        "\\y2.\\w Scout     \\r(+12% speed)\n"
        "\\y3.\\w Juggernaut\\r(+50 armor)\n"
        "\\y4.\\w Medic     \\r(regen)\n"
        "\\y5.\\w Phantom   \\r(low gravity)\n";
    util::showMenu(p.edict, (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4), 20, body);
}

void ClassicPlus::setPerk(Player& p, int perk) {
    if (perk <= PERK_NONE || perk >= PERK_COUNT) return;
    p.perk = perk;
    p.perkChosen = true;
    util::chat(p.edict, "Perk for this life: %s", perkName(perk));
    if (p.alive) applyPerk(p); // already spawned? apply immediately
}

void ClassicPlus::applyPerk(Player& p) {
    entvars_t* pv = p.pev();
    if (!pv) return;
    switch (p.perk) {
        case PERK_VANGUARD:   pv->health = 125.0f; break;
        case PERK_SCOUT:      pv->maxspeed = (pv->maxspeed > 0 ? pv->maxspeed : 250.0f) * 1.12f; break;
        case PERK_JUGGERNAUT: pv->armorvalue = 100.0f; break;
        case PERK_MEDIC:      p.nextRegen = gpGlobals->time + 1.0f; break;
        case PERK_PHANTOM:    pv->gravity = 0.80f; break;
        default: break;
    }
}
