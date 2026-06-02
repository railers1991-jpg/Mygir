#include "ModeManager.h"
#include "Util.h"

#include <cstring>
#include <strings.h> // strcasecmp

// ---- built-in modes -------------------------------------------------------
// To ship a new mode: include its header and add one `add(new YourMode());`
// line in registerAll(). Nothing else in the core needs to change.
#include "../modes/ClassicPlus.h"

void ModeManager::registerAll() {
    add(new ClassicPlus());
    // add(new GunGame());     // <- future modes slot in here
    // add(new ZombieMod());

    if (m_count > 0) {
        m_current = m_modes[0];
        m_current->onLoad();
    }
}

void ModeManager::shutdown() {
    if (m_current) m_current->onUnload();
    for (int i = 0; i < m_count; ++i) delete m_modes[i];
    m_count = 0;
    m_current = nullptr;
}

void ModeManager::add(GameMode* m) {
    if (m_count < kMaxModes) m_modes[m_count++] = m;
}

GameMode* ModeManager::find(const char* id) const {
    for (int i = 0; i < m_count; ++i)
        if (strcasecmp(m_modes[i]->id(), id) == 0) return m_modes[i];
    return nullptr;
}

bool ModeManager::switchTo(const char* id) {
    GameMode* next = find(id);
    if (!next || next == m_current) return next != nullptr;
    if (m_current) m_current->onUnload();
    m_current = next;
    m_current->onLoad();
    util::chatAll("Mode switched to: %s", m_current->title());
    return true;
}
