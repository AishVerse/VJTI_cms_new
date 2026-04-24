from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.assignment import AssignmentStatus


class AssignmentCreate(BaseModel):
    complaint_id: int
    assigned_to: int
    work_notes: str | None = None


class AssignmentUpdate(BaseModel):
    assignment_status: AssignmentStatus | None = None
    work_notes: str | None = None
    completion_date: datetime | None = None


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: int
    complaint_id: int
    assigned_to: int
    assigned_by: int
    assigned_date: datetime
    completion_date: datetime | None
    work_notes: str | None
    assignment_status: AssignmentStatus