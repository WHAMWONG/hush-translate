import Foundation

/// Writes one JSON object as a single line on stdout.
func emit(_ object: [String: Any]) {
  guard var data = try? JSONSerialization.data(withJSONObject: object, options: [.withoutEscapingSlashes]) else { return }
  data.append(0x0A)
  FileHandle.standardOutput.write(data)
}

func fail(code: String, message: String) -> Never {
  emit(["type": "error", "code": code, "message": message])
  exit(1)
}
