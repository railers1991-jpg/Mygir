// ClassicPlus.h — the flagship mode: classic CS, with momentum.
//
// Stock bomb/hostage rounds, buy menu and economy are left to the base game.
// On top we layer a light roguelite/momentum system that keeps classic fresh:
//
//   * Perks      — pick one buff for your life when you spawn.
//   * Bounty     — a long kill streak marks you "Most Wanted": you glow and
//                  whoever drops you gets a reward.
//   * First Blood / Headshot bonuses.
//   * Adrenaline — get a kill while nearly dead and you patch up.
//
// Everything is pev-based, so it runs on stock HLDS and ReHLDS alike.
#ifndef FORGE_CLASSICPLUS_H
#define FORGE_CLASSICPLUS_H

#include "../core/GameMode.h"

class ClassicPlus : public GameMode {
public:
    const char* id()    const override { return "classicplus"; }
    const char* title() const override { return "Classic+ (Momentum & Bounty)"; }
    const char* blurb() const override {
        return "Classic CS with perks, kill-streak bounties and clutch bonuses.";
    }

    void onLoad() override;
    void onRoundStart() override;
    void onConnect(Player& p) override;
    void onSpawn(Player& p) override;
    void onDeath(Player& victim, Player* attacker,
                 const char* weapon, bool headshot) override;
    void onThink(Player& p) override;
    bool onCommand(Player& p, int argc, const char* argv[]) override;

private:
    void showPerkMenu(Player& p);
    void applyPerk(Player& p);
    void setPerk(Player& p, int perk);
    static const char* perkName(int perk);

    bool m_firstBlood = false;
    bool m_perkMenuOpen[33] = {};
};

#endif // FORGE_CLASSICPLUS_H
