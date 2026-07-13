import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

const CANVAS_SIZE = 600;
// Contact photos are shown as circular avatars throughout Android. A
// rectangle inscribed in a square must satisfy width^2 + height^2 <= side^2
// to stay fully inside the circle; this margin leaves a little slack so the
// card doesn't touch the mask edge.
const SAFETY_MARGIN = 0.92;

export type CircleSafePhotoCaptureHandle = {
  capture: () => Promise<string>;
};

type Props = {
  uri?: string;
};

const CircleSafePhotoCapture = forwardRef<CircleSafePhotoCaptureHandle, Props>(
  ({ uri }, ref) => {
    const shotRef = useRef<ViewShotRef>(null);
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
      if (!uri) {
        setImageSize(null);
        return;
      }
      let cancelled = false;
      Image.getSize(
        uri,
        (width, height) => {
          if (!cancelled) {
            setImageSize({ width, height });
          }
        },
        () => {
          if (!cancelled) {
            setImageSize(null);
          }
        },
      );
      return () => {
        cancelled = true;
      };
    }, [uri]);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!shotRef.current) {
          throw new Error('Photo canvas is not ready yet.');
        }
        return shotRef.current.capture();
      },
    }));

    if (!uri || !imageSize) {
      return null;
    }

    const diagonal = Math.sqrt(imageSize.width ** 2 + imageSize.height ** 2);
    const scale = (CANVAS_SIZE * SAFETY_MARGIN) / diagonal;
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;

    return (
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot
          ref={shotRef}
          options={{ format: 'jpg', quality: 0.92, width: CANVAS_SIZE, height: CANVAS_SIZE }}
          style={styles.canvas}>
          <Image
            source={{ uri }}
            style={{ width: displayWidth, height: displayHeight }}
            resizeMode="contain"
          />
        </ViewShot>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: -CANVAS_SIZE * 2,
    left: -CANVAS_SIZE * 2,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CircleSafePhotoCapture;
