import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

logger = logging.getLogger(__name__)

DEFAULT_SLM_MODEL = "Qwen/Qwen3.5-0.8B"
DEFAULT_SLM_MAX_NEW_TOKENS = 512
DEFAULT_SLM_TEMPERATURE = 0.2

BASE_DIR = Path(__file__).resolve().parent.parent
SEMANTIC_DATA_DIR = BASE_DIR / "semantic_data"
DEFAULT_PROMPT_FILE = SEMANTIC_DATA_DIR / "slm_cleanup_prompt.txt"
MODEL_CACHE_DIR = BASE_DIR / ".model_cache"

_THINK_TAG_RE = re.compile(r"<think>.*?</think>", flags=re.DOTALL | re.IGNORECASE)
_ROLE_PREFIX_RE = re.compile(
    r"^(?:(?:<\|im_start\|>)?assistant\s*:?\s*\n?|output\s*:\s*|cleaned\s+text\s*:\s*)+",
    flags=re.IGNORECASE,
)
_THINKING_PROCESS_RE = re.compile(
    r"^thinking\s+process\s*:?.*?(?:\n\s*\n|\Z)",
    flags=re.DOTALL | re.IGNORECASE,
)


class SLMCleaner:
    """
    Stage 3 Small Language Model (SLM) post-processor.
    Uses `Qwen/Qwen3.5-0.8B` to clean OCR/PDF noise from candidate acknowledgment
    paragraphs and strip unrelated text while preserving the exact semantic meaning.
    """

    def __init__(
        self,
        model_name: str = DEFAULT_SLM_MODEL,
        prompt_path: Optional[Path] = None,
        prompt_file_path: Optional[Path] = None,
        cache_dir: Path = MODEL_CACHE_DIR,
        max_new_tokens: int = DEFAULT_SLM_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_SLM_TEMPERATURE,
        enabled: bool = True,
        device: Optional[str] = None,
    ) -> None:
        self.model_name = model_name
        resolved_prompt = prompt_path or prompt_file_path or DEFAULT_PROMPT_FILE
        self.prompt_path = Path(resolved_prompt)
        self.prompt_file_path = self.prompt_path
        self.cache_dir = str(cache_dir)
        self.max_new_tokens = max(32, int(max_new_tokens))
        self.temperature = float(temperature)
        self.enabled = enabled

        if device:
            self.device = device
        else:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.system_prompt = self._load_system_prompt()
        self._tokenizer: Optional[AutoTokenizer] = None
        self._model: Optional[AutoModelForCausalLM] = None

    def _load_system_prompt(self) -> str:
        path = Path(self.prompt_path)
        if path.is_file():
            content = path.read_text(encoding="utf-8").strip()
            if content:
                return content
        logger.warning(
            "Prompt file '%s' not found or empty. Using default cleanup instructions.",
            path,
        )
        return (
            "You are an assistant specialized in extracting clean acknowledgment sections "
            "from scientific research papers. Your goal is to clean up the provided text, "
            "fixing broken words, hyphenation, OCR artifacts, and stripping any unrelated text."
        )

    def _ensure_model_loaded(self) -> None:
        if self._model is not None and self._tokenizer is not None:
            return

        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)

        logger.info("Loading SLM Tokenizer '%s'...", self.model_name)
        try:
            self._tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                local_files_only=True,
                trust_remote_code=True,
            )
        except Exception:
            logger.info("Downloading SLM Tokenizer '%s' to cache...", self.model_name)
            self._tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                local_files_only=False,
                trust_remote_code=True,
            )

        logger.info("Loading SLM Model '%s' on '%s'...", self.model_name, self.device)
        dtype = torch.float16 if self.device == "cuda" else torch.float32
        try:
            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
                local_files_only=True,
                trust_remote_code=True,
            )
        except Exception:
            logger.info("Downloading SLM Model '%s' to cache...", self.model_name)
            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
                local_files_only=False,
                trust_remote_code=True,
            )

        self._model.to(self.device)
        self._model.eval()

    @staticmethod
    def _strip_artifacts(text: str) -> str:
        """Removes any residual special blocks, role prefixes, or surrounding code fences."""
        cleaned = _THINK_TAG_RE.sub("", text).strip()
        cleaned = _THINKING_PROCESS_RE.sub("", cleaned).strip()
        cleaned = _ROLE_PREFIX_RE.sub("", cleaned).strip()
        if cleaned.startswith("```") and cleaned.endswith("```"):
            lines = cleaned.splitlines()
            if len(lines) >= 2:
                cleaned = "\n".join(lines[1:-1]).strip()
        return cleaned

    def clean(self, raw_candidate_text: str) -> str:
        """
        Cleans OCR/PDF artifacts and isolates the acknowledgment content using
        `Qwen/Qwen3.5-0.8B`. Falls back to the raw input if disabled or if generation fails.
        """
        if not raw_candidate_text or not raw_candidate_text.strip() or not self.enabled:
            return raw_candidate_text

        raw_input = raw_candidate_text.strip()

        try:
            self._ensure_model_loaded()
            assert self._tokenizer is not None
            assert self._model is not None

            messages = [
                {"role": "system", "content": self.system_prompt},
                {
                    "role": "user",
                    "content": f"Please clean up the following acknowledgment text:\n\n{raw_input}",
                },
            ]

            try:
                input_text = self._tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                    enable_thinking=False,
                )
            except TypeError:
                input_text = self._tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                )

            inputs = self._tokenizer(input_text, return_tensors="pt").to(self.device)
            input_token_len = int(inputs["input_ids"].shape[1])

            gen_kwargs: Dict[str, Any] = {
                "max_new_tokens": self.max_new_tokens,
                "pad_token_id": self._tokenizer.eos_token_id or self._tokenizer.pad_token_id,
            }
            if self.temperature > 0.0:
                gen_kwargs["temperature"] = self.temperature
                gen_kwargs["do_sample"] = True
            else:
                gen_kwargs["do_sample"] = False

            logger.info(
                "[SLM START] Generating cleaned text with '%s' (input_tokens=%d, max_new_tokens=%d, temp=%.2f, device=%s)...",
                self.model_name,
                input_token_len,
                self.max_new_tokens,
                self.temperature,
                self.device,
            )
            t_start = time.perf_counter()

            with torch.no_grad():
                outputs = self._model.generate(
                    inputs["input_ids"],
                    attention_mask=inputs.get("attention_mask"),
                    **gen_kwargs,
                )

            t_elapsed = time.perf_counter() - t_start

            generated_tokens = outputs[0][input_token_len:]
            cleaned_text = self._tokenizer.decode(
                generated_tokens,
                skip_special_tokens=True,
            )
            cleaned_text = self._strip_artifacts(cleaned_text)

            logger.info(
                "[SLM DONE] Generated %d tokens in %.2fs (content_chars=%d).",
                len(generated_tokens),
                t_elapsed,
                len(cleaned_text),
            )

            if not cleaned_text:
                logger.warning(
                    "SLM returned empty text. Falling back to raw candidate input."
                )
                return raw_input

            return cleaned_text

        except Exception as exc:
            logger.error(
                "SLM post-processing failed (%s). Falling back to raw input.",
                exc,
                exc_info=True,
            )
            return raw_input

    def clean_text(self, raw_candidate_text: str) -> str:
        """Alias for `clean()`."""
        return self.clean(raw_candidate_text)
