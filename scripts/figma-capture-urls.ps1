# SoloBill → Figma html-to-design capture URLs (run while `npm run dev` is up)
# Open each URL in order; wait for capture toolbar to finish before the next.
# Target file: https://www.figma.com/design/cuP6Ns7uN3POA9EF19tNuV/Solo-Bill

$clientId = "cmo8xoype0000e0epw252byaj"
$invoiceId = "cmoadelyc0000r4ep56vlt4mm"

function Get-CaptureUrl($path, $captureId) {
  $endpoint = [uri]::EscapeDataString("https://mcp.figma.com/mcp/capture/$captureId/submit")
  return "http://localhost:3000$path#figmacapture=$captureId&figmaendpoint=$endpoint&figmadelay=2500"
}

$pages = @(
  @{ Name = "01 Home"; Path = "/"; Id = "30680c0e-40c1-41d1-9dee-ce97095f23b4" },
  @{ Name = "02 Login"; Path = "/login"; Id = "eaf4b7d8-d617-4a84-96c0-2ef9b62c979c" },
  @{ Name = "03 Register"; Path = "/register"; Id = "7591f46f-779a-4a94-a4cc-67627d733676" },
  @{ Name = "04 Dashboard"; Path = "/dashboard"; Id = "567682c9-315a-4711-aa85-e14b1262755a" },
  @{ Name = "05 Clients"; Path = "/dashboard/clients"; Id = "d9dad071-9643-46f3-99dc-913fae476008" },
  @{ Name = "06 New client"; Path = "/dashboard/clients/new"; Id = "52175004-f55c-4d8a-8b1a-c7b121b8c36d" },
  @{ Name = "07 Edit client"; Path = "/dashboard/clients/$clientId/edit"; Id = "c6f510bb-5971-4d10-bbec-3afc9d36b403" },
  @{ Name = "08 Invoices"; Path = "/dashboard/invoices"; Id = "92f05f77-0425-4d58-b8ec-d640055904c0" },
  @{ Name = "09 New invoice"; Path = "/invoice/new"; Id = "a148fe99-0113-491e-8c12-3c954c6d8041" },
  @{ Name = "10 Invoice detail"; Path = "/invoice/$invoiceId"; Id = "c73545fe-9374-4a95-aa6d-f6f16fddbd48" }
)

Write-Host "Sign in first at http://localhost:3000/login (demo@solobill.local / SoloBill-Mvp-2026!)"
Write-Host "Then run captures 04-10 in the SAME browser session.`n"

foreach ($p in $pages) {
  $url = Get-CaptureUrl $p.Path $p.Id
  Write-Host "$($p.Name): $url"
}
