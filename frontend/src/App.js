import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import './PlayerComparison.css';

export default function PlayerComparison() {
  const [playerList, setPlayerList] = useState([]);
  const [player1Input, setPlayer1Input] = useState('');
  const [player2Input, setPlayer2Input] = useState('');
  const [selectedPlayer1, setSelectedPlayer1] = useState('');
  const [selectedPlayer2, setSelectedPlayer2] = useState('');
  const [season1Input, setSeason1Input] = useState('');
  const [selectedSeason1, setSelectedSeason1] = useState('');
  const [season2Input, setSeason2Input] = useState('');
  const [selectedSeason2, setSelectedSeason2] = useState('');
  const [displaySeason1, setDisplaySeason1] = useState('');
  const [displaySeason2, setDisplaySeason2] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [careerStats, setCareerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dropdownRef = useRef(null);

  // Key stats to display and compare
  const statKeys = ['GP', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK',
                    'FG_PCT', 'FGA', 'FGM', 'FG3_PCT', 'FG3A', 'FG3M', 'FT_PCT', 'FTA', 'FTM'];

  const displayStatNames = {
    GP: 'Games', MIN: 'MPG', PTS: 'PPG', REB: 'RPG', AST: 'APG',
    STL: 'SPG', BLK: 'BPG',
    FG_PCT: 'FG%', FGA: 'FGA', FGM: 'FGM',
    FG3_PCT: '3P%', FG3A: '3PA', FG3M: '3PM',
    FT_PCT: 'FT%', FTA: 'FTA', FTM: 'FTM'
  };

  useEffect(() => {
    axios.get('http://localhost:5000/players')
      .then(res => setPlayerList(res.data))
      .catch(err => console.error('Error fetching player list:', err));
  }, []);

  const filterPlayers = (input) => playerList.filter(name => name.toLowerCase().includes(input.toLowerCase())).slice(0, 5);

  // Define season bounds (1976-77 to 2024-25)
  const allSeasons = Array.from({ length: 2025 - 1976 + 1 }, (_, i) => {
    const start = i + 1976;
    const end = (start + 1) % 100;
    return `${String(start).slice(2)}-${String(end).padStart(2, '0')}`;
  }).reverse();

  const filterSeasons = (input) => allSeasons.filter(season => season.includes(input)).slice(0, 5);

  const handleCompare = async () => {
    if (!selectedPlayer1 || !selectedPlayer2 || !selectedSeason1 || !selectedSeason2) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post('http://localhost:5000/compare', {
        player1: selectedPlayer1,
        player2: selectedPlayer2,
        season1: selectedSeason1,
        season2: selectedSeason2
      });
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        setComparisonData(null);
        return;
      }
      setComparisonData(res.data.stats);
      setCareerStats(res.data.career);
      setDisplaySeason1(selectedSeason1);
      setDisplaySeason2(selectedSeason2);
    } catch (err) {
      console.error('Error comparing players:', err);
      setErrorMessage('An error occurred while comparing players.');
    } finally {
      setLoading(false);
    }
  };

  // Build radar chart data
  const buildRadarData = () => {
    if (!comparisonData) return [];
    const leagueLeaders = {
      PTS: 37.1, REB: 18.7, AST: 14.5, STL: 3.7, BLK: 5.6,
      FG_PCT: 1.0, FG3_PCT: 1.0, FT_PCT: 1.0
    };
    return Object.keys(leagueLeaders).map(key => {
      const normalize = (val) => val / leagueLeaders[key] * 100;
      const val1 = key.includes('PCT') ? parseFloat(comparisonData[0][key]) : comparisonData[0][key] / comparisonData[0].GP;
      const val2 = key.includes('PCT') ? parseFloat(comparisonData[1][key]) : comparisonData[1][key] / comparisonData[1].GP;
      return {
        stat: displayStatNames[key],
        [comparisonData[0].PLAYER_NAME]: normalize(val1),
        [comparisonData[1].PLAYER_NAME]: normalize(val2)
      };
    });
  };

  // Same as above but for career stats
  const buildCareerRadarData = () => {
    if (!careerStats) return [];
    const leagueLeaders = {
      PTS: 37.1, REB: 18.7, AST: 14.5, STL: 3.7, BLK: 5.6,
      FG_PCT: 1.0, FG3_PCT: 1.0, FT_PCT: 1.0
    };
    return Object.keys(leagueLeaders).map(key => {
      const normalize = (val) => val / leagueLeaders[key] * 100;
      const val1 = parseFloat(careerStats[0][key]);
      const val2 = parseFloat(careerStats[1][key]);
      return {
        stat: displayStatNames[key],
        [careerStats[0].PLAYER_NAME]: normalize(val1),
        [careerStats[1].PLAYER_NAME]: normalize(val2)
      };
    });
  };

  const buildCareerTable = () => {
    if (!careerStats) return null;
    return (
      <div className="table-section styled-table">
        <h3>Career Averages</h3>
        <table>
          <thead>
            <tr>
              <th>Stat</th>
              <th>{careerStats[0].PLAYER_NAME}</th>
              <th>{careerStats[1].PLAYER_NAME}</th>
            </tr>
          </thead>
          <tbody>
            {statKeys.map(stat => {
              const val1 = stat === 'GP'
                ? parseInt(careerStats[0][stat])
                : stat.includes('PCT')
                  ? (parseFloat(careerStats[0][stat]) * 100).toFixed(1)
                  : parseFloat(careerStats[0][stat]).toFixed(1);
              const val2 = stat === 'GP'
                ? parseInt(careerStats[1][stat])
                : stat.includes('PCT')
                  ? (parseFloat(careerStats[1][stat]) * 100).toFixed(1)
                  : parseFloat(careerStats[1][stat]).toFixed(1);

              const isHigher1 = parseFloat(val1) > parseFloat(val2);
              const isHigher2 = parseFloat(val2) > parseFloat(val1);

              return (
                <tr key={stat}>
                  <td>{displayStatNames[stat]}</td>
                  <td className={isHigher1 ? 'highlight' : ''}>{val1}{stat.includes('PCT') ? '%' : ''}</td>
                  <td className={isHigher2 ? 'highlight' : ''}>{val2}{stat.includes('PCT') ? '%' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };



  return (
    <div className="container static-layout">
      <h2>NBA Player Comparison 🏀</h2>

      <div className="input-row compact-row" ref={dropdownRef}>
        <div className="input-group">
          <label className="input-label">Player 1</label>
          <input placeholder="Search Player 1" value={player1Input} onChange={(e) => {
            setPlayer1Input(e.target.value);
            setSelectedPlayer1('');
          }} />
          {player1Input && !selectedPlayer1 && (
            <ul className="dropdown">
              {filterPlayers(player1Input).map((option, idx) => (
                <li key={idx} onClick={() => { setSelectedPlayer1(option); setPlayer1Input(option); }}>{option}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Season 1</label>
          <input placeholder="Search Season 1 (e.g., 24-25)" value={season1Input} onChange={(e) => {
            setSeason1Input(e.target.value);
            setSelectedSeason1('');
          }} />
          {season1Input && !selectedSeason1 && (
            <ul className="dropdown">
              {filterSeasons(season1Input).map((option, idx) => (
                <li key={idx} onClick={() => { setSelectedSeason1(option); setSeason1Input(option); }}>{option}</li>
              ))}
            </ul>
          )}
        </div>

        <span className="vs-text">vs.</span>

        <div className="input-group">
          <label className="input-label">Player 2</label>
          <input placeholder="Search Player 2" value={player2Input} onChange={(e) => {
            setPlayer2Input(e.target.value);
            setSelectedPlayer2('');
          }} />
          {player2Input && !selectedPlayer2 && (
            <ul className="dropdown">
              {filterPlayers(player2Input).map((option, idx) => (
                <li key={idx} onClick={() => { setSelectedPlayer2(option); setPlayer2Input(option); }}>{option}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Season 2</label>
          <input placeholder="Search Season 2 (e.g., 24-25)" value={season2Input} onChange={(e) => {
            setSeason2Input(e.target.value);
            setSelectedSeason2('');
          }} />
          {season2Input && !selectedSeason2 && (
            <ul className="dropdown">
              {filterSeasons(season2Input).map((option, idx) => (
                <li key={idx} onClick={() => { setSelectedSeason2(option); setSeason2Input(option); }}>{option}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button className="compare-btn" onClick={handleCompare} disabled={loading}>
        {loading ? 'Comparing...' : 'Compare'}
      </button>

      {errorMessage && <p className="error-msg">{errorMessage}</p>}

      {comparisonData && (
        <div className="content-wrapper">
          <div className="content-row">
            <div className="chart-section styled-radar">
            <h3 className="chart-title">Season Chart</h3>
              <RadarChart outerRadius={120} width={370} height={406} data={buildRadarData()}>
                <PolarGrid stroke="#ccc" />
                <PolarAngleAxis
                  dataKey="stat"
                  tick={({ payload, x, y, cx, cy, textAnchor, stroke, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radiusOffset = 20;
                    const angle = payload.coordinate;
                    const newX = cx + (Math.cos(-angle * RADIAN) * (120 + radiusOffset));
                    const newY = cy + (Math.sin(-angle * RADIAN) * (120 + radiusOffset));
                    return (
                      <text
                        x={newX}
                        y={newY}
                        textAnchor="middle"
                        fill="#333"
                        fontSize={13}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={comparisonData[0].PLAYER_NAME} dataKey={comparisonData[0].PLAYER_NAME} stroke="#007bff" fill="#007bff" fillOpacity={0.6} />
                <Radar name={comparisonData[1].PLAYER_NAME} dataKey={comparisonData[1].PLAYER_NAME} stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.6} />
                <Legend
                  verticalAlign="bottom"
                  height={0}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '0.85rem', marginBottom: '18px' }} // 👈 Add margin here
                />
              </RadarChart>
            </div>

            <div className="table-section styled-table">
              <h3>Season Averages & Rankings</h3>
              <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>{comparisonData[0].PLAYER_NAME} ({displaySeason1})</th>
                  <th>{comparisonData[1].PLAYER_NAME} ({displaySeason2})</th>
                </tr>
              </thead>
              <tbody>
                {statKeys.map(stat => {
                  const stat1 = stat === 'GP' ? comparisonData[0][stat] :
                    stat === 'MIN' ? (comparisonData[0].GP > 0 ? (comparisonData[0][stat] / comparisonData[0].GP).toFixed(1) : '0.0') :
                    stat.includes('PCT') ? (parseFloat(comparisonData[0][stat]) * 100).toFixed(1) :
                    (comparisonData[0][stat] / comparisonData[0].GP).toFixed(1);

                  const stat2 = stat === 'GP' ? comparisonData[1][stat] :
                    stat === 'MIN' ? (comparisonData[1].GP > 0 ? (comparisonData[1][stat] / comparisonData[1].GP).toFixed(1) : '0.0') :
                    stat.includes('PCT') ? (parseFloat(comparisonData[1][stat]) * 100).toFixed(1) :
                    (comparisonData[1][stat] / comparisonData[1].GP).toFixed(1);

                  const isHigher1 = parseFloat(stat1) > parseFloat(stat2);
                  const isHigher2 = parseFloat(stat2) > parseFloat(stat1);

                  return (
                    <tr key={stat}>
                      <td>{displayStatNames[stat]}</td>
                      <td className={isHigher1 ? 'highlight' : ''}>
                        {stat.includes('PCT') ? `${stat1}%` : stat1}
                      </td>
                      <td className={isHigher2 ? 'highlight' : ''}>
                        {stat.includes('PCT') ? `${stat2}%` : stat2}
                      </td>
                    </tr>
                  );
                })}
              </tbody>



              </table>
            </div>
            <div className="chart-section styled-radar">
            <h3 className="chart-title">Career Chart</h3>
              <RadarChart outerRadius={120} width={370} height={406} data={buildCareerRadarData()}>
                <PolarGrid stroke="#ccc" />
                <PolarAngleAxis
                  dataKey="stat"
                  tick={({ payload, x, y, cx, cy, textAnchor, stroke, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radiusOffset = 20;
                    const angle = payload.coordinate;
                    const newX = cx + (Math.cos(-angle * RADIAN) * (120 + radiusOffset));
                    const newY = cy + (Math.sin(-angle * RADIAN) * (120 + radiusOffset));
                    return (
                      <text
                        x={newX}
                        y={newY}
                        textAnchor="middle"
                        fill="#333"
                        fontSize={13}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={careerStats[0].PLAYER_NAME} dataKey={careerStats[0].PLAYER_NAME} stroke="#00cc00" fill="#00cc00" fillOpacity={0.6} />
                <Radar name={careerStats[1].PLAYER_NAME} dataKey={careerStats[1].PLAYER_NAME} stroke="#a200ff" fill="#a200ff" fillOpacity={0.6} />
                <Legend verticalAlign="bottom" height={0} iconType="circle" wrapperStyle={{ fontSize: '0.85rem', marginBottom: '18px' }} />
              </RadarChart>
            </div>
            {buildCareerTable()}
          </div>
        </div>
      )}
    </div>
  );
}