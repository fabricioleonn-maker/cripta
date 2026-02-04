import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { Colors, Typography as TypeTokens } from '../theme/tokens';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'mono';
    color?: string;
    children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
    variant = 'body',
    color = Colors.TextPrimary,
    style,
    children,
    ...props
}) => {
    return (
        <Text style={[styles[variant], { color }, style]} {...props}>
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    h1: {
        fontSize: TypeTokens.size.xxl, // 32
        fontWeight: TypeTokens.weight.bold as any,
        letterSpacing: -0.5,
        fontFamily: TypeTokens.fontFamily.bold,
    },
    h2: {
        fontSize: TypeTokens.size.xl, // 24
        fontWeight: TypeTokens.weight.bold as any,
        letterSpacing: -0.25,
        fontFamily: TypeTokens.fontFamily.bold,
    },
    h3: {
        fontSize: TypeTokens.size.lg, // 20
        fontWeight: TypeTokens.weight.medium as any,
        fontFamily: TypeTokens.fontFamily.bold,
    },
    body: {
        fontSize: TypeTokens.size.md, // 16
        fontWeight: TypeTokens.weight.regular as any,
        fontFamily: TypeTokens.fontFamily.regular,
    },
    caption: {
        fontSize: TypeTokens.size.sm, // 14
        fontWeight: TypeTokens.weight.regular as any,
        color: Colors.TextSecondary,
        fontFamily: TypeTokens.fontFamily.regular,
    },
    mono: {
        fontSize: TypeTokens.size.sm, // 14
        fontFamily: TypeTokens.fontFamily.mono,
    }
});
