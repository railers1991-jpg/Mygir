# Jarvis

Персональный AI-ассистент для macOS: голос, память, управление маком,
локальные и облачные модели, самообучение.

> Статус: **v0.2 — живой диалог**. Стриминговые ответы от Claude,
> Settings-окно, ключ в Keychain, переключение провайдеров на лету.
> Дальше — голос. См. [ROADMAP.md](./ROADMAP.md).

## Как запустить

Нужен **macOS 13+ и Xcode 15+**.

```bash
cd jarvis
open Package.swift     # откроется Xcode, дальше Cmd+R
```

Окно поднимется с echo-провайдером — можешь сразу проверить UI и стриминг
по словам. Чтобы заговорить с Claude — открой **Settings (⌘,)**, выбери
*Anthropic Claude*, вставь `sk-ant-...` ключ и нажми *Сохранить*. Ключ
сохранится в Keychain, переключение применится без перезапуска.

## Локальная модель (Ollama)

```bash
brew install ollama
ollama pull llama3.2
ollama serve
```

В Settings → выбери *Локальная (Ollama)*, при желании поменяй модель.

## Горячие клавиши

- `⌘,` — Settings
- `⌘↩` — отправить сообщение
- `⌘⇧K` — очистить контекст

## Структура

```
Sources/Jarvis/
├── JarvisApp.swift          точка входа, @main, scene-ы
├── UI/
│   ├── ContentView.swift    чат + стриминговый курсор
│   └── SettingsView.swift   провайдер / промпт / ключ
├── Core/
│   ├── Orchestrator.swift   стриминг, подмена провайдера на лету
│   ├── ChatMessage.swift
│   └── JarvisSettings.swift хранение в UserDefaults + Keychain
├── LLM/
│   ├── LLMProvider.swift    протокол + Echo заглушка
│   ├── AnthropicProvider.swift  SSE-стриминг Claude
│   └── LocalProvider.swift  стрим Ollama
├── Memory/
│   ├── MemoryStore.swift    InMemoryStore
│   └── DiskStore.swift      JSON в Application Support
├── Security/
│   └── Keychain.swift       обёртка над Security framework
├── Voice/                   — Фаза 2
└── System/                  — Фаза 4
```

## Тесты

```bash
swift test
```
