import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import { OIL_WELLS } from '../../data/oilFields';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const OilFieldMap: React.FC = () => {
    const theme = useTheme();

    const wells = OIL_WELLS;

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
        <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <MapContainer
                center={[8.448, 30.338]}
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
                                    <strong>Field:</strong> {well.field}
                                </Typography>

                                <Typography variant="body2" gutterBottom>
                                    <strong>Pump:</strong> {well.pumpType}
                                </Typography>

                                <Typography variant="body2" gutterBottom>
                                    <strong>Route:</strong> {well.manifold} to {well.cpf}
                                </Typography>

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
            {wells.length === 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1000,
                        display: 'grid',
                        placeItems: 'center',
                        pointerEvents: 'none',
                        backgroundColor: 'rgba(255, 255, 255, 0.72)',
                    }}
                >
                    <Typography fontWeight={650}>No wells available</Typography>
                </Box>
            )}
        </Box>
    );
};

export default OilFieldMap;
