import React, { useState } from "react";
import { StyleSheet, View, Text, SafeAreaView, Image, Alert, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, StatusBar, } from "react-native";
import { Input, Button, Icon } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../supabase/supabaseClient";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SignupScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [focusedInput, setFocusedInput] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const commonInputContainerStyle = {
    borderBottomWidth: 0,
    height: 30,
  };

  const handleSignup = async () => {
    if (!email || !password || !confirm) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { fullname },
      },
    });

    if (error) {
      Alert.alert("Signup error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Account created! Please check your email to confirm your account."
      );
      navigation.goBack();
    }
  };
  

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Back Button */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" type="ionicon" color="#000" size={28} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={60}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../assets/Museo_Logo.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>
            Enter your details to create a new account
          </Text>

          {/* Email */}
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

          {/* Password */}
          <View style={styles.inputWrapper}>
            {!password && <Text style={styles.placeholderText}>Password</Text>}
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={
                <Icon
                  name={showPassword ? "eye" : "eye-off"}
                  type="ionicon"
                  onPress={() => setShowPassword(!showPassword)}
                  color="#000"
                  size={22}
                  containerStyle={{ marginTop: 20 }}
                />
              }
              containerStyle={[
                styles.inputContainer,
                focusedInput === "password" && styles.focusedContainer,
              ]}
              inputContainerStyle={commonInputContainerStyle}
              inputStyle={styles.inputStyle}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            {!confirm && (
              <Text style={styles.placeholderText}>Confirm Password</Text>
            )}
            <Input
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              rightIcon={
                <Icon
                  name={showConfirm ? "eye" : "eye-off"}
                  type="ionicon"
                  onPress={() => setShowConfirm(!showConfirm)}
                  color="#000"
                  size={22}
                  containerStyle={{ marginTop: 20 }}
                />
              }
              containerStyle={[
                styles.inputContainer,
                focusedInput === "confirm" && styles.focusedContainer,
              ]}
              inputContainerStyle={commonInputContainerStyle}
              inputStyle={styles.inputStyle}
              onFocus={() => setFocusedInput("confirm")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <Button
            title="Create Account"
            onPress={handleSignup}
            buttonStyle={styles.createButton}
            titleStyle={styles.createButtonTitle}
            containerStyle={styles.createButtonContainer}
          />

          {/* Already have an account? */}
          <View style={styles.signinContainer}>
            <Text style={styles.signinText}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 30,
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: "contain",
    marginTop: 50,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
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
  createButtonContainer: {
    width: "100%",
  },
  createButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#000",
  },
  createButtonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  signinText: {
    fontSize: 14,
    color: "#888",
  },
  signinLink: {
    fontSize: 14,
    color: "#000",
    fontWeight: "bold",
  },
});

export default SignupScreen;