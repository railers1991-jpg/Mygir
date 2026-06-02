// ModeManager.h — registry of game modes and the active-mode switch.
#ifndef FORGE_MODEMANAGER_H
#define FORGE_MODEMANAGER_H

#include "GameMode.h"

class ModeManager {
public:
    static const int kMaxModes = 16;

    // Instantiate and register every built-in mode (defined in ModeManager.cpp
    // so adding a mode is a one-line change next to its #include).
    void registerAll();
    void shutdown();

    GameMode* current() const { return m_current; }
    GameMode* find(const char* id) const;

    // Switch the active mode by id. Fires onUnload on the old, onLoad on the
    // new. Returns false if the id is unknown.
    bool switchTo(const char* id);

    int  count() const { return m_count; }
    GameMode* at(int i) const { return (i >= 0 && i < m_count) ? m_modes[i] : nullptr; }

private:
    void add(GameMode* m);

    GameMode* m_modes[kMaxModes] = {};
    int       m_count = 0;
    GameMode* m_current = nullptr;
};

#endif // FORGE_MODEMANAGER_H
