// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Mira",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "Mira", targets: ["Mira"])
    ],
    targets: [
        .executableTarget(
            name: "Mira",
            path: "Sources/Mira",
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
                    "-Xlinker", "Sources/Mira/Resources/Info.plist"
                ])
            ]
        ),
        .testTarget(
            name: "MiraTests",
            dependencies: ["Mira"],
            path: "Tests/MiraTests"
        )
    ]
)
