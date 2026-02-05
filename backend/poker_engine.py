import random
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from models import User

# Card constants
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

class Card:
    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit
    
    def __repr__(self):
        return f"{self.rank}{self.suit}"
    
    def to_dict(self):
        return {"rank": self.rank, "suit": self.suit, "display": str(self)}
    
    @property
    def value(self):
        return RANKS.index(self.rank)

class Deck:
    def __init__(self):
        self.cards = [Card(r, s) for s in SUITS for r in RANKS]
        self.shuffle()
    
    def shuffle(self):
        random.shuffle(self.cards)
    
    def draw(self):
        return self.cards.pop() if self.cards else None

class PokerPlayer:
    def __init__(self, user: User, buy_in: int, seat: int):
        self.user_id = user.id
        self.name = user.name
        self.avatar_url = user.avatar_url
        self.chips = buy_in
        self.seat = seat
        self.hand: List[Card] = []
        self.current_bet = 0
        self.is_folded = False
        self.is_all_in = False
        self.is_sitting_out = False
        self.last_action = None
        self.consecutive_timeouts = 0
        self.is_bot = False
    
    def to_dict(self, show_hand=False):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "chips": self.chips,
            "seat": self.seat,
            "hand": [c.to_dict() for c in self.hand] if (show_hand or (self.is_bot and show_hand)) else [{"rank": "?", "suit": "?", "display": "??"} for _ in self.hand],
            "current_bet": self.current_bet,
            "is_folded": self.is_folded,
            "is_all_in": self.is_all_in,
            "is_sitting_out": self.is_sitting_out,
            "last_action": self.last_action,
            "consecutive_timeouts": self.consecutive_timeouts,
            "is_bot": self.is_bot
        }

class BotPlayer(PokerPlayer):
    def __init__(self, name: str, seat: int, buy_in: int = 10000):
        # Create a fake user for the bot
        fake_user = User(id=f"bot_{random.randint(1000,9999)}", name=name, telegram_id=0, avatar_url="🤖")
        super().__init__(fake_user, buy_in, seat)
        self.is_bot = True

class PokerTable:
    def __init__(self, table_id: str, name: str, small_blind: int = 50, big_blind: int = 100, min_buy: int = 1000, max_buy: int = 100000):
        self.id = table_id
        self.name = name
        self.seats: Dict[int, PokerPlayer] = {} # 0-8
        self.max_seats = 6 
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.min_buy_in = min_buy
        self.max_buy_in = max_buy
        
        # Game State
        self.state = "WAITING" 
        self.community_cards: List[Card] = []
        self.pot = 0
        self.current_bet = 0
        self.dealer_seat = 0
        self.current_player_seat = -1
        self.deck = None
        self.min_raise = 0
        
        # Turn Management
        self.turn_deadline = None # Datetime when turn expires
        
        # Logs
        self.last_activity = datetime.utcnow()
        self.logs = []

    def get_empty_seat(self) -> int:
        for i in range(self.max_seats):
            if i not in self.seats:
                return i
        return -1

    def add_player(self, user: User, buy_in: int) -> Dict:
        if buy_in < self.min_buy_in:
             return {"error": f"Minimum buy-in is {self.min_buy_in}"}
        if buy_in > self.max_buy_in:
             return {"error": f"Maximum buy-in is {self.max_buy_in}"}

        # Check if already seated
        for p in self.seats.values():
            if p.user_id == user.id:
                 return {"success": True, "seat": p.seat, "game_state": self.to_dict(), "message": "Already seated"}

        seat = self.get_empty_seat()
        if seat == -1:
            return {"error": "Table is full"}
        
        player = PokerPlayer(user, buy_in, seat)
        self.seats[seat] = player
        self.add_log(f"{user.name} joined the table.")
        
        # Start game if enough players and not active
        if len(self.seats) >= 2 and self.state == "WAITING":
            self.start_hand()
            
        return {"success": True, "seat": seat, "game_state": self.to_dict()}
    
    def add_bot(self) -> Dict:
        seat = self.get_empty_seat()
        if seat == -1: return {"error": "Table full"}
        
        bot_names = ["PokerBot3000", "FishHunter", "AllInAnyTwo", "GTO_Wizard", "Terminator"]
        name = random.choice(bot_names)
        bot = BotPlayer(name, seat, buy_in=10000) # Default buyin for bot
        self.seats[seat] = bot
        self.add_log(f"Bot {name} added at seat {seat}.")
        
        if len(self.seats) >= 2 and self.state == "WAITING":
            self.start_hand()
            
        return {"success": True, "seat": seat, "game_state": self.to_dict()}

    def remove_player(self, user_id: str) -> Dict:
        seat_to_remove = None
        player = None
        
        for seat, p in self.seats.items():
            if p.user_id == user_id:
                seat_to_remove = seat
                player = p
                break
        
        if seat_to_remove is not None:
            refund = player.chips if not player.is_bot else 0
            
            del self.seats[seat_to_remove]
            self.add_log(f"{player.name} left the table.")
            
            if self.state != "WAITING":
                if len(self.seats) < 2:
                    self.end_hand(winner_by_fold=True)
                elif self.current_player_seat == seat_to_remove:
                    self.next_turn()
            
            return {"success": True, "refund": refund}
            
        return {"error": "Player not found"}
    
    def remove_bot(self) -> Dict:
        # Remove the first bot found
        for seat, p in self.seats.items():
            if p.is_bot:
                del self.seats[seat]
                self.add_log(f"Bot {p.name} removed.")
                
                if self.state != "WAITING":
                    if len(self.seats) < 2:
                         self.end_hand(winner_by_fold=True)
                    elif self.current_player_seat == seat:
                         self.next_turn()
                return {"success": True, "game_state": self.to_dict()}
        return {"error": "No bots to remove"}

    def start_hand(self):
        if len(self.seats) < 2:
             self.state = "WAITING"
             return

        self.state = "PREFLOP"
        self.deck = Deck()
        self.community_cards = []
        self.pot = 0
        self.current_bet = 0
        self.logs = []
        
        # Move dealer button
        active_seats = sorted([s for s in self.seats.keys()])
        
        try:
             curr_idx = active_seats.index(self.dealer_seat)
             dealer_idx = (curr_idx + 1) % len(active_seats)
        except ValueError:
             dealer_idx = 0
             
        self.dealer_seat = active_seats[dealer_idx]
        
        # Reset players
        for p in self.seats.values():
            p.hand = [self.deck.draw(), self.deck.draw()]
            p.current_bet = 0
            p.is_folded = False
            p.is_all_in = False
            p.last_action = None
        
        sb_seat = active_seats[(dealer_idx + 1) % len(active_seats)]
        bb_seat = active_seats[(dealer_idx + 2) % len(active_seats)]
        
        sb_player = self.seats[sb_seat]
        bb_player = self.seats[bb_seat]
        
        sb_amt = min(sb_player.chips, self.small_blind)
        sb_player.chips -= sb_amt
        sb_player.current_bet = sb_amt
        self.pot += sb_amt
        
        bb_amt = min(bb_player.chips, self.big_blind)
        bb_player.chips -= bb_amt
        bb_player.current_bet = bb_amt
        self.pot += bb_amt
        
        self.current_bet = self.big_blind
        self.min_raise = self.big_blind
        
        utg_idx = (dealer_idx + 3) % len(active_seats)
        self.current_player_seat = active_seats[utg_idx]
        
        # Set timer for first player
        self.turn_deadline = datetime.utcnow() + timedelta(seconds=30)
        
        self.add_log("New hand started.")

    def check_timers(self) -> Optional[Dict]:
        """Check for timed out players."""
        if self.state == "WAITING" or not self.turn_deadline:
            return None
            
        if datetime.utcnow() > self.turn_deadline:
             # Timeout!
             seat = self.current_player_seat
             player = self.seats.get(seat)
             if player:
                 player.consecutive_timeouts += 1
                 self.add_log(f"{player.name} timed out ({player.consecutive_timeouts}/3).")
                 
                 if player.consecutive_timeouts >= 3:
                     # Kick
                     refund = player.chips if not player.is_bot else 0
                     del self.seats[seat]
                     self.add_log(f"{player.name} kicked for inactivity.")
                     
                     # Check if game should end
                     if len(self.seats) < 2:
                         self.end_hand(winner_by_fold=True)
                         return {"type": "KICKED", "user_id": player.user_id, "refund": refund, "game_state": self.to_dict()}
                     
                     self.next_turn()
                     return {
                        "type": "KICKED", 
                        "user_id": player.user_id, 
                        "refund": refund, 
                        "game_state": self.to_dict(), 
                        "next_is_bot": self.seats[self.current_player_seat].is_bot if self.current_player_seat in self.seats else False
                     }
                 
                 else:
                     # Auto Fold
                     player.is_folded = True
                     player.last_action = "TIMEOUT FOLD"
                     
                     active_counts = len([p for p in self.seats.values() if not p.is_folded])
                     if active_counts == 1:
                         self.end_hand(winner_by_fold=True)
                     else:
                         self.next_turn()
                         
                     return {
                        "type": "TIMEOUT", 
                        "game_state": self.to_dict(), 
                        "next_is_bot": self.seats[self.current_player_seat].is_bot if self.current_player_seat in self.seats else False
                     }

        return None

    def handle_action(self, user_id: str, action: str, amount: int = 0) -> Dict:
        player = None
        for p in self.seats.values():
            if p.user_id == user_id:
                player = p
                break
        
        if not player or player.seat != self.current_player_seat:
            return {"error": "Not your turn"}
        
        if action == "FOLD":
            player.is_folded = True
            player.last_action = "FOLD"
            player.consecutive_timeouts = 0
            self.add_log(f"{player.name} folded.")
            
            active_counts = len([p for p in self.seats.values() if not p.is_folded])
            if active_counts == 1:
                self.end_hand(winner_by_fold=True)
                return {"success": True, "game_state": self.to_dict()}
                
        elif action == "CALL":
            call_amt = self.current_bet - player.current_bet
            if call_amt > player.chips:
                call_amt = player.chips 
            
            player.chips -= call_amt
            player.current_bet += call_amt
            self.pot += call_amt
            player.last_action = "CALL"
            if player.chips == 0:
                 player.is_all_in = True
            player.consecutive_timeouts = 0
            self.add_log(f"{player.name} called {call_amt}.")
            
        elif action == "CHECK":
            if player.current_bet < self.current_bet:
                 return {"error": "Cannot check, must call"}
            player.last_action = "CHECK"
            player.consecutive_timeouts = 0
            self.add_log(f"{player.name} checked.")
            
        elif action == "RAISE":
            total_bet = amount
            if total_bet < self.current_bet + self.min_raise and total_bet != player.chips + player.current_bet:
                 return {"error": f"Minimum raise is to {self.current_bet + self.min_raise}"}
            
            needed = total_bet - player.current_bet
            if needed > player.chips:
                 return {"error": "Not enough chips"}
            
            self.min_raise = total_bet - self.current_bet
            player.chips -= needed
            player.current_bet = total_bet
            self.pot += needed
            self.current_bet = total_bet
            player.last_action = f"RAISE {total_bet}"
            if player.chips == 0:
                 player.is_all_in = True
            player.consecutive_timeouts = 0
            self.add_log(f"{player.name} raised to {total_bet}.")

        result = self.next_turn()
        return {"success": True, "game_state": self.to_dict(), "next_is_bot": result.get("next_is_bot", False) if result else False}

    def next_turn(self):
        active_seats = sorted([s for s in self.seats.keys()])
        if not active_seats: return {}
        
        try:
            curr_idx = active_seats.index(self.current_player_seat)
        except:
            curr_idx = 0
            
        next_idx = (curr_idx + 1) % len(active_seats)
        next_seat = active_seats[next_idx]
        
        # Loop to find next valid player
        start_seat = next_seat
        loop_count = 0
        
        while loop_count < len(active_seats):
            p = self.seats[next_seat]
            if not p.is_folded and not p.is_all_in:
                break
            next_idx = (next_idx + 1) % len(active_seats)
            next_seat = active_seats[next_idx]
            loop_count += 1
            
        all_matched = True
        active_players = [p for p in self.seats.values() if not p.is_folded]
        not_all_in_players = [p for p in active_players if not p.is_all_in]
        
        for p in active_players:
            if p.current_bet != self.current_bet and not p.is_all_in:
                all_matched = False
                break
        
        can_advance = all_matched
        
        if self.state == "PREFLOP" and all_matched:
             # Preflop special case: If active player is BB and bets are matched, 
             # usually BB gets option to check. But here we simplify.
             pass
        
        if can_advance and (len(not_all_in_players) <= 1 or self.are_all_bets_equal()):
             if self.check_advance_street():
                 return {"next_is_bot": self.seats[self.current_player_seat].is_bot if self.current_player_seat in self.seats else False}
        
        self.current_player_seat = next_seat
        self.turn_deadline = datetime.utcnow() + timedelta(seconds=30)
        
        return {"next_is_bot": self.seats[self.current_player_seat].is_bot}

    def are_all_bets_equal(self):
        bet = self.current_bet
        for p in self.seats.values():
            if not p.is_folded and not p.is_all_in:
                if p.current_bet != bet:
                    return False
        return True

    def check_advance_street(self):
         for p in self.seats.values():
             p.current_bet = 0
         self.current_bet = 0
         self.min_raise = self.big_blind
         
         if self.state == "PREFLOP":
             self.state = "FLOP"
             self.community_cards = [self.deck.draw() for _ in range(3)]
             self.add_log("Flop dealt.")
         elif self.state == "FLOP":
             self.state = "TURN"
             self.community_cards.append(self.deck.draw())
             self.add_log("Turn dealt.")
         elif self.state == "TURN":
             self.state = "RIVER"
             self.community_cards.append(self.deck.draw())
             self.add_log("River dealt.")
         elif self.state == "RIVER":
             self.state = "SHOWDOWN"
             self.end_hand()
             return True
             
         active_seats = sorted([s for s in self.seats.keys()])
         dealer_idx = active_seats.index(self.dealer_seat)
         
         next_idx = (dealer_idx + 1) % len(active_seats)
         for _ in range(len(active_seats)):
             seat = active_seats[next_idx]
             if not self.seats[seat].is_folded and not self.seats[seat].is_all_in:
                 self.current_player_seat = seat
                 break
             next_idx = (next_idx + 1) % len(active_seats)
        
         self.turn_deadline = datetime.utcnow() + timedelta(seconds=30)
         return False

    def end_hand(self, winner_by_fold=False):
        winners = []
        if winner_by_fold:
            for p in self.seats.values():
                if not p.is_folded:
                    winners = [p]
                    break
        else:
            active = [p for p in self.seats.values() if not p.is_folded]
            
            # Simple Scoring
            best_rank = -1
            best_score = -1
            
            for p in active:
                rank, score = self.evaluate_hand(p.hand, self.community_cards)
                if rank > best_rank:
                    best_rank = rank
                    best_score = score
                    winners = [p]
                elif rank == best_rank:
                    if score > best_score:
                        best_score = score
                        winners = [p]
                    elif score == best_score:
                        winners.append(p)
                    
        share = self.pot // len(winners) if winners else 0
        for w in winners:
            w.chips += share
            self.add_log(f"{w.name} wins {share}!")
            
        self.state = "WAITING"
        self.pot = 0
        
    def evaluate_hand(self, hole_cards, community_cards):
        # Returns (Rank, Score)
        # 0: High Card, 1: Pair, 2: Two Pair, 3: Trips, 4: Straight, 5: Flush, 6: FH, 7: Quads, 8: SF
        
        cards = hole_cards + community_cards
        ranks = sorted([c.value for c in cards], reverse=True)
        suits = [c.suit for c in cards]
        
        # Flush
        is_flush = False
        for s in SUITS:
            if suits.count(s) >= 5:
                is_flush = True
                break
        
        # Straight
        unique_ranks = sorted(list(set(ranks)), reverse=True)
        is_straight = False
        streak = 0
        last_val = -2
        for r in unique_ranks:
            if r == last_val - 1:
                streak += 1
            else:
                streak = 1
            last_val = r
            if streak >= 5:
                is_straight = True
                break
        
        # Multiples
        counts = {}
        for r in ranks: counts[r] = counts.get(r, 0) + 1
        
        pairs = [r for r, c in counts.items() if c == 2]
        trips = [r for r, c in counts.items() if c == 3]
        quads = [r for r, c in counts.items() if c == 4]
        
        score = sum(ranks[:5]) 
        
        if is_straight and is_flush: return 8, score
        if quads: return 7, score
        if trips and pairs: return 6, score
        if is_flush: return 5, score
        if is_straight: return 4, score
        if trips: return 3, score
        if len(pairs) >= 2: return 2, score
        if pairs: return 1, score
        
        return 0, score
        
    def add_log(self, msg):
        self.logs.append({"time": datetime.utcnow().isoformat(), "msg": msg})
        if len(self.logs) > 50: self.logs.pop(0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            "seats": {k: v.to_dict(show_hand=False) for k, v in self.seats.items()}, 
            "community_cards": [c.to_dict() for c in self.community_cards],
            "pot": self.pot,
            "current_bet": self.current_bet,
            "dealer_seat": self.dealer_seat,
            "current_player_seat": self.current_player_seat,
            "logs": self.logs,
            "turn_deadline": self.turn_deadline.isoformat() if self.turn_deadline else None,
            "limits": {"min": self.min_buy_in, "max": self.max_buy_in, "sb": self.small_blind, "bb": self.big_blind}
        }
    
    def get_player_state(self, user_id):
        base = self.to_dict()
        for seat, p in self.seats.items():
            if p.user_id == user_id:
                base["seats"][seat] = p.to_dict(show_hand=True)
                base["me"] = p.to_dict(show_hand=True)
                break
        return base

poker_engine = {
    "tables": {
        "1": PokerTable("1", "Rookie Table", small_blind=50, big_blind=100, min_buy=100, max_buy=100000),
        "2": PokerTable("2", "Pro Table", small_blind=250, big_blind=500, min_buy=500, max_buy=500000),
        "3": PokerTable("3", "Whale Table", small_blind=500, big_blind=1000, min_buy=1000, max_buy=1000000),
    }
}
