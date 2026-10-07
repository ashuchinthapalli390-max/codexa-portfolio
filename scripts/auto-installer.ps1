$adb = "C:\Users\MYPC\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$apk = "G:\AntiGravity IDE\codexa app\build\app\outputs\flutter-apk\app-release.apk"

Write-Host "Waiting for Android mobile device to connect via USB..."
for ($i = 0; $i -lt 30; $i++) {
    $out = & $adb devices
    $lines = $out -split "`r?`n" | Where-Object { $_ -match "\tdevice$" }
    if ($lines) {
        $devId = ($lines[0] -split "\t")[0]
        Write-Host "Device detected: $devId"
        Write-Host "Installing CodeXa APK ($apk)..."
        $installOut = & $adb -s $devId install -r -d "$apk"
        Write-Host "Install Result: $installOut"
        Write-Host "Launching CodeXa Mobile App..."
        & $adb -s $devId shell monkey -p online.codexa.codexa_mobile -c android.intent.category.LAUNCHER 1
        Write-Host "SUCCESS: CodeXa is installed and running on $devId"
        exit 0
    }
    Start-Sleep -Seconds 2
}

Write-Host "No device connected within timeout. Please connect USB cable and enable USB Debugging."
exit 1
