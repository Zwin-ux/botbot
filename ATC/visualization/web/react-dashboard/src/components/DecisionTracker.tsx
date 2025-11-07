import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore,
  Psychology,
  TrendingUp,
  Warning,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DecisionData } from '../types';

interface DecisionTrackerProps {
  decisions: DecisionData[];
  isConnected: boolean;
}

interface DecisionSummary {
  totalDecisions: number;
  averageConfidence: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

const DecisionTracker: React.FC<DecisionTrackerProps> = ({
  decisions,
  isConnected
}) => {
  const [selectedAircraft, setSelectedAircraft] = useState<string>('all');
  const [expandedDecision, setExpandedDecision] = useState<string | false>(false);
  const [summary, setSummary] = useState<DecisionSummary>({
    totalDecisions: 0,
    averageConfidence: 0,
    highConfidenceCount: 0,
    lowConfidenceCount: 0,
    recentTrend: 'stable'
  });

  const filteredDecisions = selectedAircraft === 'all' 
    ? decisions 
    : decisions.filter(d => d.aircraftId === selectedAircraft);

  const recentDecisions = filteredDecisions.slice(-20).reverse(); // Show last 20 decisions

  useEffect(() => {
    calculateSummary();
  }, [decisions]);

  const calculateSummary = () => {
    if (decisions.length === 0) {
      setSummary({
        totalDecisions: 0,
        averageConfidence: 0,
        highConfidenceCount: 0,
        lowConfidenceCount: 0,
        recentTrend: 'stable'
      });
      return;
    }

    const totalDecisions = decisions.length;
    const confidenceValues = decisions.map(d => 
      Object.values(d.confidenceScores).reduce((sum, val) => sum + val, 0) / 
      Object.keys(d.confidenceScores).length
    );
    
    const averageConfidence = confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
    const highConfidenceCount = confidenceValues.filter(c => c > 0.8).length;
    const lowConfidenceCount = confidenceValues.filter(c => c < 0.5).length;

    // Calculate trend from recent decisions
    const recentCount = Math.min(20, decisions.length);
    const recentConfidence = confidenceValues.slice(-recentCount);
    const firstHalf = recentConfidence.slice(0, Math.floor(recentCount / 2));
    const secondHalf = recentConfidence.slice(Math.floor(recentCount / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondAvg > firstAvg + 0.05) recentTrend = 'improving';
    else if (secondAvg < firstAvg - 0.05) recentTrend = 'declining';

    setSummary({
      totalDecisions,
      averageConfidence,
      highConfidenceCount,
      lowConfidenceCount,
      recentTrend
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle color="success" />;
    if (confidence >= 0.6) return <Warning color="warning" />;
    return <Warning color="error" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp color="success" />;
      case 'declining': return <TrendingUp color="error" sx={{ transform: 'rotate(180deg)' }} />;
      default: return <TrendingUp color="disabled" sx={{ transform: 'rotate(90deg)' }} />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getAverageConfidence = (decision: DecisionData) => {
    const values = Object.values(decision.confidenceScores);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const uniqueAircraft = Array.from(new Set(decisions.map(d => d.aircraftId)));

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🧠 Decision Tracker
        <Chip
          label={`${summary.totalDecisions} decisions`}
          size="small"
          color="primary"
        />
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ mb: 2 }}>
        <Card elevation={2} sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Average Confidence
                </Typography>
                <Typography variant="h6" color="primary">
                  {(summary.averageConfidence * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getTrendIcon(summary.recentTrend)}
                <Typography variant="caption" color="text.secondary">
                  {summary.recentTrend}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Card elevation={1} sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                High Confidence
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="bold">
                {summary.highConfidenceCount}
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={1} sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Low Confidence
              </Typography>
              <Typography variant="body2" color="error.main" fontWeight="bold">
                {summary.lowConfidenceCount}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Aircraft Filter */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Filter by Aircraft</InputLabel>
        <Select
          value={selectedAircraft}
          label="Filter by Aircraft"
          onChange={(e) => setSelectedAircraft(e.target.value)}
        >
          <MenuItem value="all">All Aircraft</MenuItem>
          {uniqueAircraft.map(aircraftId => (
            <MenuItem key={aircraftId} value={aircraftId}>
              {aircraftId}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Decision List */}
      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        <AnimatePresence>
          {recentDecisions.length === 0 ? (
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Psychology sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {isConnected ? 'Waiting for decision data...' : 'Not connected to training system'}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            recentDecisions.map((decision, index) => {
              const avgConfidence = getAverageConfidence(decision);
              const decisionId = `${decision.aircraftId}-${decision.timestamp}`;
              
              return (
                <motion.div
                  key={decisionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Accordion
                    expanded={expandedDecision === decisionId}
                    onChange={(_, isExpanded) => setExpandedDecision(isExpanded ? decisionId : false)}
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getConfidenceIcon(avgConfidence)}
                          <Typography variant="body2" fontWeight="bold">
                            {decision.aircraftId}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(decision.timestamp)}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${(avgConfidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(avgConfidence) as any}
                        />
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Box sx={{ space: 2 }}>
                        {/* Action Details */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Action Taken
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {decision.action.map((value, idx) => (
                              <Chip
                                key={idx}
                                label={`${idx}: ${value.toFixed(3)}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>

                        {/* Confidence Breakdown */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Confidence Scores
                          </Typography>
                          {Object.entries(decision.confidenceScores).map(([key, value]) => (
                            <Box key={key} sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">{key}</Typography>
                                <Typography variant="caption">{(value * 100).toFixed(1)}%</Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={value * 100}
                                color={getConfidenceColor(value) as any}
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                          ))}
                        </Box>

                        {/* Value Estimate */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Value Estimate
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {decision.valueEstimate.toFixed(3)}
                          </Typography>
                        </Box>

                        {/* Explanation */}
                        {decision.explanation && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              AI Reasoning
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {decision.explanation}
                            </Typography>
                          </Box>
                        )}

                        {/* Predicted Outcomes */}
                        {Object.keys(decision.predictedOutcomes).length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Predicted Outcomes
                            </Typography>
                            {Object.entries(decision.predictedOutcomes).map(([outcome, probability]) => (
                              <Box key={outcome} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">{outcome}</Typography>
                                <Typography variant="caption" color="primary">
                                  {(probability * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default DecisionTracker;