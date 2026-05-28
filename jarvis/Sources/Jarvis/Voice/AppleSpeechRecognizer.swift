import Foundation
import Speech
import AVFoundation

@MainActor
public final class AppleSpeechRecognizer: NSObject, ObservableObject {
    @Published public private(set) var partialTranscript: String = ""
    @Published public private(set) var isListening: Bool = false
    @Published public private(set) var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined

    private var recognizer: SFSpeechRecognizer
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var onFinal: ((String) -> Void)?

    public init(locale: Locale = Locale(identifier: "ru-RU")) {
        self.recognizer = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer()!
        super.init()
    }

    public func setLocale(_ locale: Locale) {
        guard let new = SFSpeechRecognizer(locale: locale) else { return }
        recognizer = new
    }

    /// Запрашивает разрешения на распознавание и микрофон. Возвращает true, если оба получены.
    public func requestPermissions() async -> Bool {
        let speechOK: Bool = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { status in
                Task { @MainActor in self.authorizationStatus = status }
                cont.resume(returning: status == .authorized)
            }
        }
        let micOK: Bool = await withCheckedContinuation { cont in
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                cont.resume(returning: granted)
            }
        }
        return speechOK && micOK
    }

    public func startListening(onFinal: @escaping (String) -> Void) throws {
        guard !isListening else { return }
        self.onFinal = onFinal
        partialTranscript = ""

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        self.request = request

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak request] buffer, _ in
            request?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            Task { @MainActor in
                if let result {
                    self.partialTranscript = result.bestTranscription.formattedString
                    if result.isFinal {
                        self.finishListening(emit: true)
                    }
                }
                if error != nil {
                    self.finishListening(emit: true)
                }
            }
        }

        isListening = true
    }

    /// Останавливает запись. Финальный transcript придёт колбеком, если он не пустой.
    public func stopListening() {
        guard isListening else { return }
        request?.endAudio()
        // Не дёргаем finishListening сразу — даём recognitionTask вернуть финальный фрагмент.
        // Но если за 1.5с финал не пришёл — закрываем принудительно.
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            if self.isListening { self.finishListening(emit: true) }
        }
    }

    private func finishListening(emit: Bool) {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        task?.cancel()
        task = nil
        request = nil
        isListening = false
        let text = partialTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
        partialTranscript = ""
        if emit, !text.isEmpty, let cb = onFinal {
            cb(text)
        }
        onFinal = nil
    }
}
