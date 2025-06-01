import XCTest
import SwiftTreeSitter
import TreeSitterPyret

final class TreeSitterPyretTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_pyret())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Pyret grammar")
    }
}
