from flask import Flask, request, jsonify
from flask_cors import CORS
from nba_api.stats.static import players
from nba_api.stats.endpoints import playercareerstats
import pandas as pd

app = Flask(__name__)
CORS(app)

all_players = players.get_players()
all_names = [p['full_name'] for p in all_players]

# All stats we want to pull
STAT_COLUMNS = ['SEASON_ID', 'GP', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK',
                'FG_PCT', 'FG3_PCT', 'FT_PCT', 'FGA', 'FGM', 'FG3A', 'FG3M', 'FTA', 'FTM']

def get_player_stats(full_name, season=None):
    player_info = players.find_players_by_full_name(full_name)
    if not player_info:
        return None

    player_id = player_info[0]['id']
    career = playercareerstats.PlayerCareerStats(player_id=player_id)
    df = career.get_data_frames()[0]

    if season:
        row = df[df['SEASON_ID'].str.contains(season)]
    else:
        row = df[df['SEASON_ID'] == df['SEASON_ID'].max()]

    if row.empty:
        return None

    # Filter only available columns
    available_cols = [col for col in STAT_COLUMNS if col in row.columns]
    stats = row[available_cols].copy()
    stats.insert(0, 'PLAYER_NAME', full_name)
    return stats.iloc[0].to_dict()

def get_career_totals(full_name):
    player_info = players.find_players_by_full_name(full_name)
    if not player_info:
        return None

    player_id = player_info[0]['id']
    career = playercareerstats.PlayerCareerStats(player_id=player_id)
    df = career.get_data_frames()[0]
    df = df[df['SEASON_ID'] != 'Career']

    if df.empty:
        return None

    totals = {'PLAYER_NAME': full_name}
    total_gp = df['GP'].sum()
    totals['GP'] = int(total_gp)

    # Safe averages
    def safe_avg(col):
        return df[col].sum() / total_gp if total_gp and col in df else 0

    for col in ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FGA', 'FGM', 'FG3A', 'FG3M', 'FTA', 'FTM']:
        totals[col] = safe_avg(col)

    # Weighted percentages
    def weighted_pct(pct_col):
        return (df[pct_col] * df['GP']).sum() / total_gp if pct_col in df and total_gp else 0

    totals['FG_PCT'] = weighted_pct('FG_PCT')
    totals['FG3_PCT'] = weighted_pct('FG3_PCT')
    totals['FT_PCT'] = weighted_pct('FT_PCT')

    return totals

@app.route('/players', methods=['GET'])
def get_all_players():
    return jsonify(all_names)

@app.route('/compare', methods=['POST'])
def compare_players():
    data = request.get_json()
    player1 = data.get('player1')
    player2 = data.get('player2')
    season1 = data.get('season1')
    season2 = data.get('season2')

    if not (player1 and player2 and season1 and season2):
        return jsonify({'error': 'Missing player or season info'}), 400

    def convert(season):
        start = int(season.split('-')[0])
        if start >= 50:
            start_year = 1900 + start
        else:
            start_year = 2000 + start
        if start_year < 1976 or start_year > 2024:
            return None
        return f"{start_year}-{str(start_year + 1)[-2:]}"

    season1_full = convert(season1)
    season2_full = convert(season2)

    if not season1_full or not season2_full:
        return jsonify({'error': 'One or both seasons are out of range'}), 400

    stats1 = get_player_stats(player1, season1_full)
    stats2 = get_player_stats(player2, season2_full)

    if not stats1 and not stats2:
        return jsonify({'error': f"Both {player1} and {player2} did not play in their selected seasons."}), 200
    elif not stats1:
        return jsonify({'error': f"{player1} did not play in the {season1} season."}), 200
    elif not stats2:
        return jsonify({'error': f"{player2} did not play in the {season2} season."}), 200

    career1 = get_career_totals(player1)
    career2 = get_career_totals(player2)

    return jsonify({
        'stats': [stats1, stats2],
        'career': [career1, career2]
    })

if __name__ == '__main__':
    app.run(debug=True)