import Foundation
import AVFoundation

/// Озвучка ответов. Использует встроенный AVSpeechSynthesizer.
/// Позже — заменить на ElevenLabs / локальный TTS для качественного голоса.
public final class SystemSpeechSynthesizer {
    private let synth = AVSpeechSynthesizer()

    public init() {}

    public func speak(_ text: String, language: String = "ru-RU") {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(utterance)
    }

    public func stop() {
        synth.stopSpeaking(at: .immediate)
    }
}
