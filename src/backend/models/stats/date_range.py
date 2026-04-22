from datetime import date as date_type
from pydantic import BaseModel

class DatasetDateRange(BaseModel):
    min_date: date_type | None
    max_date: date_type | None
