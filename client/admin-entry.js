import QRCode from 'qrcode/lib/browser.js';
import { createElement, Save, Plus, Archive, Upload, RotateCcw, Download, ArrowLeft, RefreshCw, Copy, Printer, QrCode, Eye, LockKeyhole } from 'lucide';
const icons = { save: Save, plus: Plus, archive: Archive, publish: Upload, restore: RotateCcw, download: Download,
  back: ArrowLeft, refresh: RefreshCw, copy: Copy, print: Printer, qr: QrCode, eye: Eye, lock: LockKeyhole };
export const icon = name => createElement(icons[name] || Eye, { width: 18, height: 18, 'aria-hidden': 'true' });
export const qrImage = code => QRCode.toDataURL(code, { width: 720, margin: 4, errorCorrectionLevel: 'M' });
