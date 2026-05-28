import Foundation

/// Протокол голосового ввода. Реализация — на Apple Speech framework
/// в следующей фазе (требует разрешения NSSpeechRecognitionUsageDescription и
/// NSMicrophoneUsageDescription в Info.plist приложения).
public protocol SpeechRecognizer {
    func startListening(onPartial: @escaping (String) -> Void) async throws
    func stopListening() async -> String?
}

public final class NoopSpeechRecognizer: SpeechRecognizer {
    public init() {}
    public func startListening(onPartial: @escaping (String) -> Void) async throws {
        onPartial("[голос пока не подключён]")
    }
    public func stopListening() async -> String? { nil }
}
