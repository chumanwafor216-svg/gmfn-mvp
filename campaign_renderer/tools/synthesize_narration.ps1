param(
  [Parameter(Mandatory = $true)]
  [string]$SsmlPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [string]$VoiceName = "Microsoft Hazel Desktop"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  try {
    $availableVoiceNames = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    if ($availableVoiceNames -contains $VoiceName) {
      $synth.SelectVoice($VoiceName)
    }
  }
  catch {
    Write-Verbose "Requested voice unavailable in this execution context; using system default voice."
  }

  $synth.Rate = 2
  $synth.Volume = 100
  $synth.SetOutputToWaveFile($OutputPath)
  $ssml = Get-Content -LiteralPath $SsmlPath -Raw
  try {
    $synth.SpeakSsml($ssml)
  }
  catch {
    $plainText = $ssml -replace '<break[^>]*/>', '. '
    $plainText = $plainText -replace '<[^>]+>', ' '
    $plainText = [System.Net.WebUtility]::HtmlDecode($plainText)
    $plainText = $plainText -replace '\s+', ' '
    $synth.Speak($plainText.Trim())
  }
}
finally {
  $synth.Dispose()
}
