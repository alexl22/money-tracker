import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export function setupNotifications() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    Notifications.setNotificationChannelAsync('reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
    });
}


export async function checkNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

export async function requestNotificationPermission(): Promise<{ granted: boolean, canAskAgain: boolean }> {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
}


export async function scheduleDailyNotification(hour: number, minute: number) {
    const trigger: Notifications.NotificationTriggerInput = Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: Math.floor(hour),
            minute: Math.floor(minute),
            channelId: 'reminders',
        }
        : {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: Math.floor(hour),
            minute: Math.floor(minute),
            repeats: true,
        };

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Reminder 📊",
            body: "Remember to enter your income and expenses!",
            sound: 'default',
            data: { screen: '/(tabs)/history' },
        },
        trigger,
    });
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}


export async function updateNotification(
    enabled: boolean,
    hour: number,
    minute: number
) {
    await cancelAllNotifications();

    if (!enabled) return;

    const { granted } = await requestNotificationPermission();
    if (!granted) return false;

    await scheduleDailyNotification(hour, minute);
    return true;
}
