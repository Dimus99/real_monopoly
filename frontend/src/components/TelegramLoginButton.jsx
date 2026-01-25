import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        // Create a persistent stable callback
        const authCallback = (user) => {
            console.log("Global onTelegramAuth triggered!", user);
            if (dataOnauth) dataOnauth(user);
        };

        window.onTelegramAuth = authCallback;

        // Sanitize bot name (remove @ if present)
        const cleanBotName = botName.replace('@', '');
        console.log('Initializing Telegram Widget with bot:', cleanBotName);

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-onauth', 'onTelegramAuth');
        script.setAttribute('data-request-access', requestAccess);
        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        containerRef.current.appendChild(script);

        return () => {
            // We don't remove the global callback immediately to avoid race conditions
            // during component unmounting/loading state changes
        };
    }, [botName, dataOnauth, buttonSize, cornerRadius, requestAccess, usePic]);

    return (
        <div className="telegram-login-button-container">
            <div ref={containerRef} className="telegram-login-button" />
        </div>
    );
};

export default TelegramLoginButton;
