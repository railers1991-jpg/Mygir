import Foundation
import Combine

public enum ProviderKind: String, CaseIterable, Identifiable {
    case echo
    case anthropic
    case local

    public var id: String { rawValue }
    public var label: String {
        switch self {
        case .echo: return "Echo (заглушка)"
        case .anthropic: return "Anthropic Claude"
        case .local: return "Локальная (Ollama)"
        }
    }
}

@MainActor
public final class JarvisSettings: ObservableObject {
    private enum Keys {
        static let provider = "jarvis.provider"
        static let systemPrompt = "jarvis.systemPrompt"
        static let anthropicModel = "jarvis.anthropicModel"
        static let ollamaModel = "jarvis.ollamaModel"
        static let speechLocale = "jarvis.speechLocale"
        static let ttsVoiceID = "jarvis.ttsVoiceID"
        static let ttsEnabled = "jarvis.ttsEnabled"
    }
    private static let keychainAccount = "anthropic_api_key"
    private static let defaultPrompt = """
    Ты — Jarvis, персональный ассистент пользователя на macOS. \
    Отвечай кратко, по делу, на языке вопроса. \
    Если просят сделать что-то с системой — опиши, что бы сделал, \
    пока инструменты управления маком не подключены.
    """

    @Published public var provider: ProviderKind {
        didSet { UserDefaults.standard.set(provider.rawValue, forKey: Keys.provider) }
    }
    @Published public var systemPrompt: String {
        didSet { UserDefaults.standard.set(systemPrompt, forKey: Keys.systemPrompt) }
    }
    @Published public var anthropicModel: String {
        didSet { UserDefaults.standard.set(anthropicModel, forKey: Keys.anthropicModel) }
    }
    @Published public var ollamaModel: String {
        didSet { UserDefaults.standard.set(ollamaModel, forKey: Keys.ollamaModel) }
    }
    @Published public var anthropicAPIKey: String {
        didSet {
            if anthropicAPIKey.isEmpty {
                Keychain.delete(account: Self.keychainAccount)
            } else {
                try? Keychain.set(anthropicAPIKey, account: Self.keychainAccount)
            }
        }
    }
    @Published public var speechLocale: String {
        didSet { UserDefaults.standard.set(speechLocale, forKey: Keys.speechLocale) }
    }
    @Published public var ttsVoiceID: String {
        didSet { UserDefaults.standard.set(ttsVoiceID, forKey: Keys.ttsVoiceID) }
    }
    @Published public var ttsEnabled: Bool {
        didSet { UserDefaults.standard.set(ttsEnabled, forKey: Keys.ttsEnabled) }
    }

    public init() {
        let defaults = UserDefaults.standard
        self.provider = ProviderKind(rawValue: defaults.string(forKey: Keys.provider) ?? "") ?? .echo
        self.systemPrompt = defaults.string(forKey: Keys.systemPrompt) ?? Self.defaultPrompt
        self.anthropicModel = defaults.string(forKey: Keys.anthropicModel) ?? "claude-sonnet-4-6"
        self.ollamaModel = defaults.string(forKey: Keys.ollamaModel) ?? "llama3.2"
        self.anthropicAPIKey = Keychain.get(account: Self.keychainAccount) ?? ""
        self.speechLocale = defaults.string(forKey: Keys.speechLocale) ?? "ru-RU"
        self.ttsVoiceID = defaults.string(forKey: Keys.ttsVoiceID) ?? ""
        self.ttsEnabled = defaults.object(forKey: Keys.ttsEnabled) as? Bool ?? false
    }

    public func makeProvider() -> LLMProvider {
        switch provider {
        case .echo:
            return EchoLLMProvider()
        case .anthropic:
            guard !anthropicAPIKey.isEmpty else { return EchoLLMProvider() }
            return AnthropicProvider(apiKey: anthropicAPIKey, model: anthropicModel)
        case .local:
            return LocalProvider(model: ollamaModel)
        }
    }

    public func resetSystemPrompt() {
        systemPrompt = Self.defaultPrompt
    }
}
