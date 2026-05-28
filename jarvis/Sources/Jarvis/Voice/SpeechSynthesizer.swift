import Foundation
import AVFoundation

/// Озвучка ответов через системный TTS.
/// Голос выбирается в Settings (по identifier из AVSpeechSynthesisVoice).
public final class SystemSpeechSynthesizer {
    private let synth = AVSpeechSynthesizer()

    public init() {}

    public func speak(_ text: String, voiceID: String? = nil, language: String = "ru-RU") {
        guard !text.isEmpty else { return }
        let utterance = AVSpeechUtterance(string: text)
        if let voiceID, let voice = AVSpeechSynthesisVoice(identifier: voiceID) {
            utterance.voice = voice
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: language)
        }
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(utterance)
    }

    public func stop() {
        synth.stopSpeaking(at: .immediate)
    }

    public static var availableVoices: [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .sorted { ($0.language, $0.name) < ($1.language, $1.name) }
    }
}
