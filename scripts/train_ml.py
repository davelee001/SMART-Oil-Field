#!/usr/bin/env python3
"""
Enhanced Machine Learning Training Pipeline
==========================================

This script trains multiple ML models for oil field analytics:
- Anomaly detection with ensemble methods
- Predictive maintenance forecasting  
- Production optimization models
- Real-time stream processing validation
"""

import sqlite3
import sys
from pathlib import Path
import os
import time
import numpy as np
import pandas as pd
import logging
from datetime import datetime

# Add the project root to Python path
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / 'src'))

# Import our enhanced data science modules
from data_science.models.ml_models import ModelManager, AdvancedAnomalyDetector, PredictiveMaintenanceModel, ProductionForecaster
from data_science.pipelines.feature_engineering import TelemetryFeatureEngineer, ProductionOptimizer
from data_science.pipelines.stream_processing import StreamProcessor, TelemetryEvent, anomaly_detector_processor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(ROOT / 'logs' / 'ml_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Paths
DB = ROOT / 'data' / 'processed' / 'oilfield.db'
MODEL_DIR = ROOT / 'src' / 'data_science' / 'models' / 'trained'
LEGACY_MODEL_DIR = ROOT / 'src' / 'python_api' / 'app' / 'models'

# Ensure directories exist
MODEL_DIR.mkdir(parents=True, exist_ok=True)
LEGACY_MODEL_DIR.mkdir(parents=True, exist_ok=True)
(ROOT / 'logs').mkdir(exist_ok=True)

def load_or_generate_data():
    """Load telemetry data from SQLite or generate synthetic dataset"""
    logger.info("Loading telemetry data...")
    
    # Load telemetry from SQLite
    if not DB.exists():
        logger.warning(f"DB not found at {DB}, creating synthetic dataset...")
        df = pd.DataFrame()
    else:
        try:
            conn = sqlite3.connect(DB)
            df = pd.read_sql_query('SELECT device_id, ts, temperature, pressure, status FROM telemetry', conn)
            conn.close()
            logger.info(f"Loaded {len(df)} records from database")
        except Exception as e:
            logger.error(f"Error loading from database: {e}")
            df = pd.DataFrame()

    if df.empty or len(df) < 1000:
        logger.info("Generating enhanced synthetic dataset...")
        df = generate_enhanced_synthetic_data()
    
    return df

def generate_enhanced_synthetic_data(n_samples=5000, n_devices=10):
    """Generate realistic synthetic telemetry data with patterns and anomalies"""
    logger.info(f"Generating {n_samples} synthetic telemetry records for {n_devices} devices")
    
    now = int(time.time())
    data = []
    
    for device_idx in range(n_devices):
        device_id = f"well-{device_idx:03d}"
        device_samples = n_samples // n_devices
        
        # Generate time series with realistic patterns
        ts_start = now - device_samples * 300  # 5-minute intervals
        timestamps = np.arange(ts_start, now, 300)[:device_samples]
        
        # Base temperature with daily cycle
        time_of_day = (timestamps % (24 * 3600)) / (24 * 3600)
        base_temp = 75 + 10 * np.sin(2 * np.pi * time_of_day)  # Daily temperature cycle
        temperature = base_temp + np.random.normal(0, 2, device_samples)  # Add noise
        
        # Base pressure with some correlation to temperature
        base_pressure = 180 + 0.5 * (temperature - 75)  # Slight correlation
        pressure = base_pressure + np.random.normal(0, 5, device_samples)
        
        # Add equipment degradation trend over time
        degradation_factor = np.linspace(0, 0.2, device_samples)
        temperature += degradation_factor * np.random.normal(0, 3, device_samples)
        pressure += degradation_factor * np.random.normal(0, 8, device_samples)
        
        # Inject various types of anomalies
        status = ['OK'] * device_samples
        
        # Type 1: Sudden spikes (sensor malfunctions)
        spike_indices = np.random.choice(device_samples, size=int(0.02 * device_samples), replace=False)
        for idx in spike_indices:
            temperature[idx] += np.random.normal(30, 5)
            pressure[idx] += np.random.normal(80, 15)
            status[idx] = 'ALERT'
        
        # Type 2: Gradual drift (equipment degradation)
        drift_start = np.random.choice(device_samples - 100, size=2)
        for start_idx in drift_start:
            drift_length = np.random.randint(50, 200)
            end_idx = min(start_idx + drift_length, device_samples)
            drift_magnitude = np.random.uniform(15, 25)
            
            for i in range(start_idx, end_idx):
                progress = (i - start_idx) / drift_length
                temperature[i] += progress * drift_magnitude
                pressure[i] += progress * drift_magnitude * 2
                if progress > 0.5:
                    status[i] = 'WARN'
        
        # Type 3: Oscillations (mechanical issues)
        osc_indices = np.random.choice(device_samples, size=int(0.01 * device_samples), replace=False)
        for idx in osc_indices:
            if idx + 20 < device_samples:
                osc_pattern = 5 * np.sin(np.linspace(0, 4*np.pi, 20))
                temperature[idx:idx+20] += osc_pattern
                pressure[idx:idx+20] += osc_pattern * 3
                for i in range(idx, idx+20):
                    if i < device_samples:
                        status[i] = 'WARN'
        
        # Add device-specific data to the main dataset
        for i in range(device_samples):
            data.append({
                'device_id': device_id,
                'ts': timestamps[i],
                'temperature': temperature[i],
                'pressure': pressure[i], 
                'status': status[i]
            })
    
    df = pd.DataFrame(data)
    logger.info(f"Generated dataset: {len(df)} records, {df['status'].value_counts().to_dict()}")
    return df


def train_enhanced_models(df):
    """Train all enhanced ML models"""
    logger.info("Starting enhanced model training...")
    
    # Initialize model manager
    model_manager = ModelManager(MODEL_DIR)
    
    # Train all models
    models = model_manager.train_all_models(df)
    
    # Test stream processing capabilities
    logger.info("Testing real-time stream processing...")
    test_stream_processing(df)
    
    # Generate production optimization insights
    logger.info("Running production optimization analysis...")
    optimizer = ProductionOptimizer()
    optimization_results = optimizer.optimize_production_parameters(df)
    
    logger.info("Optimization results:")
    for param, results in optimization_results.items():
        logger.info(f"  {param}: target={results['target']:.2f}, "
                   f"range={results['min']:.2f}-{results['max']:.2f}, "
                   f"efficiency={results['current_efficiency']:.2f}")
    
    # Save legacy compatibility model
    save_legacy_model(models['anomaly_detector'], df)
    
    return models, optimization_results

def test_stream_processing(df):
    """Test real-time stream processing capabilities"""
    logger.info("Testing stream processing with sample data...")
    
    # Initialize stream processor
    processor = StreamProcessor()
    
    # Add processors
    processor.add_processor(anomaly_detector_processor)
    
    # Process sample events from the dataset
    sample_size = min(100, len(df))
    sample_df = df.tail(sample_size)
    
    for _, row in sample_df.iterrows():
        event = TelemetryEvent(
            device_id=row['device_id'],
            timestamp=row['ts'],
            temperature=row['temperature'],
            pressure=row['pressure'],
            status=row['status']
        )
        
        # Process event (synchronously for testing)
        import asyncio
        asyncio.run(processor.process_event(event))
    
    # Get processing results
    alerts = processor.get_recent_alerts()
    stats = processor.stats
    
    logger.info(f"Stream processing test complete:")
    logger.info(f"  Events processed: {stats['events_processed']}")
    logger.info(f"  Alerts generated: {stats['alerts_generated']}")
    logger.info(f"  Processing errors: {stats['processing_errors']}")
    
    return processor

def save_legacy_model(anomaly_detector, df):
    """Save legacy-compatible model for backward compatibility"""
    logger.info("Saving legacy-compatible anomaly detection model...")
    
    # Create a simple sklearn model for legacy compatibility
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    
    # Prepare simple features
    features = ['temperature', 'pressure']
    X = df[features].fillna(df[features].mean())
    
    # Train simple isolation forest
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    legacy_model = IsolationForest(contamination=0.1, random_state=42)
    legacy_model.fit(X_scaled)
    
    # Save to legacy location
    import joblib
    legacy_path = LEGACY_MODEL_DIR / 'telemetry_anomaly.pkl'
    model_data = {
        'model': legacy_model,
        'scaler': scaler,
        'features': features
    }
    joblib.dump(model_data, legacy_path)
    logger.info(f"Saved legacy model to {legacy_path}")

def evaluate_models(models, df):
    """Evaluate trained models and generate performance reports"""
    logger.info("Evaluating model performance...")
    
    evaluation_results = {}
    
    # Test anomaly detection
    if 'anomaly_detector' in models:
        logger.info("Evaluating anomaly detection model...")
        anomaly_model = models['anomaly_detector']
        
        # Test on recent data
        test_df = df.tail(500) if len(df) > 500 else df
        predictions, component_predictions = anomaly_model.predict(test_df)
        
        # Calculate metrics
        true_anomalies = (test_df['status'] != 'OK').astype(int).values
        accuracy = np.mean(predictions == true_anomalies)
        
        evaluation_results['anomaly_detection'] = {
            'accuracy': accuracy,
            'predictions': predictions.tolist(),
            'true_labels': true_anomalies.tolist(),
            'component_predictions': component_predictions
        }
        
        logger.info(f"Anomaly detection accuracy: {accuracy:.3f}")
    
    # Test predictive maintenance
    if 'maintenance_predictor' in models:
        logger.info("Evaluating predictive maintenance model...")
        maintenance_model = models['maintenance_predictor']
        
        test_df = df.tail(500) if len(df) > 500 else df
        predictions = maintenance_model.predict(test_df)
        probabilities = maintenance_model.predict(test_df, return_proba=True)
        
        evaluation_results['predictive_maintenance'] = {
            'predictions': predictions.tolist(),
            'probabilities': probabilities.tolist() if hasattr(probabilities, 'tolist') else [],
            'feature_importance': maintenance_model.get_feature_importance().tolist()
        }
    
    # Test production forecasting
    if 'production_forecaster' in models:
        logger.info("Evaluating production forecasting model...")
        forecaster = models['production_forecaster']
        
        # Use temperature as proxy for production target
        test_df = df.tail(500) if len(df) > 500 else df
        targets = (test_df['temperature'] - test_df['temperature'].min()) / (test_df['temperature'].max() - test_df['temperature'].min())
        
        predictions = forecaster.predict(test_df)
        
        # Calculate RMSE
        rmse = np.sqrt(np.mean((predictions - targets.values)**2))
        
        evaluation_results['production_forecasting'] = {
            'rmse': rmse,
            'predictions': predictions.tolist(),
            'targets': targets.tolist()
        }
        
        logger.info(f"Production forecasting RMSE: {rmse:.3f}")
    
    return evaluation_results

def generate_report(models, optimization_results, evaluation_results, df):
    """Generate comprehensive training report"""
    logger.info("Generating training report...")
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'dataset_info': {
            'total_records': len(df),
            'devices': df['device_id'].nunique(),
            'time_span_hours': (df['ts'].max() - df['ts'].min()) / 3600,
            'status_distribution': df['status'].value_counts().to_dict()
        },
        'models_trained': list(models.keys()),
        'optimization_results': optimization_results,
        'evaluation_results': evaluation_results,
        'model_files': [str(f) for f in MODEL_DIR.glob('*.pkl')]
    }
    
    # Save report
    report_path = ROOT / 'logs' / f'training_report_{int(time.time())}.json'
    import json
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Training report saved to {report_path}")
    return report

def main():
    """Main training pipeline"""
    logger.info("Starting enhanced ML training pipeline...")
    start_time = time.time()
    
    try:
        # Load data
        df = load_or_generate_data()
        
        # Train models
        models, optimization_results = train_enhanced_models(df)
        
        # Evaluate models
        evaluation_results = evaluate_models(models, df)
        
        # Generate report
        report = generate_report(models, optimization_results, evaluation_results, df)
        
        # Summary
        training_time = time.time() - start_time
        logger.info(f"Training pipeline completed successfully in {training_time:.2f} seconds")
        logger.info(f"Models trained: {len(models)}")
        logger.info(f"Total data points processed: {len(df)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Training pipeline failed: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
