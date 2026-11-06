from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


class TaskMessage(BaseModel):
    """Message sent from Coordinator to Worker via tasks_queue."""

    paper_id: str = Field(..., description="Unique identifier of the paper (e.g., Strapi documentId or OpenAlex ID)")
    pdf_path: str = Field(..., description="Full URL or file path to the PDF")
    file_hash: str = Field(..., description="SHA-256 fingerprint of the PDF file")


class ResultMessage(BaseModel):
    """Message returned from Worker to Coordinator via results_queue."""

    paper_id: str = Field(..., description="Unique identifier of the paper")
    pdf_path: str = Field(default="", description="Full URL or file path to the processed PDF")
    file_hash: str = Field(..., description="SHA-256 fingerprint of the processed PDF file")
    status: TaskStatus = Field(..., description="Processing outcome ('success' or 'failed')")
    acknowledgment_text: Optional[str] = Field(
        default=None,
        description="Extracted acknowledgment/funding text, or None if no section matched",
    )
    confidence_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Highest confidence score returned by the AI extractor",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error details if status is 'failed'",
    )
