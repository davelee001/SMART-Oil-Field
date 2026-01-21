"""
Advanced ETL and Data Pipeline for Oil Field Analytics
======================================================

This module provides comprehensive data processing capabilities:
- Real-time stream ingestion
- Batch data processing
- Data quality validation
- Feature store management
- Data warehouse operations
"""

import asyncio
import logging
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
import duckdb
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / 'data'


@dataclass
class DataQualityRule:
    """Data quality validation rule"""
    column: str
    rule_type: str  # 'range', 'not_null', 'unique', 'format'
    parameters: Dict[str, Any]
    severity: str = 'ERROR'  # 'ERROR', 'WARNING', 'INFO'


class DataQualityValidator:
    """Data quality validation engine"""
    
    def __init__(self):
        self.rules = []
        self.violations = []
    
    def add_rule(self, rule: DataQualityRule):
        """Add a validation rule"""
        self.rules.append(rule)
    
    def validate(self, df: pd.DataFrame) -> Dict:
        """Validate data against all rules"""
        self.violations = []
        results = {
            'passed': True,
            'total_rules': len(self.rules),
            'violations': [],
            'summary': {}
        }
        
        for rule in self.rules:
            violations = self._check_rule(df, rule)
            if violations:
                results['violations'].extend(violations)
                if rule.severity == 'ERROR':
                    results['passed'] = False
        
        # Generate summary
        severity_counts = {}
        for violation in results['violations']:
            severity = violation['severity']
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        results['summary'] = {
            'total_violations': len(results['violations']),
            'by_severity': severity_counts,
            'data_quality_score': self._calculate_quality_score(results)
        }
        
        return results
    
    def _check_rule(self, df: pd.DataFrame, rule: DataQualityRule) -> List[Dict]:
        """Check a single validation rule"""
        violations = []
        
        if rule.column not in df.columns:
            violations.append({
                'rule': rule.rule_type,
                'column': rule.column,
                'severity': rule.severity,
                'message': f'Column {rule.column} not found in dataset',
                'count': 1
            })
            return violations
        
        column_data = df[rule.column]
        
        if rule.rule_type == 'range':
            min_val = rule.parameters.get('min')
            max_val = rule.parameters.get('max')
            
            if min_val is not None:
                violations_mask = column_data < min_val
                violation_count = violations_mask.sum()
                if violation_count > 0:
                    violations.append({
                        'rule': 'range_min',
                        'column': rule.column,
                        'severity': rule.severity,
                        'message': f'{violation_count} values below minimum {min_val}',
                        'count': violation_count
                    })
            
            if max_val is not None:
                violations_mask = column_data > max_val
                violation_count = violations_mask.sum()
                if violation_count > 0:
                    violations.append({
                        'rule': 'range_max',
                        'column': rule.column,
                        'severity': rule.severity,
                        'message': f'{violation_count} values above maximum {max_val}',
                        'count': violation_count
                    })
        
        elif rule.rule_type == 'not_null':
            null_count = column_data.isnull().sum()
            if null_count > 0:
                violations.append({
                    'rule': 'not_null',
                    'column': rule.column,
                    'severity': rule.severity,
                    'message': f'{null_count} null values found',
                    'count': null_count
                })
        
        elif rule.rule_type == 'unique':
            duplicate_count = column_data.duplicated().sum()
            if duplicate_count > 0:
                violations.append({
                    'rule': 'unique',
                    'column': rule.column,
                    'severity': rule.severity,
                    'message': f'{duplicate_count} duplicate values found',
                    'count': duplicate_count
                })
        
        return violations
    
    def _calculate_quality_score(self, results: Dict) -> float:
        """Calculate overall data quality score (0-1)"""
        if not results['violations']:
            return 1.0
        
        # Weight violations by severity
        severity_weights = {'ERROR': 1.0, 'WARNING': 0.5, 'INFO': 0.1}
        
        total_weight = 0
        for violation in results['violations']:
            weight = severity_weights.get(violation['severity'], 1.0)
            total_weight += weight * violation['count']
        
        # Normalize by total rules and assume baseline quality
        max_possible_weight = len(self.rules) * 100  # Assume max 100 violations per rule
        quality_score = max(0, 1 - (total_weight / max_possible_weight))
        
        return quality_score


class EnhancedETLPipeline:
    """Enhanced ETL pipeline with data quality and feature engineering"""
    
    def __init__(self):
        self.validator = DataQualityValidator()
        self._setup_quality_rules()
        
        # Database connections
        self.sqlite_db = DATA_DIR / 'processed' / 'oilfield.db'
        self.duckdb_file = DATA_DIR / 'processed' / 'warehouse.duckdb'
        self.parquet_dir = DATA_DIR / 'processed' / 'warehouse' / 'parquet'
        
        # Ensure directories exist
        self.parquet_dir.mkdir(parents=True, exist_ok=True)
    
    def _setup_quality_rules(self):
        """Setup data quality validation rules"""
        # Temperature validation
        self.validator.add_rule(DataQualityRule(
            column='temperature',
            rule_type='range',
            parameters={'min': -50, 'max': 200},
            severity='ERROR'
        ))
        
        # Pressure validation  
        self.validator.add_rule(DataQualityRule(
            column='pressure',
            rule_type='range',
            parameters={'min': 0, 'max': 1000},
            severity='ERROR'
        ))
        
        # Required fields
        for col in ['device_id', 'ts']:
            self.validator.add_rule(DataQualityRule(
                column=col,
                rule_type='not_null',
                parameters={},
                severity='ERROR'
            ))
    
    def extract_telemetry_data(self) -> pd.DataFrame:
        """Extract telemetry data from various sources"""
        logger.info("Extracting telemetry data...")
        
        dataframes = []
        
        # Extract from SQLite
        if self.sqlite_db.exists():
            try:
                conn = sqlite3.connect(self.sqlite_db)
                df_sqlite = pd.read_sql_query(
                    'SELECT * FROM telemetry ORDER BY ts DESC',
                    conn
                )
                conn.close()
                if not df_sqlite.empty:
                    df_sqlite['source'] = 'sqlite'
                    dataframes.append(df_sqlite)
                    logger.info(f"Extracted {len(df_sqlite)} records from SQLite")
            except Exception as e:
                logger.error(f"Error extracting from SQLite: {e}")
        
        # Extract from CSV files (if any)
        csv_files = list((DATA_DIR / 'raw').glob('*.csv'))
        for csv_file in csv_files:
            try:
                df_csv = pd.read_csv(csv_file)
                if not df_csv.empty:
                    df_csv['source'] = f'csv_{csv_file.name}'
                    dataframes.append(df_csv)
                    logger.info(f"Extracted {len(df_csv)} records from {csv_file.name}")
            except Exception as e:
                logger.error(f"Error extracting from {csv_file}: {e}")
        
        # Combine all sources
        if dataframes:
            combined_df = pd.concat(dataframes, ignore_index=True)
            logger.info(f"Total extracted records: {len(combined_df)}")
        else:
            logger.warning("No data sources found, creating empty DataFrame")
            combined_df = pd.DataFrame()
        
        return combined_df
    
    def transform_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform and clean the data"""
        logger.info("Transforming data...")
        
        if df.empty:
            return df
        
        # Data quality validation
        quality_results = self.validator.validate(df)
        logger.info(f"Data quality score: {quality_results['summary']['data_quality_score']:.3f}")
        
        if not quality_results['passed']:
            logger.warning("Data quality issues found:")
            for violation in quality_results['violations']:
                if violation['severity'] == 'ERROR':
                    logger.error(f"  {violation['message']}")
        
        # Data cleaning and transformation
        df_clean = df.copy()
        
        # Remove duplicates
        initial_count = len(df_clean)
        df_clean = df_clean.drop_duplicates(subset=['device_id', 'ts'])
        if len(df_clean) < initial_count:
            logger.info(f"Removed {initial_count - len(df_clean)} duplicate records")
        
        # Handle missing values
        df_clean = self._handle_missing_values(df_clean)
        
        # Data type conversions
        df_clean = self._convert_data_types(df_clean)
        
        # Feature engineering
        df_clean = self._engineer_features(df_clean)
        
        # Outlier detection and handling
        df_clean = self._handle_outliers(df_clean)
        
        logger.info(f"Transformation complete: {len(df_clean)} records")
        return df_clean
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values in the dataset"""
        df = df.copy()
        
        # Forward fill for time series continuity
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                df[col] = df[col].fillna(method='ffill')
                df[col] = df[col].fillna(df[col].mean())  # Fill remaining with mean
        
        # Fill device_id if missing (shouldn't happen but safety check)
        if 'device_id' in df.columns:
            df['device_id'] = df['device_id'].fillna('unknown')
        
        # Fill status
        if 'status' in df.columns:
            df['status'] = df['status'].fillna('UNKNOWN')
        
        return df
    
    def _convert_data_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert data types for optimal storage and processing"""
        df = df.copy()
        
        # Convert timestamp to proper format
        if 'ts' in df.columns:
            df['ts'] = pd.to_numeric(df['ts'], errors='coerce')
            df['datetime'] = pd.to_datetime(df['ts'], unit='s', errors='coerce')
        
        # Convert numerical columns
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Convert categorical columns
        if 'status' in df.columns:
            df['status'] = df['status'].astype('category')
        
        if 'device_id' in df.columns:
            df['device_id'] = df['device_id'].astype('category')
        
        return df
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer additional features for analytics"""
        df = df.copy()
        
        if 'datetime' in df.columns:
            # Time-based features
            df['hour'] = df['datetime'].dt.hour
            df['day_of_week'] = df['datetime'].dt.dayofweek
            df['month'] = df['datetime'].dt.month
            df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            
            # Shift features (for working days vs weekends)
            df['is_business_hours'] = (
                (df['hour'] >= 8) & (df['hour'] <= 17) & (df['is_weekend'] == 0)
            ).astype(int)
        
        # Device-level aggregations
        if 'device_id' in df.columns:
            device_stats = df.groupby('device_id').agg({
                'temperature': ['mean', 'std', 'min', 'max'],
                'pressure': ['mean', 'std', 'min', 'max']
            }).round(2)
            
            device_stats.columns = [f'device_{col[0]}_{col[1]}' for col in device_stats.columns]
            df = df.merge(device_stats, left_on='device_id', right_index=True, how='left')
        
        # Temperature and pressure interaction features
        if 'temperature' in df.columns and 'pressure' in df.columns:
            df['temp_pressure_ratio'] = df['temperature'] / (df['pressure'] + 1e-8)
            df['temp_pressure_product'] = df['temperature'] * df['pressure']
        
        return df
    
    def _handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect and handle outliers"""
        df = df.copy()
        
        for col in ['temperature', 'pressure']:
            if col in df.columns:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                # Mark outliers
                df[f'{col}_is_outlier'] = (
                    (df[col] < lower_bound) | (df[col] > upper_bound)
                ).astype(int)
                
                # Cap extreme outliers (beyond 3 IQR)
                extreme_lower = Q1 - 3 * IQR
                extreme_upper = Q3 + 3 * IQR
                
                outlier_count = ((df[col] < extreme_lower) | (df[col] > extreme_upper)).sum()
                if outlier_count > 0:
                    logger.info(f"Capping {outlier_count} extreme outliers in {col}")
                    df[col] = df[col].clip(lower=extreme_lower, upper=extreme_upper)
        
        return df
    
    def load_to_warehouse(self, df: pd.DataFrame):
        """Load transformed data to data warehouse"""
        logger.info("Loading data to warehouse...")
        
        if df.empty:
            logger.warning("No data to load")
            return
        
        try:
            # Connect to DuckDB
            con = duckdb.connect(str(self.duckdb_file))
            
            # Create/update main telemetry table
            con.execute("DROP TABLE IF EXISTS telemetry_enhanced;")
            con.register('df_temp', df)
            con.execute("""
                CREATE TABLE telemetry_enhanced AS 
                SELECT * FROM df_temp;
            """)
            
            # Create aggregated views
            self._create_aggregated_tables(con)
            
            # Export to Parquet for external tools
            self._export_to_parquet(con)
            
            con.close()
            logger.info("Data successfully loaded to warehouse")
            
        except Exception as e:
            logger.error(f"Error loading to warehouse: {e}")
    
    def _create_aggregated_tables(self, con):
        """Create aggregated tables for analytics"""
        
        # Hourly aggregations
        con.execute("""
            CREATE OR REPLACE TABLE telemetry_hourly AS
            SELECT 
                device_id,
                date_trunc('hour', datetime) AS hour_bucket,
                COUNT(*) AS record_count,
                AVG(temperature) AS avg_temperature,
                MIN(temperature) AS min_temperature,
                MAX(temperature) AS max_temperature,
                STDDEV(temperature) AS std_temperature,
                AVG(pressure) AS avg_pressure,
                MIN(pressure) AS min_pressure,
                MAX(pressure) AS max_pressure,
                STDDEV(pressure) AS std_pressure,
                SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) AS alert_count,
                AVG(CASE WHEN temperature_is_outlier = 1 THEN 1.0 ELSE 0.0 END) AS outlier_rate
            FROM telemetry_enhanced
            WHERE datetime IS NOT NULL
            GROUP BY device_id, hour_bucket
            ORDER BY hour_bucket DESC;
        """)
        
        # Daily aggregations
        con.execute("""
            CREATE OR REPLACE TABLE telemetry_daily AS
            SELECT 
                device_id,
                date_trunc('day', datetime) AS day_bucket,
                COUNT(*) AS record_count,
                AVG(temperature) AS avg_temperature,
                AVG(pressure) AS avg_pressure,
                SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) AS alert_count,
                MAX(datetime) AS last_reading
            FROM telemetry_enhanced
            WHERE datetime IS NOT NULL
            GROUP BY device_id, day_bucket
            ORDER BY day_bucket DESC;
        """)
        
        # Device health summary
        con.execute("""
            CREATE OR REPLACE TABLE device_health_summary AS
            SELECT 
                device_id,
                COUNT(*) AS total_readings,
                MIN(datetime) AS first_reading,
                MAX(datetime) AS last_reading,
                AVG(temperature) AS avg_temperature,
                STDDEV(temperature) AS temp_variability,
                AVG(pressure) AS avg_pressure,
                STDDEV(pressure) AS pressure_variability,
                SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) AS total_alerts,
                AVG(CASE WHEN temperature_is_outlier = 1 THEN 1.0 ELSE 0.0 END) AS outlier_rate,
                CASE 
                    WHEN AVG(CASE WHEN temperature_is_outlier = 1 THEN 1.0 ELSE 0.0 END) > 0.1 THEN 'POOR'
                    WHEN AVG(CASE WHEN temperature_is_outlier = 1 THEN 1.0 ELSE 0.0 END) > 0.05 THEN 'FAIR'
                    ELSE 'GOOD'
                END AS health_status
            FROM telemetry_enhanced
            WHERE datetime IS NOT NULL
            GROUP BY device_id;
        """)
    
    def _export_to_parquet(self, con):
        """Export tables to Parquet format"""
        tables = ['telemetry_enhanced', 'telemetry_hourly', 'telemetry_daily', 'device_health_summary']
        
        for table in tables:
            parquet_path = self.parquet_dir / f'{table}.parquet'
            con.execute(f"COPY {table} TO '{parquet_path.as_posix()}' (FORMAT PARQUET);")
            logger.info(f"Exported {table} to {parquet_path}")
    
    def run_full_pipeline(self):
        """Run the complete ETL pipeline"""
        logger.info("Starting enhanced ETL pipeline...")
        start_time = datetime.now()
        
        try:
            # Extract
            raw_data = self.extract_telemetry_data()
            
            # Transform
            clean_data = self.transform_data(raw_data)
            
            # Load
            self.load_to_warehouse(clean_data)
            
            # Pipeline summary
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            summary = {
                'pipeline_start': start_time.isoformat(),
                'pipeline_end': end_time.isoformat(),
                'duration_seconds': duration,
                'records_processed': len(clean_data),
                'quality_score': self.validator.validate(clean_data)['summary']['data_quality_score'],
                'output_files': [str(f) for f in self.parquet_dir.glob('*.parquet')]
            }
            
            logger.info(f"ETL pipeline completed successfully in {duration:.2f} seconds")
            logger.info(f"Processed {len(clean_data)} records")
            
            return summary
            
        except Exception as e:
            logger.error(f"ETL pipeline failed: {e}", exc_info=True)
            raise


def main():
    """Main ETL execution"""
    pipeline = EnhancedETLPipeline()
    summary = pipeline.run_full_pipeline()
    
    # Save summary
    summary_path = DATA_DIR / 'processed' / 'etl_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("ETL Pipeline Summary:")
    print(f"  Records processed: {summary['records_processed']}")
    print(f"  Duration: {summary['duration_seconds']:.2f} seconds")
    print(f"  Data quality score: {summary['quality_score']:.3f}")


if __name__ == "__main__":
    main()