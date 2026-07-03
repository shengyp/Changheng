package com.xyz.question_bank_management_system.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class LlmSecretCodec {
    private static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom secureRandom = new SecureRandom();
    private final SecretKeySpec keySpec;

    public LlmSecretCodec(@Value("${app.jwt.secret:PLEASE_CHANGE_ME_TO_A_LONG_RANDOM_STRING}") String secret) {
        this.keySpec = new SecretKeySpec(sha256(secret), "AES");
    }

    public String encode(String plainText) {
        if (!StringUtils.hasText(plainText)) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.trim().getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to encrypt LLM secret", ex);
        }
    }

    public String decode(String cipherText) {
        if (!StringUtils.hasText(cipherText)) {
            return "";
        }
        String value = cipherText.trim();
        if (!value.startsWith(PREFIX)) {
            return value;
        }
        try {
            String[] parts = value.substring(PREFIX.length()).split(":", 2);
            if (parts.length != 2) {
                return "";
            }
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] encrypted = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return "";
        }
    }

    public String mask(String cipherText) {
        String secret = decode(cipherText);
        if (!StringUtils.hasText(secret)) {
            return "";
        }
        String trimmed = secret.trim();
        if (trimmed.length() <= 8) {
            return "****" + trimmed.substring(Math.max(0, trimmed.length() - 2));
        }
        return trimmed.substring(0, 4) + "****" + trimmed.substring(trimmed.length() - 4);
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(String.valueOf(value).getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize LLM secret codec", ex);
        }
    }
}
