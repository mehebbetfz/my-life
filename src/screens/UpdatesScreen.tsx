import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Header, PrimaryButton, Row, Screen } from '../components/ui';
import {
  explainOtaDisabled,
  getOtaStatus,
  promptCheckAndUpdate,
} from '../lib/ota';
import { colors, fonts } from '../theme';

export function UpdatesScreen() {
  const status = getOtaStatus();
  const [busy, setBusy] = useState(false);

  return (
    <Screen>
      <Header
        title="Обновления"
        subtitle="EAS Update · без новой сборки"
      />

      <Row>
        <Text style={styles.metaLine}>
          {status.enabled
            ? 'OTA активны в этой сборке'
            : explainOtaDisabled()}
        </Text>
        {status.channel ? (
          <Text style={styles.metaLine}>Канал · {status.channel}</Text>
        ) : null}
        {status.runtimeVersion ? (
          <Text style={styles.metaLine}>
            Runtime · {status.runtimeVersion}
          </Text>
        ) : null}
        <Text style={styles.metaLine}>
          {status.isEmbedded ? 'Встроенный бандл' : 'OTA-бандл'}
        </Text>
      </Row>

      <PrimaryButton
        label={busy ? 'Проверяю…' : 'Проверить обновления'}
        icon="refresh-cw"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void promptCheckAndUpdate().finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaLine: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
    marginBottom: 6,
    lineHeight: 20,
  },
});
