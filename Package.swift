// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterPyret",
    products: [
        .library(name: "TreeSitterPyret", targets: ["TreeSitterPyret"]),
    ],
    dependencies: [
        .package(url: "https://github.com/IRONM00N/swift-tree-sitter", from: "0.8.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterPyret",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterPyretTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterPyret",
            ],
            path: "bindings/swift/TreeSitterPyretTests"
        )
    ],
    cLanguageStandard: .c11
)
