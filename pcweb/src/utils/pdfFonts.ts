// Embedded Pretendard Regular (subset) Base64 TTF
// NOTE: This is a minimal subset example. For full Korean coverage, replace FONT_BASE64
// with a full Pretendard Regular TTF encoded in base64 (without data: prefix).
// You can generate a subset using: pyftsubset Pretendard-Regular.ttf --text-file=sample.txt --output-file=pretendard-subset.ttf --flavor=ttf
// Then base64 encode: base64 pretendard-subset.ttf > pretendard-subset.b64
import jsPDF from 'jspdf';

let registered = false;

// Placeholder tiny TTF subset (this will not cover all Hangul — replace for production)
// WARNING: Replace below string with actual full base64 for correct Korean rendering.
const FONT_BASE64 =
  'AAEAAAALAIAAAwAwT1MvMggYDwAAAC8AAAAYGNtYXAWJi9LAAABHAAAABxnYXNwAAAAEAAAAXgAAAAIZ2x5ZqK6Ht8AAAGQAAABfGhlYWQFkAouAAAB4AAAADZoaGVhB1IDxQAAAhQAAAAkaG10eBkA//8AAAI4AAAALGxvY2ECVgB2AAACRAAAABxtYXhwAA4AOgAAAmgAAAAgbmFtZcB4GhsAAAKQAAABanBvc3QAAwAAAAADNAAAACAAAwP4AZAABQAAAooAAgAAAAAAAAgAAAAAAAAABAAADhj///8PgP//AAAAAA==';

export function registerPretendardFont() {
  if (registered) return;
  try {
    (jsPDF as any).API.addFileToVFS('Pretendard-Regular.ttf', FONT_BASE64);
    (jsPDF as any).API.addFont('Pretendard-Regular.ttf', 'Pretendard', 'normal');
    registered = true;
  } catch (e) {
    // Fallback silently – helvetica will be used
    console.warn('Pretendard font registration failed, falling back to helvetica', e);
  }
}
