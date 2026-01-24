import requests
import time
import json
import sys

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("1. Registering User...")
    resp = requests.post(f"{BASE_URL}/auth/anonymous", json={"name": "TestUser"})
    if resp.status_code != 200:
        print(f"Failed to auth: {resp.text}")
        return
    
    data = resp.json()
    token = data["token"]
    user = data["user"]
    print(f"   User created: {user['name']} ({user['id']})")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Creating Game...")
    # Create request needs 'map_type', 'game_mode', 'starting_money', 'max_players'
    create_data = {
        "map_type": "World",
        "game_mode": "classic",
        "starting_money": 1500,
        "max_players": 4
    }
    resp = requests.post(f"{BASE_URL}/games", json=create_data, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to create game: {resp.text}")
        return
        
    game_data = resp.json()
    game_id = game_data["game_id"]
    print(f"   Game created: {game_id}")
    
    # Need to join? Creator usually joins automatically?
    # Let's check game state.
    resp = requests.get(f"{BASE_URL}/games/{game_id}", headers=headers)
    game_state = resp.json()["game_state"]
    if user['id'] not in [p['user_id'] for p in game_state['players'].values()]:
        print("   Creator not in game? Joining...")
        join_data = {"character": "Biden"}
        requests.post(f"{BASE_URL}/games/{game_id}/join", json=join_data, headers=headers)
    else:
        print("   Creator is in game.")

    print("\n3. Adding Bot...")
    resp = requests.post(f"{BASE_URL}/games/{game_id}/bots", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to add bot: {resp.text}")
        return
    bot_data = resp.json()
    print(f"   Bot added: {bot_data['character']} ({bot_data['bot_id']})")
    
    print("\n4. Starting Game...")
    resp = requests.post(f"{BASE_URL}/games/{game_id}/start", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to start game: {resp.text}")
        return
    
    print("   Game started!")
    
    print("\n5. Polling Game Logs (waiting for Bot turn)...")
    last_log_count = 0
    
    for i in range(20): # Poll for 20 seconds
        resp = requests.get(f"{BASE_URL}/games/{game_id}", headers=headers)
        if resp.status_code != 200:
            print("Error polling game")
            break
            
        game_state = resp.json()["game_state"]
        logs = game_state.get("logs", [])
        
        if len(logs) > last_log_count:
            for log in logs[last_log_count:]:
                print(f"   LOG: {log}")
            last_log_count = len(logs)
        
        # Check whose turn it is
        current_idx = game_state.get("current_turn_index", 0)
        order = game_state.get("player_order", [])
        current_id = order[current_idx]
        current_player = game_state["players"][current_id]
        
        # print(f"   Turn: {current_player['name']} (Bot: {current_player.get('is_bot', False)})")
        
        time.sleep(1)

if __name__ == "__main__":
    run_test()
