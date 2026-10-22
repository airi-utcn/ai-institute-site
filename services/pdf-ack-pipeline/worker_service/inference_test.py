import logging
from pathlib import Path

from src.pdf_chunker import extract_candidate_chunks
from src.semantic_extractor import SemanticExtractor

PATH_NAME = "C:/Users/Victor/Desktop/sets"
path = Path(PATH_NAME)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # Instantiate once so the models stay in RAM across all PDFs in the loop
    extractor = SemanticExtractor()

    # Open from desktop and extract all PDFs for testing
    for pdf_file in path.glob("*.pdf"):
        chunks = extract_candidate_chunks(pdf_file)
        text = extractor.extract(chunks, 0.55)

        print(f"From {pdf_file}")
        print(text)
        print()
