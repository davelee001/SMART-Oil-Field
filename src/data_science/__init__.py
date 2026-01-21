"""
Advanced Oil Field Data Science Suite
====================================

This module provides comprehensive machine learning and data processing
capabilities for oil field telemetry data analysis.

Features:
- Anomaly detection in sensor data
- Predictive maintenance models
- Production optimization
- Real-time stream processing
- Feature engineering pipelines
- Model versioning and deployment
"""

import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Project structure
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / 'data'
MODELS_DIR = Path(__file__).parent / 'models'
PIPELINES_DIR = Path(__file__).parent / 'pipelines'

# Ensure directories exist
for dir_path in [DATA_DIR / 'processed', DATA_DIR / 'raw', DATA_DIR / 'temp', MODELS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)