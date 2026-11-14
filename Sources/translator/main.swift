// Helper for the Raycast extension. Every subcommand writes JSON lines to stdout.
//
//   translator status
//   translator translate --to <lang> [--alt <lang>]      (text on stdin, streams the result)
//   translator ocr --file <image>
//   translator clipboard --out <dir>
import Foundation

let arguments = Array(CommandLine.arguments.dropFirst())

func option(_ name: String) -> String? {
  guard let index = arguments.firstIndex(of: name), index + 1 < arguments.count else { return nil }
  return arguments[index + 1]
}

func usage() -> Never {
  fail(code: "usage", message: "usage: translator status | translate --to <lang> [--alt <lang>] | ocr --file <image> | clipboard --out <dir>")
}

guard let command = arguments.first else { usage() }

switch command {
case "status":
  emit(status())

case "translate":
  guard let to = option("--to") else { usage() }
  let input = String(decoding: FileHandle.standardInput.readDataToEndOfFile(), as: UTF8.self)
  await translate(input, to: to, alt: option("--alt"))

case "ocr":
  guard let file = option("--file") else { usage() }
  do {
    emit(["kind": "image", "text": try recognizeText(at: URL(fileURLWithPath: file)), "image": file])
  } catch {
    fail(code: "ocr", message: error.localizedDescription)
  }

case "clipboard":
  guard let out = option("--out") else { usage() }
  do {
    emit(try readClipboard(imageDirectory: URL(fileURLWithPath: out, isDirectory: true)))
  } catch {
    fail(code: "clipboard", message: error.localizedDescription)
  }

default:
  usage()
}
