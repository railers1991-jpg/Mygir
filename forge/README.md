# Forge — свой движок модов для CS 1.6

Нативный **Metamod-плагин на C++** для настоящего сервера Counter-Strike 1.6
(GoldSrc). Никакого AMX Mod X — это полностью наш собственный фреймворк
игровых режимов и плагинов. Сам движок CS 1.6 закрытый, поэтому весь свежий
геймплей живёт здесь, как отдельный модуль, который подгружается в сервер.

## Что внутри

- **Своё ядро** (`src/core`): обёртка над игроками, шина событий, реестр
  режимов, утилиты вывода/эффектов — всё на «безопасных» pev-полях, работает
  и на стоковом HLDS, и на ReHLDS без подгонки оффсетов.
- **Своя система плагинов** (`GameMode`): чтобы сделать новый режим, наследуешь
  один класс и получаешь чистый поток событий (`onSpawn`, `onDeath`,
  `onRoundStart`, `onCommand`…). Никакого Metamod-кода в самих режимах.
- **Флагманский режим `Classic+`** (`src/modes/ClassicPlus.cpp`): классический
  CS (бомба/закладка/экономика — стоковые), но с нашей изюминкой:
  - **Перки на жизнь** — `/perk` или меню: Vanguard (+25 HP), Scout (+скорость),
    Juggernaut (+50 брони), Medic (реген), Phantom (низкая гравитация).
  - **Bounty / «Most Wanted»** — серия из N убийств подсвечивает игрока красным;
    кто его убьёт — получает награду.
  - **First Blood**, **бонус за хедшот**, **Adrenaline** (хил за клатч-килл на
    низком HP).

## Структура

```
forge/
├── Makefile                 сборка 32-битного .so
├── cfg/forge.cfg            cvar-настройки сервера
└── src/
    ├── sdk/                 связка с Metamod (входная точка, перехват вызовов)
    │   ├── meta_api.cpp      Meta_Query/Attach + GiveFnptrsToDll
    │   ├── dllapi.cpp        хуки game-DLL (спавн, команды, think…)
    │   └── engine_api.cpp    декодирование DeathMsg / RoundTime
    ├── core/                наше ядро
    │   ├── Forge.*           менеджер: события -> режим
    │   ├── Player.h          состояние игрока
    │   ├── GameMode.h        контракт плагина/режима
    │   ├── ModeManager.*     реестр и переключение режимов
    │   └── Util.*            вывод текста, меню, эффекты
    └── modes/
        └── ClassicPlus.*    флагманский режим
```

## Сборка (Linux)

CS 1.6 — 32-битный, плагин тоже должен быть 32-битным.

```bash
# зависимости (Debian/Ubuntu)
sudo apt-get install g++-multilib make

# нужны исходники HLSDK и заголовки Metamod рядом:
#   git clone https://github.com/dreamstalker/rehlds        # или классический hlsdk
#   git clone https://github.com/Bots-United/metamod-p

make HLSDK=/путь/к/hlsdk METAMOD=/путь/к/metamod-p/metamod
# => build/forge_mm_i386.so
```

> Примечание: в этой среде плагин не компилировался — нет HLSDK/Metamod и
> самого сервера. Код написан под стандартные API HLSDK + Metamod; перед
> боевым запуском собери его по инструкции выше.

## Установка на сервер

1. Скопируй `build/forge_mm_i386.so` в `cstrike/addons/forge/`.
2. Допиши строку в `cstrike/addons/metamod/plugins.ini`:
   ```
   linux addons/forge/forge_mm_i386.so
   ```
3. Скопируй `cfg/forge.cfg` в `cstrike/` и добавь в `server.cfg`:
   ```
   exec forge.cfg
   ```
4. Перезапусти сервер. В консоли появится `[Forge] online — mode: Classic+`.

## Команды

Игроки (в чат):

| Команда            | Действие                                  |
|--------------------|-------------------------------------------|
| `/perk`            | открыть меню выбора перка                  |
| `/perk scout`      | выбрать перк по имени                      |
| `/modes`           | список режимов                             |

Сервер (консоль/rcon):

| Команда                 | Действие                       |
|-------------------------|--------------------------------|
| `forge_mode`            | список режимов                 |
| `forge_mode <id>`       | переключить активный режим      |

## Как добавить свой режим

```cpp
// src/modes/GunGame.h
#include "../core/GameMode.h"
class GunGame : public GameMode {
public:
    const char* id()    const override { return "gungame"; }
    const char* title() const override { return "GunGame"; }
    void onDeath(Player& v, Player* a, const char* w, bool hs) override {
        if (a) util::center(a->edict, "Level up!");
    }
};
```

Затем одна строка в `src/core/ModeManager.cpp`:

```cpp
#include "../modes/GunGame.h"
// ...
add(new GunGame());
```

Пересобрал — режим доступен через `forge_mode gungame` или голосование.

## Дорожная карта

- [ ] Голосование за режим в конце карты
- [ ] Сохранение прогресса/рангов (SQLite)
- [ ] Дополнительные режимы: GunGame, Zombie, BattleRoyale
- [ ] Опциональная интеграция с ReGameDLL/ReAPI для точных событий раунда
