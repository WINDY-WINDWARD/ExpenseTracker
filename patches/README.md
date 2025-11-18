# Fix for @maniac-tech/react-native-expo-read-sms Build Error

## Problem
The library `@maniac-tech/react-native-expo-read-sms` has a bug in version that causes compilation errors:
```
error: cannot find symbol getApplicationInfo()
error: package Build does not exist
```

## Solution
Apply this patch to fix the library code.

### Option 1: Manual Patch (Recommended)

1. Navigate to the file:
   ```
   node_modules\@maniac-tech\react-native-expo-read-sms\android\src\main\java\com\reactlibrary\RNExpoReadSmsModule.java
   ```

2. Find line 53 (around line 53):
   ```java
   if(Build.VERSION.SDK_INT >= 34 && getApplicationInfo().targetSdkVersion >= 34) {
   ```

3. Replace it with:
   ```java
   if(Build.VERSION.SDK_INT >= 34 && currentActivity.getApplicationInfo().targetSdkVersion >= 34) {
   ```

4. Make sure the imports at the top include:
   ```java
   import android.os.Build;
   ```

### Option 2: Copy Fixed File

Copy the fixed file from `patches/RNExpoReadSmsModule.java` to:
```
node_modules\@maniac-tech\react-native-expo-read-sms\android\src\main\java\com\reactlibrary\RNExpoReadSmsModule.java
```

### Option 3: Use patch-package (For Persistent Fix)

1. Install patch-package:
   ```bash
   npm install --save-dev patch-package
   ```

2. Apply the manual fix (Option 1)

3. Create the patch:
   ```bash
   npx patch-package @maniac-tech/react-native-expo-read-sms
   ```

4. Add to package.json scripts:
   ```json
   "scripts": {
     "postinstall": "patch-package"
   }
   ```

This will automatically apply the fix after every `npm install`.

## After Applying the Fix

Run the build again:
```bash
cd android
.\gradlew.bat assembleRelease
```

## Alternative: Use Different Library

If the fix doesn't work, consider using `react-native-get-sms-android` instead, which is more stable but requires bare workflow.
