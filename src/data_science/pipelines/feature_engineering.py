"""
Advanced Feature Engineering Pipeline for Oil Field Data
========================================================

This module handles sophisticated feature extraction and engineering
from raw telemetry data to prepare it for machine learning models.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.base import BaseEstimator, TransformerMixin
import logging

logger = logging.getLogger(__name__)


class TelemetryFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Advanced feature engineering for telemetry data
    """
    
    def __init__(self, window_size=24, include_fourier=True, include_statistical=True):
        self.window_size = window_size
        self.include_fourier = include_fourier
        self.include_statistical = include_statistical
        self.scaler = RobustScaler()
        self.fitted = False
    
    def fit(self, X, y=None):
        """Fit the feature engineer on training data"""
        if isinstance(X, pd.DataFrame):
            # Fit scaler on numerical columns
            numerical_cols = ['temperature', 'pressure']
            if all(col in X.columns for col in numerical_cols):
                self.scaler.fit(X[numerical_cols])
        
        self.fitted = True
        return self
    
    def transform(self, X):
        """Transform the data with engineered features"""
        if not self.fitted:
            raise ValueError("FeatureEngineer must be fitted before transform")
        
        df = X.copy()
        
        # Time-based features
        if 'ts' in df.columns:
            df = self._add_time_features(df)
        
        # Rolling window features
        if self.include_statistical:
            df = self._add_rolling_features(df)
        
        # Fourier features for cyclical patterns
        if self.include_fourier and 'ts' in df.columns:
            df = self._add_fourier_features(df)
        
        # Anomaly indicators
        df = self._add_anomaly_indicators(df)
        
        # Scale numerical features
        numerical_cols = ['temperature', 'pressure']
        if all(col in df.columns for col in numerical_cols):
            df[numerical_cols] = self.scaler.transform(df[numerical_cols])
        
        return df
    
    def _add_time_features(self, df):
        """Add time-based features"""
        df = df.copy()
        df['datetime'] = pd.to_datetime(df['ts'], unit='s')
        df['hour'] = df['datetime'].dt.hour
        df['day_of_week'] = df['datetime'].dt.dayofweek
        df['month'] = df['datetime'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        return df
    
    def _add_rolling_features(self, df):
        """Add rolling window statistical features"""
        df = df.copy()
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                # Rolling statistics
                df[f'{col}_rolling_mean'] = df[col].rolling(window=self.window_size).mean()
                df[f'{col}_rolling_std'] = df[col].rolling(window=self.window_size).std()
                df[f'{col}_rolling_min'] = df[col].rolling(window=self.window_size).min()
                df[f'{col}_rolling_max'] = df[col].rolling(window=self.window_size).max()
                df[f'{col}_rolling_median'] = df[col].rolling(window=self.window_size).median()
                
                # Rate of change
                df[f'{col}_rate_of_change'] = df[col].diff()
                df[f'{col}_rate_of_change_pct'] = df[col].pct_change()
                
                # Deviation from rolling mean
                df[f'{col}_deviation'] = df[col] - df[f'{col}_rolling_mean']
                df[f'{col}_z_score'] = (df[col] - df[f'{col}_rolling_mean']) / (df[f'{col}_rolling_std'] + 1e-8)
        
        # Cross-feature relationships
        if 'temperature' in df.columns and 'pressure' in df.columns:
            df['temp_pressure_ratio'] = df['temperature'] / (df['pressure'] + 1e-8)
            df['temp_pressure_product'] = df['temperature'] * df['pressure']
        
        return df
    
    def _add_fourier_features(self, df):
        """Add Fourier transform features for cyclical patterns"""
        df = df.copy()
        
        for col in ['temperature', 'pressure']:
            if col in df.columns and len(df) >= 2:
                # Simple Fourier features (dominant frequencies)
                fft = np.fft.fft(df[col].fillna(df[col].mean()))
                fft_freq = np.fft.fftfreq(len(fft))
                
                # Get dominant frequency components
                dominant_idx = np.argsort(np.abs(fft))[-5:]  # Top 5 frequencies
                
                for i, idx in enumerate(dominant_idx):
                    df[f'{col}_fft_real_{i}'] = np.real(fft[idx])
                    df[f'{col}_fft_imag_{i}'] = np.imag(fft[idx])
        
        return df
    
    def _add_anomaly_indicators(self, df):
        """Add basic anomaly indicators"""
        df = df.copy()
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                # Outlier detection using IQR
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df[f'{col}_is_outlier'] = ((df[col] < lower_bound) | (df[col] > upper_bound)).astype(int)
        
        return df


class ProductionOptimizer:
    """
    Production optimization using ML techniques
    """
    
    def __init__(self):
        self.model = None
        self.feature_engineer = TelemetryFeatureEngineer()
    
    def optimize_production_parameters(self, telemetry_df):
        """
        Suggest optimal production parameters based on historical data
        """
        logger.info("Analyzing telemetry data for production optimization")
        
        # Engineer features
        features_df = self.feature_engineer.fit_transform(telemetry_df)
        
        # Calculate efficiency metrics
        efficiency_scores = self._calculate_efficiency_scores(features_df)
        
        # Find optimal operating ranges
        optimal_ranges = self._find_optimal_ranges(features_df, efficiency_scores)
        
        return optimal_ranges
    
    def _calculate_efficiency_scores(self, df):
        """Calculate efficiency scores based on stability and performance"""
        scores = {}
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                # Stability score (lower variance = higher score)
                stability = 1 / (df[f'{col}_rolling_std'].mean() + 1)
                
                # Performance score (based on optimal ranges)
                if col == 'temperature':
                    # Optimal temperature range: 75-85°F
                    performance = 1 - np.abs(df[col].mean() - 80) / 80
                else:  # pressure
                    # Optimal pressure range: 180-220 PSI
                    performance = 1 - np.abs(df[col].mean() - 200) / 200
                
                scores[col] = {
                    'stability': max(0, min(1, stability)),
                    'performance': max(0, min(1, performance))
                }
        
        return scores
    
    def _find_optimal_ranges(self, df, efficiency_scores):
        """Find optimal operating parameter ranges"""
        optimal_ranges = {}
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                # Get current statistics
                mean_val = df[col].mean()
                std_val = df[col].std()
                
                # Calculate recommended range based on efficiency
                stability_factor = efficiency_scores[col]['stability']
                performance_factor = efficiency_scores[col]['performance']
                
                # Adjust range based on efficiency
                range_adjustment = (1 - stability_factor) * std_val
                
                optimal_ranges[col] = {
                    'min': mean_val - range_adjustment,
                    'max': mean_val + range_adjustment,
                    'target': mean_val,
                    'current_efficiency': (stability_factor + performance_factor) / 2
                }
        
        return optimal_ranges


def process_real_time_stream(data_point):
    """
    Process a single data point from real-time stream
    """
    # Add timestamp if missing
    if 'ts' not in data_point:
        data_point['ts'] = int(datetime.now().timestamp())
    
    # Basic validation
    if 'temperature' in data_point and 'pressure' in data_point:
        # Check for extreme values
        if data_point['temperature'] > 150 or data_point['temperature'] < -50:
            data_point['alert'] = 'TEMPERATURE_EXTREME'
        
        if data_point['pressure'] > 500 or data_point['pressure'] < 0:
            data_point['alert'] = 'PRESSURE_EXTREME'
    
    return data_point