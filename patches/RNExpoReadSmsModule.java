package com.reactlibrary;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Telephony;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class RNExpoReadSmsModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private final ReactApplicationContext reactContext;
    private Callback callback;
    private static final int READ_SMS_PERMISSION_REQUEST_CODE = 1;

    public RNExpoReadSmsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "RNExpoReadSms";
    }

    @ReactMethod
    public void requestReadSMSPermission(Callback callback) {
        this.callback = callback;
        Activity currentActivity = getCurrentActivity();

        if (currentActivity == null) {
            callback.invoke("Activity doesn't exist");
            return;
        }

        // Fixed: Added proper context reference and Build import
        if(Build.VERSION.SDK_INT >= 34 && currentActivity.getApplicationInfo().targetSdkVersion >= 34) {
            ActivityCompat.requestPermissions(currentActivity,
                    new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS},
                    READ_SMS_PERMISSION_REQUEST_CODE);
        } else {
            ActivityCompat.requestPermissions(currentActivity,
                    new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS},
                    READ_SMS_PERMISSION_REQUEST_CODE);
        }
    }

    @ReactMethod
    public void list(String filter, Callback failureCallback, Callback successCallback) {
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Telephony.Sms.CONTENT_URI;

            String[] projection = new String[]{"_id", "address", "body", "date", "type"};
            String selection = null;
            String[] selectionArgs = null;
            String sortOrder = "date DESC";

            if (filter != null && !filter.isEmpty()) {
                JSONObject filterObj = new JSONObject(filter);
                List<String> selectionList = new ArrayList<>();
                List<String> selectionArgsList = new ArrayList<>();

                if (filterObj.has("box")) {
                    String box = filterObj.getString("box");
                    if (box.equals("inbox")) {
                        selectionList.add("type = ?");
                        selectionArgsList.add("1");
                    } else if (box.equals("sent")) {
                        selectionList.add("type = ?");
                        selectionArgsList.add("2");
                    }
                }

                if (filterObj.has("minDate")) {
                    selectionList.add("date >= ?");
                    selectionArgsList.add(String.valueOf(filterObj.getLong("minDate")));
                }

                if (filterObj.has("maxDate")) {
                    selectionList.add("date <= ?");
                    selectionArgsList.add(String.valueOf(filterObj.getLong("maxDate")));
                }

                if (!selectionList.isEmpty()) {
                    selection = String.join(" AND ", selectionList);
                    selectionArgs = selectionArgsList.toArray(new String[0]);
                }
            }

            Cursor cursor = contentResolver.query(uri, projection, selection, selectionArgs, sortOrder);

            JSONArray jsonArray = new JSONArray();
            int count = 0;
            int maxCount = 100;

            if (filter != null && !filter.isEmpty()) {
                JSONObject filterObj = new JSONObject(filter);
                if (filterObj.has("maxCount")) {
                    maxCount = filterObj.getInt("maxCount");
                }
            }

            if (cursor != null && cursor.moveToFirst()) {
                do {
                    if (count >= maxCount) break;

                    JSONObject jsonObject = new JSONObject();
                    jsonObject.put("_id", cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                    jsonObject.put("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    jsonObject.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    jsonObject.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    jsonObject.put("type", cursor.getInt(cursor.getColumnIndexOrThrow("type")));

                    jsonArray.put(jsonObject);
                    count++;
                } while (cursor.moveToNext());

                cursor.close();
            }

            successCallback.invoke(count, jsonArray.toString());
        } catch (JSONException e) {
            failureCallback.invoke(e.getMessage());
        } catch (Exception e) {
            failureCallback.invoke(e.getMessage());
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, android.content.Intent data) {
    }

    @Override
    public void onNewIntent(android.content.Intent intent) {
    }
}
