import os
import httpx
from typing import Optional

# Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
# Usually for Telegram Mini Apps the link is: https://t.me/botname/appname?startapp=parameter
# Or if it's the main app of the bot: https://t.me/botname?startapp=parameter
BOT_USERNAME = os.getenv("BOT_USERNAME")
# The name of the Mini App in BotFather. If empty, the link format changes to the direct bot-app link
APP_SHORT_NAME = os.getenv("TG_APP_NAME")

async def send_telegram_game_invite(
    to_telegram_id: int, 
    from_user_name: str, 
    game_id: str, 
    map_type: str
) -> bool:
    """
    Sends a Telegram message to a user inviting them to a game.
    Includes an inline button to join via the Mini App.
    """
    if not BOT_TOKEN:
        print("TELEGRAM: Cannot send invite - BOT_TOKEN not set")
        return False
        
    if not to_telegram_id:
        print("TELEGRAM: Cannot send invite - No target telegram_id")
        return False

    # Construct the Mini App deep link
    # Ref: https://core.telegram.org/bots/webapps#direct-links
    # If not provided, we try the direct bot link: https://t.me/botname?startapp=parameter
    
    # Read at runtime because it might be fetched during lifespan startup
    bot_name = os.getenv("BOT_USERNAME") or "monopoly_haha_bot"
    app_target = os.getenv("TG_APP_NAME")
    
    if app_target:
        join_url = f"https://t.me/{bot_name}/{app_target}?startapp={game_id}"
    else:
        # Many bots use the main app attached to the bot username
        join_url = f"https://t.me/{bot_name}?startapp={game_id}"
    
    text = (
        f"🎲 *{from_user_name}* вызывает тебя на партию в монополию!\n\n"
        f"🗺 Карта: *{map_type}*\n"
        f"🆔 Лобби: `{game_id}`\n\n"
        f"Нажми кнопку ниже, чтобы войти в игру 👇"
    )
    
    payload = {
        "chat_id": to_telegram_id,
        "text": text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[
                {"text": "🚀 Ворваться в игру", "url": join_url}
            ]]
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            response = await client.post(url, json=payload, timeout=10.0)
            
            if response.status_code == 200:
                print(f"TELEGRAM: Invite sent successfully to {to_telegram_id}")
                return True
            else:
                print(f"TELEGRAM: Failed to send invite. Status: {response.status_code}, Resp: {response.text}")
                return False
                
    except Exception as e:
        print(f"TELEGRAM: Exception while sending invite: {e}")
        return False
