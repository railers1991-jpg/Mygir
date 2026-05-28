import SwiftUI

struct ContentView: View {
    @EnvironmentObject var orchestrator: Orchestrator
    @State private var input: String = ""
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            transcript
            Divider()
            composer
        }
        .background(Color(NSColor.windowBackgroundColor))
        .onAppear { inputFocused = true }
    }

    private var header: some View {
        HStack {
            Circle()
                .fill(orchestrator.isThinking ? Color.orange : Color.green)
                .frame(width: 10, height: 10)
            Text("Jarvis")
                .font(.headline)
            Spacer()
            Text(orchestrator.providerName)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(12)
    }

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(orchestrator.messages) { message in
                        MessageBubble(message: message).id(message.id)
                    }
                }
                .padding(16)
            }
            .onChange(of: orchestrator.messages.count) { _ in
                if let last = orchestrator.messages.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private var composer: some View {
        HStack(spacing: 8) {
            Button {
                // TODO: hand off to JarvisVoice.SpeechRecognizer
            } label: {
                Image(systemName: "mic.fill")
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.borderless)
            .help("Голосовой ввод (скоро)")

            TextField("Скажи или напечатай...", text: $input)
                .textFieldStyle(.roundedBorder)
                .focused($inputFocused)
                .onSubmit(send)

            Button("Отправить", action: send)
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(12)
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        input = ""
        Task { await orchestrator.handle(userInput: text) }
    }
}

struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 4) {
                Text(message.role.label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(message.content)
                    .padding(10)
                    .background(background)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .textSelection(.enabled)
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
