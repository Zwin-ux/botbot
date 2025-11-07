import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, ShowChart, BarChart as BarChartIcon } from '@mui/icons-material';
import { PerformanceData } from '../types';

interface PerformanceMetricsProps {
  performanceData: PerformanceData[];
  isConnected: boolean;
}

type MetricType = 'reward' | 'safety' | 'efficiency' | 'violations' | 'confidence';
type ChartType = 'line' | 'area' | 'bar';
type TimeRange = 'last50' | 'last100' | 'last200' | 'all';

interface MetricStats {
  current: number;
  average: number;
  best: number;
  worst: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  performanceData,
  isConnected
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('reward');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeRange, setTimeRange] = useState<TimeRange>('last100');
  const [comparisonMode, setComparisonMode] = useState(false);

  const filteredData = useMemo(() => {
    let data = performanceData;
    
    switch (timeRange) {
      case 'last50':
        data = data.slice(-50);
        break;
      case 'last100':
        data = data.slice(-100);
        break;
      case 'last200':
        data = data.slice(-200);
        break;
      default:
        break;
    }

    return data.map((d, index) => ({
      index,
      episode: d.episode,
      step: d.step,
      reward: d.reward,
      cumulativeReward: d.cumulativeReward,
      safetyScore: d.safetyScore,
      efficiencyScore: d.efficiencyScore,
      violationCount: d.violationCount,
      averageConfidence: d.averageConfidence * 100, // Convert to percentage
      timestamp: d.timestamp
    }));
  }, [performanceData, timeRange]);

  const calculateStats = (metricKey: string): MetricStats => {
    if (filteredData.length === 0) {
      return {
        current: 0,
        average: 0,
        best: 0,
        worst: 0,
        trend: 'stable',
        changePercent: 0
      };
    }

    const values = filteredData.map(d => d[metricKey as keyof typeof d] as number);
    const current = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const best = Math.max(...values);
    const worst = Math.min(...values);

    // Calculate trend from recent data
    const recentCount = Math.min(20, values.length);
    const recentValues = values.slice(-recentCount);
    const firstHalf = recentValues.slice(0, Math.floor(recentCount / 2));
    const secondHalf = recentValues.slice(Math.floor(recentCount / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      current,
      average,
      best,
      worst,
      trend,
      changePercent
    };
  };

  const metrics = {
    reward: {
      label: 'Reward',
      key: 'reward',
      color: '#3498db',
      stats: calculateStats('reward')
    },
    safety: {
      label: 'Safety Score',
      key: 'safetyScore',
      color: '#27ae60',
      stats: calculateStats('safetyScore')
    },
    efficiency: {
      label: 'Efficiency Score',
      key: 'efficiencyScore',
      color: '#9b59b6',
      stats: calculateStats('efficiencyScore')
    },
    violations: {
      label: 'Violations',
      key: 'violationCount',
      color: '#e74c3c',
      stats: calculateStats('violationCount')
    },
    confidence: {
      label: 'Confidence',
      key: 'averageConfidence',
      color: '#f39c12',
      stats: calculateStats('averageConfidence')
    }
  };

  const currentMetric = metrics[selectedMetric];

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const xAxisProps = {
      dataKey: 'episode',
      stroke: '#888',
      tick: { fill: '#888' }
    };

    const yAxisProps = {
      stroke: '#888',
      tick: { fill: '#888' }
    };

    const tooltipProps = {
      contentStyle: {
        backgroundColor: '#2d2d2d',
        border: '1px solid #444',
        borderRadius: '8px'
      },
      labelStyle: { color: '#fff' }
    };

    if (comparisonMode) {
      // Show multiple metrics
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            <Legend />
            <Line
              type="monotone"
              dataKey="reward"
              stroke={metrics.reward.color}
              strokeWidth={2}
              dot={false}
              name="Reward"
            />
            <Line
              type="monotone"
              dataKey="safetyScore"
              stroke={metrics.safety.color}
              strokeWidth={2}
              dot={false}
              name="Safety"
            />
            <Line
              type="monotone"
              dataKey="efficiencyScore"
              stroke={metrics.efficiency.color}
              strokeWidth={2}
              dot={false}
              name="Efficiency"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Area
                type="monotone"
                dataKey={currentMetric.key}
                stroke={currentMetric.color}
                fillOpacity={1}
                fill="url(#colorMetric)"
                strokeWidth={2}
              />
              <ReferenceLine
                y={currentMetric.stats.average}
                stroke="#888"
                strokeDasharray="5 5"
                label={{ value: 'Avg', fill: '#888', position: 'right' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey={currentMetric.key} fill={currentMetric.color} />
              <ReferenceLine
                y={currentMetric.stats.average}
                stroke="#888"
                strokeDasharray="5 5"
                label={{ value: 'Avg', fill: '#888', position: 'right' }}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Line
                type="monotone"
                dataKey={currentMetric.key}
                stroke={currentMetric.color}
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                y={currentMetric.stats.average}
                stroke="#888"
                strokeDasharray="5 5"
                label={{ value: 'Avg', fill: '#888', position: 'right' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <ShowChart color="disabled" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📊 Performance Metrics
          {filteredData.length > 0 && (
            <Chip
              label={`${filteredData.length} data points`}
              size="small"
              color="primary"
            />
          )}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <MenuItem value="last50">Last 50</MenuItem>
              <MenuItem value="last100">Last 100</MenuItem>
              <MenuItem value="last200">Last 200</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, value) => value && setChartType(value)}
            size="small"
          >
            <ToggleButton value="line">
              <ShowChart fontSize="small" />
            </ToggleButton>
            <ToggleButton value="area">
              <ShowChart fontSize="small" />
            </ToggleButton>
            <ToggleButton value="bar">
              <BarChartIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Metric Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics).map(([key, metric]) => (
          <Grid item xs={12} sm={6} md={2.4} key={key}>
            <Card
              elevation={selectedMetric === key ? 4 : 2}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: selectedMetric === key ? `2px solid ${metric.color}` : 'none',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                setSelectedMetric(key as MetricType);
                setComparisonMode(false);
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 1 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: metric.color }}>
                    {metric.stats.current.toFixed(2)}
                  </Typography>
                  {getTrendIcon(metric.stats.trend)}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Avg: {metric.stats.average.toFixed(2)}
                </Typography>
                <br />
                <Typography
                  variant="caption"
                  sx={{
                    color: metric.stats.trend === 'up' ? 'success.main' : 
                           metric.stats.trend === 'down' ? 'error.main' : 'text.secondary'
                  }}
                >
                  {metric.stats.changePercent > 0 ? '+' : ''}
                  {metric.stats.changePercent.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Chart */}
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {comparisonMode ? 'Comparison View' : currentMetric.label}
            </Typography>
            <Chip
              label={comparisonMode ? 'Comparison' : 'Single Metric'}
              size="small"
              onClick={() => setComparisonMode(!comparisonMode)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          {filteredData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ShowChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {isConnected ? 'Waiting for performance data...' : 'Not connected to training system'}
              </Typography>
            </Box>
          ) : (
            renderChart()
          )}

          {/* Stats Summary */}
          {!comparisonMode && filteredData.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Current
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {currentMetric.stats.current.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Average
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {currentMetric.stats.average.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Best
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {currentMetric.stats.best.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Worst
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {currentMetric.stats.worst.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceMetrics;