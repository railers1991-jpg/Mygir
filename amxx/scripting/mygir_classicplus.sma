/**
 * Mygir :: Classic+
 * --------------------------------------------------------------------------
 * Флагманский режим: классический CS 1.6 (бомба, экономика, раунды — стоковые),
 * но с нашей изюминкой поверх:
 *
 *   • Перки на жизнь (меню /perk):
 *       Vanguard    — +25 к максимальному HP
 *       Scout       — +скорость передвижения
 *       Juggernaut  — +броня (вест+шлем)
 *       Medic       — регенерация HP со временем
 *       Phantom     — пониженная гравитация
 *   • First Blood   — первое убийство раунда: объявление + бонус
 *   • Headshot bonus— доплата за килл в голову
 *   • Bounty / Most Wanted — серия убийств подсвечивает игрока; killer'у награда
 *   • Adrenaline    — клатч-килл на низком HP лечит
 *
 * Зависимости: amxmodx, cstrike, fun, hamsandwich, fakemeta (для рендера).
 */

#include <amxmodx>
#include <hamsandwich>
#include <fakemeta>
#include <mygir>

#define PLUGIN  "Mygir Classic+"

// ---- Перки ---------------------------------------------------------------
enum _:Perk
{
    PERK_NONE = 0,
    PERK_VANGUARD,
    PERK_SCOUT,
    PERK_JUGGERNAUT,
    PERK_MEDIC,
    PERK_PHANTOM,
    PERK_COUNT
};

new const g_perkName[PERK_COUNT][] =
{
    "Без перка",
    "Vanguard  \y(+25 HP)",
    "Scout  \y(+скорость)",
    "Juggernaut  \y(+броня)",
    "Medic  \y(реген HP)",
    "Phantom  \y(низкая гравитация)"
};

// ---- Состояние игроков ---------------------------------------------------
new g_perk[33];          // выбранный перк
new g_streak[33];        // текущая серия убийств
new bool:g_wanted[33];   // помечен ли как Most Wanted

new bool:g_firstBloodDone;

// ---- Cvars ---------------------------------------------------------------
new g_cvPerks, g_cvFirstBlood, g_cvHsBonus,
    g_cvBountyStreak, g_cvBountyReward, g_cvAdrenaline,
    g_cvVanguardHp, g_cvScoutSpeed, g_cvJuggerArmor, g_cvPhantomGrav;

public plugin_init()
{
    register_plugin(PLUGIN, MYGIR_VERSION, "Mygir")

    // настройки
    g_cvPerks        = register_cvar("mygir_perks",         "1")
    g_cvFirstBlood   = register_cvar("mygir_firstblood",    "1")
    g_cvHsBonus      = register_cvar("mygir_hs_bonus",      "300")
    g_cvBountyStreak = register_cvar("mygir_bounty_streak", "5")
    g_cvBountyReward = register_cvar("mygir_bounty_reward", "2500")
    g_cvAdrenaline   = register_cvar("mygir_adrenaline",    "1")
    g_cvVanguardHp   = register_cvar("mygir_vanguard_hp",   "125")
    g_cvScoutSpeed   = register_cvar("mygir_scout_speed",   "320")
    g_cvJuggerArmor  = register_cvar("mygir_jugger_armor",  "100")
    g_cvPhantomGrav  = register_cvar("mygir_phantom_grav",  "0.6")

    // события геймплея
    register_event("DeathMsg", "ev_DeathMsg", "a")
    register_logevent("le_RoundStart", 2, "1=Round_Start")

    // спавн через Ham (post — чтобы движок уже выдал стартовое HP/броню)
    RegisterHam(Ham_Spawn, "player", "fw_Spawn_Post", 1)

    // команды/меню перков
    register_clcmd("say /perk",  "cmd_PerkMenu")
    register_clcmd("say /perks", "cmd_PerkMenu")
    register_clcmd("say perk",   "cmd_PerkMenu")
}

public client_putinserver(id)
{
    g_perk[id]   = PERK_NONE
    g_streak[id] = 0
    g_wanted[id] = false
}

// ==========================================================================
//  Спавн: применяем выбранный перк
// ==========================================================================
public fw_Spawn_Post(id)
{
    if (!mygir_is_playing(id))
        return

    // сброс возможного свечения от прошлой жизни
    clear_glow(id)
    g_wanted[id] = false

    if (!get_pcvar_num(g_cvPerks))
        return

    switch (g_perk[id])
    {
        case PERK_VANGUARD:
        {
            new hp = get_pcvar_num(g_cvVanguardHp)
            set_user_health(id, hp)
        }
        case PERK_SCOUT:
        {
            set_user_maxspeed(id, get_pcvar_float(g_cvScoutSpeed))
        }
        case PERK_JUGGERNAUT:
        {
            cs_set_user_armor(id, get_pcvar_num(g_cvJuggerArmor), CS_ARMOR_VESTHELM)
        }
        case PERK_MEDIC:
        {
            // запускаем реген, привязанный к id; снимется на смерти/респавне
            remove_task(id + 9000)
            set_task(1.0, "task_Regen", id + 9000, _, _, "b")
        }
        case PERK_PHANTOM:
        {
            set_user_gravity(id, get_pcvar_float(g_cvPhantomGrav))
        }
    }
}

public task_Regen(taskid)
{
    new id = taskid - 9000
    if (!is_user_alive(id) || g_perk[id] != PERK_MEDIC)
    {
        remove_task(taskid)
        return
    }

    new hp = get_user_health(id)
    if (hp < 100)
        set_user_health(id, min(hp + 3, 100))
}

// ==========================================================================
//  Раунд: сброс First Blood и серий
// ==========================================================================
public le_RoundStart()
{
    g_firstBloodDone = false

    new players[32], num
    get_players(players, num, "ch")
    for (new i = 0; i < num; i++)
    {
        g_streak[players[i]] = 0
        g_wanted[players[i]] = false
        clear_glow(players[i])
    }
}

// ==========================================================================
//  Убийство: First Blood / хедшот / bounty / adrenaline
// ==========================================================================
public ev_DeathMsg()
{
    new killer = read_data(1)
    new victim = read_data(2)
    new headshot = read_data(3)

    // самоубийство / урон от мира
    if (!killer || killer == victim || !is_user_connected(killer))
    {
        if (is_user_connected(victim))
        {
            g_streak[victim] = 0
            g_wanted[victim] = false
        }
        return
    }

    new bool:friendly = (cs_get_user_team(killer) == cs_get_user_team(victim))

    // --- First Blood ---
    if (get_pcvar_num(g_cvFirstBlood) && !g_firstBloodDone && !friendly)
    {
        g_firstBloodDone = true
        new name[32]; mygir_name(killer, name, charsmax(name))
        mygir_give_cash(killer, 500)
        mygir_chat(0, "^3%s^1 пролил ^4First Blood^1! (+$500)", name)
    }

    // --- Бонус за хедшот ---
    if (headshot && !friendly)
    {
        new bonus = get_pcvar_num(g_cvHsBonus)
        if (bonus > 0)
        {
            mygir_give_cash(killer, bonus)
            mygir_chat(killer, "Хедшот: ^4+$%d", bonus)
        }
    }

    // --- Adrenaline: клатч-килл на низком HP лечит ---
    if (get_pcvar_num(g_cvAdrenaline) && !friendly && is_user_alive(killer))
    {
        if (get_user_health(killer) <= 30)
        {
            new hp = min(get_user_health(killer) + 35, 100)
            set_user_health(killer, hp)
            mygir_chat(killer, "^4Adrenaline^1: +HP за клатч-килл")
        }
    }

    // --- Был ли убитый Most Wanted: награда охотнику ---
    if (g_wanted[victim] && !friendly)
    {
        new reward = get_pcvar_num(g_cvBountyReward)
        mygir_give_cash(killer, reward)

        new kn[32], vn[32]
        mygir_name(killer, kn, charsmax(kn))
        mygir_name(victim, vn, charsmax(vn))
        mygir_chat(0, "^3%s^1 снял ^4Most Wanted^1 с ^3%s^1 и забрал ^4$%d^1!", kn, vn, reward)
    }
    g_wanted[victim] = false
    g_streak[victim] = 0
    clear_glow(victim)

    // --- Обновляем серию убийцы ---
    if (!friendly)
    {
        g_streak[killer]++

        new need = get_pcvar_num(g_cvBountyStreak)
        if (need > 0 && g_streak[killer] == need && !g_wanted[killer])
        {
            g_wanted[killer] = true
            set_glow_red(killer)

            new name[32]; mygir_name(killer, name, charsmax(name))
            mygir_chat(0, "^3%s^1 поднял серию ^4%d^1 — теперь это ^4Most Wanted^1! Голова в награде.", name, need)
        }
    }
}

// ==========================================================================
//  Меню перков
// ==========================================================================
public cmd_PerkMenu(id)
{
    if (!get_pcvar_num(g_cvPerks))
    {
        mygir_chat(id, "Перки выключены на этом сервере.")
        return PLUGIN_HANDLED
    }

    new title[64]
    formatex(title, charsmax(title), "\yMygir \wClassic+\d — выбери перк")
    new menu = menu_create(title, "perk_handler")

    new item[64]
    for (new p = 0; p < PERK_COUNT; p++)
    {
        new bool:cur = (g_perk[id] == p)
        formatex(item, charsmax(item), "%s%s", cur ? "\w> " : "\w", g_perkName[p])
        menu_additem(menu, item)
    }

    menu_display(id, menu)
    return PLUGIN_HANDLED
}

public perk_handler(id, menu, item)
{
    if (item == MENU_EXIT)
    {
        menu_destroy(menu)
        return PLUGIN_HANDLED
    }

    g_perk[id] = item
    mygir_chat(id, "Перк выбран: ^4%s^1. Активируется со следующего спавна.", g_perkName[item])

    menu_destroy(menu)
    return PLUGIN_HANDLED
}

// ==========================================================================
//  Рендер «свечения» Most Wanted
// ==========================================================================
set_glow_red(id)
{
    // красная подсветка корпуса
    set_user_rendering(id, kRenderFxGlowShell, 255, 30, 30, kRenderNormal, 16)
}

clear_glow(id)
{
    set_user_rendering(id, kRenderFxNone, 0, 0, 0, kRenderNormal, 16)
}
