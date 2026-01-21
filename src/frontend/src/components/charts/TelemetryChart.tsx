import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface TelemetryData {
    timestamp: string;
    temperature: number;
    pressure: number;
    flow_rate: number;
}

const TelemetryChart: React.FC = () => {
    const theme = useTheme();
    const chartRef = useRef<ChartJS<'line'>>(null);

    // Mock real-time data - replace with actual WebSocket connection
    const [data, setData] = React.useState<TelemetryData[]>([
        { timestamp: '10:00', temperature: 75.5, pressure: 200.0, flow_rate: 150.2 },
        { timestamp: '10:05', temperature: 76.1, pressure: 198.5, flow_rate: 152.1 },
        { timestamp: '10:10', temperature: 75.8, pressure: 201.2, flow_rate: 149.8 },
        { timestamp: '10:15', temperature: 77.2, pressure: 203.1, flow_rate: 155.5 },
        { timestamp: '10:20', temperature: 76.9, pressure: 199.8, flow_rate: 151.3 },
        { timestamp: '10:25', temperature: 75.3, pressure: 197.5, flow_rate: 148.9 },
    ]);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            });

            const newPoint: TelemetryData = {
                timestamp: timeString,
                temperature: 75 + Math.random() * 5,
                pressure: 195 + Math.random() * 15,
                flow_rate: 145 + Math.random() * 15,
            };

            setData((prevData) => {
                const newData = [...prevData, newPoint];
                return newData.length > 20 ? newData.slice(1) : newData;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const chartData = {
        labels: data.map((item) => item.timestamp),
        datasets: [
            {
                label: 'Temperature (°F)',
                data: data.map((item) => item.temperature),
                borderColor: theme.palette.error.main,
                backgroundColor: `${theme.palette.error.main}20`,
                fill: false,
                tension: 0.4,
            },
            {
                label: 'Pressure (PSI)',
                data: data.map((item) => item.pressure),
                borderColor: theme.palette.primary.main,
                backgroundColor: `${theme.palette.primary.main}20`,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1',
            },
            {
                label: 'Flow Rate (bbl/day)',
                data: data.map((item) => item.flow_rate),
                borderColor: theme.palette.success.main,
                backgroundColor: `${theme.palette.success.main}20`,
                fill: false,
                tension: 0.4,
                yAxisID: 'y2',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: 'Temperature (°F)',
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: {
                    display: true,
                    text: 'Pressure (PSI)',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
            y2: {
                type: 'linear' as const,
                display: false,
                position: 'right' as const,
            },
        },
        elements: {
            point: {
                radius: 3,
                hoverRadius: 6,
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    };

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <Line ref={chartRef} data={chartData} options={options} />
        </Box>
    );
};

export default TelemetryChart;