/**
 * Mygir :: Shop
 * --------------------------------------------------------------------------
 * Магазин дополнительной снаряги за внутриигровые деньги CS.
 * Открывается на «/shop». Покупки тратят $ как в обычном баю, но дают то,
 * чего в стоковом магазине нет.
 *
 * Товары:
 *   • Аптечка     — +25 HP (до 100)
 *   • Тяжёлая броня— 100 брони (вест+шлем)
 *   • HE-граната
 *   • Дым
 *   • Флешка
 *   • Скорость    — лёгкий буст maxspeed до конца жизни
 *
 * Зависимости: amxmodx, cstrike, fun, mygir.
 */

#include <amxmodx>
#include <fun>
#include <mygir>

#define PLUGIN  "Mygir Shop"

enum _:Item { ITEM_NAME, ITEM_PRICE }

new const g_shop[][Item] =
{
    { "Аптечка \y(+25 HP)",        650  },
    { "Тяжёлая броня \y(100 AP)",  900  },
    { "HE-граната",                300  },
    { "Дымовая шашка",             250  },
    { "Флешбэнг",                  200  },
    { "Ускорение \y(буст скорости)", 1200 }
};

new g_cvEnabled

public plugin_init()
{
    register_plugin(PLUGIN, MYGIR_VERSION, "Mygir")

    g_cvEnabled = register_cvar("mygir_shop", "1")

    register_clcmd("say /shop",  "cmd_Shop")
    register_clcmd("say /buy",   "cmd_Shop")
    register_clcmd("say shop",   "cmd_Shop")
}

public cmd_Shop(id)
{
    if (!get_pcvar_num(g_cvEnabled))
    {
        mygir_chat(id, "Магазин выключен на этом сервере.")
        return PLUGIN_HANDLED
    }

    if (!mygir_is_playing(id))
    {
        mygir_chat(id, "Магазин доступен только живым игрокам в команде.")
        return PLUGIN_HANDLED
    }

    new title[96]
    formatex(title, charsmax(title), "\yMygir \wShop\d — у тебя \y$%d", cs_get_user_money(id))
    new menu = menu_create(title, "shop_handler")

    new item[64]
    for (new i = 0; i < sizeof(g_shop); i++)
    {
        formatex(item, charsmax(item), "%s  \r$%d", g_shop[i][ITEM_NAME], g_shop[i][ITEM_PRICE])
        menu_additem(menu, item)
    }

    menu_display(id, menu)
    return PLUGIN_HANDLED
}

public shop_handler(id, menu, item)
{
    if (item == MENU_EXIT)
    {
        menu_destroy(menu)
        return PLUGIN_HANDLED
    }

    if (!mygir_is_playing(id))
    {
        mygir_chat(id, "Нельзя покупать: ты не в игре.")
        menu_destroy(menu)
        return PLUGIN_HANDLED
    }

    new price = g_shop[item][ITEM_PRICE]
    if (cs_get_user_money(id) < price)
    {
        mygir_chat(id, "Недостаточно денег: нужно ^4$%d^1.", price)
        menu_destroy(menu)
        return PLUGIN_HANDLED
    }

    if (!buy_give(id, item))
    {
        // buy_give уже сообщил причину — деньги не списываем
        menu_destroy(menu)
        return PLUGIN_HANDLED
    }

    mygir_give_cash(id, -price)
    mygir_chat(id, "Куплено: ^4%s^1 за ^4$%d", g_shop[item][ITEM_NAME], price)

    menu_destroy(menu)
    return PLUGIN_HANDLED
}

/**
 * Выдать товар. Возвращает true если выдача удалась (тогда спишем деньги).
 * Имя не give_item — это занятый натив из fun.
 */
bool:buy_give(id, item)
{
    switch (item)
    {
        case 0:  // Аптечка
        {
            new hp = get_user_health(id)
            if (hp >= 100)
            {
                mygir_chat(id, "У тебя уже полное HP.")
                return false
            }
            set_user_health(id, min(hp + 25, 100))
        }
        case 1:  // Тяжёлая броня
        {
            cs_set_user_armor(id, 100, CS_ARMOR_VESTHELM)
        }
        case 2:  give_item(id, "weapon_hegrenade")    // натив fun
        case 3:  give_item(id, "weapon_smokegrenade")
        case 4:  give_item(id, "weapon_flashbang")
        case 5:  // Ускорение
        {
            new Float:sp = get_user_maxspeed(id)
            set_user_maxspeed(id, sp + 40.0)
        }
    }
    return true
}
