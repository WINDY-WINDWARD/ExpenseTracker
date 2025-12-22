import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import SmsAndroid from '@maniac-tech/react-native-expo-read-sms';

/**
 * Custom hook for reading SMS messages
 * Handles permissions and SMS reading functionality
 */
export const useSMSReader = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Request SMS permissions
   */
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      setError('SMS reading is only supported on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      const hasReadSMS = granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasReceiveSMS = granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED;

      const permissionGranted = hasReadSMS && hasReceiveSMS;
      setHasPermission(permissionGranted);

      if (!permissionGranted) {
        setError('SMS permissions are required for this feature');
      }

      return permissionGranted;
    } catch (err) {
      console.error('Error requesting SMS permissions:', err);
      setError('Failed to request permissions');
      return false;
    }
  };

  /**
   * Check if permissions are already granted
   */
  const checkPermissions = async () => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const hasReadSMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const hasReceiveSMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);

      const permissionGranted = hasReadSMS && hasReceiveSMS;
      setHasPermission(permissionGranted);
      return permissionGranted;
    } catch (err) {
      console.error('Error checking SMS permissions:', err);
      return false;
    }
  };

  /**
   * Read SMS messages with optional filters
   * @param {Object} options - Filter options
   * @param {number} options.maxCount - Maximum number of messages to read (default: 100)
   * @param {number} options.daysBack - Number of days to look back (default: 30)
   * @param {number} options.minDate - Minimum date timestamp (overrides daysBack if provided)
   * @param {number} options.maxDate - Maximum date timestamp (default: now)
   * @returns {Promise<Array>} Array of SMS messages
   */
  const readSMS = async (options = {}) => {
    const { maxCount = 100, daysBack = 30, minDate, maxDate } = options;

    if (Platform.OS !== 'android') {
      setError('SMS reading is only supported on Android');
      return [];
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        return [];
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range
      const endDate = maxDate || Date.now();
      const startDate = minDate || (endDate - (daysBack * 24 * 60 * 60 * 1000));

      const filter = {
        box: 'inbox',
        minDate: startDate,
        maxDate: endDate,
        maxCount: maxCount,
      };

      return new Promise((resolve, reject) => {
        SmsAndroid.list(
          JSON.stringify(filter),
          (fail) => {
            console.error('Failed to read SMS:', fail);
            setError('Failed to read SMS messages');
            setIsLoading(false);
            reject(fail);
          },
          (count, smsList) => {
            try {
              const messages = JSON.parse(smsList);
              setIsLoading(false);
              resolve(messages);
            } catch (err) {
              console.error('Error parsing SMS list:', err);
              setError('Failed to parse SMS messages');
              setIsLoading(false);
              reject(err);
            }
          }
        );
      });
    } catch (err) {
      console.error('Error reading SMS:', err);
      setError('An error occurred while reading SMS');
      setIsLoading(false);
      return [];
    }
  };



  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    hasPermission,
    isLoading,
    error,
    requestPermissions,
    checkPermissions,
    readSMS,
  };
};

export default useSMSReader;
