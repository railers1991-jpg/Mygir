import Foundation

public struct AnthropicProvider: LLMProvider {
    public let name: String = "anthropic"
    private let apiKey: String
    private let model: String
    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!

    public init(apiKey: String, model: String = "claude-sonnet-4-6") {
        self.apiKey = apiKey
        self.model = model
    }

    public func complete(messages: [ChatMessage]) async throws -> String {
        let body: [[String: Any]] = messages
            .filter { $0.role != .system }
            .map { ["role": $0.role.rawValue, "content": $0.content] }

        let payload: [String: Any] = [
            "model": model,
            "max_tokens": 1024,
            "system": "Ты — Jarvis, персональный ассистент пользователя на macOS. Отвечай кратко, по делу, на языке вопроса.",
            "messages": body
        ]

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "Anthropic", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "HTTP error: \(body)"
            ])
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]],
              let first = content.first,
              let text = first["text"] as? String else {
            throw NSError(domain: "Anthropic", code: -2, userInfo: [
                NSLocalizedDescriptionKey: "Не удалось распарсить ответ"
            ])
        }
        return text
    }
}
