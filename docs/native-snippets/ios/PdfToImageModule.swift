import Foundation
import PDFKit

@objc(PdfToImage)
class PdfToImage: NSObject {
  @objc
  func convert(_ uri: NSString, maxDim: NSNumber, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) -> Void {
    let DEFAULT_MAX: CGFloat = 1200.0
    let appliedMax = (maxDim.intValue > 0) ? CGFloat(maxDim.doubleValue) : DEFAULT_MAX

    do {
      var path = (uri as String)
      if path.hasPrefix("file://") {
        path = String(path.dropFirst("file://".count))
      }

      let url = URL(fileURLWithPath: path)
      guard let doc = PDFDocument(url: url) else {
        reject("open_error", "Cannot open PDF at \(path)", nil)
        return
      }

      var outPaths: [String] = []
      for i in 0..<doc.pageCount {
        guard let page = doc.page(at: i) else { continue }
        let pageRect = page.bounds(for: .mediaBox)

        // Scale down if page is large
        let MAX_DIM = appliedMax
        var renderSize = pageRect.size
        let maxSide = max(pageRect.size.width, pageRect.size.height)
        if maxSide > MAX_DIM {
          let scale = MAX_DIM / maxSide
          renderSize = CGSize(width: pageRect.size.width * scale, height: pageRect.size.height * scale)
        }

        UIGraphicsBeginImageContextWithOptions(renderSize, false, 1.0)
        guard let ctx = UIGraphicsGetCurrentContext() else { continue }
        // Flip and scale context because PDF coordinate origin is bottom-left
        ctx.translateBy(x: 0, y: renderSize.height)
        ctx.scaleBy(x: 1.0, y: -1.0)

        // Draw the PDF page scaled to renderSize
        page.draw(with: .mediaBox, to: ctx)
        guard let img = UIGraphicsGetImageFromCurrentImageContext() else { continue }
        UIGraphicsEndImageContext()

        if let data = img.pngData() {
          let filename = "pdf_page_\(i)_\(Int(Date().timeIntervalSince1970)).png"
          let outURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)
          try data.write(to: outURL)
          outPaths.append(outURL.path)
        }
      }

      resolve(outPaths)
    } catch let err {
      reject("error", err.localizedDescription, err)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    // No UI initialization required
    return false
  }
}

// Note: Add bridging header and RCT_EXPORT_MODULE in Objective-C shim if needed when using Swift in RN <0.61.
