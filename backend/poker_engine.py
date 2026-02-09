import random
import asyncio
from typing import Dict, List, Optional, Any, Tuple
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
    
    def __eq__(self, other):
        return isinstance(other, Card) and self.rank == other.rank and self.suit == other.suit
    
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
        self.acted_street = False
        self.total_wagered = 0
        self.current_hand_strength = None # Cache for the frontend display
    
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
            "is_bot": self.is_bot,
            "current_hand": self.current_hand_strength
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
        self.max_seats = 8
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
        self.winning_cards = []
        self.winners_ids = []
        
        # Turn Management
        self.turn_deadline = None # Datetime when turn expires
        
        # Logs
        self.last_activity = datetime.utcnow()
        self.logs = []
        
        # Dealer Message
        self.dealer_message = None
        self.dealer_message_expires = None

    def get_empty_seat(self) -> int:
        for i in range(self.max_seats):
            if i == 4: continue # Reserve Top Center for Dealer (matches Frontend visual)
            if i not in self.seats:
                return i
        return -1

    def add_player(self, user: User, buy_in: int, requested_seat: int = None) -> Dict:
        if buy_in < self.min_buy_in:
             return {"error": f"Minimum buy-in is {self.min_buy_in}"}
        if buy_in > self.max_buy_in:
             return {"error": f"Maximum buy-in is {self.max_buy_in}"}

        # Check if already seated
        for p in self.seats.values():
            if p.user_id == user.id:
                 return {"success": True, "seat": p.seat, "state": self.to_dict(), "message": "Already seated"}

        seat = -1
        if requested_seat is not None:
             if 0 <= requested_seat < self.max_seats and requested_seat != 4 and requested_seat not in self.seats:
                 seat = requested_seat
        
        if seat == -1:
            seat = self.get_empty_seat()
            
        if seat == -1:
            return {"error": "Table is full"}
        
        player = PokerPlayer(user, buy_in, seat)
        
        # If joining mid-game, wait for next hand
        if self.state != "WAITING":
            player.is_folded = True
            player.last_action = "Wait next"
            
        self.seats[seat] = player
        self.add_log(f"{user.name} joined the table.")
        
        # REMOVED AUTO START
        # if len(self.seats) >= 2 and self.state == "WAITING":
        #    self.start_hand()
            
        return {"success": True, "seat": seat, "state": self.to_dict()}
    
    def add_bot(self) -> Dict:
        seat = self.get_empty_seat()
        if seat == -1: return {"error": "Table full"}
        
        bot_names = ["PokerBot3000", "FishHunter", "AllInAnyTwo", "GTO_Wizard", "Terminator"]
        name = random.choice(bot_names)
        bot = BotPlayer(name, seat, buy_in=10000) # Default buyin for bot
        self.seats[seat] = bot
        self.add_log(f"Bot {name} added at seat {seat}.")
        
        # REMOVED AUTO START
        # if len(self.seats) >= 2 and self.state == "WAITING":
        #    self.start_hand()
            
        return {"success": True, "seat": seat, "state": self.to_dict()}

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
                return {"success": True, "state": self.to_dict()}
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
        self.winning_cards = []
        self.winners_ids = []
        
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
            p.total_wagered = 0
            p.is_folded = False
            p.is_all_in = False
            p.last_action = None
            p.acted_street = False
            p.current_hand_strength = None
        
        sb_seat = active_seats[(dealer_idx + 1) % len(active_seats)]
        bb_seat = active_seats[(dealer_idx + 2) % len(active_seats)]
        
        sb_player = self.seats[sb_seat]
        bb_player = self.seats[bb_seat]
        
        sb_amt = min(sb_player.chips, self.small_blind)
        sb_player.chips -= sb_amt
        sb_player.current_bet = sb_amt
        sb_player.total_wagered = sb_amt
        self.pot += sb_amt
        if sb_player.chips == 0: sb_player.is_all_in = True
        
        bb_amt = min(bb_player.chips, self.big_blind)
        bb_player.chips -= bb_amt
        bb_player.current_bet = bb_amt
        bb_player.total_wagered = bb_amt
        self.pot += bb_amt
        if bb_player.chips == 0: bb_player.is_all_in = True
        
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
            
        # New: Auto-restart after Showdown
        if self.state == "SHOWDOWN":
             if self.turn_deadline and datetime.utcnow() > self.turn_deadline:
                 if len(self.seats) >= 2:
                     self.start_hand()
                     next_is_bot = self.seats[self.current_player_seat].is_bot if self.current_player_seat in self.seats else False
                     return {"type": "GAME_UPDATE", "state": self.to_dict(), "message": "Next hand starting...", "next_is_bot": next_is_bot}
                 else:
                     self.state = "WAITING"
                     return {"type": "GAME_UPDATE", "state": self.to_dict(), "message": "Waiting for players..."}
             return None

        if self.dealer_message_expires and datetime.utcnow() > self.dealer_message_expires:
             self.dealer_message = None
             self.dealer_message_expires = None
             # We return update to clear it
             return {"type": "GAME_UPDATE", "state": self.to_dict()}

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
                         return {"type": "KICKED", "user_id": player.user_id, "refund": refund, "state": self.to_dict()}
                     
                     self.next_turn()
                     return {
                        "type": "KICKED", 
                        "user_id": player.user_id, 
                        "refund": refund, 
                        "state": self.to_dict(), 
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
                        "state": self.to_dict(), 
                        "next_is_bot": self.seats[self.current_player_seat].is_bot if self.current_player_seat in self.seats else False
                     }

        return None

    def handle_action(self, user_id: str, action: str, amount: int = 0) -> Dict:
        if self.state == "SHOWDOWN":
            return {"error": "Hand is over, waiting for next deal"}

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
            player.total_wagered += call_amt
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
            # Validation: Min raise is current_bet + min_raise, unless all-in
            min_valid_raise = self.current_bet + self.min_raise
            
            # Exception: User can go all-in for less than min_raise
            if total_bet < min_valid_raise:
                 if total_bet != player.chips + player.current_bet:
                     return {"error": f"Minimum raise is to {min_valid_raise}"}
            
            needed = total_bet - player.current_bet
            if needed > player.chips:
                 return {"error": "Not enough chips"}
            
            # Logic for updating min_raise logic:
            # If the raise is a full valid raise, update min_raise
            current_raise_amt = total_bet - self.current_bet
            if current_raise_amt >= self.min_raise:
                 self.min_raise = current_raise_amt
            
            player.chips -= needed
            player.current_bet = total_bet
            player.total_wagered += needed
            self.pot += needed
            self.current_bet = total_bet
            player.last_action = f"RAISE {total_bet}"
            if player.chips == 0:
                 player.is_all_in = True
            player.consecutive_timeouts = 0
            self.add_log(f"{player.name} raised to {total_bet}.")
            
        elif action == "TIP_DEALER":
            if player.chips < 10:
                return {"error": "Not enough chips to tip ($10)"}
            player.chips -= 10
            phrases = [
                "Thank you! Good luck!", "Much appreciated!", "Creating a connection...", 
                "You're too kind!", "May the flop be with you!", "Karma points added!"
            ]
            self.dealer_message = random.choice(phrases)
            self.dealer_message_expires = datetime.utcnow() + timedelta(seconds=5)
            self.add_log(f"{player.name} tipped the dealer $10.")
            return {"success": True, "game_state": self.to_dict()}
            
        elif action == "SEND_REACTION":
            target_seat = amount
            emoji = kwargs.get('emoji', '🤡')
            if target_seat not in self.seats:
                 return {"error": "Invalid target"}
            
            return {
                "success": True, 
                "game_state": self.to_dict(),
                "type": "REACTION_ANIMATION",
                "emoji": emoji,
                "from_seat": player.seat,
                "to_seat": target_seat
            }

        player.acted_street = True
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
            if not p.is_folded and not p.is_all_in and len(p.hand) > 0:
                break
            next_idx = (next_idx + 1) % len(active_seats)
            next_seat = active_seats[next_idx]
            loop_count += 1
            
        all_matched = True
        all_acted = True
        active_players = [p for p in self.seats.values() if not p.is_folded]
        not_all_in_players = [p for p in active_players if not p.is_all_in]
        
        for p in active_players:
            if p.current_bet != self.current_bet and not p.is_all_in:
                all_matched = False
                break
            if not p.acted_street and not p.is_all_in:
                 # Big Blind Special Case: If Preflop, and p is BB, and no raises -> BB still needs to Check
                 # Generally, assume if not acted, can't advance.
                 all_acted = False
        
        can_advance = all_matched and all_acted
        
        # Special Case: Walk (Everyone folded to BB) happens in FOLD logic end_hand(winner_by_fold).
        # Special Case: Preflop, BB matches but hasn't acted?
        # If all_matched is True, but all_acted is False (BB needs to act).
        # Logic holds: can_advance = False. Action goes to BB.
        
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
             p.acted_street = False
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
        winning_score = (-1,)
        winning_cards = []
        
        overall_winners_ids = []
        
        if winner_by_fold:
            # Everyone folded except one
            remaining = [p for p in self.seats.values() if not p.is_folded]
            if remaining:
                w = remaining[0]
                w.chips += self.pot
                self.add_log(f"{w.name} wins {self.pot} by fold!")
                overall_winners_ids.append(w.user_id)
        else:
            # Showdown with Side Pots Logic
            active_players = [p for p in self.seats.values() if not p.is_folded]
            all_players = list(self.seats.values())
            
            # Sort active players by total wagered to create side pots
            # Filter out 0 wagered if any (shouldn't be if active)
            active_players.sort(key=lambda p: p.total_wagered)
            
            pots = [] 
            prev_limit = 0
            
            for p in active_players:
                limit = p.total_wagered
                if limit <= prev_limit:
                    continue
                
                pot_amount = 0
                for ap in all_players:
                    contribution = max(0, min(ap.total_wagered, limit) - prev_limit)
                    pot_amount += contribution
                
                if pot_amount > 0:
                    eligible = [ap for ap in active_players if ap.total_wagered >= limit]
                    pots.append({"amount": pot_amount, "eligible": eligible})
                    
                prev_limit = limit
                
            # Now resolve each side pot
            for i, pot_obj in enumerate(pots):
                amount = pot_obj["amount"]
                eligible = pot_obj["eligible"]
                
                # Evaluate hands for eligible players
                pot_winners = []
                best_rank_val = -1
                best_score_val = (-1,)
                best_pot_cards = []
                
                for player in eligible:
                    rank, score, best_hand = self.evaluate_hand(player.hand, self.community_cards)
                    
                    # Store strength for display
                    player.current_hand_strength = {
                        "rank": rank,
                        "name": self.get_hand_name(rank),
                        "best_cards": [c.to_dict() for c in best_hand],
                        "uses_my_cards": any(c in best_hand for c in player.hand)
                    }
                    
                    if rank > best_rank_val:
                        best_rank_val = rank
                        best_score_val = score
                        pot_winners = [player]
                        best_pot_cards = best_hand
                    elif rank == best_rank_val:
                        if score > best_score_val:
                            best_score_val = score
                            pot_winners = [player]
                            best_pot_cards = best_hand
                        elif score == best_score_val:
                            pot_winners.append(player)
                
                # Distribute pot
                if pot_winners:
                    share = amount // len(pot_winners)
                    remainder = amount % len(pot_winners)
                    
                    hand_name = self.get_hand_name(best_rank_val)
                    
                    for idx, w in enumerate(pot_winners):
                        extra = 1 if idx < remainder else 0 # Simple remainder distribution
                        win_amt = share + extra
                        w.chips += win_amt
                        if w.user_id not in overall_winners_ids:
                             overall_winners_ids.append(w.user_id)
                        
                        # Only add main pot log
                        # self.add_log(f"{w.name} wins {win_amt} from side pot {i+1} with {hand_name}!")
                    
                    pot_desc = "Main Pot" if i == len(pots)-1 else f"Side Pot {i+1}"
                    names = ", ".join([w.name for w in pot_winners])
                    self.add_log(f"{names} win {amount} ({pot_desc}) with {hand_name}")
                    
                    # Update global winning cards to the best hand of the LAST pot (Main Pot usually) for display
                    if i == len(pots) - 1:
                        winning_cards = best_pot_cards
            
        self.winners_ids = overall_winners_ids
        self.winning_cards = winning_cards
        
        self.state = "SHOWDOWN" # Ensure state is designated as finished/showdown
        
        self.turn_deadline = datetime.utcnow() + timedelta(seconds=10) # 10s to see results

    def evaluate_hand(self, hole_cards: List[Card], community_cards: List[Card]) -> Tuple[int, Tuple, List[Card]]:
        # Returns (RankCategory, ScoreTuple, BestCards)
        # RankCategory: 0-8 (High Card to Straight Flush)
        # ScoreTuple: Tuple for tie-breaking (e.g., (14, 13, 12, 11, 10))
        
        all_cards = hole_cards + community_cards
        import itertools
        
        best_rank = -1
        best_score_tuple = (-1,)
        best_hand = []
        
        # Performance note: 7 choose 5 is 21 combinations. Very fast.
        for combo in itertools.combinations(all_cards, 5):
            combo = list(combo)
            rank, score_tuple = self._eval_5(combo)
            
            # Tuple comparison handles tie-breaking automatically
            if rank > best_rank:
                best_rank = rank
                best_score_tuple = score_tuple
                best_hand = combo
            elif rank == best_rank:
                if score_tuple > best_score_tuple:
                    best_score_tuple = score_tuple
                    best_hand = combo
                
        return best_rank, best_score_tuple, best_hand

    def get_hand_name(self, rank):
        hand_ranks = {
            0: "High Card", 1: "Pair", 2: "Two Pair", 3: "Three of a Kind",
            4: "Straight", 5: "Flush", 6: "Full House", 7: "Four of a Kind", 8: "Straight Flush"
        }
        return hand_ranks.get(rank, "Unknown")

    def _eval_5(self, cards: List[Card]) -> Tuple[int, Tuple]:
        # Returns (Category, TieBreakerTuple)
        # Sort by rank descending
        ranks = sorted([c.value for c in cards], reverse=True)
        suits = [c.suit for c in cards]
        
        is_flush = len(set(suits)) == 1
        
        # Ace is value 12 (in 0-12 scale). 2 is 0. 
        # Check Straight
        unique_ranks = sorted(list(set(ranks)), reverse=True)
        is_straight = (len(unique_ranks) == 5) and (unique_ranks[0] - unique_ranks[-1] == 4)
        
        # Wheel Check: A, 5, 4, 3, 2 -> [12, 3, 2, 1, 0]
        # Converted to 5-high straight
        if not is_straight and set(ranks) == {12, 3, 2, 1, 0}:
            is_straight = True
            ranks = [3, 2, 1, 0, -1] # Adjust ranks for score tuple so 5 is high

        if is_straight and is_flush:
            return 8, tuple(ranks)
            
        counts = {}
        for r in ranks: counts[r] = counts.get(r, 0) + 1
        
        # Sort counts to find pairs/trips
        # group by count, then by rank
        # Example Full House: {Rank: Count} -> (3, PairRank), (2, LowRank)
        
        sorted_by_count = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
        # structure: [(rank, count), (rank, count)...]
        
        pattern = tuple(count for rank, count in sorted_by_count)
        tie_breakers = tuple(rank for rank, count in sorted_by_count)
        
        if pattern == (4, 1):
            return 7, tie_breakers # Quads: (QuadRank, Kicker)
        if pattern == (3, 2):
            return 6, tie_breakers # Full House: (TripsRank, PairRank)
        if is_flush:
            return 5, tuple(ranks) # Flush: (R1, R2, R3, R4, R5)
        if is_straight:
            return 4, tuple(ranks) # Straight: (HighRank) - Wheel handled above
        if pattern == (3, 1, 1):
            return 3, tie_breakers # Trips: (TripRank, K1, K2)
        if pattern == (2, 2, 1):
            return 2, tie_breakers # Two Pair: (HighPair, LowPair, Kicker)
        if pattern == (2, 1, 1, 1):
            return 1, tie_breakers # Pair: (PairRank, K1, K2, K3)
        
        return 0, tuple(ranks)
        
    def add_log(self, msg):
        self.logs.append({"time": datetime.utcnow().isoformat() + "Z", "msg": msg})
        if len(self.logs) > 50: self.logs.pop(0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            "seats": {k: v.to_dict(show_hand=(self.state == "SHOWDOWN")) for k, v in self.seats.items()}, 
            "community_cards": [c.to_dict() for c in self.community_cards],
            "pot": self.pot,
            "current_bet": self.current_bet,
            "min_raise": self.min_raise,
            "dealer_seat": self.dealer_seat,
            "current_player_seat": self.current_player_seat,
            "logs": self.logs,
            "turn_deadline": (self.turn_deadline.isoformat() + "Z") if self.turn_deadline else None,
            "limits": {"min": self.min_buy_in, "max": self.max_buy_in, "sb": self.small_blind, "bb": self.big_blind},
            "winning_cards": [c.to_dict() for c in self.winning_cards],
            "winners_ids": self.winners_ids,
            "dealer_message": self.dealer_message
        }
    
    def get_player_state(self, user_id):
        base = self.to_dict()
        for seat, p in self.seats.items():
            if p.user_id == user_id:
                p_dict = p.to_dict(show_hand=True)
                # Add current hand evaluation for the player themselves
                if p.hand and len(p.hand) == 2:
                    rank, score, best_hand = self.evaluate_hand(p.hand, self.community_cards)
                    
                    uses_my_cards = any(c in best_hand for c in p.hand)
                    
                    p_dict["current_hand"] = {
                        "rank": rank,
                        "name": self.get_hand_name(rank),
                        "best_cards": [c.to_dict() for c in best_hand],
                        "uses_my_cards": uses_my_cards
                    }
                base["seats"][seat] = p_dict
                base["me"] = p_dict
                break
        return base

poker_engine = {
    "tables": {
        "4": PokerTable("4", "Micro Stakes", small_blind=5, big_blind=10, min_buy=50, max_buy=10000),
        "5": PokerTable("5", "Casual", small_blind=15, big_blind=30, min_buy=150, max_buy=30000),
        "1": PokerTable("1", "Rookie Table", small_blind=50, big_blind=100, min_buy=500, max_buy=100000),
        "2": PokerTable("2", "Pro Table", small_blind=250, big_blind=500, min_buy=2500, max_buy=500000),
        "3": PokerTable("3", "Whale Table", small_blind=500, big_blind=1000, min_buy=5000, max_buy=1000000),
    }
}
