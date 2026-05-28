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

    public func stream(messages: [ChatMessage], systemPrompt: String) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            let task = Task { [apiKey, model, endpoint] in
                do {
                    let body: [[String: Any]] = messages
                        .filter { $0.role != .system }
                        .map { ["role": $0.role.rawValue, "content": $0.content] }

                    let payload: [String: Any] = [
                        "model": model,
                        "max_tokens": 1024,
                        "stream": true,
                        "system": systemPrompt,
                        "messages": body
                    ]

                    var request = URLRequest(url: endpoint)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
                    request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
                    request.httpBody = try JSONSerialization.data(withJSONObject: payload)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                        var snippet = ""
                        for try await line in bytes.lines {
                            snippet += line + "\n"
                            if snippet.count > 500 { break }
                        }
                        throw NSError(domain: "Anthropic", code: -1, userInfo: [
                            NSLocalizedDescriptionKey: "HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0): \(snippet)"
                        ])
                    }

                    for try await line in bytes.lines {
                        guard line.hasPrefix("data:") else { continue }
                        let data = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        guard !data.isEmpty, data != "[DONE]",
                              let jsonData = data.data(using: .utf8),
                              let event = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
                            continue
                        }
                        if event["type"] as? String == "content_block_delta",
                           let delta = event["delta"] as? [String: Any],
                           delta["type"] as? String == "text_delta",
                           let text = delta["text"] as? String {
                            continuation.yield(text)
                        }
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
