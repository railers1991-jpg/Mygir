import SwiftUI
import Speech

struct ContentView: View {
    @EnvironmentObject var orchestrator: Orchestrator
    @EnvironmentObject var settings: JarvisSettings
    @StateObject private var recognizer = AppleSpeechRecognizer()
    @State private var input: String = ""
    @State private var permissionError: String?
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            transcript
            if let error = permissionError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 12)
                    .padding(.top, 6)
            }
            if recognizer.isListening || !recognizer.partialTranscript.isEmpty {
                listeningBanner
            }
            Divider()
            composer
        }
        .background(Color(NSColor.windowBackgroundColor))
        .onAppear {
            inputFocused = true
            recognizer.setLocale(Locale(identifier: settings.speechLocale))
        }
        .onChange(of: settings.speechLocale) { newValue in
            recognizer.setLocale(Locale(identifier: newValue))
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(orchestrator.isThinking ? Color.orange : Color.green)
                .frame(width: 10, height: 10)
            Text("Jarvis")
                .font(.headline)
            Spacer()
            Text(orchestrator.providerName)
                .font(.caption)
                .foregroundStyle(.secondary)
            if settings.provider == .anthropic && settings.anthropicAPIKey.isEmpty {
                Text("· нет ключа")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            if settings.ttsEnabled {
                Image(systemName: "speaker.wave.2")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
    }

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(orchestrator.messages) { message in
                        MessageBubble(message: message, isStreaming:
                            orchestrator.isThinking
                            && message.id == orchestrator.messages.last?.id
                            && message.role == .assistant
                        )
                        .id(message.id)
                    }
                }
                .padding(16)
            }
            .onChange(of: orchestrator.messages.last?.id) { _ in
                if let last = orchestrator.messages.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
            .onChange(of: orchestrator.messages.last?.content) { _ in
                if let last = orchestrator.messages.last {
                    proxy.scrollTo(last.id, anchor: .bottom)
                }
            }
        }
    }

    private var listeningBanner: some View {
        HStack(spacing: 8) {
            PulsingWaveform()
            Text(recognizer.partialTranscript.isEmpty
                 ? "Слушаю..."
                 : recognizer.partialTranscript)
                .lineLimit(2)
                .truncationMode(.head)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.red.opacity(0.08))
    }

    private var composer: some View {
        HStack(spacing: 8) {
            Button(action: toggleMic) {
                Image(systemName: recognizer.isListening ? "stop.circle.fill" : "mic.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(recognizer.isListening ? .red : .accentColor)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.borderless)
            .keyboardShortcut("l", modifiers: .command)
            .help(recognizer.isListening
                  ? "Остановить запись (⌘L)"
                  : "Голосовой ввод (⌘L)")

            TextField("Скажи или напечатай...", text: $input)
                .textFieldStyle(.roundedBorder)
                .focused($inputFocused)
                .onSubmit(send)
                .disabled(orchestrator.isThinking || recognizer.isListening)

            Button("Отправить", action: send)
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty
                          || orchestrator.isThinking)
        }
        .padding(12)
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        input = ""
        Task { await orchestrator.handle(userInput: text) }
    }

    private func toggleMic() {
        if recognizer.isListening {
            recognizer.stopListening()
            return
        }
        Task {
            let ok = await recognizer.requestPermissions()
            guard ok else {
                permissionError = "Нет разрешения на микрофон или распознавание речи. Системные настройки → Privacy & Security."
                return
            }
            permissionError = nil
            do {
                try recognizer.startListening { recognized in
                    Task { await orchestrator.handle(userInput: recognized) }
                }
            } catch {
                permissionError = "Не удалось включить запись: \(error.localizedDescription)"
            }
        }
    }
}

struct MessageBubble: View {
    let message: ChatMessage
    let isStreaming: Bool

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 4) {
                Text(message.role.label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack(alignment: .bottom, spacing: 6) {
                    Text(message.content.isEmpty ? "…" : message.content)
                        .textSelection(.enabled)
                    if isStreaming {
                        TypingCaret()
                    }
                }
                .padding(10)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            if message.role != .user { Spacer(minLength: 40) }
        }
    }

    private var background: Color {
        switch message.role {
        case .user: return Color.accentColor.opacity(0.18)
        case .assistant: return Color.gray.opacity(0.18)
        case .system: return Color.yellow.opacity(0.18)
        }
    }
}

private struct PulsingWaveform: View {
    @State private var on = false
    var body: some View {
        Image(systemName: "waveform")
            .foregroundStyle(.red)
            .opacity(on ? 0.4 : 1.0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                    on = true
                }
            }
    }
}

private struct TypingCaret: View {
    @State private var on = false
    var body: some View {
        Rectangle()
            .fill(Color.primary)
            .frame(width: 6, height: 14)
            .opacity(on ? 0.2 : 0.9)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    on = true
                }
            }
    }
}
