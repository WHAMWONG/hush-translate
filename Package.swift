// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "hush-translate",
  platforms: [
    .macOS(.v26)
  ],
  targets: [
    .executableTarget(name: "translator")
  ]
)
