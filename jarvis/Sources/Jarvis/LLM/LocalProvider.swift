import Foundation

/// Заглушка для локального инференса. В будущем — интеграция с llama.cpp / MLX.
/// Варианты:
/// - HTTP к локальному llama.cpp/Ollama (http://localhost:11434)
/// - Прямая bridging-обёртка над MLX-Swift или llama.cpp.spm
public struct LocalProvider: LLMProvider {
    public let name: String = "local (ollama)"
    private let endpoint: URL
    private let model: String

    public init(endpoint: URL = URL(string: "http://localhost:11434/api/chat")!,
                model: String = "llama3.2") {
        self.endpoint = endpoint
        self.model = model
    }

    public func complete(messages: [ChatMessage]) async throws -> String {
        let body: [[String: String]] = messages
            .filter { $0.role != .system }
            .map { ["role": $0.role.rawValue, "content": $0.content] }

        let payload: [String: Any] = [
            "model": model,
            "messages": body,
            "stream": false
        ]

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let message = json["message"] as? [String: Any],
              let text = message["content"] as? String else {
            throw NSError(domain: "Local", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Не удалось распарсить ответ от локальной модели"
            ])
        }
        return text
    }
}
