import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OilWell {
    id: string;
    name: string;
    position: LatLngExpression;
    status: 'active' | 'warning' | 'error' | 'inactive';
    production: number;
    temperature: number;
    pressure: number;
}

const OilFieldMap: React.FC = () => {
    const theme = useTheme();

    // Mock data for oil wells - replace with actual API data
    const wells: OilWell[] = [
        {
            id: 'well-001',
            name: 'Well Alpha-1',
            position: [29.7604, -95.3698], // Houston area
            status: 'active',
            production: 150.2,
            temperature: 75.5,
            pressure: 200.0,
        },
        {
            id: 'well-002',
            name: 'Well Beta-2',
            position: [29.7804, -95.3898],
            status: 'active',
            production: 142.8,
            temperature: 76.1,
            pressure: 198.5,
        },
        {
            id: 'well-003',
            name: 'Well Gamma-3',
            position: [29.7404, -95.3498],
            status: 'warning',
            production: 95.3,
            temperature: 82.1,
            pressure: 185.2,
        },
        {
            id: 'well-004',
            name: 'Well Delta-4',
            position: [29.7704, -95.3798],
            status: 'error',
            production: 0,
            temperature: 0,
            pressure: 0,
        },
    ];

    const getMarkerColor = (status: string) => {
        switch (status) {
            case 'active':
                return '#4caf50';
            case 'warning':
                return '#ff9800';
            case 'error':
                return '#f44336';
            case 'inactive':
                return '#9e9e9e';
            default:
                return '#2196f3';
        }
    };

    const getStatusChip = (status: string) => {
        const color = status as 'success' | 'warning' | 'error' | 'default';
        return (
            <Chip
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                color={status === 'active' ? 'success' : color}
                size="small"
            />
        );
    };

    // Create custom marker icon based on status
    const createCustomIcon = (status: string) => {
        const color = getMarkerColor(status);
        const svgIcon = `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.9 12.5 28.5 12.5 28.5s12.5-21.6 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `;
        return new Icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });
    };

    return (
        <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
            <MapContainer
                center={[29.7604, -95.3698]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {wells.map((well) => (
                    <Marker
                        key={well.id}
                        position={well.position}
                        icon={createCustomIcon(well.status)}
                    >
                        <Popup>
                            <Box sx={{ minWidth: 200 }}>
                                <Typography variant="h6" gutterBottom>
                                    {well.name}
                                </Typography>

                                <Box sx={{ mb: 2 }}>
                                    {getStatusChip(well.status)}
                                </Box>

                                <Typography variant="body2" gutterBottom>
                                    <strong>Production:</strong> {well.production} bbl/day
                                </Typography>

                                <Typography variant="body2" gutterBottom>
                                    <strong>Temperature:</strong> {well.temperature}°F
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Pressure:</strong> {well.pressure} PSI
                                </Typography>
                            </Box>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Box>
    );
};

export default OilFieldMap;