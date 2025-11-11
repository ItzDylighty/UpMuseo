import React, { useState } from "react";
import { StyleSheet, View, Text, Image, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, } from "react-native";
import { Input, Button, Icon } from "react-native-elements";
import { Link, useRouter } from "expo-router";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "./contexts/UserContext";
import "react-native-url-polyfill/auto";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [focusedInput, setFocusedInput] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const { refreshUserData } = useUser();

  const router = useRouter();
  const commonInputContainerStyle = { borderBottomWidth: 0, height: 30 };

  // Email/Password Login
  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      // Try to fetch user data from backend (graceful failure)
      try {
        await refreshUserData();
        Alert.alert("Success", "Logged in!");
      } catch (backendError) {
        console.warn('[Login] Backend connection failed:', backendError.message);
        Alert.alert(
          "Logged In", 
          "Backend server connection failed - some features may be limited. Please ensure the server is running."
        );
      }
      
      router.replace("/home");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong");
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = Linking.createURL("/auth/callback", {
        scheme: "capstonereact",
      });

      console.log('[OAuth] Starting Google login with redirect:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        console.error('[OAuth] Supabase OAuth error:', error.message);
        setMessage(error.message);
        return;
      }

      if (data?.url) {
        console.log('[OAuth] Opening auth session...');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === "success" && result.url) {
          console.log('[OAuth] Auth session successful, exchanging code...');
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(result.url);

          if (sessionError) {
            console.error('[OAuth] Session exchange error:', sessionError.message);
            setMessage(sessionError.message);
            return;
          }

          if (sessionData?.session) {
            console.log('[OAuth] Session created successfully!');
            
            // Try to fetch user data from backend (graceful failure)
            try {
              console.log('[OAuth] Fetching user data from backend...');
              await refreshUserData();
              console.log('[OAuth] User data fetched successfully');
            } catch (backendError) {
              console.warn('[OAuth] Backend connection failed (non-critical):', backendError.message);
              // Continue anyway - user is authenticated via Supabase
              Alert.alert(
                'Note', 
                'Logged in! Backend server connection failed - some features may be limited until server is running.'
              );
            }
            
            // Navigate to home regardless of backend status
            console.log('[OAuth] Navigating to home...');
            router.replace("/home");
          }
        } else if (result.type === "cancel") {
          console.log('[OAuth] User cancelled login');
          setMessage("Login cancelled");
        } else {
          console.log('[OAuth] Auth session result:', result.type);
        }
      }
    } catch (err) {
      console.error('[OAuth] Unexpected error:', err);
      setMessage("Login failed: " + (err.message || "Something went wrong"));
    }
  };

  // UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Logo */}
            <Image
              source={require("../assets/Museo_Logo.png")}
              style={styles.logo}
            />

            {/* Title */}
            <Text style={styles.title}>LOGIN</Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              {!email && <Text style={styles.placeholderText}>Email</Text>}
              <Input
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={[
                  styles.inputContainer,
                  focusedInput === "email" && styles.focusedContainer,
                ]}
                inputContainerStyle={commonInputContainerStyle}
                inputStyle={styles.inputStyle}
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              {!password && <Text style={styles.placeholderText}>Password</Text>}
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                containerStyle={[
                  styles.inputContainer,
                  focusedInput === "password" && styles.focusedContainer,
                ]}
                inputContainerStyle={commonInputContainerStyle}
                inputStyle={styles.inputStyle}
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
                rightIcon={
                  <Icon
                    name={showPassword ? "eye" : "eye-off"}
                    type="ionicon"
                    color="#000"
                    size={22}
                    onPress={() => setShowPassword(!showPassword)}
                    containerStyle={{ marginTop: 20 }}
                  />
                }
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPassword}>Forgot your password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              title="Login with Email"
              onPress={handleLogin}
              buttonStyle={styles.loginButton}
              titleStyle={styles.loginButtonTitle}
              containerStyle={styles.loginButtonContainer}
            />

            {/* Error Message */}
            {message ? <Text style={styles.errorMsg}>{message}</Text> : null}

            {/* OR Separator */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google Login */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
            >
              <Image
                source={require("../assets/googlelogo.jpg")}
                style={styles.googleLogo}
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Signup Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Create Account?</Text>
              <Link href="/signup" style={styles.signupLink}>
                Register
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: "contain",
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  inputWrapper: {
    width: "100%",
    position: "relative",
  },
  placeholderText: {
    position: "absolute",
    top: 17,
    left: 15,
    color: "#888",
    zIndex: 1,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 5,
  },
  focusedContainer: {
    borderColor: "#000",
    borderWidth: 2,
  },
  inputStyle: {
    fontSize: 18,
    color: "#000",
    top: 12,
    textAlignVertical: "center",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPassword: {
    fontSize: 14,
    color: "#888",
  },
  loginButtonContainer: {
    width: "100%",
  },
  loginButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#000",
  },
  loginButtonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: 25,
  },
  signupText: {
    fontSize: 16,
    color: "#888",
  },
  signupLink: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 5,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    width: "100%",
    justifyContent: "center",
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: "contain",
  },
  googleText: {
    fontSize: 16,
    color: "#000",
  },
  errorMsg: {
    color: "red",
    marginTop: 10,
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginVertical: 15,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: "#888",
  },
});