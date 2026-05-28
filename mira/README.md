# Mira

Персональный AI-ассистент для macOS: голос, память, управление маком,
локальные и облачные модели, самообучение.

> Статус: **v0.3 — голос**. К стримингу добавились распознавание речи
> через Apple Speech, выбор голоса для озвучки и автоозвучка ответов.
> Дальше — векторная память. См. [ROADMAP.md](./ROADMAP.md).

## Как запустить

Нужен **macOS 13+ и Xcode 15+**.

```bash
cd mira
open Package.swift     # откроется Xcode, дальше Cmd+R
```

Окно поднимется с echo-провайдером — можешь сразу проверить UI, стриминг
по словам и микрофон. Чтобы заговорить с Claude — открой **Settings (⌘,)**,
выбери *Anthropic Claude*, вставь `sk-ant-...` и нажми *Сохранить*. Ключ
сохранится в Keychain.

## Голос

- `⌘L` или кнопка-микрофон → запрос разрешений на микрофон/распознавание
  (только в первый раз) → запись → ещё раз `⌘L` для отправки.
- Язык распознавания — Settings → Голос.
- Чтобы Mira отвечала голосом — там же включи "Озвучивать ответы"
  и выбери голос (список из `AVSpeechSynthesisVoice.speechVoices()`).

**Важно про разрешения:** `Info.plist` с `NSMicrophoneUsageDescription`
и `NSSpeechRecognitionUsageDescription` встроен в бинарь через
linker-флаги в `Package.swift`. Если запускаешь `swift run` из терминала
и macOS отказывает — попробуй `Cmd+R` из Xcode, он подписывает запуск
ad-hoc и системный диалог о разрешениях появится корректно.

## Локальная модель (Ollama)

```bash
brew install ollama
ollama pull llama3.2
ollama serve
```

В Settings → выбери *Локальная (Ollama)*.

## Горячие клавиши

- `⌘,` — Settings
- `⌘↩` — отправить сообщение
- `⌘L` — старт/стоп голосового ввода
- `⌘⇧K` — очистить контекст

## Структура

```
Sources/Mira/
├── MiraApp.swift              точка входа, @main, scene-ы
├── UI/
│   ├── ContentView.swift        чат + микрофон + стриминговый курсор
│   └── SettingsView.swift       3 вкладки: провайдер / промпт / голос
├── Core/
│   ├── Orchestrator.swift       стриминг, авто-TTS
│   ├── ChatMessage.swift
│   └── MiraSettings.swift     UserDefaults + Keychain
├── LLM/
│   ├── LLMProvider.swift        Echo заглушка
│   ├── AnthropicProvider.swift  SSE-стриминг Claude
│   └── LocalProvider.swift      стрим Ollama
├── Memory/
│   ├── MemoryStore.swift        InMemoryStore
│   └── DiskStore.swift          JSON в Application Support
├── Security/
│   └── Keychain.swift
├── Voice/
│   ├── AppleSpeechRecognizer.swift   SFSpeechRecognizer + AVAudioEngine
│   └── SpeechSynthesizer.swift       AVSpeechSynthesizer + список голосов
├── System/
│   └── SystemController.swift   — управление маком (Фаза 4)
└── Resources/
    └── Info.plist               usage descriptions для микрофона/speech
```

## Тесты

```bash
swift test
```
