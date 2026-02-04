import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle, StatusBarStyle } from 'react-native';
import { Colors } from '../theme/tokens';

interface ScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    barStyle?: StatusBarStyle;
}

export const Screen: React.FC<ScreenProps> = ({
    children,
    style,
    barStyle = 'light-content'
}) => {
    return (
        <View style={[styles.container, style]}>
            <StatusBar
                barStyle={barStyle}
                backgroundColor={Colors.BgRoot}
            />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.BgRoot,
    }
});
