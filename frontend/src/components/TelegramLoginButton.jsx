import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        console.log('DEBUG AUTH: [Button] Rendering init. botName:', botName);

        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.innerHTML !== '') {
            console.log('DEBUG AUTH: [Button] Container already full, skipping script inject');
            return;
        }

        const cleanBotName = botName.replace('@', '');
        console.log('DEBUG AUTH: [Button] Target Bot:', cleanBotName);

        // We use the standardized name that Lobby.jsx also listens to
        const callbackName = 'onTelegramAuth';

        // Define the global callback BEFORE appending the script
        // This prevents race conditions where Telegram script might call it immediately
        if (dataOnauth) {
            console.log('DEBUG AUTH: [Button] Setting up window.' + callbackName);
            window[callbackName] = (data) => {
                console.log("DEBUG AUTH: [Widget] CALLBACK TRIGGERED!");
                console.log("DEBUG AUTH: [Widget] Received Data ID:", data?.id);
                console.log("DEBUG AUTH: [Widget] Data Body:", data);
                dataOnauth(data);
            };
        } else {
            console.warn('DEBUG AUTH: [Button] missing dataOnauth handler');
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

        script.onload = () => console.log("DEBUG AUTH: [Button] TG script successfully LOADED");
        script.onerror = (e) => console.error("DEBUG AUTH: [Button] TG script FAILED to load", e);

        if (containerRef.current) {
            console.log('DEBUG AUTH: [Button] Appending <script> to DOM');
            containerRef.current.appendChild(script);
        }

        return () => {
            console.log('DEBUG AUTH: [Button] Clean up / Unmount');
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

    return (
        <div className="telegram-login-button-container">
            <div ref={containerRef} className="telegram-login-button" />
        </div>
    );
};

export default TelegramLoginButton;
