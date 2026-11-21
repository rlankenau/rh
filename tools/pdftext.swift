import Foundation
import PDFKit
let a = CommandLine.arguments
guard let d = PDFDocument(url: URL(fileURLWithPath: a[1])) else { print("cannot open"); exit(1) }
let lo = Int(a[2])!, hi = min(Int(a[3])!, d.pageCount)
for i in lo...hi { print("=== page \(i) ==="); print(d.page(at: i-1)?.string ?? "") }
