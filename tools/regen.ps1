$d="data"; $out="// Auto-generiert aus data/*.json`n"
$out += "const TYPES_DATA = " + (Get-Content "$d\types.json" -Raw) + ";`n"
$out += "const CREATURES_DATA = " + (Get-Content "$d\creatures.json" -Raw) + ";`n"
$out += "const FUSIONS_DATA = " + (Get-Content "$d\fusions.json" -Raw) + ";`n"
[IO.File]::WriteAllText("js\data.js", $out, (New-Object Text.UTF8Encoding($false)))
$o = "// GENERIERT aus js/*.js - NICHT von Hand aendern.`n"
$o += "const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };`n"
foreach ($f in @('profiles','data','items','state','ascension','battle')) {
  $o += "`n// ================= js/$f.js =================`n"; $o += (Get-Content "js\$f.js" -Raw) + "`n" }
$o += "`nexport { createBattle, updateBattle, castActive, Creatures, Items, Elements, statsAtLevel };`n"
[IO.File]::WriteAllText("supabase\functions\verify-match\engine.js", $o, (New-Object Text.UTF8Encoding($false)))
Write-Output "js/data.js + engine.js neu erzeugt"
