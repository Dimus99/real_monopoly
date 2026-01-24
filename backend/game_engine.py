"""
Game engine for Political Monopoly.
Handles all game logic: movement, buying, rent, abilities, etc.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random
import uuid

from models import Property, GameState, Player, TradeOffer

# ============== Board Data ==============

WORLD_MAP_DATA = [
    # Brown
    {"name": "Пхеньян", "group": "Brown", "price": 60, "rent": [2, 10, 30, 90, 160, 250]},
    {"name": "Тегеран", "group": "Brown", "price": 60, "rent": [4, 20, 60, 180, 320, 450]},
    # Light Blue
    {"name": "Багдад", "group": "LightBlue", "price": 100, "rent": [6, 30, 90, 270, 400, 550]},
    {"name": "Кабул", "group": "LightBlue", "price": 100, "rent": [6, 30, 90, 270, 400, 550]},
    {"name": "Дамаск", "group": "LightBlue", "price": 120, "rent": [8, 40, 100, 300, 450, 600]},
    # Pink
    {"name": "Тайбэй", "group": "Pink", "price": 140, "rent": [10, 50, 150, 450, 625, 750]},
    {"name": "Гонконг", "group": "Pink", "price": 140, "rent": [10, 50, 150, 450, 625, 750]},
    {"name": "Пекин", "group": "Pink", "price": 160, "rent": [12, 60, 180, 500, 700, 900]},
    # Orange
    {"name": "Тель-Авив", "group": "Orange", "price": 180, "rent": [14, 70, 200, 550, 750, 950]},
    {"name": "Иерусалим", "group": "Orange", "price": 180, "rent": [14, 70, 200, 550, 750, 950]},
    {"name": "Мекка", "group": "Orange", "price": 200, "rent": [16, 80, 220, 600, 800, 1000]},
    # Red
    {"name": "Рио-де-Жанейро", "group": "Red", "price": 220, "rent": [18, 90, 250, 700, 875, 1050]},
    {"name": "Дели", "group": "Red", "price": 220, "rent": [18, 90, 250, 700, 875, 1050]},
    {"name": "Москва", "group": "Red", "price": 240, "rent": [20, 100, 300, 750, 925, 1100]},
    # Yellow
    {"name": "Берлин", "group": "Yellow", "price": 260, "rent": [22, 110, 330, 800, 975, 1150]},
    {"name": "Париж", "group": "Yellow", "price": 260, "rent": [22, 110, 330, 800, 975, 1150]},
    {"name": "Лондон", "group": "Yellow", "price": 280, "rent": [24, 120, 360, 850, 1025, 1200]},
    # Green
    {"name": "Киев", "group": "Green", "price": 300, "rent": [26, 130, 390, 900, 1100, 1275]},
    {"name": "Токио", "group": "Green", "price": 300, "rent": [26, 130, 390, 900, 1100, 1275]},
    {"name": "Вашингтон", "group": "Green", "price": 320, "rent": [28, 150, 450, 1000, 1200, 1400]},
    # Dark Blue
    {"name": "Гренландия", "group": "DarkBlue", "price": 706, "rent": [35, 175, 500, 1100, 1300, 1500]},
    {"name": "Антарктида", "group": "DarkBlue", "price": 400, "rent": [50, 200, 600, 1400, 1700, 2000]},
]

UKRAINE_MAP_DATA = [
    {"name": "Киев", "group": "DarkBlue", "price": 400, "rent": [50, 200, 600, 1400, 1700, 2000]},
    {"name": "Львов", "group": "Green", "price": 300, "rent": [26, 130, 390, 900, 1100, 1275]},
    {"name": "Одесса", "group": "Green", "price": 320, "rent": [28, 150, 450, 1000, 1200, 1400]},
    {"name": "Харьков", "group": "Yellow", "price": 280, "rent": [24, 120, 360, 850, 1025, 1200]},
    {"name": "Днепр", "group": "Yellow", "price": 260, "rent": [22, 110, 330, 800, 975, 1150]},
    {"name": "Запорожье", "group": "Red", "price": 240, "rent": [20, 100, 300, 750, 925, 1100]},
    {"name": "Мариуполь", "group": "Red", "price": 220, "rent": [18, 90, 250, 700, 875, 1050]},
    {"name": "Николаев", "group": "Orange", "price": 200, "rent": [16, 80, 220, 600, 800, 1000]},
    {"name": "Херсон", "group": "Orange", "price": 180, "rent": [14, 70, 200, 550, 750, 950]},
    {"name": "Винница", "group": "Pink", "price": 160, "rent": [12, 60, 180, 500, 700, 900]},
    {"name": "Полтава", "group": "Pink", "price": 140, "rent": [10, 50, 150, 450, 625, 750]},
    {"name": "Чернигов", "group": "LightBlue", "price": 120, "rent": [8, 40, 100, 300, 450, 600]},
    {"name": "Сумы", "group": "LightBlue", "price": 100, "rent": [6, 30, 90, 270, 400, 550]},
    {"name": "Житомир", "group": "Brown", "price": 60, "rent": [4, 20, 60, 180, 320, 450]},
    {"name": "Ровно", "group": "Brown", "price": 60, "rent": [2, 10, 30, 90, 160, 250]},
]

MONOPOLY1_MAP_DATA = [
    {"name": "JACKPOT", "group": "Special", "price": 0, "rent": []},  # 0
    {"name": "American Airlines", "group": "LightBlue", "price": 240, "rent": [20, 100, 300, 750, 925, 1100]},  # 1
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 2
    {"name": "Lufthansa", "group": "LightBlue", "price": 180, "rent": [14, 70, 200, 550, 750, 950]},  # 3
    {"name": "British Airways", "group": "LightBlue", "price": 200, "rent": [16, 80, 220, 600, 800, 1000]},  # 4
    {"name": "M1 Sky", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]},  # 5
    {"name": "McDonald's", "group": "Brown", "price": 220, "rent": [18, 90, 250, 700, 875, 1050]},  # 6
    {"name": "Rovio", "group": "Brown", "price": 100, "rent": [6, 30, 90, 270, 400, 550]},  # 7
    {"name": "KFC", "group": "Brown", "price": 240, "rent": [20, 100, 300, 750, 925, 1100]},  # 8
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 9
    {"name": "POLICE", "group": "Jail", "price": 0, "rent": []},  # 10
    {"name": "Holiday Inn", "group": "Pink", "price": 520, "rent": [26, 130, 390, 900, 1100, 1275]},  # 11
    {"name": "Radisson", "group": "Pink", "price": 520, "rent": [26, 130, 390, 900, 1100, 1275]},  # 12
    {"name": "Blue", "group": "Pink", "price": 520, "rent": [26, 130, 390, 900, 1100, 1275]},  # 13
    {"name": "Novotel", "group": "Pink", "price": 1500, "rent": [50, 200, 600, 1400, 1700, 2000]},  # 14
    {"name": "Land Rover", "group": "Orange", "price": 250, "rent": [22, 110, 330, 800, 975, 1150]},  # 15
    {"name": "Diamond", "group": "Orange", "price": 350, "rent": [24, 120, 360, 850, 1025, 1200]},  # 16
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 17
    {"name": "Pepsi", "group": "Orange", "price": 500, "rent": [28, 150, 450, 1000, 1200, 1400]},  # 18
    {"name": "Nike", "group": "Orange", "price": 820, "rent": [35, 175, 500, 1100, 1300, 1500]},  # 19
    {"name": "SUPER JACKPOT", "group": "FreeParking", "price": 0, "rent": []},  # 20
    {"name": "Gucci", "group": "Red", "price": 2750, "rent": [100, 400, 1200, 2800, 3400, 4000]},  # 21
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 22
    {"name": "Sunsilk", "group": "Red", "price": 4950, "rent": [150, 600, 1800, 4200, 5100, 6000]},  # 23
    {"name": "World", "group": "Red", "price": 1025, "rent": [50, 250, 750, 1500, 2000, 2500]},  # 24
    {"name": "Cash", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]},  # 25
    {"name": "Reebok", "group": "Yellow", "price": 308, "rent": [22, 110, 330, 800, 975, 1150]},  # 26
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 27
    {"name": "Diesel", "group": "Yellow", "price": 308, "rent": [22, 110, 330, 800, 975, 1150]},  # 28
    {"name": "New Balance", "group": "Yellow", "price": 410, "rent": [24, 120, 360, 850, 1025, 1200]},  # 29
    {"name": "PRISON", "group": "GoToJail", "price": 0, "rent": []},  # 30
    {"name": "VK", "group": "Blue", "price": 100, "rent": [10, 50, 150, 450, 600, 750]},  # 31
    {"name": "Rockstar", "group": "Blue", "price": 100, "rent": [10, 50, 150, 450, 600, 750]},  # 32
    {"name": "Facebook", "group": "Blue", "price": 100, "rent": [10, 50, 150, 450, 600, 750]},  # 33
    {"name": "Twitter", "group": "Cyan", "price": 120, "rent": [12, 60, 180, 500, 700, 900]},  # 34
    {"name": "Space", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]},  # 35
    {"name": "Sprite", "group": "Green", "price": 1025, "rent": [50, 250, 750, 1500, 2000, 2500]},  # 36
    {"name": "Chance", "group": "Chance", "price": 0, "rent": []},  # 37
    {"name": "7up", "group": "Green", "price": 717, "rent": [35, 175, 500, 1100, 1300, 1500]},  # 38
    {"name": "Mirinda", "group": "Green", "price": 820, "rent": [40, 200, 600, 1200, 1500, 1800]},  # 39
]

# Character abilities
CHARACTER_ABILITIES = {
    "Putin": {
        "name": "ORESHNIK",
        "description": "Launch a missile to destroy any property. It becomes worthless ruins.",
        "cooldown": 5  # turns
    },
    "Trump": {
        "name": "BUYOUT",
        "description": "Hostile takeover: Buy any property even if owned (pay 150% to owner). 50% discount on Greenland.",
        "cooldown": 4
    },
    "Zelensky": {
        "name": "AID",
        "description": "Collect foreign aid: Take 10% of each opponent's cash.",
        "cooldown": 4
    },
    "Kim": {
        "name": "ISOLATION",
        "description": "Block a property: No one can buy or collect rent from it for 3 turns.",
        "cooldown": 5
    },
    "Biden": {
        "name": "SANCTIONS",
        "description": "Freeze an opponent: They skip their next turn.",
        "cooldown": 4
    },
    "Xi": {
        "name": "BELT_ROAD",
        "description": "Claim infrastructure bonus: Collect $50 from each property you pass.",
        "cooldown": 4
    }
}


def create_board(map_type: str = "World") -> List[Property]:
    """Create the game board with 40 tiles."""
    properties = []
    
    if map_type == "Monopoly1":
        # Monopoly1 has a complete custom layout
        for i, prop_data in enumerate(MONOPOLY1_MAP_DATA):
            properties.append(Property(
                id=i,
                name=prop_data["name"],
                group=prop_data["group"],
                price=prop_data["price"],
                rent=prop_data.get("rent", [])
            ))
        return properties

    data = WORLD_MAP_DATA if map_type == "World" else UKRAINE_MAP_DATA
    data_idx = 0
    
    for i in range(40):
        prop_data = None
        
        # Special tiles at fixed positions
        if i == 0:
            prop_data = {"name": "СТАРТ", "group": "Special", "price": 0, "rent": []}
        elif i == 10:
            prop_data = {"name": "ТЮРЬМА", "group": "Jail", "price": 0, "rent": []}
        elif i == 20:
            prop_data = {"name": "БЕСПЛАТНАЯ ПАРКОВКА", "group": "FreeParking", "price": 0, "rent": []}
        elif i == 30:
            prop_data = {"name": "В ТЮРЬМУ", "group": "GoToJail", "price": 0, "rent": []}
        # Chance
        elif i in [2, 7, 17, 22, 33, 36]:
            prop_data = {"name": "Шанс", "group": "Chance", "price": 0, "rent": []}
        # Tax tiles
        elif i == 4:
            prop_data = {"name": "Подоходный налог", "group": "Tax", "price": 0, "rent": [200]}
        elif i == 38:
            prop_data = {"name": "Налог на роскошь", "group": "Tax", "price": 0, "rent": [100]}
        # Stations
        elif i == 5:
            prop_data = {"name": "Аэропорт Москвы", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]}
        elif i == 15:
            prop_data = {"name": "Аэропорт Пекина", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]}
        elif i == 25:
            prop_data = {"name": "Аэропорт Нью-Йорка", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]}
        elif i == 35:
            prop_data = {"name": "Аэропорт Лондона", "group": "Station", "price": 200, "rent": [25, 50, 100, 200]}
        # Utilities
        elif i == 12:
            prop_data = {"name": "Газпром", "group": "Utility", "price": 150, "rent": []}
        elif i == 28:
            prop_data = {"name": "Роснефть", "group": "Utility", "price": 150, "rent": []}
        else:
            # Regular property
            if data_idx < len(data):
                prop_data = data[data_idx]
                data_idx += 1
            else:
                prop_data = {"name": f"City {i}", "group": "Generic", "price": 100, "rent": [10]}
        
        properties.append(Property(
            id=i,
            name=prop_data["name"],
            group=prop_data["group"],
            price=prop_data["price"],
            rent=prop_data.get("rent", [])
        ))
    
    return properties


class GameEngine:
    """Main game engine handling all game logic."""
    
    def __init__(self):
        self.games: Dict[str, GameState] = {}
    
    def create_game(
        self, 
        game_id: str, 
        map_type: str = "World",
        game_mode: str = "abilities",
        host_id: str = None,
        starting_money: int = 1500,
        max_players: int = 6
    ) -> GameState:
        """Create a new game."""
        board = create_board(map_type)
        game = GameState(
            game_id=game_id,
            host_id=host_id or "",
            players={},
            player_order=[],
            board=board,
            map_type=map_type,
            game_mode=game_mode,
            starting_money=starting_money,
            max_players=max_players,
            created_at=datetime.utcnow()
        )
        self.games[game_id] = game
        return game
    
    def add_player(self, game_id: str, player: Player) -> bool:
        """Add a player to a game."""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        if player.id not in game.players:
            game.players[player.id] = player
            game.player_order.append(player.id)
            return True
        return False
    
    def get_current_player(self, game_id: str) -> Optional[Player]:
        """Get the player whose turn it is."""
        game = self.games.get(game_id)
        if not game or not game.player_order:
            return None
        
        current_id = game.player_order[game.current_turn_index]
        return game.players.get(current_id)
    
    def roll_dice(self, game_id: str, player_id: str) -> Dict[str, Any]:
        """Roll dice and move player."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        # Verify it's this player's turn
        current_id = game.player_order[game.current_turn_index]
        if current_id != player_id:
            return {"error": "Not your turn"}
        
        player = game.players[player_id]
        
        # Handle Sanctions (Skip Turn)
        if player.skipped_turns > 0:
            player.skipped_turns -= 1
            game.logs.append(f"🚫 {player.name} is sanctioned in this turn! Skipping...")
            
            # Immediately end turn since their action involves doing nothing
            # Return special status so frontend knows to just end
            # Actually, let's just create a dummy result that forces end turn
            # But we need to ensure the turn advances.
            # Best approach: Return a result that indicates skipped, and auto-call next_turn or let frontend do it?
            # It's better if we just return the state and let frontend see the log, 
            # OR we execute next_turn here and return "turn_skipped".
            
            # Let's perform the "skip" action:
            self._next_turn(game)
            return {
                "dice": [0, 0],
                "action": "skipped_turn",
                "game_state": game.dict()
            }
        
        # Roll dice
        d1 = random.randint(1, 6)
        d2 = random.randint(1, 6)
        game.dice = [d1, d2]
        is_doubles = d1 == d2
        
        result = {
            "dice": [d1, d2],
            "doubles": is_doubles,
            "passed_go": False,
            "action": None,
            "amount": None
        }
        
        # Handle jail
        if player.is_jailed:
            if is_doubles:
                player.is_jailed = False
                player.jail_turns = 0
                game.logs.append(f"{player.name} rolled doubles and escaped jail!")
            else:
                player.jail_turns += 1
                if player.jail_turns >= 3:
                    player.is_jailed = False
                    player.jail_turns = 0
                    player.money -= 50
                    game.logs.append(f"{player.name} paid $50 to leave jail")
                else:
                    result["action"] = "still_jailed"
                    game.logs.append(f"{player.name} is still in jail ({player.jail_turns}/3 turns)")
                    self._next_turn(game)
                    return result
        
        # Handle consecutive doubles (go to jail on 3rd)
        if is_doubles:
            game.doubles_count += 1
            if game.doubles_count >= 3:
                self._send_to_jail(game, player)
                result["action"] = "go_to_jail"
                game.logs.append(f"{player.name} rolled 3 doubles in a row - sent to jail!")
                self._next_turn(game)
                return result
        else:
            game.doubles_count = 0
        
        # Move player
        old_position = player.position
        new_position = (player.position + d1 + d2) % 40
        player.position = new_position
        
        # Check if passed GO
        if new_position < old_position and old_position != 0:
            go_money = 2000 if game.map_type == "Monopoly1" else 200
            player.money += go_money
            result["passed_go"] = True
            game.logs.append(f"{player.name} passed GO and collected ${go_money}")
        
        # Handle landing
        tile = game.board[new_position]
        result["landed_on"] = tile.name
        result["tile_type"] = tile.group
        
        landing_result = self._handle_landing(game, player, tile)
        result.update(landing_result)
        
        game.logs.append(f"{player.name} rolled {d1}+{d2} and moved to {tile.name}")
        
        # If doubles, remind to roll again
        if is_doubles:
            game.logs.append(f"{player.name} rolled doubles - roll again!")
            game.turn_state["has_rolled"] = False
        else:
            game.turn_state["has_rolled"] = True
        
        result["game_state"] = game.dict()
        return result
    
    def _handle_landing(self, game: GameState, player: Player, tile: Property) -> Dict[str, Any]:
        """Handle player landing on a tile."""
        result = {}
        
        if tile.group == "GoToJail":
            self._send_to_jail(game, player)
            result["action"] = "go_to_jail"
            
        elif tile.group == "Tax":
            tax_amount = tile.rent[0] if tile.rent else 100
            player.money -= tax_amount
            game.pot += tax_amount
            result["action"] = "pay_tax"
            result["amount"] = tax_amount
            game.logs.append(f"{player.name} paid ${tax_amount} in taxes")
            
        elif tile.group == "FreeParking":
            # Player collects pot
            if game.pot > 0:
                player.money += game.pot
                result["action"] = "collect_pot"
                result["amount"] = game.pot
                game.logs.append(f"{player.name} collected ${game.pot} from Free Parking!")
                game.pot = 0
                
        elif tile.group == "Chance":
            result["action"] = "chance"
            result.update(self._draw_chance_card(game, player))
            
        elif tile.group in ["Jail", "Special"]:
            # Just visiting or GO
            result["action"] = "safe"
            
        elif tile.group in ["Station", "Utility"]:
            # Handlestations and utilities
            if tile.owner_id and tile.owner_id != player.id and not tile.is_mortgaged:
                rent = self._calculate_rent(game, tile, game.dice)
                result["action"] = "pay_rent"
                result["amount"] = rent
                result["owner_id"] = tile.owner_id
            elif not tile.owner_id and not tile.is_destroyed:
                result["action"] = "can_buy"
                result["price"] = tile.price
                
        else:
            # Regular property
            if tile.is_destroyed:
                result["action"] = "destroyed"
                game.logs.append(f"{tile.name} lies in ruins...")
            elif tile.owner_id and tile.owner_id != player.id and not tile.is_mortgaged:
                rent = self._calculate_rent(game, tile, game.dice)
                result["action"] = "pay_rent"
                result["amount"] = rent
                result["owner_id"] = tile.owner_id
            elif not tile.owner_id:
                result["action"] = "can_buy"
                result["price"] = tile.price
        
        return result
    
    def _calculate_rent(self, game: GameState, tile: Property, dice: List[int]) -> int:
        """Calculate rent for a property."""
        if tile.is_destroyed or tile.is_mortgaged or tile.isolation_turns > 0:
            return 0
        
        owner = game.players.get(tile.owner_id)
        if not owner:
            return 0
        
        if tile.group == "Utility":
            # Count utilities owned by owner
            utilities_owned = sum(1 for t in game.board if t.group == "Utility" and t.owner_id == tile.owner_id and t.isolation_turns == 0)
            multiplier = 4 if utilities_owned == 1 else 10
            return (dice[0] + dice[1]) * multiplier
            
        elif tile.group == "Station":
            # Count stations owned
            stations_owned = sum(1 for t in game.board if t.group == "Station" and t.owner_id == tile.owner_id)
            rent_index = min(stations_owned - 1, len(tile.rent) - 1)
            return tile.rent[rent_index] if tile.rent else 25
            
        else:
            # Regular property
            if not tile.rent:
                return 10
            
            # Check if owner has monopoly (all of same group)
            group_props = [t for t in game.board if t.group == tile.group]
            has_monopoly = all(t.owner_id == tile.owner_id for t in group_props)
            
            rent_index = min(tile.houses, len(tile.rent) - 1)
            base_rent = tile.rent[rent_index]
            
            # Double rent if monopoly and no houses
            if has_monopoly and tile.houses == 0:
                return base_rent * 2
            
            return base_rent
    
    def _draw_chance_card(self, game: GameState, player: Player) -> Dict[str, Any]:
        """Draw a random chance card effect."""
        cards = [
            {"type": "money", "amount": 200, "text": "Foreign Aid Package - Collect $200"},
            {"type": "money", "amount": 150, "text": "Successful Trade Deal - Collect $150"},
            {"type": "money", "amount": 100, "text": "Political Donation - Collect $100"},
            {"type": "money", "amount": -100, "text": "Campaign Fine - Pay $100"},
            {"type": "money", "amount": -150, "text": "Legal Fees - Pay $150"},
            {"type": "move", "position": 0, "text": "Emergency Summit - Advance to GO"},
            {"type": "move", "position": 10, "text": "War Crimes Investigation - Go to Hague (Jail)"},
            {"type": "jail_free", "text": "Diplomatic Immunity - Get out of Jail Free"},
            {"type": "repair", "house_cost": 25, "hotel_cost": 100, "text": "Infrastructure Repair - Pay $25 per house, $100 per hotel"},
        ]
        
        card = random.choice(cards)
        game.logs.append(f"Breaking News: {card['text']}")
        
        if card["type"] == "money":
            player.money += card["amount"]
            return {"chance_card": card["text"], "amount": card["amount"]}
            
        elif card["type"] == "move":
            old_pos = player.position
            player.position = card["position"]
            if card["position"] == 10:
                self._send_to_jail(game, player)
            elif card["position"] < old_pos:
                player.money += 200  # Passed GO
            return {"chance_card": card["text"], "new_position": card["position"]}
            
        elif card["type"] == "repair":
            total = 0
            for prop in game.board:
                if prop.owner_id == player.id:
                    if prop.houses == 5:  # Hotel
                        total += card["hotel_cost"]
                    else:
                        total += prop.houses * card["house_cost"]
            player.money -= total
            return {"chance_card": card["text"], "amount": -total}
        
        return {"chance_card": card["text"]}
    
    def _send_to_jail(self, game: GameState, player: Player):
        """Send player to jail."""
        player.position = 10
        player.is_jailed = True
        player.jail_turns = 0
        game.doubles_count = 0
    
    def _next_turn(self, game: GameState):
        """Advance to next player's turn."""
        if not game.player_order:
            return

        game.current_turn_index = (game.current_turn_index + 1) % len(game.player_order)
        game.turn_number += 1
        game.doubles_count = 0
        game.turn_state = {}  # Reset turn flags
        
        # Set timeout (45s)
        game.turn_expiry = datetime.utcnow() + timedelta(seconds=45)
        

        # Decrease ability cooldowns
        for player in game.players.values():
            if player.ability_cooldown > 0:
                player.ability_cooldown -= 1
        
        # Decrease Isolation counters
        for prop in game.board:
            if prop.isolation_turns > 0:
                prop.isolation_turns -= 1
    
    def check_timeouts(self) -> List[Dict[str, Any]]:
        """Check for expired turns and kick players. Returns updates to broadcast."""
        updates = []
        
        # List to avoid iteration modification issues
        active_games = [g for g in self.games.values() if g.game_status == "active"]
        
        for game in active_games:
            # Check timeout
            if game.turn_expiry and datetime.utcnow() > game.turn_expiry:
                current_pid = game.player_order[game.current_turn_index]
                player = game.players.get(current_pid)
                
                # Don't kick bots, they respond automatically (unless they stuck?)
                # Actually bots should run immediately. If they stick, something broken.
                # Kick them too to unblock.
                if player:
                    # Kick logic
                    kick_result = self._kick_player(game, player, "Turn timeout")
                    updates.append({
                        "game_id": game.game_id,
                        "type": "PLAYER_KICKED",
                        "data": kick_result
                    })
        return updates

    def _kick_player(self, game: GameState, player: Player, reason: str) -> Dict[str, Any]:
        """Remove a player from the game (timeout/quit)."""
        # 1. Bankrupt logic (return assets to bank)
        self._handle_bankruptcy(game, player, None, 0)
        
        game.logs.append(f"🚫 {player.name} timed out and left the game!")

        # 2. Check remaining state
        active_humans = [p for p in game.players.values() if not p.is_bot and not p.is_bankrupt]
        active_players = [p for p in game.players.values() if not p.is_bankrupt]
        
        game_over = False
        game_deleted = False
        
        if len(active_players) < 2:
            # End game
            game.game_status = "finished"
            if active_players:
                game.winner_id = active_players[0].id
                game.logs.append(f"🏆 {active_players[0].name} wins by default!")
            game_over = True
        elif not active_humans:
            # Only bots -> Kill game
            if game.game_id in self.games:
                del self.games[game.game_id]
                game_deleted = True
        
        # 3. Advance turn if needed (handled by bankruptcy removing from order, 
        # but we need to ensure timer is reset for NEXT player)
        if not game_over and not game_deleted and game.player_order:
             # _handle_bankruptcy removed player from order. 
             # current_turn_index might now point to wrong index or out of bounds?
             # Actually _handle_bankruptcy just removes from order.
             # We should ensure index mod len
             if len(game.player_order) > 0:
                 game.current_turn_index = game.current_turn_index % len(game.player_order)
                 game.turn_expiry = datetime.utcnow() + timedelta(seconds=45)

        return {
            "kicked_id": player.id, 
            "reason": reason, 
            "game_state": game.dict(),
            "game_over": game_over,
            "game_deleted": game_deleted
        }

    def get_user_active_games(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active games for a user."""
        active = []
        for gid, game in self.games.items():
            if game.game_status == "active":
                player = next((p for p in game.players.values() if p.user_id == user_id), None)
                if player and not player.is_bankrupt:
                    active.append({
                        "game_id": gid,
                        "map_type": game.map_type,
                        "turn": game.turn_number,
                        "character": player.character,
                        "players_count": len(game.player_order),
                        "player_id": player.id
                    })
        return active
    
    def buy_property(self, game_id: str, player_id: str, property_id: int) -> Dict[str, Any]:
        """Buy a property."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        player = game.players.get(player_id)
        if not player:
            return {"error": "Player not found"}
        
        if player.position != property_id:
            return {"error": "Must be on the tile to buy it"}
        
        if property_id < 0 or property_id >= len(game.board):
            return {"error": "Invalid property"}
        
        prop = game.board[property_id]
        
        if prop.owner_id:
            return {"error": "Property already owned"}
        
        if prop.is_destroyed:
            return {"error": "Cannot buy destroyed property"}
            
        if prop.isolation_turns > 0:
            return {"error": "Property is Isolated (Kim's Nuke Threat) - Cannot buy!"}
        
        if prop.group in ["Special", "Jail", "FreeParking", "GoToJail", "Chance", "Tax"]:
            return {"error": "Cannot buy this tile"}
        
        if player.money < prop.price:
            return {"error": "Not enough money"}
        
        # Buy it
        player.money -= prop.price
        prop.owner_id = player_id
        player.properties.append(property_id)
        
        game.logs.append(f"{player.name} bought {prop.name} for ${prop.price}")
        
        return {
            "success": True,
            "property": prop.dict(),
            "game_state": game.dict()
        }
    
    def pay_rent(self, game_id: str, player_id: str, property_id: int) -> Dict[str, Any]:
        """Pay rent to property owner."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        player = game.players.get(player_id)
        prop = game.board[property_id]
        
        if not prop.owner_id or prop.owner_id == player_id:
            return {"error": "No rent to pay"}
        
        owner = game.players.get(prop.owner_id)
        if not owner:
            return {"error": "Owner not found"}
        
        rent = self._calculate_rent(game, prop, game.dice)
        
        if player.money < rent:
            # Player goes bankrupt
            return self._handle_bankruptcy(game, player, owner, rent)
        
        player.money -= rent
        owner.money += rent
        
        game.logs.append(f"{player.name} paid ${rent} rent to {owner.name}")
        
        return {
            "success": True,
            "rent_paid": rent,
            "game_state": game.dict()
        }
    
    def _handle_bankruptcy(self, game: GameState, player: Player, creditor: Player, debt: int) -> Dict[str, Any]:
        """Handle player bankruptcy."""
        player.is_bankrupt = True
        
        # Transfer all properties to creditor (or bank if no creditor)
        for prop_id in player.properties:
            prop = game.board[prop_id]
            if creditor:
                prop.owner_id = creditor.id
                creditor.properties.append(prop_id)
            else:
                prop.owner_id = None
                prop.houses = 0
        
        # Transfer remaining money
        if creditor:
            creditor.money += player.money
        
        player.money = 0
        player.properties = []
        
        # Remove from turn order
        if player.id in game.player_order:
            game.player_order.remove(player.id)
        
        game.logs.append(f"{player.name} went BANKRUPT!")
        
        # Check for winner
        active_players = [p for p in game.players.values() if not p.is_bankrupt]
        if len(active_players) == 1:
            game.game_status = "finished"
            game.winner_id = active_players[0].id
            game.finished_at = datetime.utcnow()
            game.logs.append(f"{active_players[0].name} WINS THE GAME!")
        
        return {
            "success": True,
            "bankrupt": True,
            "game_state": game.dict()
        }
    
    def execute_ability(self, game_id: str, player_id: str, ability_type: str, target_id: int = None) -> Dict[str, Any]:
        """Execute a character's special ability."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        player = game.players.get(player_id)
        if not player:
            return {"error": "Player not found"}
        
        # Check cooldown
        if player.ability_cooldown > 0:
            return {"error": f"Ability on cooldown ({player.ability_cooldown} turns remaining)"}
        
        if game.game_mode == "classic":
            return {"error": "Abilities are disabled in Classic Mode"}

        ability = None
        if game.game_mode == "oreshnik_all":
            # In this mode, everyone has ORESHNIK
            ability = CHARACTER_ABILITIES["Putin"]
            ability_name = "ORESHNIK"
        else:
            ability = CHARACTER_ABILITIES.get(player.character)
            if not ability:
                return {"error": "No ability for this character"}
            ability_name = ability["name"]

        if ability_name != ability_type:
            return {"error": f"Invalid ability for this mode/character"}
        
        result = {}
        
        # Execute ability based on type
        if ability_type == "ORESHNIK":
            result = self._ability_oreshnik(game, player, target_id)
        elif ability_type == "BUYOUT":
            result = self._ability_buyout(game, player, target_id)
        elif ability_type == "AID":
            result = self._ability_aid(game, player)
        elif ability_type == "ISOLATION":
            result = self._ability_isolation(game, player, target_id)
        elif ability_type == "SANCTIONS":
            result = self._ability_sanctions(game, player, target_id)
        elif ability_type == "BELT_ROAD":
            result = self._ability_belt_road(game, player)
        else:
            return {"error": "Unknown ability"}
        
        if result.get("success"):
            player.ability_cooldown = ability["cooldown"]
            player.ability_used_this_game = True
        
        result["game_state"] = game.dict()
        return result
    
    def _ability_oreshnik(self, game: GameState, player: Player, target_id: int = None) -> Dict[str, Any]:
        """Putin's Oreshnik: Destroy a property."""
        if target_id is None:
            # Pick random opponent's property
            targets = [p for p in game.board if p.owner_id and p.owner_id != player.id and not p.is_destroyed]
            if not targets:
                return {"error": "No valid targets"}
            target_id = random.choice(targets).id
        
        target = game.board[target_id]
        
        if target.id == 0 or target.id == 10:
            return {"error": "Cannot destroy GO or Jail"}
        
        if target.is_destroyed:
            return {"error": "Already destroyed"}
        
        # Destroy the property
        target.is_destroyed = True
        target.rent = [0] * len(target.rent)
        target.destruction_turn = game.turn_number
        
        game.logs.append(f"🚀 {player.name} launched ORESHNIK at {target.name}! The city is in ruins!")
        
        return {
            "success": True,
            "type": "ORESHNIK",
            "target_id": target_id,
            "target_name": target.name
        }
    
    def _ability_buyout(self, game: GameState, player: Player, target_id: int = None) -> Dict[str, Any]:
        """Trump's Buyout: Hostile takeover of any property."""
        if target_id is None:
            return {"error": "Must specify target property"}
        
        target = game.board[target_id]
        
        if not target.owner_id:
            return {"error": "Property is not owned - just buy it normally"}
        
        if target.owner_id == player.id:
            return {"error": "You already own this"}
        
        if target.is_destroyed:
            return {"error": "Cannot buy destroyed property"}
        
        # Calculate price
        price = int(target.price * 1.5)
        
        # Greenland discount
        if target.name == "Greenland":
            price = int(target.price * 0.5)
            game.logs.append("🏝️ Special Greenland discount applied!")
        
        if player.money < price:
            return {"error": f"Need ${price} for hostile takeover"}
        
        # Execute takeover
        old_owner = game.players[target.owner_id]
        player.money -= price
        old_owner.money += price
        
        # Transfer property
        old_owner.properties.remove(target_id)
        player.properties.append(target_id)
        target.owner_id = player.id
        
        game.logs.append(f"💰 {player.name} executed HOSTILE TAKEOVER of {target.name} from {old_owner.name} for ${price}!")
        
        return {
            "success": True,
            "type": "BUYOUT",
            "target_id": target_id,
            "target_name": target.name,
            "price_paid": price
        }
    
    def _ability_aid(self, game: GameState, player: Player) -> Dict[str, Any]:
        """Zelensky's Aid: Collect 10% from all opponents."""
        total_collected = 0
        
        for other in game.players.values():
            if other.id != player.id and not other.is_bankrupt:
                aid_amount = int(other.money * 0.10)
                other.money -= aid_amount
                total_collected += aid_amount
        
        player.money += total_collected
        
        game.logs.append(f"🤝 {player.name} collected FOREIGN AID Package: ${total_collected} from allies!")
        
        return {
            "success": True,
            "type": "AID",
            "amount_collected": total_collected
        }
    
    def _ability_isolation(self, game: GameState, player: Player, target_id: int = None) -> Dict[str, Any]:
        """Kim's Isolation: Block a property for 3 turns."""
        if target_id is None:
            return {"error": "Must specify target property"}
        
        target = game.board[target_id]
        
        if target.group in ["Special", "Jail", "FreeParking", "GoToJail", "Chance", "Tax"]:
            return {"error": "Cannot isolate this tile"}
        
        # Set isolation
        target.isolation_turns = 3
        
        game.logs.append(f"🔒 {player.name} imposed ISOLATION on {target.name} for 3 turns!")
        
        return {
            "success": True,
            "type": "ISOLATION",
            "target_id": target_id,
            "target_name": target.name
        }
    
    def _ability_sanctions(self, game: GameState, player: Player, target_player_id: int = None) -> Dict[str, Any]:
        """Biden's Sanctions: Skip opponent's next turn."""
        if target_player_id is None:
            # Pick random opponent
            opponents = [p for p in game.players.values() if p.id != player.id and not p.is_bankrupt]
            if not opponents:
                return {"error": "No valid targets"}
            target = random.choice(opponents)
            target_player_id = target.id
        else:
            target = game.players.get(str(target_player_id))
            if not target:
                return {"error": "Target player not found"}
        
        # Skip their turn
        target.skipped_turns = 1
        
        game.logs.append(f"🚫 {player.name} imposed SANCTIONS on {target.name}! They will skip their next turn!")
        
        return {
            "success": True,
            "type": "SANCTIONS",
            "target_player_id": target.id,
            "target_name": target.name
        }
    
    def _ability_belt_road(self, game: GameState, player: Player) -> Dict[str, Any]:
        """Xi's Belt & Road: Collect bonus from passed properties."""
        # Give flat bonus of $50 per owned property
        owned_count = len(player.properties)
        bonus = owned_count * 50
        
        if bonus == 0:
            bonus = 100  # Minimum
        
        player.money += bonus
        
        game.logs.append(f"🛤️ {player.name} activated BELT & ROAD Initiative: Collected ${bonus}!")
        
        return {
            "success": True,
            "type": "BELT_ROAD",
            "bonus": bonus
        }
    
    
    # ============ Trading System ============

    def create_trade(self, game_id: str, offer: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trade offer."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        # Validate players
        p_from = game.players.get(offer.get("from_player_id"))
        p_to = game.players.get(offer.get("to_player_id"))
        
        if not p_from or not p_to:
            return {"error": "Invalid players"}
        
        # Validate assets ownership
        for pid in offer.get("offer_properties", []):
            if pid not in p_from.properties:
                return {"error": "You don't own offered property"}
                
        for pid in offer.get("request_properties", []):
            if pid not in p_to.properties:
                return {"error": "Target doesn't own requested property"}
        
        if p_from.money < offer.get("offer_money", 0):
            return {"error": "Not enough money"}
            
        trade_id = str(uuid.uuid4())
        trade = TradeOffer(
            id=trade_id,
            game_id=game_id,
            from_player_id=p_from.id,
            to_player_id=p_to.id,
            offer_money=offer.get("offer_money", 0),
            offer_properties=offer.get("offer_properties", []),
            request_money=offer.get("request_money", 0),
            request_properties=offer.get("request_properties", [])
        )
        
        game.trades[trade_id] = trade
        game.logs.append(f"🤝 {p_from.name} sent a trade offer to {p_to.name}")
        
        return {
            "success": True,
            "trade": trade.dict(),
            "game_state": game.dict()
        }

    def respond_to_trade(self, game_id: str, trade_id: str, response: str) -> Dict[str, Any]:
        """Accept or Reject a trade."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
            
        trade = game.trades.get(trade_id)
        if not trade:
            return {"error": "Trade not found"}
            
        if trade.status != "pending":
            return {"error": "Trade already processed"}
            
        p_from = game.players.get(trade.from_player_id)
        p_to = game.players.get(trade.to_player_id)
        
        if not p_from or not p_to:
            trade.status = "cancelled"
            return {"error": "Player(s) left the game"}
            
        if response == "accept":
            # Verify assets again (state might have changed)
            if p_from.money < trade.offer_money or p_to.money < trade.request_money:
                return {"error": "Funds changed, trade failed"}
                
            for pid in trade.offer_properties:
                if pid not in p_from.properties:
                     return {"error": "Assets changed, trade failed"}
            for pid in trade.request_properties:
                if pid not in p_to.properties:
                     return {"error": "Assets changed, trade failed"}
                     
            # Execute Trade
            self._execute_trade(game, trade, p_from, p_to)
            trade.status = "accepted"
            game.logs.append(f"✅ Trade between {p_from.name} and {p_to.name} ACCEPTED!")
            
        elif response == "reject":
            trade.status = "rejected"
            game.logs.append(f"❌ {p_to.name} rejected trade from {p_from.name}")
            
        elif response == "cancel":
             trade.status = "cancelled"
             game.logs.append(f"🚫 {p_from.name} cancelled trade")

        return {
            "success": True,
            "trade_id": trade_id,
            "status": trade.status,
            "game_state": game.dict()
        }

    def _execute_trade(self, game: GameState, trade: TradeOffer, p1: Player, p2: Player):
        """Transfer assets."""
        # Money
        p1.money -= trade.offer_money
        p2.money += trade.offer_money
        
        p2.money -= trade.request_money
        p1.money += trade.request_money
        
        # Properties P1 -> P2
        for pid in trade.offer_properties:
            p1.properties.remove(pid)
            p2.properties.append(pid)
            game.board[pid].owner_id = p2.id
            
        # Properties P2 -> P1
        for pid in trade.request_properties:
            p2.properties.remove(pid)
            p1.properties.append(pid)
            game.board[pid].owner_id = p1.id
            
    def run_bot_turn(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Execute a bot's dice roll. Returns dice result for animation."""
        game = self.games.get(game_id)
        if not game:
            return None
        
        current_id = game.player_order[game.current_turn_index]
        player = game.players[current_id]
        
        if not player.is_bot:
            return None
        
        # Roll dice
        roll_result = self.roll_dice(game_id, current_id)
        
        return {
            "type": "DICE_ROLLED",
            "player_id": current_id,
            "player_name": player.name,
            "is_bot": True,
            **roll_result
        }
    
    def run_bot_post_roll(self, game_id: str, player_id: str) -> Optional[Dict[str, Any]]:
        """Execute bot actions after dice roll (buy, pay rent, ability)."""
        game = self.games.get(game_id)
        if not game:
            return None
        
        player = game.players.get(player_id)
        if not player or not player.is_bot:
            return None
        
        actions = []
        
        # Buy if possible
        tile = game.board[player.position]
        if not tile.owner_id and tile.price > 0 and player.money >= tile.price:
            if tile.group not in ['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax']:
                buy_result = self.buy_property(game_id, player_id, player.position)
                if buy_result.get("success"):
                    actions.append({"type": "PROPERTY_BOUGHT", **buy_result})
        
        # Pay rent if needed
        if tile.owner_id and tile.owner_id != player_id and not tile.is_mortgaged:
            rent_result = self.pay_rent(game_id, player_id, player.position)
            actions.append({"type": "RENT_PAID", **rent_result})
        
        # Random chance to use ability (20%)
        if player.ability_cooldown == 0 and random.random() < 0.15:
            ability = CHARACTER_ABILITIES.get(player.character)
            if ability:
                ability_result = self.execute_ability(game_id, player_id, ability["name"])
                if ability_result.get("success"):
                    actions.append({"type": "ABILITY_USED", **ability_result})
        
        if actions:
            return {
                "type": "BOT_ACTIONS",
                "player_id": player_id,
                "actions": actions,
                "game_state": game.dict()
            }
        
        return None

    def end_turn(self, game_id: str, player_id: str) -> Dict[str, Any]:
        """Manually end a player's turn."""
        game = self.games.get(game_id)
        if not game:
            return {"error": "Game not found"}
        
        # Verify it's this player's turn
        current_id = game.player_order[game.current_turn_index]
        if current_id != player_id:
            return {"error": "Not your turn"}
        
        # Advance turn
        self._next_turn(game)
        
        return {
            "success": True,
            "game_state": game.dict()
        }
    
    def add_chat_message(self, game_id: str, player_name: str, message: str):
        """Add a chat message to the game log."""
        game = self.games.get(game_id)
        if game:
            game.logs.append(f"💬 {player_name}: {message}")


# Global engine instance
engine = GameEngine()
