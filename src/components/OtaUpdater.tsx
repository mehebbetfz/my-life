import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { downloadAndApplyOta, syncOtaOnLaunch } from '../lib/ota';
import { colors, fonts, space } from '../theme';
import { Icon } from './Icon';

/**
 * Скачивает OTA в фоне. Перезагрузка — только по кнопке
 * (авто-reload выбивал из приложения / мог зациклиться на битом бандле).
 */
export function OtaUpdater() {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const result = await syncOtaOnLaunch({ reloadImmediately: false });
        if (!cancelled && result.kind === 'available') setPending(true);
      } finally {
        syncing.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 10) }]}>
      <Icon name="download-cloud" size={16} color="#fff" />
      <Text style={styles.text}>Доступно обновление</Text>
      <Pressable
        disabled={busy}
        style={styles.btn}
        onPress={() => {
          setBusy(true);
          void downloadAndApplyOta()
            .catch(() => {
              /* reload may reject while restarting */
            })
            .finally(() => setBusy(false));
        }}
      >
        <Text style={styles.btnText}>{busy ? '…' : 'Установить'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.lg,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    flex: 1,
  },
  btn: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnText: {
    color: colors.accent,
    fontFamily: fonts.sansSemi,
    fontSize: 13,
  },
});
