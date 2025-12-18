package com.yourapp.pdftoimage

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import android.net.Uri
import java.io.InputStream
import android.content.Intent
import android.Manifest
import android.content.pm.PackageManager

class PdfToImageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "PdfToImage"

    private fun copyUriToTempFile(uriString: String): File? {
        try {
            val uri = Uri.parse(uriString)

            // Try to take persistable read permission if possible (some pickers provide it)
            try {
                reactApplicationContext.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (e: Exception) {
                // ignore if not supported or not granted
            }

            val input: InputStream? = reactApplicationContext.contentResolver.openInputStream(uri)
            if (input == null) return null

            val outFile = File(reactApplicationContext.cacheDir, "pdf_copy_${System.currentTimeMillis()}.pdf")
            FileOutputStream(outFile).use { out ->
                input.copyTo(out)
            }
            input.close()
            return outFile
        } catch (e: Exception) {
            return null
        }
    }

    @ReactMethod
    fun convert(uri: String, maxDim: Int, promise: Promise) {
        // Supports both file paths and content URIs. Content URIs are copied to a temp file first.
        val DEFAULT_MAX = 1200
        val appliedMax = if (maxDim > 0) maxDim else DEFAULT_MAX

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            promise.reject("unsupported", "PdfRenderer requires Android API 21+")
            return
        }

        try {
            var workingPath = uri

            // If it looks like a content URI, attempt to copy to a temp file
            if (workingPath.startsWith("content://")) {
                val temp = copyUriToTempFile(workingPath)
                if (temp == null || !temp.exists()) {
                    promise.reject("not_found", "Could not access content URI. Please ensure the app has read permission or pick the file again.")
                    return
                }
                workingPath = temp.absolutePath
            } else if (workingPath.startsWith("file://")) {
                workingPath = workingPath.removePrefix("file://")
            }

            val file = File(workingPath)

            // If the path points to external storage, ensure read permission is available
            val needPermissionCheck = !workingPath.startsWith(reactApplicationContext.cacheDir)
            if (needPermissionCheck) {
                val perm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    Manifest.permission.READ_MEDIA_IMAGES
                } else {
                    Manifest.permission.READ_EXTERNAL_STORAGE
                }
                val hasPerm = reactApplicationContext.checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED
                if (!hasPerm) {
                    promise.reject("permission_required", "Read permission is required to access this file. Please request it from the app before converting.")
                    return
                }
            }

            if (!file.exists()) {
                promise.reject("not_found", "File not found: $workingPath")
                return
            }

            val parcelFileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(parcelFileDescriptor)
            val results = Arguments.createArray()

            val tempFilesToCleanup = mutableListOf<File>()

            for (i in 0 until renderer.pageCount) {
                val page = renderer.openPage(i)
                val width = page.width
                val height = page.height

                // Render at page resolution
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

                // Scale down if too large to avoid OOM
                val MAX_DIM_USED = appliedMax
                var outBitmap = bitmap
                val maxSide = maxOf(width, height)
                if (maxSide > MAX_DIM_USED) {
                    val scale = MAX_DIM_USED.toFloat() / maxSide.toFloat()
                    val newW = (width * scale).toInt()
                    val newH = (height * scale).toInt()
                    outBitmap = Bitmap.createScaledBitmap(bitmap, newW, newH, true)
                    // recycle original if it's different
                    if (outBitmap != bitmap) bitmap.recycle()
                }

                val outFile = File(reactApplicationContext.cacheDir, "pdf_page_${i}_${System.currentTimeMillis()}.png")
                val fos = FileOutputStream(outFile)
                outBitmap.compress(Bitmap.CompressFormat.PNG, 90, fos)
                fos.flush()
                fos.close()

                results.pushString(outFile.absolutePath)
                page.close()
                if (outBitmap != bitmap) outBitmap.recycle()
            }

            renderer.close()
            parcelFileDescriptor.close()

            // Cleanup temp files if we created any (e.g., copied content URI)
            // Note: do not remove the generated PNGs; caller expects those paths.
            if (workingPath != uri && workingPath.contains(reactApplicationContext.cacheDir)) {
                try {
                    File(workingPath).delete()
                } catch (e: Exception) {
                    // ignore cleanup errors
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("error", e.message, e)
        }
    }
}
