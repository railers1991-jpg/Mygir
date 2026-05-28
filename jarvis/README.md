# Jarvis

Персональный AI-ассистент для macOS: голос, память, управление маком,
локальные и облачные модели, самообучение.

> Статус: **v0.1 — скелет**. Запускается, рисует UI, отвечает заглушкой.
> Дальнейшие фазы — в [ROADMAP.md](./ROADMAP.md).

## Как запустить

Нужен **macOS 13+ и Xcode 15+**.

```bash
cd jarvis
open Package.swift     # откроется Xcode, дальше Cmd+R
```

Или через CLI:

```bash
swift build
swift run Jarvis
```

(UI-окно поднимется только при запуске из Xcode — SwiftPM-исполняемый
без app bundle не имеет права на NSApplication.)

## Подключить настоящего Claude

В `JarvisApp.swift` замени:

```swift
@StateObject private var orchestrator = Orchestrator(
    llm: AnthropicProvider(apiKey: ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? ""),
    memory: try! DiskStore()
)
```

И запусти с переменной окружения:

```bash
ANTHROPIC_API_KEY=sk-ant-... swift run Jarvis
```

В Xcode — Edit Scheme → Run → Arguments → Environment Variables.

## Локальная модель (Ollama)

```bash
brew install ollama
ollama pull llama3.2
ollama serve
```

Затем в `JarvisApp.swift`: `llm: LocalProvider()`.

## Структура

```
Sources/Jarvis/
├── JarvisApp.swift          точка входа, @main
├── UI/                      SwiftUI views
├── Core/                    Orchestrator, ChatMessage
├── LLM/                     провайдеры (Echo/Anthropic/Local)
├── Memory/                  хранилище контекста
├── Voice/                   распознавание и синтез речи
└── System/                  управление macOS
```

## Тесты

```bash
swift test
```
