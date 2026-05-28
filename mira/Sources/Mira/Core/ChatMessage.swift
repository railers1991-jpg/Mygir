import Foundation

public struct ChatMessage: Identifiable, Equatable, Codable {
    public enum Role: String, Codable {
        case user, assistant, system

        var label: String {
            switch self {
            case .user: return "Ты"
            case .assistant: return "Mira"
            case .system: return "система"
            }
        }
    }

    public let id: UUID
    public let role: Role
    public let content: String
    public let createdAt: Date

    public init(id: UUID = UUID(), role: Role, content: String, createdAt: Date = .init()) {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
    }
}
