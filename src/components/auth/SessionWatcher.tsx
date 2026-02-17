"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

export default function SessionWatcher() {
    const { data: session } = useSession();
    const initialUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        // 1. Set initial user ID on mount (if session exists)
        if (session?.user?.id && !initialUserIdRef.current) {
            initialUserIdRef.current = session.user.id;
        }

        // 2. Setup LocalStorage Listener for cross-tab communication
        // We use localStorage because it triggers an event in other tabs reliably
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === "auth_event") {
                const message = event.newValue;
                if (message === "login") {
                    // Another tab logged in.
                    // Setting window.location.href = "/login" provides the visual "logout".
                    // Note: We do NOT call signOut() here because that would clear the cookie
                    // and log out the *new* user in the other tab too!
                    window.location.href = "/login";
                }
                if (message === "logout") {
                    // Another tab logged out. We should sync.
                    // Here we CAN call signOut because the session is meant to be destroyed.
                    signOut({ redirect: true, callbackUrl: "/login" });
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);

        // 3. Check Visibility Change (Focus)
        const handleVisibilityChange = async () => {
            if (document.visibilityState === "visible") {
                // When tab becomes visible, check if session is still valid/same
                // If the cookie changed, useSession might not update immediately without refetch
                // We can force a reload if we detect mismatch, or just rely on the BroadcastChannel

                const res = await fetch("/api/auth/session");
                const newSession = await res.json();

                if (!newSession?.user) {
                    // Session is gone (logged out elsewhere)
                    if (initialUserIdRef.current) {
                        signOut({ redirect: true, callbackUrl: "/login" });
                    }
                } else if (newSession.user.id !== initialUserIdRef.current) {
                    // Session user changed
                    signOut({ redirect: true, callbackUrl: "/login" });
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // 4. Notify other tabs when WE login/logout
        // This part is tricky because SessionWatcher mounts *after* login usually.
        // Ideally, the Login page should send the broadcast. 
        // BUT, if we just rely on visibility + existing session polling, it might be enough.
        // However, to be "instant", we can emit event here if we detect we just mounted with a session?
        // No, that fires on every refresh.

        // Better strategy:
        // Just listen for visibility and maybe polling.
        // AND modify the LoginForm to send a message? Or just rely on cookie change?
        // User asked "if tab b login, tab a logout".
        // So Tab B (Login form) needs to say "I logged in".

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [session]);

    return null;
}
