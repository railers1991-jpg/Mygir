import Foundation

/// Локальный инференс через Ollama (`http://localhost:11434`).
/// Альтернатива на будущее — bridging с MLX-Swift или llama.cpp.spm.
public struct LocalProvider: LLMProvider {
    public let name: String = "local (ollama)"
    private let endpoint: URL
    private let model: String

    public init(endpoint: URL = URL(string: "http://localhost:11434/api/chat")!,
                model: String = "llama3.2") {
        self.endpoint = endpoint
        self.model = model
    }

    public func stream(messages: [ChatMessage], systemPrompt: String) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            let task = Task { [endpoint, model] in
                do {
                    var body: [[String: String]] = [["role": "system", "content": systemPrompt]]
                    body.append(contentsOf: messages
                        .filter { $0.role != .system }
                        .map { ["role": $0.role.rawValue, "content": $0.content] })

                    let payload: [String: Any] = [
                        "model": model,
                        "messages": body,
                        "stream": true
                    ]

                    var request = URLRequest(url: endpoint)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.httpBody = try JSONSerialization.data(withJSONObject: payload)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                        throw NSError(domain: "Local", code: -1, userInfo: [
                            NSLocalizedDescriptionKey: "Ollama недоступен (HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)). Проверь `ollama serve`."
                        ])
                    }

                    for try await line in bytes.lines {
                        guard let data = line.data(using: .utf8),
                              let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                            continue
                        }
                        if let message = event["message"] as? [String: Any],
                           let chunk = message["content"] as? String, !chunk.isEmpty {
                            continuation.yield(chunk)
                        }
                        if event["done"] as? Bool == true { break }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
