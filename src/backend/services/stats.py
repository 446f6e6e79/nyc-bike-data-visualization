import pandas as pd
from routes import stats
from models.stats import RideTypeStats, UserTypeStats
from models.ride import RideableType, MemberCasual

def compute_ride_type_stats(df: pd.DataFrame, rideable_type: RideableType) -> RideTypeStats:
    """Compute statistics for a specific rideable type"""
    rides = df[df['rideable_type'] == rideable_type.value]
    return RideTypeStats(
        rideable_type=rideable_type,
        total_rides=len(rides),
        average_duration_minutes=rides['trip_duration'].mean() / 60,
        total_distance_km=rides['trip_distance'].sum()
    )

def compute_user_type_stats(df: pd.DataFrame, user_type: MemberCasual) -> UserTypeStats:
    """Compute statistics for a specific user type"""
    rides = df[df['member_casual'] == user_type.value]
    return UserTypeStats(
        user_type=user_type,
        total_rides=len(rides),
        average_duration_minutes=rides['trip_duration'].mean() / 60,
        average_distance_km=rides['trip_distance'].mean()
    )