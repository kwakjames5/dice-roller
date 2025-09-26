import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart } from 'recharts';
import { Copy, Dice6, Play, Zap } from 'lucide-react';

export default function DiceRoller() {
  const [numDice, setNumDice] = useState(2);
  const [numRolls, setNumRolls] = useState(12);
  const [results, setResults] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [animateMode, setAnimateMode] = useState(false);
  const [currentRollIndex, setCurrentRollIndex] = useState(0);
  const [allGeneratedRolls, setAllGeneratedRolls] = useState([]);
  const [speed, setSpeed] = useState(2); // rolls per second
  const [currentDiceValues, setCurrentDiceValues] = useState([]);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const intervalRef = useRef(null);

  // Dice face component
  const DiceFace = ({ value, isRolling }) => {
    const getDots = (num) => {
      const dotPositions = {
        1: ['center'],
        2: ['top-left', 'bottom-right'],
        3: ['top-left', 'center', 'bottom-right'],
        4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
        6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
      };
      return dotPositions[num] || [];
    };

    const dotPositionClasses = {
      'top-left': 'top-1 left-1',
      'top-right': 'top-1 right-1',
      'middle-left': 'top-1/2 left-1 -translate-y-1/2',
      'middle-right': 'top-1/2 right-1 -translate-y-1/2',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      'bottom-left': 'bottom-1 left-1',
      'bottom-right': 'bottom-1 right-1'
    };

    return (
      <div className={`
        relative w-16 h-16 bg-white border-2 border-gray-300 rounded-lg shadow-lg
        flex items-center justify-center transition-all duration-300
        ${isRolling ? 'animate-spin' : ''}
      `}>
        {getDots(value).map((position, index) => (
          <div
            key={index}
            className={`absolute w-2 h-2 bg-gray-800 rounded-full ${dotPositionClasses[position]}`}
          />
        ))}
      </div>
    );
  };

  const generateAllRolls = () => {
    const allRolls = [];
    
    for (let i = 0; i < numRolls; i++) {
      const rollResult = [];
      let sum = 0;
      
      for (let j = 0; j < numDice; j++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rollResult.push(roll);
        sum += roll;
      }
      
      allRolls.push({ roll: i + 1, dice: rollResult, sum });
    }
    
    return allRolls;
  };

  const calculateStatsAndChart = (rolls) => {
    const sumFrequency = {};
    const diceFrequency = {};
    const runningAverages = [];
    
    // Initialize dice frequency tracking
    for (let i = 1; i <= 6; i++) {
      diceFrequency[i] = 0;
    }
    
    rolls.forEach((r, index) => {
      // Sum frequency
      sumFrequency[r.sum] = (sumFrequency[r.sum] || 0) + 1;
      
      // Individual dice frequency
      r.dice.forEach(die => {
        diceFrequency[die]++;
      });
      
      // Running average
      const currentRolls = rolls.slice(0, index + 1);
      const currentSums = currentRolls.map(roll => roll.sum);
      const runningAvg = currentSums.reduce((a, b) => a + b, 0) / currentSums.length;
      runningAverages.push({
        rollNumber: index + 1,
        runningAverage: runningAvg,
        expectedAverage: (numDice * 3.5) // Expected value for n dice
      });
    });

    const sums = rolls.map(r => r.sum);
    const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
    const mode = Object.keys(sumFrequency).reduce((a, b) => sumFrequency[a] > sumFrequency[b] ? a : b);
    
    // Sum frequency chart
    const chartData = Object.keys(sumFrequency)
      .sort((a, b) => Number(a) - Number(b))
      .map(sum => {
        const actualFreq = sumFrequency[sum];
        const actualProb = actualFreq / rolls.length;
        
        // Calculate expected probability for this sum
        let expectedProb = 0;
        if (numDice === 1) {
          expectedProb = 1/6;
        } else if (numDice === 2) {
          const ways = {2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1};
          expectedProb = (ways[sum] || 0) / 36;
        }
        // For more dice, expected probability calculation gets complex, so we'll skip for now
        
        return {
          sum: Number(sum),
          frequency: actualFreq,
          actualProbability: actualProb,
          expectedProbability: numDice <= 2 ? expectedProb : null
        };
      });

    // Individual dice frequency chart
    const diceChartData = Object.keys(diceFrequency)
      .sort((a, b) => Number(a) - Number(b))
      .map(face => ({
        face: Number(face),
        frequency: diceFrequency[face],
        actualProbability: diceFrequency[face] / (rolls.length * numDice),
        expectedProbability: 1/6
      }));

    return {
      rolls,
      stats: {
        mean: mean.toFixed(2),
        mode: Number(mode),
        min: Math.min(...sums),
        max: Math.max(...sums),
        total: rolls.length,
        expectedMean: (numDice * 3.5).toFixed(2)
      },
      chartData,
      diceChartData,
      runningAverages
    };
  };

  const rollDice = () => {
    setIsRolling(true);
    setResults(null);
    setCurrentRollIndex(0);
    setCurrentDiceValues([]);
    
    // Generate all rolls upfront
    const allRolls = generateAllRolls();
    setAllGeneratedRolls(allRolls);
    
    if (animateMode) {
      // Start streaming animation
      let index = 0;
      intervalRef.current = setInterval(() => {
        index++;
        setCurrentRollIndex(index);
        
        // Animate dice rolling if we have 20 or fewer dice
        if (numDice <= 20) {
          setIsRollingDice(true);
          setCurrentDiceValues(allRolls[index - 1].dice);
          
          // Stop dice spinning after a brief moment
          setTimeout(() => {
            setIsRollingDice(false);
          }, 300);
        }
        
        // Update results with current subset of rolls
        const currentRolls = allRolls.slice(0, index);
        setResults(calculateStatsAndChart(currentRolls));
        
        if (index >= allRolls.length) {
          clearInterval(intervalRef.current);
          setIsRolling(false);
        }
      }, 1000 / speed);
    } else {
      // Instant mode
      setResults(calculateStatsAndChart(allRolls));
      setCurrentRollIndex(allRolls.length);
      setIsRolling(false);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Stop animation if user switches to instant mode during rolling
  useEffect(() => {
    if (!animateMode && isRolling && intervalRef.current) {
      clearInterval(intervalRef.current);
      setResults(calculateStatsAndChart(allGeneratedRolls));
      setCurrentRollIndex(allGeneratedRolls.length);
      setIsRolling(false);
    }
  }, [animateMode, isRolling, allGeneratedRolls]);

  const copyData = () => {
    if (!results) return;
    
    const headers = ['Roll #', ...Array.from({length: numDice}, (_, i) => `Die ${i+1}`), 'Sum'];
    const dataRows = results.rolls.map(r => 
      [r.roll, ...r.dice, r.sum].join('\t')
    );
    const copyText = [headers.join('\t'), ...dataRows].join('\n');
    
    navigator.clipboard.writeText(copyText);
  };

  const copyStats = () => {
    if (!results) return;
    
    const statsText = `Statistics:
Mean: ${results.stats.mean}
Mode: ${results.stats.mode}
Min: ${results.stats.min}
Max: ${results.stats.max}
Total Rolls: ${results.stats.total}`;
    
    navigator.clipboard.writeText(statsText);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white text-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Dice6 className="text-blue-600" />
          Dice Roller
        </h1>
        <p className="text-gray-700">Roll multiple dice, see the results, and analyze the data</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        {/* Animation Toggle */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAnimateMode(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                !animateMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Zap size={16} />
              Instant Results
            </button>
            <button
              onClick={() => setAnimateMode(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                animateMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Play size={16} />
              Animate & Watch
            </button>
          </div>
        </div>

        {/* Speed Control (only show in animate mode) */}
        {animateMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Animation Speed: {speed} rolls/second
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Number of Dice
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numDice}
              onChange={(e) => setNumDice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRolling}
            />
            {numDice > 20 && (
              <p className="text-sm text-orange-600 mt-1">
                Max 20 dice for visual animation
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Number of Rolls
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={numRolls}
              onChange={(e) => setNumRolls(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRolling}
            />
          </div>
          
          <button
            onClick={rollDice}
            disabled={isRolling}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {isRolling ? (animateMode ? `Rolling... (${currentRollIndex}/${numRolls})` : 'Rolling...') : 'Roll Dice'}
          </button>
        </div>
      </div>

      {/* Dice Animation Area (only show in animate mode with ≤20 dice) */}
      {animateMode && numDice <= 20 && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg mb-6 border-2 border-dashed border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {isRolling ? `Rolling... (${currentRollIndex}/${numRolls})` : 'Dice will appear here during animation'}
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {currentDiceValues.length > 0 ? (
              currentDiceValues.map((value, index) => (
                <DiceFace key={index} value={value} isRolling={isRollingDice} />
              ))
            ) : (
              // Placeholder dice
              Array.from({length: numDice}, (_, index) => (
                <DiceFace key={index} value={1} isRolling={false} />
              ))
            )}
          </div>
          {currentDiceValues.length > 0 && (
            <div className="text-center mt-4">
              <span className="text-lg font-semibold text-gray-900">
                Sum: {currentDiceValues.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Warning for too many dice */}
      {animateMode && numDice > 20 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-yellow-900">
            <strong>Note:</strong> Visual dice animation is limited to 20 dice for performance. 
            Your results will still show all {numDice} dice, but the animation is disabled.
          </p>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
              <button
                onClick={copyStats}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Copy size={16} />
                Copy Stats
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{results.stats.mean}</div>
                <div className="text-sm text-gray-600">Actual Mean</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-500">{results.stats.expectedMean}</div>
                <div className="text-sm text-gray-600">Expected Mean</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{results.stats.mode}</div>
                <div className="text-sm text-gray-600">Mode</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{results.stats.min}</div>
                <div className="text-sm text-gray-600">Min</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{results.stats.max}</div>
                <div className="text-sm text-gray-600">Max</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{results.stats.total}</div>
                <div className="text-sm text-gray-600">Total Rolls</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Sum Frequency</h2>
              <div className="flex items-center gap-4">
                {animateMode && isRolling && (
                  <div className="text-sm text-gray-600">
                    Updating live... ({currentRollIndex}/{numRolls} rolls)
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!results) return;
                    const chartText = `Sum Frequency Data:
${results.chartData.map(d => `Sum ${d.sum}: ${d.frequency} times`).join('\n')}`;
                    navigator.clipboard.writeText(chartText);
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Copy size={14} />
                  Copy Chart Data
                </button>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.chartData} key={results.chartData.length}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sum" />
                  <YAxis 
                    yAxisId="frequency" 
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
                  />
                  <YAxis 
                    yAxisId="probability" 
                    orientation="right" 
                    domain={[0, 1]} 
                    label={{ value: 'Probability (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} 
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'frequency') return [value + ' times', 'Count'];
                      if (name === 'actualProbability') return [(value * 100).toFixed(1) + '%', 'Actual %'];
                      if (name === 'expectedProbability') return [(value * 100).toFixed(1) + '%', 'Expected %'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Sum: ${label}`}
                  />
                  <Legend />
                  <Bar yAxisId="frequency" dataKey="frequency" fill="#2563eb" name="Frequency" />
                  <Line 
                    yAxisId="probability" 
                    type="monotone" 
                    dataKey="actualProbability" 
                    stroke="#059669" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Actual %"
                  />
                  {numDice <= 2 && (
                    <Line 
                      yAxisId="probability" 
                      type="monotone" 
                      dataKey="expectedProbability" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Expected %"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Running Average Convergence Chart */}
          {results.runningAverages.length > 5 && (
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Average Convergence</h2>
                  <p className="text-sm text-gray-600">Watch how your average approaches the expected value</p>
                </div>
                <button
                  onClick={() => {
                    if (!results) return;
                    const convergenceText = `Running Average Data:
${results.runningAverages.map(d => `Roll ${d.rollNumber}: ${d.runningAverage.toFixed(3)}`).join('\n')}`;
                    navigator.clipboard.writeText(convergenceText);
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Copy size={14} />
                  Copy Convergence Data
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.runningAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rollNumber" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'runningAverage') return [value.toFixed(3), 'Running Average'];
                        if (name === 'expectedAverage') return [value.toFixed(1), 'Expected Average'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="runningAverage" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={false}
                      name="Running Average"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expectedAverage" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Expected Average"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Individual Dice Frequency Chart */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Individual Die Face Frequency</h2>
                <p className="text-sm text-gray-600">Each face should appear about 16.7% of the time</p>
              </div>
              <button
                onClick={() => {
                  if (!results) return;
                  const diceText = `Individual Die Frequency:
${results.diceChartData.map(d => `Face ${d.face}: ${d.frequency} times (${(d.actualProbability * 100).toFixed(1)}%)`).join('\n')}`;
                  navigator.clipboard.writeText(diceText);
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Copy size={14} />
                Copy Die Data
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.diceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="face" />
                  <YAxis 
                    yAxisId="frequency" 
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
                  />
                  <YAxis 
                    yAxisId="probability" 
                    orientation="right" 
                    domain={[0, 0.4]} 
                    label={{ value: 'Probability (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} 
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'frequency') return [value + ' times', 'Count'];
                      if (name === 'actualProbability') return [(value * 100).toFixed(1) + '%', 'Actual %'];
                      if (name === 'expectedProbability') return ['16.7%', 'Expected %'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Die Face: ${label}`}
                  />
                  <Legend />
                  <Bar yAxisId="frequency" dataKey="frequency" fill="#059669" name="Frequency" />
                  <Line 
                    yAxisId="probability" 
                    type="monotone" 
                    dataKey="actualProbability" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Actual %"
                  />
                  <Line 
                    yAxisId="probability" 
                    type="monotone" 
                    dataKey="expectedProbability" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Expected 16.7%"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Roll Results</h2>
              <div className="flex items-center gap-4">
                {animateMode && isRolling && (
                  <div className="text-sm text-gray-600">
                    Showing {currentRollIndex} of {numRolls} rolls
                  </div>
                )}
                <button
                  onClick={copyData}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Copy size={16} />
                  Copy Data
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Roll #</th>
                    {Array.from({length: numDice}, (_, i) => (
                      <th key={i} className="px-4 py-2 text-left">Die {i + 1}</th>
                    ))}
                    <th className="px-4 py-2 text-left font-semibold">Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rolls.map((result, index) => (
                    <tr 
                      key={index} 
                      className={`border-b hover:bg-gray-50 ${
                        animateMode && index === currentRollIndex - 1 ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2">{result.roll}</td>
                      {result.dice.map((die, dieIndex) => (
                        <td key={dieIndex} className="px-4 py-2 font-mono">{die}</td>
                      ))}
                      <td className="px-4 py-2 font-semibold">{result.sum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}