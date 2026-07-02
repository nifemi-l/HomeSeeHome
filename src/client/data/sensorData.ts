export interface SensorReading {
  temperature: number;
  humidity: number | null;
}

const MOCK_SENSOR_READINGS: SensorReading[] = [
  { temperature: 21, humidity: 43 },
  { temperature: 23, humidity: 48 },
  { temperature: 25, humidity: 55 },
  { temperature: 27, humidity: 61 },
  { temperature: 19, humidity: 37 },
  { temperature: 24, humidity: null },
];

export const MOCK_SENSOR_CYCLE_MS = 45_000;

export function getRandomMockSensorReading(previousIndex: number | null = null): {
  index: number;
  reading: SensorReading;
} {
  if (MOCK_SENSOR_READINGS.length === 0) {
    return { index: 0, reading: { temperature: 22, humidity: 45 } };
  }

  if (MOCK_SENSOR_READINGS.length === 1) {
    return { index: 0, reading: MOCK_SENSOR_READINGS[0] };
  }

  let nextIndex = Math.floor(Math.random() * MOCK_SENSOR_READINGS.length);
  if (previousIndex !== null && nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % MOCK_SENSOR_READINGS.length;
  }

  return { index: nextIndex, reading: MOCK_SENSOR_READINGS[nextIndex] };
}

/**
 * @deprecated Legacy backend fetch kept only for reference while the client uses local mocks.
 */
export async function fetchLegacySensorData(householdId: number): Promise<SensorReading> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/api/sensor-data/${householdId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sensor data: ${response.status}`);
  }

  return response.json();
}