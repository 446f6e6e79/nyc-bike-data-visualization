from datetime import date

def fetch_rows(cur) -> list[dict]:
    """Fetch all rows from the cursor and return as a list of dictionaries."""
    # Get the column names from the cursor description
    cols = [d[0] for d in cur.description]
    # Fetch all rows and zip each with the column names to create a list of dictionaries
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def fetch_row(cur) -> dict:
    """Fetch a single row from the cursor and return as a dictionary."""
    # Get the column names from the cursor description
    cols = [d[0] for d in cur.description]
    # Fetch the single row and zip it with the column names to create a dictionary
    return dict(zip(cols, cur.fetchone()))

def total_hours(start: date, end: date) -> int:
    """Calculate the total number of hours between two dates, inclusive.
    For example, from Jan 1 to Jan 3 would be 3 days * 24 hours/day = 72 hours.
    """
    return (end - start).days * 24 + 24