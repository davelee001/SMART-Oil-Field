"""
Real-time Stream Processing for Oil Field Telemetry
===================================================

This module handles real-time processing of telemetry streams using
Apache Kafka-like patterns for high-throughput data processing.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
import numpy as np
import pandas as pd
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class TelemetryEvent:
    """Structure for telemetry events"""
    device_id: str
    timestamp: float
    temperature: float
    pressure: float
    status: str = 'OK'
    metadata: Optional[Dict] = None


class StreamBuffer:
    """
    Circular buffer for maintaining recent telemetry data
    """
    
    def __init__(self, maxsize: int = 10000):
        self.buffer = deque(maxlen=maxsize)
        self.maxsize = maxsize
    
    def add(self, event: TelemetryEvent):
        """Add event to buffer"""
        self.buffer.append(event)
    
    def get_recent(self, seconds: int = 3600) -> List[TelemetryEvent]:
        """Get events from last N seconds"""
        cutoff_time = datetime.now().timestamp() - seconds
        return [event for event in self.buffer if event.timestamp >= cutoff_time]
    
    def get_by_device(self, device_id: str, limit: int = 100) -> List[TelemetryEvent]:
        """Get recent events for specific device"""
        device_events = [event for event in self.buffer if event.device_id == device_id]
        return device_events[-limit:]
    
    def to_dataframe(self, device_id: Optional[str] = None) -> pd.DataFrame:
        """Convert buffer to DataFrame for analysis"""
        if device_id:
            events = self.get_by_device(device_id)
        else:
            events = list(self.buffer)
        
        if not events:
            return pd.DataFrame()
        
        data = []
        for event in events:
            data.append({
                'device_id': event.device_id,
                'ts': event.timestamp,
                'temperature': event.temperature,
                'pressure': event.pressure,
                'status': event.status
            })
        
        return pd.DataFrame(data)


class StreamProcessor:
    """
    Real-time stream processor with configurable processing pipelines
    """
    
    def __init__(self, buffer_size: int = 10000):
        self.buffer = StreamBuffer(buffer_size)
        self.processors: List[Callable] = []
        self.alerts: List[Dict] = []
        self.running = False
        
        # Processing statistics
        self.stats = {
            'events_processed': 0,
            'alerts_generated': 0,
            'processing_errors': 0,
            'last_processed': None
        }
    
    def add_processor(self, processor: Callable):
        """Add a processing function to the pipeline"""
        self.processors.append(processor)
    
    async def process_event(self, event: TelemetryEvent):
        """Process a single telemetry event"""
        try:
            # Add to buffer
            self.buffer.add(event)
            
            # Run through processing pipeline
            for processor in self.processors:
                result = processor(event, self.buffer)
                
                # Handle alerts
                if isinstance(result, dict) and result.get('alert'):
                    self.alerts.append({
                        'timestamp': datetime.now(),
                        'device_id': event.device_id,
                        'alert_type': result['alert'],
                        'details': result,
                        'event': event
                    })
                    self.stats['alerts_generated'] += 1
            
            # Update statistics
            self.stats['events_processed'] += 1
            self.stats['last_processed'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Error processing event: {e}")
            self.stats['processing_errors'] += 1
    
    def get_recent_alerts(self, minutes: int = 60) -> List[Dict]:
        """Get alerts from the last N minutes"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        return [alert for alert in self.alerts if alert['timestamp'] >= cutoff_time]
    
    def get_device_health(self, device_id: str) -> Dict:
        """Get health status for a specific device"""
        recent_events = self.buffer.get_by_device(device_id, limit=100)
        
        if not recent_events:
            return {'status': 'NO_DATA', 'last_seen': None}
        
        latest_event = recent_events[-1]
        recent_alerts = [
            alert for alert in self.get_recent_alerts(60)
            if alert['device_id'] == device_id
        ]
        
        # Calculate health metrics
        df = self.buffer.to_dataframe(device_id)
        if len(df) > 1:
            temp_stability = df['temperature'].std()
            pressure_stability = df['pressure'].std()
        else:
            temp_stability = 0
            pressure_stability = 0
        
        health_score = self._calculate_health_score(
            temp_stability, pressure_stability, len(recent_alerts)
        )
        
        return {
            'status': 'HEALTHY' if health_score > 0.7 else 'DEGRADED' if health_score > 0.4 else 'CRITICAL',
            'health_score': health_score,
            'last_seen': latest_event.timestamp,
            'recent_alerts': len(recent_alerts),
            'temperature_stability': temp_stability,
            'pressure_stability': pressure_stability
        }
    
    def _calculate_health_score(self, temp_std: float, pressure_std: float, alert_count: int) -> float:
        """Calculate overall health score for a device"""
        # Normalize stability metrics (lower std = better health)
        temp_score = max(0, 1 - temp_std / 10)  # Assuming std > 10 is bad
        pressure_score = max(0, 1 - pressure_std / 50)  # Assuming std > 50 is bad
        
        # Penalize for alerts
        alert_penalty = min(0.5, alert_count * 0.1)
        
        health_score = (temp_score + pressure_score) / 2 - alert_penalty
        return max(0, min(1, health_score))


# Predefined processors
def anomaly_detector_processor(event: TelemetryEvent, buffer: StreamBuffer) -> Optional[Dict]:
    """Real-time anomaly detection processor"""
    # Get recent data for the device
    recent_events = buffer.get_by_device(event.device_id, limit=50)
    
    if len(recent_events) < 10:
        return None  # Need more data for anomaly detection
    
    # Calculate basic statistics
    temperatures = [e.temperature for e in recent_events]
    pressures = [e.pressure for e in recent_events]
    
    temp_mean = np.mean(temperatures)
    temp_std = np.std(temperatures)
    pressure_mean = np.mean(pressures)
    pressure_std = np.std(pressures)
    
    # Check for anomalies (3-sigma rule)
    temp_z_score = abs((event.temperature - temp_mean) / (temp_std + 1e-8))
    pressure_z_score = abs((event.pressure - pressure_mean) / (pressure_std + 1e-8))
    
    if temp_z_score > 3 or pressure_z_score > 3:
        return {
            'alert': 'ANOMALY_DETECTED',
            'temp_z_score': temp_z_score,
            'pressure_z_score': pressure_z_score,
            'severity': 'HIGH' if max(temp_z_score, pressure_z_score) > 4 else 'MEDIUM'
        }
    
    return None


def threshold_monitor_processor(event: TelemetryEvent, buffer: StreamBuffer) -> Optional[Dict]:
    """Monitor for threshold violations"""
    alerts = []
    
    # Temperature thresholds
    if event.temperature > 120:
        alerts.append({
            'alert': 'TEMPERATURE_HIGH',
            'value': event.temperature,
            'threshold': 120,
            'severity': 'CRITICAL'
        })
    elif event.temperature < 40:
        alerts.append({
            'alert': 'TEMPERATURE_LOW',
            'value': event.temperature,
            'threshold': 40,
            'severity': 'HIGH'
        })
    
    # Pressure thresholds
    if event.pressure > 300:
        alerts.append({
            'alert': 'PRESSURE_HIGH',
            'value': event.pressure,
            'threshold': 300,
            'severity': 'CRITICAL'
        })
    elif event.pressure < 100:
        alerts.append({
            'alert': 'PRESSURE_LOW',
            'value': event.pressure,
            'threshold': 100,
            'severity': 'HIGH'
        })
    
    if alerts:
        return alerts[0]  # Return first alert
    
    return None


def trend_analyzer_processor(event: TelemetryEvent, buffer: StreamBuffer) -> Optional[Dict]:
    """Analyze trends in telemetry data"""
    recent_events = buffer.get_by_device(event.device_id, limit=30)
    
    if len(recent_events) < 20:
        return None
    
    # Calculate trends
    temperatures = [e.temperature for e in recent_events]
    pressures = [e.pressure for e in recent_events]
    
    # Simple linear trend calculation
    n = len(temperatures)
    x = np.arange(n)
    
    temp_trend = np.polyfit(x, temperatures, 1)[0]
    pressure_trend = np.polyfit(x, pressures, 1)[0]
    
    # Alert on significant trends
    if abs(temp_trend) > 0.5:  # Temperature changing by 0.5°/reading
        return {
            'alert': 'TEMPERATURE_TREND',
            'trend_value': temp_trend,
            'direction': 'INCREASING' if temp_trend > 0 else 'DECREASING',
            'severity': 'MEDIUM'
        }
    
    if abs(pressure_trend) > 2.0:  # Pressure changing by 2 PSI/reading
        return {
            'alert': 'PRESSURE_TREND',
            'trend_value': pressure_trend,
            'direction': 'INCREASING' if pressure_trend > 0 else 'DECREASING',
            'severity': 'MEDIUM'
        }
    
    return None


class StreamAnalytics:
    """
    Analytics engine for stream processing insights
    """
    
    def __init__(self, processor: StreamProcessor):
        self.processor = processor
    
    def get_system_overview(self) -> Dict:
        """Get overall system health and statistics"""
        all_devices = set()
        device_health = {}
        
        # Get all unique devices from buffer
        for event in self.processor.buffer.buffer:
            all_devices.add(event.device_id)
        
        # Get health for each device
        for device_id in all_devices:
            device_health[device_id] = self.processor.get_device_health(device_id)
        
        # Calculate system-wide metrics
        healthy_devices = sum(1 for health in device_health.values() if health['status'] == 'HEALTHY')
        total_devices = len(all_devices)
        system_health = healthy_devices / total_devices if total_devices > 0 else 0
        
        recent_alerts = self.processor.get_recent_alerts(60)
        critical_alerts = sum(1 for alert in recent_alerts if alert.get('details', {}).get('severity') == 'CRITICAL')
        
        return {
            'total_devices': total_devices,
            'healthy_devices': healthy_devices,
            'system_health_score': system_health,
            'recent_alerts': len(recent_alerts),
            'critical_alerts': critical_alerts,
            'processing_stats': self.processor.stats,
            'device_health': device_health
        }
    
    def get_device_analytics(self, device_id: str) -> Dict:
        """Get detailed analytics for a specific device"""
        df = self.processor.buffer.to_dataframe(device_id)
        
        if df.empty:
            return {'error': 'No data available for device'}
        
        # Calculate statistics
        analytics = {
            'device_id': device_id,
            'data_points': len(df),
            'time_range': {
                'start': df['ts'].min(),
                'end': df['ts'].max(),
                'duration_hours': (df['ts'].max() - df['ts'].min()) / 3600
            },
            'temperature': {
                'mean': df['temperature'].mean(),
                'std': df['temperature'].std(),
                'min': df['temperature'].min(),
                'max': df['temperature'].max(),
                'trend': self._calculate_trend(df['temperature'])
            },
            'pressure': {
                'mean': df['pressure'].mean(),
                'std': df['pressure'].std(),
                'min': df['pressure'].min(),
                'max': df['pressure'].max(),
                'trend': self._calculate_trend(df['pressure'])
            }
        }
        
        # Add recent alerts for this device
        device_alerts = [
            alert for alert in self.processor.get_recent_alerts(1440)  # Last 24 hours
            if alert['device_id'] == device_id
        ]
        analytics['recent_alerts'] = len(device_alerts)
        analytics['alert_types'] = list(set(alert.get('alert_type', 'UNKNOWN') for alert in device_alerts))
        
        return analytics
    
    def _calculate_trend(self, series: pd.Series) -> float:
        """Calculate linear trend for a time series"""
        if len(series) < 2:
            return 0.0
        
        x = np.arange(len(series))
        trend = np.polyfit(x, series, 1)[0]
        return float(trend)