// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Jarvis",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "Jarvis", targets: ["Jarvis"])
    ],
    targets: [
        .executableTarget(
            name: "Jarvis",
            path: "Sources/Jarvis",
            resources: [
                .copy("Resources/Info.plist")
            ],
            linkerSettings: [
                // Встраиваем Info.plist в секцию __TEXT/__info_plist бинаря,
                // чтобы macOS прочитала NSMicrophoneUsageDescription и
                // NSSpeechRecognitionUsageDescription при запросе доступа.
                .unsafeFlags([
                    "-Xlinker", "-sectcreate",
                    "-Xlinker", "__TEXT",
                    "-Xlinker", "__info_plist",
                    "-Xlinker", "Sources/Jarvis/Resources/Info.plist"
                ])
            ]
        ),
        .testTarget(
            name: "JarvisTests",
            dependencies: ["Jarvis"],
            path: "Tests/JarvisTests"
        )
    ]
)
