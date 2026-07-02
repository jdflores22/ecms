#!/usr/bin/env python3
"""Multi-engine OCR ensemble for payment proof images. Outputs JSON to stdout."""
from __future__ import annotations

import json
import sys
import traceback
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageEnhance, ImageOps


@dataclass
class OcrPass:
    engine: str
    text: str
    weight: int
    variant: str = "full"


def _load_rgb(path: Path) -> Image.Image:
    img = Image.open(path)
    return img.convert("RGB")


def _preprocess_variants(img: Image.Image) -> list[tuple[str, Image.Image, int]]:
    w, h = img.size
    variants: list[tuple[str, Image.Image, int]] = [("full", img.copy(), 12)]

    if h > 120:
        top = img.crop((0, 0, w, max(72, int(h * 0.14))))
        variants.append(("status_band", top, 10))

    if h > 200:
        date_row = img.crop((int(w * 0.02), int(h * 0.33), int(w * 0.98), int(h * 0.52)))
        variants.append(("date_row", date_row, 16))

    if h > 240:
        details = img.crop((int(w * 0.02), int(h * 0.25), int(w * 0.98), int(h * 0.92)))
        variants.append(("details_band", details, 14))

    enhanced: list[tuple[str, Image.Image, int]] = []
    for name, crop, weight in variants:
        gray = ImageOps.grayscale(crop)
        boosted = ImageEnhance.Contrast(gray).enhance(2.2)
        sharpened = ImageEnhance.Sharpness(boosted).enhance(1.6)
        enhanced.append((f"{name}_enhanced", sharpened.convert("RGB"), weight + 2))
    variants.extend(enhanced)
    return variants


def _run_tesseract(image: Image.Image) -> str:
    import pytesseract

    return pytesseract.image_to_string(image, lang="eng", config="--psm 6").strip()


def _run_tesseract_line(image: Image.Image) -> str:
    import pytesseract

    return pytesseract.image_to_string(image, lang="eng", config="--psm 7").strip()


def _run_paddle(image: Image.Image) -> str:
    from paddleocr import PaddleOCR

    if not hasattr(_run_paddle, "_ocr"):
        _run_paddle._ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)  # type: ignore[attr-defined]
    ocr = _run_paddle._ocr  # type: ignore[attr-defined]
    import numpy as np

    result = ocr.ocr(np.array(image), cls=True)
    lines: list[str] = []
    for block in result or []:
        for line in block or []:
            if line and len(line) > 1 and line[1][0]:
                lines.append(str(line[1][0]))
    return "\n".join(lines).strip()


def _run_easyocr(image: Image.Image) -> str:
    import easyocr
    import numpy as np

    if not hasattr(_run_easyocr, "_reader"):
        _run_easyocr._reader = easyocr.Reader(["en"], gpu=False, verbose=False)  # type: ignore[attr-defined]
    reader = _run_easyocr._reader  # type: ignore[attr-defined]
    rows = reader.readtext(np.array(image), detail=0, paragraph=True)
    return "\n".join(str(row) for row in rows).strip()


def _run_doctr(image: Image.Image) -> str:
    from doctr.io import DocumentFile
    from doctr.models import ocr_predictor
    import numpy as np

    if not hasattr(_run_doctr, "_model"):
        _run_doctr._model = ocr_predictor(pretrained=True)  # type: ignore[attr-defined]
    model = _run_doctr._model  # type: ignore[attr-defined]
    tmp = Path("_doctr_tmp.png")
    image.save(tmp)
    try:
        doc = DocumentFile.from_images(str(tmp))
        result = model(doc)
        return result.render().strip()
    finally:
        tmp.unlink(missing_ok=True)


def _run_cnocr(image: Image.Image) -> str:
    from cnocr import CnOcr
    import numpy as np

    if not hasattr(_run_cnocr, "_ocr"):
        _run_cnocr._ocr = CnOcr(det_model_name="naive_det", rec_model_name="en_number_mobile_v2.0")  # type: ignore[attr-defined]
    ocr = _run_cnocr._ocr  # type: ignore[attr-defined]
    rows = ocr.ocr(np.array(image))
    return "\n".join(str(row["text"]) for row in rows).strip()


def _run_surya(image: Image.Image) -> str:
    from surya.foundation import FoundationPredictor
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor

    if not hasattr(_run_surya, "_rec"):
        foundation = FoundationPredictor()
        _run_surya._rec = RecognitionPredictor(foundation)  # type: ignore[attr-defined]
        _run_surya._det = DetectionPredictor()  # type: ignore[attr-defined]
    rec = _run_surya._rec  # type: ignore[attr-defined]
    det = _run_surya._det  # type: ignore[attr-defined]
    tmp = Path("_surya_tmp.png")
    image.save(tmp)
    try:
        preds = rec([str(tmp)], det_predictor=det)
        lines: list[str] = []
        for pred in preds:
            for line in pred.text_lines:
                lines.append(line.text)
        return "\n".join(lines).strip()
    finally:
        tmp.unlink(missing_ok=True)


def _run_keras_ocr(image: Image.Image) -> str:
    import keras_ocr
    import numpy as np

    if not hasattr(_run_keras_ocr, "_pipeline"):
        _run_keras_ocr._pipeline = keras_ocr.pipeline.Pipeline()  # type: ignore[attr-defined]
    pipeline = _run_keras_ocr._pipeline  # type: ignore[attr-defined]
    predictions = pipeline.recognize([np.array(image)])
    lines: list[str] = []
    for group in predictions:
        for _box, text in group:
            lines.append(text)
    return "\n".join(lines).strip()


def _run_ocrmypdf(path: Path) -> str:
    import ocrmypdf
    import tempfile

    if path.suffix.lower() != ".pdf":
        return ""
    with tempfile.TemporaryDirectory() as tmpdir:
        out = Path(tmpdir) / "out.pdf"
        sidecar = Path(tmpdir) / "out.txt"
        ocrmypdf.ocr(
            path,
            out,
            sidecar=sidecar,
            force_ocr=True,
            progress_bar=False,
        )
        return sidecar.read_text(encoding="utf-8", errors="ignore").strip()


def _safe_engine(
    name: str,
    fn: Callable[[Image.Image], str],
    image: Image.Image,
    weight: int,
    variant: str,
) -> OcrPass | None:
    try:
        text = fn(image)
        if text and text.strip():
            return OcrPass(engine=name, text=text.strip(), weight=weight, variant=variant)
    except Exception:
        print(f"[ocr-ensemble] {name}/{variant} skipped: {traceback.format_exc().splitlines()[-1]}", file=sys.stderr)
    return None


ENGINE_RUNNERS: list[tuple[str, Callable[[Image.Image], str], int]] = [
    ("tesseract", _run_tesseract, 11),
    ("tesseract_line", _run_tesseract_line, 10),
    ("paddleocr", _run_paddle, 15),
    ("easyocr", _run_easyocr, 14),
    ("doctr", _run_doctr, 13),
    ("cnocr", _run_cnocr, 12),
    ("surya", _run_surya, 13),
    ("keras_ocr", _run_keras_ocr, 11),
]


def run_ensemble(image_path: Path) -> list[OcrPass]:
    passes: list[OcrPass] = []

    if image_path.suffix.lower() == ".pdf":
        try:
            text = _run_ocrmypdf(image_path)
            if text:
                passes.append(OcrPass(engine="ocrmypdf", text=text, weight=16, variant="pdf"))
        except Exception:
            print("[ocr-ensemble] ocrmypdf skipped", file=sys.stderr)
        return passes

    img = _load_rgb(image_path)
    for variant_name, variant_img, variant_weight in _preprocess_variants(img):
        for engine_name, runner, base_weight in ENGINE_RUNNERS:
            result = _safe_engine(
                engine_name,
                runner,
                variant_img,
                base_weight + max(0, variant_weight - 10),
                variant_name,
            )
            if result:
                passes.append(result)

    # Kraken / Calamari / MMOCR need extra model setup — attempt only on full image
    for optional_name, module_name, fn_name in [
        ("kraken", "kraken", "rpred"),
        ("calamari", "calamari_ocr", "predict"),
        ("mmocr", "mmocr.apis", "MmocrInferencer"),
    ]:
        try:
            __import__(module_name)
            print(f"[ocr-ensemble] {optional_name} installed but needs model config — skipped", file=sys.stderr)
        except ImportError:
            pass

    return passes


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: run_ensemble.py <image-path>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1]).resolve()
    if not path.exists():
        print(json.dumps({"error": "file not found", "passes": []}))
        return 1
    passes = run_ensemble(path)
    print(json.dumps({"passes": [asdict(p) for p in passes]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
