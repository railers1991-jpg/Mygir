/**
 * mygir.inc — общие хелперы для плагинов Mygir (CS 1.6 / AMX Mod X).
 *
 * Подключай в любой наш плагин:  #include <mygir>
 * Здесь живёт то, что не хочется дублировать: цветной чат, выдача денег,
 * безопасные проверки и пара мелких утилит.
 */

#if defined _mygir_included
    #endinput
#endif
#define _mygir_included

#include <amxmodx>
#include <cstrike>
#include <fun>

#define MYGIR_VERSION   "0.1.0"
#define MYGIR_TAG       "Mygir"          // префикс в чате
#define MYGIR_PREFIX    "^4[Mygir]^1 "   // ^4 зелёный тег, ^1 обычный текст

// ---- Цвета SayText (работают, когда жив хотя бы один игрок) --------------
//   ^1 жёлто-белый   ^3 цвет команды   ^4 зелёный
// -------------------------------------------------------------------------

/**
 * mygir_chat(id, fmt) — цветное сообщение в чат с нашим префиксом.
 * id = 0 шлёт всем. Безопасно к ботам/невалидным id.
 */
stock mygir_chat(const id, const fmt[], any:...)
{
    new msg[192];
    vformat(msg, charsmax(msg), fmt, 3);

    new full[224];
    formatex(full, charsmax(full), "%s%s", MYGIR_PREFIX, msg);

    if (id)
    {
        if (is_user_connected(id))
            _mygir_saytext(id, full);
    }
    else
    {
        new players[32], num;
        get_players(players, num, "ch");   // connected, без HLTV
        for (new i = 0; i < num; i++)
            _mygir_saytext(players[i], full);
    }
}

stock _mygir_saytext(const id, const msg[])
{
    message_begin(MSG_ONE_UNRELIABLE, get_user_msgid("SayText"), _, id);
    write_byte(id);
    write_string(msg);
    message_end();
}

/**
 * mygir_give_cash(id, amount) — добавить денег (с клампом до лимита CS $16000).
 * amount может быть отрицательным. Возвращает итоговую сумму.
 */
stock mygir_give_cash(const id, const amount)
{
    if (!is_user_connected(id))
        return 0;

    new money = cs_get_user_money(id) + amount;
    if (money < 0)      money = 0;
    if (money > 16000)  money = 16000;

    cs_set_user_money(id, money);
    return money;
}

/**
 * mygir_is_playing(id) — жив и в боевой команде (T/CT), не зритель.
 */
stock bool:mygir_is_playing(const id)
{
    if (!is_user_alive(id))
        return false;

    new CsTeams:team = cs_get_user_team(id);
    return (team == CS_TEAM_T || team == CS_TEAM_CT);
}

/**
 * mygir_name(id) — имя игрока в буфер (удобно для format-строк).
 */
stock mygir_name(const id, name[], const len)
{
    get_user_name(id, name, len);
}
