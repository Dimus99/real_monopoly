import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.innerHTML !== '') {
            return;
        }

        const cleanBotName = botName.replace('@', '');
        console.log('DEBUG AUTH: [Button] Rendering widget for:', cleanBotName);

        // We use the standardized name that Lobby.jsx also listens to
        const callbackName = 'onTelegramAuth';

        // Define the global callback BEFORE appending the script
        // This prevents race conditions where Telegram script might call it immediately
        if (dataOnauth) {
            window[callbackName] = (data) => {
                console.log("DEBUG AUTH: [Widget] Global callback triggered!");
                dataOnauth(data);
            };
        }

        // Ensure the container is truly empty
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-onauth', callbackName);
        script.setAttribute('data-request-access', requestAccess);
        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        script.onload = () => console.log("DEBUG AUTH: [Button] Widget script injected and loaded");
        script.onerror = (e) => console.error("DEBUG AUTH: [Button] Widget script failed", e);

        if (containerRef.current) {
            containerRef.current.appendChild(script);
        }


        return () => {
            // Cleanup on unmount - but carefully
            // Actually better not to touch global callback here to avoid race conditions
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

    return (
        <div className="telegram-login-button-container">
            <div ref={containerRef} className="telegram-login-button" />
        </div>
    );
};

export default TelegramLoginButton;
