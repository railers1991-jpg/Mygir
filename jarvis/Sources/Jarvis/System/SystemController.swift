import Foundation
import AppKit

/// Управление macOS: открытие приложений, URL, AppleScript-команды,
/// а в следующей фазе — Accessibility API для клика по UI других приложений.
public final class SystemController {
    public init() {}

    public func openApplication(named name: String) throws {
        let workspace = NSWorkspace.shared
        guard let url = workspace.urlForApplication(withBundleIdentifier: name)
                ?? workspace.fullPath(forApplication: name).map(URL.init(fileURLWithPath:)) else {
            throw NSError(domain: "System", code: 404, userInfo: [
                NSLocalizedDescriptionKey: "Не нашёл приложение: \(name)"
            ])
        }
        workspace.openApplication(at: url, configuration: .init())
    }

    public func openURL(_ urlString: String) -> Bool {
        guard let url = URL(string: urlString) else { return false }
        return NSWorkspace.shared.open(url)
    }

    public func runAppleScript(_ source: String) throws -> String {
        var error: NSDictionary?
        let script = NSAppleScript(source: source)
        let result = script?.executeAndReturnError(&error)
        if let error { throw NSError(domain: "AppleScript", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "\(error)"
        ]) }
        return result?.stringValue ?? ""
    }
}
