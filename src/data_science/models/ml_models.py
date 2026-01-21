"""
Advanced Machine Learning Models for Oil Field Analytics
========================================================

This module contains sophisticated ML models for various oil field analytics tasks:
- Anomaly detection in real-time telemetry
- Predictive maintenance scheduling
- Production forecasting
- Equipment failure prediction
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
import logging
from pathlib import Path

from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import classification_report, mean_squared_error, mean_absolute_error
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb
from sklearn.cluster import DBSCAN

from ..pipelines.feature_engineering import TelemetryFeatureEngineer

logger = logging.getLogger(__name__)


class AdvancedAnomalyDetector:
    """
    Multi-model anomaly detection system using ensemble methods
    """
    
    def __init__(self, contamination=0.1):
        self.contamination = contamination
        self.models = {}
        self.feature_engineer = TelemetryFeatureEngineer()
        self.scaler = StandardScaler()
        self.fitted = False
        
        # Initialize ensemble of anomaly detection models
        self.models['isolation_forest'] = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=200
        )
        
        self.models['dbscan'] = DBSCAN(eps=0.5, min_samples=5)
        
        # Statistical anomaly detector
        self.statistical_thresholds = {}
    
    def fit(self, X, y=None):
        """Train the anomaly detection ensemble"""
        logger.info("Training anomaly detection models")
        
        # Engineer features
        X_engineered = self.feature_engineer.fit_transform(X)
        
        # Select numerical features for training
        numerical_features = self._get_numerical_features(X_engineered)
        X_numerical = X_engineered[numerical_features].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X_numerical)
        
        # Train models
        self.models['isolation_forest'].fit(X_scaled)
        self.models['dbscan'].fit(X_scaled)
        
        # Calculate statistical thresholds
        self._calculate_statistical_thresholds(X_numerical)
        
        self.fitted = True
        return self
    
    def predict(self, X):
        """Predict anomalies using ensemble approach"""
        if not self.fitted:
            raise ValueError("Model must be fitted before prediction")
        
        # Engineer features
        X_engineered = self.feature_engineer.transform(X)
        
        # Select numerical features
        numerical_features = self._get_numerical_features(X_engineered)
        X_numerical = X_engineered[numerical_features].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.transform(X_numerical)
        
        # Get predictions from each model
        predictions = {}
        
        # Isolation Forest (-1 for outlier, 1 for inlier)
        predictions['isolation_forest'] = self.models['isolation_forest'].predict(X_scaled)
        predictions['isolation_forest'] = (predictions['isolation_forest'] == -1).astype(int)
        
        # DBSCAN (-1 for noise/outlier)
        dbscan_labels = self.models['dbscan'].fit_predict(X_scaled)
        predictions['dbscan'] = (dbscan_labels == -1).astype(int)
        
        # Statistical anomaly detection
        predictions['statistical'] = self._predict_statistical_anomalies(X_numerical)
        
        # Ensemble prediction (majority vote)
        ensemble_prediction = np.array([
            predictions['isolation_forest'],
            predictions['dbscan'],
            predictions['statistical']
        ]).mean(axis=0)
        
        # Threshold at 0.5 (majority vote)
        final_prediction = (ensemble_prediction >= 0.5).astype(int)
        
        return final_prediction, predictions
    
    def _get_numerical_features(self, df):
        """Get list of numerical feature columns"""
        return [col for col in df.columns if df[col].dtype in ['float64', 'int64']]
    
    def _calculate_statistical_thresholds(self, X):
        """Calculate statistical thresholds for anomaly detection"""
        for col in X.columns:
            if X[col].dtype in ['float64', 'int64']:
                mean = X[col].mean()
                std = X[col].std()
                self.statistical_thresholds[col] = {
                    'lower': mean - 3 * std,
                    'upper': mean + 3 * std
                }
    
    def _predict_statistical_anomalies(self, X):
        """Predict anomalies using statistical thresholds"""
        anomalies = np.zeros(len(X))
        
        for col in X.columns:
            if col in self.statistical_thresholds:
                lower = self.statistical_thresholds[col]['lower']
                upper = self.statistical_thresholds[col]['upper']
                col_anomalies = (X[col] < lower) | (X[col] > upper)
                anomalies = anomalies | col_anomalies.values
        
        return anomalies.astype(int)


class PredictiveMaintenanceModel:
    """
    Predictive maintenance model to forecast equipment failures
    """
    
    def __init__(self):
        self.model = None
        self.feature_engineer = TelemetryFeatureEngineer()
        self.scaler = StandardScaler()
        self.fitted = False
        
        # Use LightGBM for better performance on large datasets
        self.model = lgb.LGBMClassifier(
            objective='binary',
            n_estimators=500,
            learning_rate=0.05,
            max_depth=8,
            random_state=42,
            class_weight='balanced'
        )
    
    def fit(self, X, y):
        """Train the predictive maintenance model"""
        logger.info("Training predictive maintenance model")
        
        # Engineer features
        X_engineered = self.feature_engineer.fit_transform(X)
        
        # Select features and prepare data
        feature_columns = self._select_features(X_engineered)
        X_features = X_engineered[feature_columns].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X_features)
        
        # Train model
        self.model.fit(X_scaled, y)
        
        self.fitted = True
        return self
    
    def predict(self, X, return_proba=False):
        """Predict maintenance needs"""
        if not self.fitted:
            raise ValueError("Model must be fitted before prediction")
        
        # Engineer features
        X_engineered = self.feature_engineer.transform(X)
        
        # Select features and prepare data
        feature_columns = self._select_features(X_engineered)
        X_features = X_engineered[feature_columns].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.transform(X_features)
        
        # Make predictions
        if return_proba:
            return self.model.predict_proba(X_scaled)
        else:
            return self.model.predict(X_scaled)
    
    def get_feature_importance(self):
        """Get feature importance from the trained model"""
        if not self.fitted:
            raise ValueError("Model must be fitted before getting feature importance")
        
        return self.model.feature_importances_
    
    def _select_features(self, df):
        """Select relevant features for predictive maintenance"""
        # Priority features for maintenance prediction
        priority_features = [
            'temperature', 'pressure',
            'temperature_rolling_std', 'pressure_rolling_std',
            'temperature_rate_of_change', 'pressure_rate_of_change',
            'temperature_z_score', 'pressure_z_score',
            'temperature_is_outlier', 'pressure_is_outlier'
        ]
        
        # Add time features if available
        time_features = ['hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'is_weekend']
        
        available_features = []
        for feature in priority_features + time_features:
            if feature in df.columns:
                available_features.append(feature)
        
        return available_features


class ProductionForecaster:
    """
    Time series forecasting model for production optimization
    """
    
    def __init__(self, forecast_horizon=24):
        self.forecast_horizon = forecast_horizon
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.feature_engineer = TelemetryFeatureEngineer()
        self.scaler = StandardScaler()
        self.fitted = False
    
    def fit(self, X, y):
        """Train the production forecasting model"""
        logger.info("Training production forecasting model")
        
        # Engineer features for time series
        X_engineered = self._engineer_time_series_features(X)
        
        # Select relevant features
        feature_columns = self._get_numerical_features(X_engineered)
        X_features = X_engineered[feature_columns].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X_features)
        
        # Train model
        self.model.fit(X_scaled, y)
        
        self.fitted = True
        return self
    
    def predict(self, X):
        """Generate production forecasts"""
        if not self.fitted:
            raise ValueError("Model must be fitted before prediction")
        
        # Engineer features
        X_engineered = self._engineer_time_series_features(X)
        
        # Select features
        feature_columns = self._get_numerical_features(X_engineered)
        X_features = X_engineered[feature_columns].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.transform(X_features)
        
        # Make prediction
        return self.model.predict(X_scaled)
    
    def forecast_multi_step(self, X, steps=None):
        """Generate multi-step ahead forecasts"""
        if steps is None:
            steps = self.forecast_horizon
        
        forecasts = []
        current_X = X.copy()
        
        for step in range(steps):
            # Predict next value
            pred = self.predict(current_X.tail(1))
            forecasts.append(pred[0])
            
            # Update input for next prediction
            # This is a simplified approach; in practice, you'd want to
            # properly update the time series features
            next_row = current_X.iloc[-1:].copy()
            if 'ts' in next_row.columns:
                next_row['ts'] += 3600  # Add 1 hour
            current_X = pd.concat([current_X, next_row], ignore_index=True)
        
        return np.array(forecasts)
    
    def _engineer_time_series_features(self, X):
        """Engineer features specific for time series forecasting"""
        df = self.feature_engineer.fit_transform(X) if not self.feature_engineer.fitted else self.feature_engineer.transform(X)
        
        # Add lag features
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                for lag in [1, 2, 3, 6, 12, 24]:  # Various lag windows
                    df[f'{col}_lag_{lag}'] = df[col].shift(lag)
        
        return df
    
    def _get_numerical_features(self, df):
        """Get numerical features for modeling"""
        return [col for col in df.columns if df[col].dtype in ['float64', 'int64']]


class ModelManager:
    """
    Centralized model management for training, saving, and loading models
    """
    
    def __init__(self, models_dir):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.models = {}
    
    def train_all_models(self, telemetry_df):
        """Train all models on the provided dataset"""
        logger.info("Training all ML models")
        
        # Prepare labels for supervised learning
        y_anomaly = self._generate_anomaly_labels(telemetry_df)
        y_maintenance = self._generate_maintenance_labels(telemetry_df)
        y_production = self._generate_production_targets(telemetry_df)
        
        # Train anomaly detection
        self.models['anomaly_detector'] = AdvancedAnomalyDetector()
        self.models['anomaly_detector'].fit(telemetry_df)
        
        # Train predictive maintenance
        self.models['maintenance_predictor'] = PredictiveMaintenanceModel()
        self.models['maintenance_predictor'].fit(telemetry_df, y_maintenance)
        
        # Train production forecaster
        self.models['production_forecaster'] = ProductionForecaster()
        self.models['production_forecaster'].fit(telemetry_df, y_production)
        
        # Save all models
        self.save_all_models()
        
        return self.models
    
    def save_all_models(self):
        """Save all trained models"""
        for name, model in self.models.items():
            model_path = self.models_dir / f'{name}.pkl'
            joblib.dump(model, model_path)
            logger.info(f"Saved model {name} to {model_path}")
    
    def load_all_models(self):
        """Load all saved models"""
        model_files = list(self.models_dir.glob('*.pkl'))
        
        for model_file in model_files:
            model_name = model_file.stem
            try:
                self.models[model_name] = joblib.load(model_file)
                logger.info(f"Loaded model {model_name} from {model_file}")
            except Exception as e:
                logger.error(f"Failed to load model {model_name}: {e}")
        
        return self.models
    
    def _generate_anomaly_labels(self, df):
        """Generate anomaly labels based on statistical analysis"""
        # Simple approach: label extreme values as anomalies
        labels = np.zeros(len(df))
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 2 * IQR
                upper_bound = Q3 + 2 * IQR
                
                outliers = (df[col] < lower_bound) | (df[col] > upper_bound)
                labels = labels | outliers.values
        
        return labels.astype(int)
    
    def _generate_maintenance_labels(self, df):
        """Generate maintenance labels based on degradation patterns"""
        # Simplified approach: predict maintenance needs based on trends
        labels = np.zeros(len(df))
        
        if 'temperature' in df.columns and 'pressure' in df.columns:
            # Rolling standard deviation as a proxy for equipment degradation
            temp_std = df['temperature'].rolling(window=24).std()
            pressure_std = df['pressure'].rolling(window=24).std()
            
            # High variability indicates potential maintenance needs
            high_variability = (
                (temp_std > temp_std.quantile(0.8)) | 
                (pressure_std > pressure_std.quantile(0.8))
            )
            
            labels = high_variability.fillna(0).astype(int).values
        
        return labels
    
    def _generate_production_targets(self, df):
        """Generate production targets for forecasting"""
        # Simplified approach: use temperature as a proxy for production efficiency
        if 'temperature' in df.columns:
            # Normalize temperature to 0-1 range as production efficiency
            temp_min = df['temperature'].min()
            temp_max = df['temperature'].max()
            production_efficiency = (df['temperature'] - temp_min) / (temp_max - temp_min)
            return production_efficiency.fillna(0.5).values
        else:
            return np.random.uniform(0.3, 0.9, len(df))