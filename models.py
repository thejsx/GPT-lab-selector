from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from pydantic import BaseModel


class QueryData(BaseModel):
    query: str

class PatientData(BaseModel):
    age: Optional[str]
    gender: Optional[str]
    weight: Optional[str]

class HealthForm(BaseModel):
    Patient: PatientData
    Conditions: List[str]
    Query: str