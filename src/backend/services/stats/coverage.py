from src.backend.db import get_conn
from src.backend.models.stats.date_range import DatasetDateRange

def get_data_range_coverage() -> DatasetDateRange:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT min_date, max_date FROM dataset_coverage WHERE id = 1")
            row = cur.fetchone()
    if row:
        return DatasetDateRange(min_date=row[0], max_date=row[1])
    return DatasetDateRange(min_date=None, max_date=None)