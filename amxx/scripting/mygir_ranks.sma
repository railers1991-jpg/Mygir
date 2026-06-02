/**
 * Mygir :: Ranks
 * --------------------------------------------------------------------------
 * Прогрессия игроков: XP за убийства (с бонусом за хедшот) и за победу раунда.
 * Уровни и звания, прогресс сохраняется между картами через nvault
 * (по SteamID, а в отсутствие — по имени).
 *
 * Команды:  /rank  — показать свой ранг и прогресс
 *           /top   — топ онлайна по уровню
 */

#include <amxmodx>
#include <nvault>
#include <mygir>

#define PLUGIN  "Mygir Ranks"

new const RANKS[][] =
{
    "Новобранец",   // 0
    "Рядовой",      // 1
    "Капрал",       // 2
    "Сержант",      // 3
    "Лейтенант",    // 4
    "Капитан",      // 5
    "Майор",        // 6
    "Полковник",    // 7
    "Генерал",      // 8
    "Легенда"       // 9
};

new g_xp[33]
new g_level[33]
new g_vault

new g_cvXpKill, g_cvXpHs, g_cvXpWin, g_cvXpBase, g_cvXpStep

public plugin_init()
{
    register_plugin(PLUGIN, MYGIR_VERSION, "Mygir")

    g_cvXpKill = register_cvar("mygir_xp_kill", "10")
    g_cvXpHs   = register_cvar("mygir_xp_hs",   "5")
    g_cvXpWin  = register_cvar("mygir_xp_win",  "15")
    g_cvXpBase = register_cvar("mygir_xp_base", "100")  // XP до 1 уровня
    g_cvXpStep = register_cvar("mygir_xp_step", "50")   // +XP на каждый след. уровень

    register_event("DeathMsg", "ev_DeathMsg", "a")
    // победа раунда в CS 1.6 надёжно ловится по звуку рации:
    register_event("SendAudio", "ev_TerWin", "a", "2&%!MRAD_terwin")
    register_event("SendAudio", "ev_CtWin",  "a", "2&%!MRAD_ctwin")

    register_clcmd("say /rank", "cmd_Rank")
    register_clcmd("say /top",  "cmd_Top")

    g_vault = nvault_open("mygir_ranks")
    if (g_vault == INVALID_HANDLE)
        set_fail_state("Не удалось открыть nvault 'mygir_ranks'")
}

public plugin_end()
{
    if (g_vault != INVALID_HANDLE)
        nvault_close(g_vault)
}

public client_putinserver(id)
{
    g_xp[id] = 0
    g_level[id] = 0
    load_progress(id)
}

public client_disconnected(id)
{
    save_progress(id)
}

// ---- XP за убийства ------------------------------------------------------
public ev_DeathMsg()
{
    new killer = read_data(1)
    new victim = read_data(2)
    new headshot = read_data(3)

    if (!killer || killer == victim || !is_user_connected(killer))
        return

    if (cs_get_user_team(killer) == cs_get_user_team(victim))
        return  // без XP за тимкилл

    new gain = get_pcvar_num(g_cvXpKill)
    if (headshot)
        gain += get_pcvar_num(g_cvXpHs)

    add_xp(killer, gain)
}

// ---- XP за победу команды ------------------------------------------------
public ev_TerWin()  { award_team_win(CS_TEAM_T) }
public ev_CtWin()   { award_team_win(CS_TEAM_CT) }

award_team_win(CsTeams:team)
{
    new bonus = get_pcvar_num(g_cvXpWin)
    if (bonus <= 0)
        return

    new players[32], num
    get_players(players, num, "ch")
    for (new i = 0; i < num; i++)
        if (cs_get_user_team(players[i]) == team)
            add_xp(players[i], bonus)
}

add_xp(id, amount)
{
    if (!is_user_connected(id) || amount <= 0)
        return

    g_xp[id] += amount

    new before = g_level[id]
    while (g_xp[id] >= xp_for_next(g_level[id]) && g_level[id] < charsmax(RANKS))
    {
        g_xp[id] -= xp_for_next(g_level[id])
        g_level[id]++
    }

    if (g_level[id] > before)
    {
        mygir_chat(id, "Новый уровень: ^4%d^1 — ^3%s^1!", g_level[id], RANKS[g_level[id]])
    }
}

// XP, нужное чтобы перейти с уровня lvl на lvl+1
xp_for_next(lvl)
{
    return get_pcvar_num(g_cvXpBase) + lvl * get_pcvar_num(g_cvXpStep)
}

// ---- Команды -------------------------------------------------------------
public cmd_Rank(id)
{
    new need = xp_for_next(g_level[id])
    mygir_chat(id, "Звание: ^3%s^1 (ур. ^4%d^1). XP: ^4%d^1/^4%d", RANKS[g_level[id]], g_level[id], g_xp[id], need)
    return PLUGIN_HANDLED
}

public cmd_Top(id)
{
    new players[32], num
    get_players(players, num, "ch")

    // простая сортировка пузырьком по уровню (онлайн небольшой)
    for (new i = 0; i < num - 1; i++)
        for (new j = i + 1; j < num; j++)
            if (g_level[players[j]] > g_level[players[i]])
            {
                new t = players[i]; players[i] = players[j]; players[j] = t
            }

    mygir_chat(id, "^4Топ онлайна^1:")
    new name[32], shown = min(num, 5)
    for (new k = 0; k < shown; k++)
    {
        mygir_name(players[k], name, charsmax(name))
        mygir_chat(id, "  ^4%d.^1 ^3%s^1 — ур. ^4%d^1 (%s)", k + 1, name, g_level[players[k]], RANKS[g_level[players[k]]])
    }
    return PLUGIN_HANDLED
}

// ---- Сохранение через nvault --------------------------------------------
vault_key(id, key[], len)
{
    new auth[40]
    get_user_authid(id, auth, charsmax(auth))
    if (!auth[0] || equal(auth, "STEAM_ID_PENDING") || equal(auth, "VALVE_ID_LAN") || equal(auth, "BOT"))
        get_user_name(id, auth, charsmax(auth))  // фоллбэк по имени

    formatex(key, len, "mygir_%s", auth)
}

save_progress(id)
{
    new key[64]; vault_key(id, key, charsmax(key))
    new data[32]
    formatex(data, charsmax(data), "%d %d", g_level[id], g_xp[id])
    nvault_set(g_vault, key, data)
}

load_progress(id)
{
    new key[64]; vault_key(id, key, charsmax(key))
    new data[32]
    if (nvault_get(g_vault, key, data, charsmax(data)))
    {
        new slvl[16], sxp[16]
        parse(data, slvl, charsmax(slvl), sxp, charsmax(sxp))
        g_level[id] = clamp(str_to_num(slvl), 0, charsmax(RANKS))
        g_xp[id]    = max(str_to_num(sxp), 0)
    }
}
