import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../app/contexts/UserContext";

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const router = useRouter();
  const { refreshUserData } = useUser();

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log("Redirect URL:", url);

      // Exchange code for Supabase session
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        console.error("Auth error:", error.message);
        return;
      }

      if (data?.session) {
        console.log("Logged in with Google:", data.session.user.email);
        
        // Fetch user data from backend after successful OAuth
        await refreshUserData();
        
        router.replace("/home");
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [refreshUserData, router]);

  return null;
}