import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const currentUrl = window.location.origin + window.location.pathname;
        console.log('DEBUG AUTH: [Button] Rendering init. Bot:', botName, 'AuthURL:', currentUrl);

        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.getAttribute('data-initialized') === botName) {
            console.log('DEBUG AUTH: [Button] Container already initialized for this bot');
            return;
        }

        const cleanBotName = botName.replace('@', '');
        const callbackName = 'onTelegramAuth';

        // Set up callback as fallback
        if (dataOnauth) {
            window[callbackName] = (data) => {
                console.log("DEBUG AUTH: [Widget] Callback triggered (dataOnauth)!");
                dataOnauth(data);
            };
        }

        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            containerRef.current.setAttribute('data-initialized', botName);
        }

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-request-access', requestAccess);

        // Use BOTH for max compatibility. Redirect is more robust.
        script.setAttribute('data-auth-url', currentUrl);
        script.setAttribute('data-onauth', callbackName);

        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        script.onload = () => console.log("DEBUG AUTH: [Button] TG Widget Loaded");
        script.onerror = (e) => console.error("DEBUG AUTH: [Button] TG Widget Load Error", e);

        if (containerRef.current) {
            containerRef.current.appendChild(script);
        }

        return () => {
            console.log('DEBUG AUTH: [Button] Unmounting component');
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

    return (
        <div className="telegram-login-button-container">
            <div ref={containerRef} className="telegram-login-button" />
        </div>
    );
};

export default TelegramLoginButton;
