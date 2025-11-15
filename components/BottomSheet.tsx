
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { colors } from '../styles/commonStyles';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';

interface SimpleBottomSheetProps {
  children?: React.ReactNode;
  isVisible?: boolean;
  onClose?: () => void;
}

const SNAP_POINTS = [0, 300, 600];

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
});

export default function SimpleBottomSheet({ children, isVisible = false, onClose }: SimpleBottomSheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [gestureTranslateY, setGestureTranslateY] = useState(0);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 600,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  const handleBackdropPress = () => {
    if (onClose) {
      onClose();
    }
  };

  const snapToPoint = (point: number) => {
    Animated.spring(translateY, {
      toValue: point,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      if (point === 600 && onClose) {
        onClose();
      }
    });
  };

  const getClosestSnapPoint = (currentY: number, velocityY: number) => {
    const threshold = 50;
    
    if (velocityY > threshold) {
      return 600; // Close
    }
    
    if (velocityY < -threshold) {
      return 0; // Fully open
    }
    
    // Find closest snap point
    return SNAP_POINTS.reduce((prev, curr) => 
      Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
    );
  };

  const onGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    setGestureTranslateY(Math.max(0, translationY));
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      const currentY = Math.max(0, translationY);
      const snapPoint = getClosestSnapPoint(currentY, velocityY);
      
      snapToPoint(snapPoint);
      setGestureTranslateY(0);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View
                style={[
                  styles.container,
                  {
                    transform: [
                      {
                        translateY: Animated.add(translateY, gestureTranslateY),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.handle} />
                {children}
              </Animated.View>
            </PanGestureHandler>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
